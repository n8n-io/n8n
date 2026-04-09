import type {
	BuiltAgent,
	CredentialProvider,
	GenerateResult,
	StreamChunk,
	ToolDescriptor,
} from '@n8n/agents';

import * as agents from '@n8n/agents';
import { SqliteMemory, SqliteMemoryConfigSchema } from '@n8n/agents/dist/storage/sqlite-memory';
import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import {
	ExecutionRepository,
	ProjectRelationRepository,
	UserRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { In } from '@n8n/typeorm';
import { OperationalError, UserError } from 'n8n-workflow';
import {
	setSchemaBaseDirs,
	validateNodeConfig,
	type SchemaValidationResult,
} from '@n8n/workflow-sdk';

import { ActiveExecutions } from '@/active-executions';
import { resolveBuiltinNodeDefinitionDirs } from '@/modules/instance-ai/node-definition-resolver';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EphemeralNodeExecutor } from '@/node-execution';
import { UrlService } from '@/services/url.service';
import { TtlMap } from '@/utils/ttl-map';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { AgentJsonConfig, AgentJsonToolRef } from './agent-json-config';
import { AgentJsonConfigSchema } from './agent-json-config';
import { AgentSecureRuntime } from './agent-secure-runtime';
import { AgentsCredentialProvider } from './agents-credential-provider';
import { Agent } from './entities/agent.entity';
import { buildFromJson } from './from-json-config';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { N8nMemory } from './integrations/n8n-memory';
import { AgentRepository } from './repositories/agent.repository';
import type { WorkflowToolDescriptor } from './types';

