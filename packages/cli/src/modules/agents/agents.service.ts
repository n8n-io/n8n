import * as agents from '@n8n/agents';
import type {
	AgentSchema,
	BuiltAgent,
	CredentialProvider,
	GenerateResult,
	StreamChunk,
} from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { Container, Service } from '@n8n/di';
import {
	ExecutionRepository,
	ProjectRelationRepository,
	UserRepository,
	WorkflowRepository,
} from '@n8n/db';
import { In } from '@n8n/typeorm';
import { OperationalError, UserError } from 'n8n-workflow';

import { Agent } from './entities/agent.entity';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { AgentRepository } from './repositories/agent.repository';
import type { WorkflowToolDescriptor } from './types';

import { ActiveExecutions } from '@/active-executions';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UrlService } from '@/services/url.service';
import { TtlMap } from '@/utils/ttl-map';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowRunner } from '@/workflow-runner';

import { AgentsCredentialProvider } from './agents-credential-provider';
import { AgentSecureRuntime } from './agent-secure-runtime';

export interface ExecuteAgentData {
	response: string;
	structuredOutput: unknown | null;
	usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
	toolCalls: Array<{ toolName: string; input: unknown; result: unknown }>;
	finishReason: string;
}

const STARTER_CODE = `import { Agent } from '@n8n/agents';

export default new Agent('my-agent')
  .model('anthropic', 'claude-sonnet-4-5')
  .instructions('You are a helpful assistant.');
`;

@Service()
export class AgentsService {
	/**
	 * Cached agent runtimes keyed by `agentId` or `agentId:userId`.
	 * TTL = 30 minutes — entries are evicted when the agent is idle so that
	 * memory is freed without requiring an explicit shutdown step.
	 */
	private readonly runtimes = new TtlMap<
		string,
		{ agent: agents.Agent; agentId: string; userId?: string }
	>(30 * Time.minutes.toMilliseconds);

	/** Build a cache key that includes the user so different users get isolated runtimes. */
	private runtimeKey(agentId: string, userId?: string): string {
		return userId ? `${agentId}:${userId}` : agentId;
	}

	/** Remove all cached runtimes for an agent (across all users). */
	private clearRuntimes(agentId: string): void {
		for (const key of this.runtimes.keys()) {
			if (key === agentId || key.startsWith(`${agentId}:`)) {
				this.runtimes.delete(key);
			}
		}
	}