export interface ExecuteAgentData {
	response: string;
	structuredOutput: unknown | null;
	usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null;
	toolCalls: Array<{ toolName: string; input: unknown; result: unknown }>;
	finishReason: string;
}

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
		private readonly ephemeralNodeExecutor: EphemeralNodeExecutor,
		private readonly n8nMemory: N8nMemory,
	) {}

	async create(projectId: string, name: string): Promise<Agent> {
		const defaultConfig: AgentJsonConfig = {
			name,
			model: 'anthropic/claude-sonnet-4-5',
			credential: '',
			instructions: 'You are a helpful assistant.',
		};

		const agent = this.agentRepository.create({
			name,
			projectId,
			schema: defaultConfig,
		});

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

	private getMemoryRegistry(): Record<string, agents.MemoryFactory> {
		return {
			n8n: () => this.n8nMemory,
			sqlite: (params) => new SqliteMemory(SqliteMemoryConfigSchema.parse(params)),
			postgres: () => {
				throw new Error('Not implemented');
			},
		};
	}

	/**
	 * Returns a `resolveTool` callback for `Agent.fromSchema()` that converts
	 * non-editable tool schema entries into functional `BuiltTool` implementations.
	 *
	 * Detects the tool type via `metadata.workflowTool` / `metadata.nodeTool` and
	 * delegates to the appropriate factory. Returns `null` for unknown types so that
	 * `fromSchema` falls back to a passthrough marker.
	 */
	private makeToolResolver(projectId: string, userId?: string): agents.ToolResolver {
		return async (ts) => {
			const meta = ts.metadata ?? {};

			if (meta.workflowTool === true) {
				if (!userId) {
					throw new UserError('userId is required when agent uses workflow tools');
				}
				const { resolveWorkflowTool } = await import('./workflow-tool-factory');
				return await resolveWorkflowTool(
					{
						workflowName: meta.workflowName as string,
						options: meta.options as WorkflowToolDescriptor['options'],
					},
					{
						workflowRepository: this.workflowRepository,
						workflowRunner: this.workflowRunner,
						activeExecutions: this.activeExecutions,
						executionRepository: this.executionRepository,
						workflowFinderService: this.workflowFinderService,
						userRepository: this.userRepository,
						userId,
						projectId,
						webhookBaseUrl: this.urlService.getWebhookBaseUrl(),
					},
				);
			}

			if (meta.nodeTool === true) {
				const { resolveNodeTool } = await import('./node-tool-factory');
				return resolveNodeTool(ts, { executor: this.ephemeralNodeExecutor, projectId });
			}

			return null;
		};
	}

	/**
	 * Inject platform-level tools and storage into an agent instance.
	 * Workflow and node tools are resolved earlier via `makeToolResolver()` inside
	 * `fromSchema()`, so this method only handles host-side singletons.
	 */
	private async injectRuntimeDependencies(agent: agents.Agent, agentId: string): Promise<void> {
		// Inject the rich_interaction tool for ad-hoc UI in chat integrations.
		try {
			const { createRichInteractionTool } = await import('./integrations/rich-interaction-tool');
			agent.tool(createRichInteractionTool());
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

			const reconstructed = await this.reconstructFromConfig(
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
		if (!agentEntity.schema) {
			return { ok: false, error: 'Agent has no JSON config. Create a config first.' };
		}

		try {
			const reconstructed = await this.reconstructFromConfig(
				agentEntity,
				credentialProvider,
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

	/**
	 * Get the JSON config for an agent.
	 */
	async getConfig(agentId: string, projectId: string): Promise<AgentJsonConfig> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');
		if (!entity.schema) {
			throw new UserError('Agent has no JSON config yet.');
		}
		return entity.schema;
	}

	/**
	 * Validate an AgentJsonConfig: runs Zod schema validation and checks any
	 * node tool configurations against their JSON-Schema definitions.
	 *
	 * Returns `{ valid: true, config }` on success, or `{ valid: false, error }`
	 * with a human-readable message on failure.
	 */
	validateConfig(
		raw: unknown,
	): { valid: true; config: AgentJsonConfig } | { valid: false; error: string } {
		const parsed = AgentJsonConfigSchema.safeParse(raw);
		if (!parsed.success) {
			return { valid: false, error: parsed.error.message };
		}

		const config = parsed.data;

		const nodeError = this.validateNodeToolConfigs(config);
		if (nodeError) {
			return { valid: false, error: nodeError };
		}

		return { valid: true, config };
	}

	/**
	 * Persist a new AgentJsonConfig (full replace).
	 */
	async updateConfig(
		agentId: string,
		projectId: string,
		config: AgentJsonConfig,
	): Promise<{ config: AgentJsonConfig; updatedAt: string }> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');

		const result = this.validateConfig(config);
		if (!result.valid) {
			throw new UserError(`Invalid agent config: ${result.error}`);
		}

		entity.schema = result.config;
		entity.name = result.config.name;
		entity.description = result.config.description ?? null;

		// Remove tool entries that are no longer referenced in the config
		const referencedIds = new Set(
			(result.config.tools ?? [])
				.filter((t): t is { type: 'custom'; id: string } => t.type === 'custom')
				.map((t) => t.id),
		);
		const orphanIds = Object.keys(entity.tools).filter((id) => !referencedIds.has(id));
		if (orphanIds.length > 0) {
			const tools = { ...entity.tools };
			for (const id of orphanIds) {
				delete tools[id];
			}
			entity.tools = tools;
		}

		// Invalidate runtime caches
		this.clearRuntimes(agentId);

		const saved = await this.agentRepository.save(entity);
		this.logger.debug('Updated agent JSON config', { agentId, projectId });

		return { config: result.config, updatedAt: saved.updatedAt.toISOString() };
	}

	/**
	 * Partially update an AgentJsonConfig
	 */
	async patchConfig(
		agentId: string,
		projectId: string,
		partial: Partial<AgentJsonConfig>,
	): Promise<{ config: AgentJsonConfig; updatedAt: string }> {
		const existing = await this.getConfig(agentId, projectId);

		const merged: AgentJsonConfig = {
			...existing,
			...partial,
			config: partial.config !== undefined ? partial.config : existing.config,
			memory: partial.memory !== undefined ? partial.memory : existing.memory,
		};

		return await this.updateConfig(agentId, projectId, merged);
	}

	/**
	 * Validate and persist a custom tool for an agent.
	 * The tool code is described in an isolate, and the descriptor + code
	 * are stored in the agent's `tools` column.
	 */
	async buildCustomTool(
		agentId: string,
		projectId: string,
		toolId: string,
		code: string,
		descriptor: ToolDescriptor,
	): Promise<{ ok: boolean; descriptor: ToolDescriptor }> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');

		// Store tool code + descriptor
		entity.tools = {
			...entity.tools,
			[toolId]: { code, descriptor },
		};

		// Add to config tools array if not already present
		if (entity.schema) {
			const tools = entity.schema.tools ?? [];
			const alreadyLinked = tools.some(
				(t: AgentJsonToolRef) => t.type === 'custom' && 'id' in t && t.id === toolId,
			);
			if (!alreadyLinked) {
				entity.schema.tools = [...tools, { type: 'custom' as const, id: toolId }];
			}
		}

		this.clearRuntimes(agentId);
		await this.agentRepository.save(entity);

		this.logger.debug('Built custom tool', { agentId, projectId, toolId });

		return { ok: true, descriptor };
	}

	/**
	 * Remove a custom tool from an agent.
	 */
	async deleteCustomTool(agentId: string, projectId: string, toolId: string): Promise<void> {
		const entity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!entity) throw new NotFoundError('Agent not found');

		const tools = { ...entity.tools };
		delete tools[toolId];
		entity.tools = tools;

		// Remove from config tools array
		if (entity.schema?.tools) {
			entity.schema.tools = entity.schema.tools.filter(
				(t: AgentJsonToolRef) => !(t.type === 'custom' && 'id' in t && t.id === toolId),
			);
		}

		this.clearRuntimes(agentId);
		await this.agentRepository.save(entity);

		this.logger.debug('Deleted custom tool', { agentId, projectId, toolId });
	}

	/**
	 * Validate the node configurations for any node-type tools in an AgentJsonConfig.
	 *
	 * Node tool schemas are validated on the host (not in the sandbox) because the
	 * real Zod schemas are only available in the host process.
	 *
	 * @returns A formatted error string if any node config is invalid, or null if all pass.
	 */
	private validateNodeToolConfigs(config: AgentJsonConfig): string | null {
		const nodeTools = (config.tools ?? []).filter(
			(t): t is Extract<AgentJsonToolRef, { type: 'node' }> => t.type === 'node',
		);

		if (nodeTools.length === 0) return null;

		const dirs = resolveBuiltinNodeDefinitionDirs();
		if (dirs.length > 0) {
			setSchemaBaseDirs(dirs);
		}

		const errors: string[] = [];

		for (const tool of nodeTools) {
			const nodeType: string = tool.node.nodeType;
			const nodeTypeVersion: number = tool.node.nodeTypeVersion;
			const nodeParameters = tool.node.nodeParameters ?? {};

			const result: SchemaValidationResult = validateNodeConfig(
				nodeType,
				nodeTypeVersion,
				{ parameters: nodeParameters },
				{ isToolNode: true },
			);

			if (!result.valid) {
				const messages = result.errors
					.map((e: { path: string; message: string }) => e.message)
					.join('; ');
				errors.push(`Node tool "${tool.name}" (${nodeType}@${nodeTypeVersion}): ${messages}`);
			}
		}

		return errors.length > 0 ? errors.join('\n') : null;
	}

	/**
	 * Reconstruct an agent from its JSON config using buildFromJson().
	 * This is the new execution path for JSON-config agents.
	 */
	private async reconstructFromConfig(
		agentEntity: Agent,
		credentialProvider: CredentialProvider,
		userId?: string,
	): Promise<agents.Agent> {
		const config = agentEntity.schema;
		if (!config) {
			throw new UserError('Agent has no JSON config.');
		}

		// Build toolsByName map: { toolName -> code }
		const toolsByName: Record<string, string> = {};
		for (const [_toolId, toolEntry] of Object.entries(agentEntity.tools ?? {})) {
			toolsByName[toolEntry.descriptor.name] = toolEntry.code;
		}

		// Build toolDescriptors map: { toolId -> descriptor }
		const toolDescriptors: Record<string, ToolDescriptor> = {};
		for (const [toolId, toolEntry] of Object.entries(agentEntity.tools ?? {})) {
			toolDescriptors[toolId] = toolEntry.descriptor;
		}

		const toolExecutor = this.secureRuntime.createToolExecutor(toolsByName);

		const reconstructed = await buildFromJson(config, toolDescriptors, {
			toolExecutor,
			credentialProvider,
			resolveTool: async (ref) => {
				// Convert AgentJsonToolRef to the marker BuiltTool that makeToolResolver expects
				if (ref.type === 'workflow') {
					const marker = {
						name: ref.name ?? ref.workflow,
						description: ref.description ?? `Execute the "${ref.workflow}" workflow`,
						editable: false,
						metadata: {
							workflowTool: true,
							workflowName: ref.workflow,
							options: { name: ref.name, description: ref.description },
						},
					};
					return await this.makeToolResolver(
						agentEntity.projectId,
						userId,
					)(marker as unknown as agents.ToolSchema);
				}
				if (ref.type === 'node') {
					const marker = {
						name: ref.name,
						description: ref.description ?? `Execute node ${ref.name}`,
						editable: false,
						metadata: { nodeTool: true, ...ref.node },
					};
					return await this.makeToolResolver(
						agentEntity.projectId,
						userId,
					)(marker as unknown as agents.ToolSchema);
				}
				return null;
			},
			memoryRegistry: this.getMemoryRegistry(),
		});

		await this.injectRuntimeDependencies(reconstructed, agentEntity.id);

		return reconstructed;
	}
}