	/**
	 * In-process schema cache keyed by agentId.
	 * TTL = 10 minutes — provides a short-lived buffer that avoids re-describing
	 * on every request while staying coherent in multi-instance deployments where
	 * another node may update the DB schema.
	 */
	private readonly schemaCache = new TtlMap<string, AgentSchema>(10 * Time.minutes.toMilliseconds);

	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly workflowRunner: WorkflowRunner,
		private readonly activeExecutions: ActiveExecutions,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly userRepository: UserRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly urlService: UrlService,
		private readonly n8nCheckpointStorage: N8NCheckpointStorage,
		private readonly secureRuntime: AgentSecureRuntime,
	) {}

	async create(projectId: string, name: string): Promise<Agent> {
		const agent = this.agentRepository.create({
			name,
			code: STARTER_CODE,
			projectId,
		});

		// Describe the starter code so the schema is immediately available
		try {
			agent.schema = await this.secureRuntime.describeSecurely(STARTER_CODE);
		} catch (e) {
			this.logger.warn('Failed to describe starter code', {
				error: e instanceof Error ? e.message : String(e),
			});
		}

		const saved = await this.agentRepository.save(agent);

		this.logger.debug('Created SDK agent', { agentId: saved.id, projectId });

		return saved;
	}

	async findByProjectId(projectId: string): Promise<Agent[]> {
		return await this.agentRepository.findByProjectId(projectId);
	}

	async findById(agentId: string, projectId: string): Promise<Agent | null> {
		return await this.agentRepository.findByIdAndProjectId(agentId, projectId);
	}

	async updateCode(
		agentId: string,
		projectId: string,
		code: string,
		updatedAt?: string,
	): Promise<{ agent: Agent; schemaError: string | null } | null> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);

		if (!agent) {
			return null;
		}

		if (updatedAt && agent.updatedAt.toISOString() !== updatedAt) {
			throw new ConflictError('Agent has been modified');
		}

		agent.code = code;
		agent.schema = null;

		this.clearRuntimes(agentId);
		this.schemaCache.delete(agentId);

		// Try to describe the new code and cache schema
		let schemaError: string | null = null;
		try {
			const schema = await this.secureRuntime.describeSecurely(code);
			agent.schema = schema;
			this.schemaCache.set(agentId, schema);
		} catch (e) {
			schemaError = e instanceof Error ? e.message : String(e);
			agent.schema = null;
			this.logger.warn('Failed to describe agent code', { agentId, error: schemaError });
		}

		const saved = await this.agentRepository.save(agent);

		this.logger.debug('Updated SDK agent code', { agentId, projectId });

		return { agent: saved, schemaError };
	}

	async updateName(agentId: string, projectId: string, name: string): Promise<Agent | null> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);

		if (!agent) {
			return null;
		}

		agent.name = name;
		const saved = await this.agentRepository.save(agent);
		this.logger.debug('Updated SDK agent name', { agentId, projectId, name });
		return saved;
	}

	async updateDescription(
		agentId: string,
		projectId: string,
		description: string,
		updatedAt?: string,
	): Promise<Agent | null> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);

		if (!agent) {
			return null;
		}

		if (updatedAt && agent.updatedAt.toISOString() !== updatedAt) {
			throw new ConflictError('Agent has been modified');
		}

		agent.description = description;
		const saved = await this.agentRepository.save(agent);
		this.logger.debug('Updated SDK agent description', { agentId, projectId });
		return saved;
	}

	async findByUser(userId: string): Promise<Agent[]> {
		const projectRelations = await this.projectRelationRepository.findAllByUser(userId);
		const projectIds = projectRelations.map((pr) => pr.projectId);

		if (projectIds.length === 0) return [];

		return await this.agentRepository.find({
			where: { projectId: In(projectIds) },
			order: { updatedAt: 'DESC' },
		});
	}

	async delete(agentId: string, projectId: string): Promise<boolean> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);

		if (!agent) {
			return false;
		}

		await this.agentRepository.remove(agent);

		this.clearRuntimes(agentId);
		this.schemaCache.delete(agentId);

		this.logger.debug('Deleted SDK agent', { agentId, projectId });

		return true;
	}

	getRuntime(agentId: string): { agent: agents.Agent; agentId: string } | undefined {
		return this.findRuntimeForAgent(agentId);
	}

	hasRuntime(agentId: string): boolean {
		return this.findRuntimeForAgent(agentId) !== undefined;
	}

	/** Find any cached runtime for an agent (regardless of user). */
	private findRuntimeForAgent(
		agentId: string,
	): { agent: agents.Agent; agentId: string; userId?: string } | undefined {
		for (const [key, runtime] of this.runtimes) {
			if (key === agentId || key.startsWith(`${agentId}:`)) {
				return runtime;
			}
		}
		return undefined;
	}

	async getSchema(
		agentId: string,
		projectId: string,
		_credentialProvider: CredentialProvider,
	): Promise<AgentSchema> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');

		let schema = this.schemaCache.get(agentId);
		if (!schema) {
			if (!entity.schema) {
				throw new UserError(
					'Agent schema has not been generated yet. Save the agent to generate it.',
				);
			}
			schema = entity.schema;
			this.schemaCache.set(agentId, schema);
		}
		// Merge entity description (stored on the DB entity, not in agent code)
		schema = {
			...schema,
			description: entity.description,
		};
		return schema;
	}

	async updateSchema(
		agentId: string,
		projectId: string,
		schema: AgentSchema,
		updatedAt: string,
		_credentialProvider: CredentialProvider,
	): Promise<{ code: string; schema: AgentSchema; updatedAt: string }> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');

		if (entity.updatedAt.toISOString() !== updatedAt) {
			throw new ConflictError('Agent has been modified');
		}

		const { generateAgentCode } = await import('@n8n/agents');
		const code = await generateAgentCode(schema, entity.name);

		// Invalidate caches
		this.clearRuntimes(agentId);
		this.schemaCache.delete(agentId);
		entity.code = code;
		entity.schema = null;

		// Describe the generated code securely to get a validated schema
		try {
			const describedSchema = await this.secureRuntime.describeSecurely(code);
			entity.schema = describedSchema;
			this.schemaCache.set(agentId, describedSchema);
		} catch {
			entity.schema = null;
		}

		const saved = await this.agentRepository.save(entity);

		const freshSchema = this.schemaCache.get(agentId);
		if (!freshSchema) {
			throw new Error('Schema not available after describing generated code');
		}
		freshSchema.description = entity.description;

		return { code, schema: freshSchema, updatedAt: saved.updatedAt.toISOString() };
	}

	/**
	 * Inject workflow tools, rich interaction tool, and checkpoint storage into
	 * an agent instance. Shared between reconstructFromSchema() and compileIsolated().
	 */
	private async injectRuntimeDependencies(
		agent: agents.Agent,
		agentId: string,
		projectId: string,
		userId?: string,
	): Promise<void> {
		// Resolve workflow tools — detect WorkflowTool markers in the tools list.
		// Both direct-mode compile and fromSchema reconstruction add these markers
		// to declaredTools for non-editable (workflow) tools.
		const workflowMarkers = agent.declaredTools.filter(
			(t) => '__workflowTool' in t && t.__workflowTool === true,
		) as unknown as WorkflowToolDescriptor[];

		if (workflowMarkers.length > 0) {
			if (!userId) {
				throw new UserError('userId is required when agent uses workflow tools');
			}

			const { resolveWorkflowTools } = await import('./workflow-tool-factory');

			const workflowTools = await resolveWorkflowTools([], workflowMarkers, {
				workflowRepository: this.workflowRepository,
				workflowRunner: this.workflowRunner,
				activeExecutions: this.activeExecutions,
				executionRepository: this.executionRepository,
				workflowFinderService: this.workflowFinderService,
				userRepository: this.userRepository,
				userId,
				projectId,
				webhookBaseUrl: this.urlService.getWebhookBaseUrl(),
			});

			const agentWithTool = agent as unknown as {
				tool: (t: unknown) => unknown;
			};
			if (typeof agentWithTool.tool === 'function') {
				for (const tool of workflowTools) {
					agentWithTool.tool(tool);
				}
			}

			this.logger.debug('Resolved workflow tools', {
				agentId,
				count: workflowTools.length,
			});
		}

		// Inject the rich_interaction tool for ad-hoc UI in chat integrations.
		const agentWithTools = agent as unknown as { tool: (t: unknown) => unknown };
		try {
			const { createRichInteractionTool } = await import('./integrations/rich-interaction-tool');
			agentWithTools.tool(createRichInteractionTool());
		} catch (toolError) {
			this.logger.warn('Failed to inject rich_interaction tool', {
				agentId,
				error: toolError instanceof Error ? toolError.message : String(toolError),
			});
		}

		// Inject checkpoint storage
		if (!agent.hasCheckpointStorage()) {
			agent.checkpoint(this.n8nCheckpointStorage);
		}
	}

	/**
	 * Reconstruct an agent from its persisted DB schema using Agent.fromSchema().
	 * This is the execution-time path — no compile() call needed.
	 * The runtime is cached for subsequent calls.
	 */
	private async reconstructFromSchema(
		agentEntity: Agent,
		credentialProvider: CredentialProvider,
		userId?: string,
	): Promise<agents.Agent> {
		if (!agentEntity.schema) {
			throw new UserError(
				'Agent schema is not available. The agent may need to be re-saved to generate its schema.',
			);
		}

		const source = agentEntity.code;
		if (!source?.trim()) {
			throw new UserError('Agent has no source code.');
		}

		const executor = this.secureRuntime.createExecutor(source);

		const reconstructed = await agents.Agent.fromSchema(agentEntity.schema, agentEntity.name, {
			handlerExecutor: executor,
			credentialProvider,
		});

		// Inject workflow tools, rich interaction tool, checkpoint
		await this.injectRuntimeDependencies(
			reconstructed,
			agentEntity.id,
			agentEntity.projectId,
			userId,
		);

		return reconstructed;
	}

	/**
	 * Resume a suspended tool call and yield the resulting stream chunks.
	 * Used by chat integration handlers to continue an agent run after
	 * a human-in-the-loop action (button click, modal submission).
	 */
	async *resumeForChat(
		agentId: string,
		runId: string,
		toolCallId: string,
		resumeData: unknown,
	): AsyncGenerator<StreamChunk> {
		const runtime = this.findRuntimeForAgent(agentId);
		if (!runtime) {
			throw new UserError(`Agent ${agentId} is not compiled — cannot resume`);
		}

		const agentInstance = runtime.agent;

		const checkpointStatus = await this.n8nCheckpointStorage.getStatus(runId);
		if (checkpointStatus === 'expired') {
			throw new UserError(`Checkpoint ${runId} is expired and cannot be resumed`);
		}

		if (checkpointStatus === 'not-found') {
			throw new UserError(`Checkpoint ${runId} not found and cannot be resumed`);
		}

		const resultStream = await agentInstance.resume('stream', resumeData, {
			runId,
			toolCallId,
		});

		const reader = resultStream.stream.getReader();
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				yield value;
			}
		} finally {
			reader.releaseLock();
		}
	}

	/**
	 * Execute a compiled SDK agent for a chat integration and yield stream chunks.
	 * Uses userId as the resourceId so each user gets their own memory context.
	 *
	 * When the runtime is not cached (e.g. after server restart), it loads the
	 * agent from DB and reconstructs from the persisted schema — no compile() call.
	 */
	async *executeForChat(
		agentId: string,
		message: string,
		threadId: string,
		userId: string,
		projectId: string,
		credentialProvider: CredentialProvider,
	): AsyncGenerator<StreamChunk> {
		const key = this.runtimeKey(agentId, userId);
		let runtime = this.runtimes.get(key);
		if (!runtime) {
			// Scope the lookup to the project so an agent from a different project
			// cannot be driven by supplying an arbitrary agentId (IDOR).
			const agentEntity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
			if (!agentEntity) throw new NotFoundError(`Agent ${agentId} not found`);

			const reconstructed = await this.reconstructFromSchema(
				agentEntity,
				credentialProvider,
				userId,
			);

			// Cache the runtime for subsequent calls
			this.runtimes.set(key, { agent: reconstructed, agentId, userId });
			runtime = this.runtimes.get(key);
			if (!runtime) throw new Error(`Agent ${agentId} failed to reconstruct`);
		}

		const agentInstance = runtime.agent;

		const resultStream = await agentInstance.stream(message, {
			persistence: {
				threadId,
				resourceId: userId,
			},
		});

		const reader = resultStream.stream.getReader();
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				if (value.type === 'tool-call-suspended') {
					this.logger.info('Chat: tool-call-suspended chunk received', {
						agentId,
						toolCallId: value.toolCallId,
						toolName: value.toolName,
					});
				}
				yield value;
			}
		} finally {
			reader.releaseLock();
		}
	}

	/**
	 * Compile an agent in isolation without writing to the shared runtime cache.
	 * Used by executeForWorkflow so that concurrent Slack / chat executions
	 * are not affected.
	 */
	private async compileIsolated(
		agentEntity: Agent,
		credentialProvider: CredentialProvider,
		userId?: string,
	): Promise<{ ok: boolean; agent?: BuiltAgent; error?: string }> {
		const source = agentEntity.code;
		if (!source?.trim()) {
			return { ok: false, error: 'No source code provided' };
		}

		// Use sandboxed path when agent has a persisted schema
		if (agentEntity.schema) {
			try {
				const executor = this.secureRuntime.createExecutor(source);

				const reconstructed = await agents.Agent.fromSchema(agentEntity.schema, agentEntity.name, {
					handlerExecutor: executor,
					credentialProvider,
				});

				// Inject runtime dependencies (workflow tools, rich interaction, checkpoint)
				await this.injectRuntimeDependencies(
					reconstructed,
					agentEntity.id,
					agentEntity.projectId,
					userId,
				);

				return { ok: true, agent: reconstructed as BuiltAgent };
			} catch (e) {
				return {
					ok: false,
					error: e instanceof Error ? e.message : 'Unknown compilation error',
				};
			}
		}

		// No schema available — agent cannot be compiled
		return { ok: false, error: 'Agent schema is not available. Save the agent to generate it.' };
	}

	/**
	 * Execute an SDK agent within a workflow execution context.
	 * Compiles a fresh isolated agent per call for credential isolation
	 * (does not use or affect the shared runtime cache).
	 */
	async executeForWorkflow(
		agentId: string,
		message: string,
		executionId: string,
		threadId: string,
		userId: string,
		projectId: string,
	): Promise<ExecuteAgentData> {
		const agentEntity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agentEntity) {
			throw new OperationalError('Agent not found or not accessible.');
		}

		// Look up the full User entity with role relation (CredentialsFinderService needs it)
		const userRepo = Container.get(UserRepository);
		const user = await userRepo.findOne({ where: { id: userId }, relations: ['role'] });
		if (!user) {
			throw new OperationalError('Could not resolve user for credential access.');
		}

		const credentialProvider = new AgentsCredentialProvider(
			Container.get(CredentialsService),
			Container.get(CredentialsFinderService),
			user,
		);

		const compiled = await this.compileIsolated(agentEntity, credentialProvider, userId);
		if (!compiled.ok || !compiled.agent) {
			throw new OperationalError(`Failed to compile agent: ${compiled.error ?? 'unknown error'}`);
		}

		const result = await compiled.agent.generate(message, {
			persistence: {
				resourceId: executionId,
				threadId,
			},
		});

		// Check for errors
		if (result.error) {
			const errorMessage =
				result.error instanceof Error ? result.error.message : String(result.error);
			throw new OperationalError(`Agent execution failed: ${errorMessage}`);
		}

		if (result.finishReason === 'error') {
			throw new OperationalError('Agent execution finished with an error.');
		}

		if (result.pendingSuspend && result.pendingSuspend.length > 0) {
			const toolNames = result.pendingSuspend
				.map((s: { toolName: string }) => s.toolName)
				.join(', ');
			throw new OperationalError(
				`Agent execution suspended waiting for tool approval: ${toolNames}. ` +
					'Suspend/resume is not supported in workflow execution context.',
			);
		}

		return {
			response: this.extractTextResponse(result),
			structuredOutput: result.structuredOutput ?? null,
			usage: result.usage
				? {
						promptTokens: result.usage.promptTokens,
						completionTokens: result.usage.completionTokens,
						totalTokens: result.usage.totalTokens,
					}
				: null,
			toolCalls: (result.toolCalls ?? []).map(
				(tc: { tool: string; input: unknown; output: unknown }) => ({
					toolName: tc.tool,
					input: tc.input,
					result: tc.output,
				}),
			),
			finishReason: result.finishReason ?? 'stop',
		};
	}

	/**
	 * Extract the text response from the last assistant message in a GenerateResult.
	 */
	private extractTextResponse(result: GenerateResult): string {
		for (let i = result.messages.length - 1; i >= 0; i--) {
			const msg = result.messages[i];
			if (msg.type !== 'custom' && msg.role === 'assistant' && Array.isArray(msg.content)) {
				const textParts = (msg.content as Array<{ type: string; text?: string }>)
					.filter((c): c is { type: 'text'; text: string } => c.type === 'text')
					.map((c) => c.text);
				if (textParts.length > 0) {
					return textParts.join('');
				}
			}
		}
		return '';
	}
}
