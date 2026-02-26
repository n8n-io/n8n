import type { User } from '@n8n/db';
import {
	GLOBAL_MEMBER_ROLE,
	UserRepository,
	WorkflowRepository,
	ProjectRelationRepository,
	ProjectRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import crypto from 'node:crypto';
import { Cipher } from 'n8n-core';
import {
	ManualExecutionCancelledError,
	createRunExecutionData,
	jsonStringify,
	type IExecutionContext,
	type IWorkflowExecutionDataProcess,
} from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { CredentialsHelper } from '@/credentials-helper';
import { CredentialsService } from '@/credentials/credentials.service';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { Push } from '@/push';
import { PublicApiKeyService } from '@/services/public-api-key.service';
import { WorkflowRunner } from '@/workflow-runner';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

import { discoverWorkflowSkill } from './agent-schema-discovery';
import { callExternalAgent } from './agent-external-client';
import { callLlm } from './agent-llm-client';
import { buildSystemPrompt } from './agent-prompt-builder';
import {
	SUPPORTED_TRIGGERS,
	buildPinData,
	findSupportedTrigger,
	getExecutionMode,
} from './agent-workflow-runner';
import type {
	AgentDto,
	AgentTaskResult,
	ExternalAgentConfig,
	IterationBudget,
	LlmConfig,
	LlmMessage,
	StepCallback,
	TaskStep,
} from './agents.types';
import {
	EXECUTION_TIMEOUT_MS,
	LLM_BASE_URL,
	LLM_MODEL,
	toAgentDto,
	scrubSecrets,
} from './agents.types';

@Service()
export class AgentsService {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly credentialsService: CredentialsService,
		private readonly credentialsHelper: CredentialsHelper,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowRunner: WorkflowRunner,
		private readonly activeExecutions: ActiveExecutions,
		private readonly push: Push,
		private readonly publicApiKeyService: PublicApiKeyService,
		private readonly cipher: Cipher,
	) {}

	private broadcastAgentEvent(agentId: string, event: Record<string, unknown>) {
		this.push.broadcast({
			type: 'agentTaskStep',
			data: { agentId, event },
		});
	}

	private broadcastAgentDone(agentId: string, result: AgentTaskResult) {
		this.push.broadcast({
			type: 'agentTaskDone',
			data: {
				agentId,
				status: result.status,
				summary: result.summary ?? result.message,
			},
		});
	}

	// ── CRUD ──────────────────────────────────────────────────────────────

	async createAgent(payload: {
		firstName: string;
		description?: string;
		agentAccessLevel?: 'external' | 'internal' | 'closed';
		avatar?: string | null;
	}): Promise<AgentDto> {
		const email = `agent-${crypto.randomUUID().slice(0, 8)}@internal.n8n.local`;

		const { user } = await this.userRepository.createUserWithProject({
			email,
			firstName: payload.firstName,
			lastName: '',
			password: null,
			type: 'agent',
			avatar: payload.avatar ?? null,
			role: GLOBAL_MEMBER_ROLE,
		});

		if (payload.description !== undefined || payload.agentAccessLevel !== undefined) {
			if (payload.description !== undefined) user.description = payload.description;
			if (payload.agentAccessLevel !== undefined) user.agentAccessLevel = payload.agentAccessLevel;
			await this.userRepository.save(user);
		}

		const apiKeyRecord = await this.publicApiKeyService.createPublicApiKeyForUser(user, {
			label: `${payload.firstName} A2A Key`,
			expiresAt: null,
			scopes: ['agent:read', 'agent:receive', 'agent:execute'],
		});

		const dto = toAgentDto(user);
		dto.apiKey = apiKeyRecord.apiKey;
		return dto;
	}

	async updateAgent(
		agentId: string,
		payload: {
			firstName?: string;
			avatar?: string | null;
			description?: string;
			agentAccessLevel?: 'external' | 'internal' | 'closed';
		},
	): Promise<AgentDto> {
		const agent = await this.userRepository.findOneBy({ id: agentId });

		if (!agent || agent.type !== 'agent') {
			throw new NotFoundError(`Agent ${agentId} not found`);
		}

		if (payload.firstName !== undefined) agent.firstName = payload.firstName;
		if (payload.avatar !== undefined) agent.avatar = payload.avatar;
		if (payload.description !== undefined) agent.description = payload.description;
		if (payload.agentAccessLevel !== undefined) agent.agentAccessLevel = payload.agentAccessLevel;

		const saved = await this.userRepository.save(agent);
		return toAgentDto(saved);
	}

	async deleteAgent(agentId: string): Promise<void> {
		const agent = await this.userRepository.findOneBy({ id: agentId, type: 'agent' });

		if (!agent) {
			throw new NotFoundError(`Agent ${agentId} not found`);
		}

		await this.userRepository.delete({ id: agentId });
	}

	async listAgents(): Promise<AgentDto[]> {
		const agents = await this.userRepository.find({ where: { type: 'agent' } });
		return agents.map(toAgentDto);
	}

	// ── Capabilities & Card ──────────────────────────────────────────────

	async getCapabilities(agentId: string) {
		const agentUser = await this.userRepository.findOne({
			where: { id: agentId, type: 'agent' },
			relations: ['role'],
		});

		if (!agentUser) {
			throw new NotFoundError(`Agent ${agentId} not found`);
		}

		const workflowIds = await this.workflowSharingService.getSharedWorkflowIds(agentUser, {
			scopes: ['workflow:read'],
		});

		const workflows = workflowIds.length
			? await this.workflowRepository.findByIds(workflowIds, {
					fields: ['id', 'name', 'active'],
				})
			: [];

		const credentials = await this.credentialsService.getMany(agentUser, {
			includeGlobal: false,
		});

		const projectRelations = await this.projectRelationRepository.findAllByUser(agentUser.id);
		const projectIds = projectRelations.map((r) => r.projectId);

		const projects =
			projectIds.length > 0 ? await this.projectRepository.findByIds(projectIds) : [];

		const hasAnthropicCred = credentials.some((c) => c.type === 'anthropicApi');
		const llmConfigured = hasAnthropicCred;

		return {
			agentId: agentUser.id,
			agentName: `${agentUser.firstName} ${agentUser.lastName}`.trim(),
			description: agentUser.description,
			agentAccessLevel: agentUser.agentAccessLevel,
			llmConfigured,
			projects: projects.map((p) => ({ id: p.id, name: p.name })),
			workflows: workflows.map((w) => ({
				id: w.id,
				name: w.name,
				active: w.active,
			})),
			credentials: credentials.map((c) => ({
				id: c.id,
				name: c.name,
				type: c.type,
			})),
		};
	}

	async getAgentCard(agentId: string, baseUrl: string) {
		const agent = await this.userRepository.findOne({
			where: { id: agentId, type: 'agent' },
			relations: ['role'],
		});

		if (!agent || agent.agentAccessLevel === 'closed') {
			throw new NotFoundError(`Agent ${agentId} not found`);
		}

		const credentials = await this.credentialsService.getMany(agent, {
			includeGlobal: false,
		});

		const seenTypes = new Set<string>();
		const requiredCredentials: Array<{ type: string; description: string }> = [];
		for (const cred of credentials) {
			if (!seenTypes.has(cred.type)) {
				seenTypes.add(cred.type);
				requiredCredentials.push({ type: cred.type, description: cred.name });
			}
		}

		// Discover typed skills from shared workflows with Execute Workflow Triggers
		const workflowIds = await this.workflowSharingService.getSharedWorkflowIds(agent, {
			scopes: ['workflow:read'],
		});
		const skills: Array<{
			id: string;
			name: string;
			inputs: Array<{ name: string; type: string }>;
		}> = [];
		if (workflowIds.length) {
			const workflows = await this.workflowRepository.findByIds(workflowIds);
			for (const wf of workflows) {
				const nodes = wf.nodes ?? [];
				const skill = discoverWorkflowSkill(wf.id, wf.name, nodes);
				if (skill) {
					skills.push({ id: skill.workflowId, name: skill.workflowName, inputs: skill.inputs });
				}
			}
		}

		return {
			id: agent.id,
			name: agent.firstName,
			provider: {
				name: 'n8n',
				description: agent.description ?? '',
			},
			capabilities: {
				streaming: true,
				pushNotifications: false,
				multiTurn: true,
			},
			skills,
			interfaces: [
				{
					type: 'http+json',
					url: `${baseUrl}/api/v1/agents/${agent.id}/task`,
				},
			],
			securitySchemes: {
				apiKey: {
					type: 'apiKey',
					name: 'x-n8n-api-key',
					in: 'header',
				},
			},
			security: [{ apiKey: [] }],
			requiredCredentials,
		};
	}

	// ── Access Control ───────────────────────────────────────────────────

	async enforceAccessLevel(agentId: string, caller: User): Promise<void> {
		const agentUser = await this.userRepository.findOne({
			where: { id: agentId, type: 'agent' },
		});

		if (!agentUser) {
			throw new NotFoundError(`Agent ${agentId} not found`);
		}

		if (agentUser.agentAccessLevel === 'closed') {
			if (caller.role.slug === 'global:owner' || caller.role.slug === 'global:admin') return;
			if (await this.sharesProject(caller.id, agentId)) return;
			throw new NotFoundError(`Agent ${agentId} not found`);
		}

		// External agents: any authenticated caller
		if (agentUser.agentAccessLevel === 'external' || agentUser.agentAccessLevel === null) {
			return;
		}

		// Internal agents: admin or project membership
		if (caller.role.slug === 'global:owner' || caller.role.slug === 'global:admin') return;
		if (await this.sharesProject(caller.id, agentId)) return;
		throw new ForbiddenError('You do not have access to this agent.');
	}

	private async sharesProject(userId: string, agentId: string): Promise<boolean> {
		const callerRelations = await this.projectRelationRepository.findAllByUser(userId);
		const agentRelations = await this.projectRelationRepository.findAllByUser(agentId);
		const callerProjectIds = new Set(callerRelations.map((r) => r.projectId));
		return agentRelations.some((r) => callerProjectIds.has(r.projectId));
	}

	// ── LLM Config ───────────────────────────────────────────────────────

	private async resolveLlmConfig(agentUser: User, byokApiKey?: string): Promise<LlmConfig> {
		if (byokApiKey) {
			return {
				apiKey: byokApiKey,
				baseUrl: LLM_BASE_URL,
				model: LLM_MODEL,
			};
		}

		const credentials = await this.credentialsService.getMany(agentUser, {
			includeGlobal: false,
		});

		const anthropicCred = credentials.find((c) => c.type === 'anthropicApi');

		if (anthropicCred) {
			const additionalData = await WorkflowExecuteAdditionalData.getBase({});
			const data = await this.credentialsHelper.getDecrypted(
				additionalData,
				{ id: anthropicCred.id, name: anthropicCred.name },
				'anthropicApi',
				'internal',
			);

			if (data.apiKey) {
				return {
					apiKey: data.apiKey as string,
					baseUrl: (data.url as string) || LLM_BASE_URL,
					model: LLM_MODEL,
				};
			}
		}

		return {
			apiKey: '',
			baseUrl: LLM_BASE_URL,
			model: LLM_MODEL,
		};
	}

	// ── Execution ────────────────────────────────────────────────────────

	private recordObservation(
		steps: TaskStep[],
		messages: LlmMessage[],
		onStep: StepCallback | undefined,
		observation: {
			action: string;
			result: string;
			message: string;
			extra?: Record<string, unknown>;
		},
		knownSecrets: string[] = [],
	) {
		const safeMessage = scrubSecrets(observation.message, knownSecrets);
		steps[steps.length - 1].result = observation.result;
		messages.push({ role: 'user', content: `Observation: ${safeMessage}` });
		onStep?.({
			type: 'observation',
			action: observation.action,
			result: observation.result,
			...observation.extra,
		});
	}

	async executeAgentTask(
		agentId: string,
		prompt: string,
		budget: IterationBudget,
		options?: {
			onStep?: StepCallback;
			externalAgents?: ExternalAgentConfig[];
			callChain?: Set<string>;
			byokApiKey?: string;
			callerId?: string;
			workflowCredentials?: Record<string, Record<string, string>>;
		},
	): Promise<AgentTaskResult> {
		const {
			onStep: originalOnStep,
			externalAgents,
			callChain = new Set<string>(),
			byokApiKey,
			callerId,
			workflowCredentials,
		} = options ?? {};

		const onStep: StepCallback | undefined = (event) => {
			originalOnStep?.(event);
			this.broadcastAgentEvent(agentId, event);
		};

		// Cycle detection
		if (callChain.has(agentId)) {
			const result: AgentTaskResult = {
				status: 'error',
				message: `Delegation cycle detected: agent ${agentId} is already in the call chain.`,
				steps: [],
			};
			this.broadcastAgentDone(agentId, result);
			return result;
		}
		callChain.add(agentId);

		let result: AgentTaskResult;
		try {
			result = await this.executeAgentTaskInner(
				agentId,
				prompt,
				budget,
				onStep,
				externalAgents,
				callChain,
				byokApiKey,
				callerId,
				workflowCredentials,
			);
		} catch (error) {
			this.broadcastAgentDone(agentId, {
				status: 'error',
				steps: [],
				message: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}

		this.broadcastAgentDone(agentId, result);
		return result;
	}

	private async executeAgentTaskInner(
		agentId: string,
		prompt: string,
		budget: IterationBudget,
		onStep: StepCallback | undefined,
		externalAgents: ExternalAgentConfig[] | undefined,
		callChain: Set<string>,
		byokApiKey: string | undefined,
		callerId: string | undefined,
		workflowCredentials: Record<string, Record<string, string>> | undefined,
	): Promise<AgentTaskResult> {
		const agentUser = await this.userRepository.findOne({
			where: { id: agentId, type: 'agent' },
			relations: ['role'],
		});

		if (!agentUser) {
			throw new NotFoundError(`Agent ${agentId} not found`);
		}

		const llmConfig = await this.resolveLlmConfig(agentUser, byokApiKey);
		if (!llmConfig.apiKey) {
			return {
				status: 'error',
				message:
					'No LLM API key available. Share an Anthropic credential with this agent or provide a BYOK key.',
				steps: [],
			};
		}

		// Collect all known secret values for scrubbing from observations.
		// This prevents credential leakage when APIs echo auth headers in error responses.
		const knownSecrets: string[] = [llmConfig.apiKey];
		if (workflowCredentials) {
			for (const creds of Object.values(workflowCredentials)) {
				knownSecrets.push(...Object.values(creds));
			}
		}

		const workflowIds = await this.workflowSharingService.getSharedWorkflowIds(agentUser, {
			scopes: ['workflow:read'],
		});
		const workflows = workflowIds.length
			? await this.workflowRepository.findByIds(workflowIds)
			: [];

		const workflowList = workflows.map((w) => ({
			id: w.id,
			name: w.name,
			active: w.active,
		}));

		// Discover typed skills from Execute Workflow Trigger schemas
		const skills = workflows
			.map((w) => discoverWorkflowSkill(w.id, w.name, w.nodes ?? []))
			.filter((s): s is NonNullable<typeof s> => s !== null);

		const otherAgents: Array<{ id: string; firstName: string; description: string }> = [];
		const externalAgentNames = new Set(externalAgents?.map((a) => a.name) ?? []);

		if (budget.remaining > 0) {
			const allAgents = await this.userRepository.find({ where: { type: 'agent' } });
			for (const a of allAgents) {
				if (
					a.id !== agentId &&
					a.agentAccessLevel !== 'closed' &&
					!externalAgentNames.has(a.firstName)
				) {
					otherAgents.push({
						id: a.id,
						firstName: a.firstName,
						description: a.description ?? '',
					});
				}
			}
		}

		if (externalAgents) {
			for (const ext of externalAgents) {
				otherAgents.push({
					id: `external:${ext.name}`,
					firstName: ext.name,
					description: ext.description ?? '',
				});
			}
		}

		const canDelegate = budget.remaining > 0 && otherAgents.length > 0;
		const agentName = `${agentUser.firstName} ${agentUser.lastName}`.trim();
		const steps: TaskStep[] = [];

		const observe = (observation: {
			action: string;
			result: string;
			message: string;
			extra?: Record<string, unknown>;
		}) => this.recordObservation(steps, messages, onStep, observation, knownSecrets);

		const systemPromptText = buildSystemPrompt(
			agentName,
			workflowList,
			otherAgents,
			canDelegate,
			skills,
		);
		const messages: LlmMessage[] = [
			{ role: 'system', content: systemPromptText },
			{ role: 'user', content: prompt },
		];

		while (budget.remaining > 0) {
			budget.remaining--;

			const llmResponse = await callLlm(messages, llmConfig);
			messages.push({ role: 'assistant', content: llmResponse });

			const cleaned = llmResponse
				.replace(/^```(?:json)?\s*/i, '')
				.replace(/\s*```\s*$/, '')
				.trim();

			let parsed: {
				action: string;
				workflowId?: string;
				inputs?: Record<string, unknown>;
				toAgentId?: string;
				message?: string;
				reasoning?: string;
				summary?: string;
			};
			try {
				parsed = JSON.parse(cleaned);
			} catch {
				// LLM sometimes includes preamble text before/after JSON — extract it
				const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
				if (jsonMatch) {
					try {
						parsed = JSON.parse(jsonMatch[0]);
					} catch {
						return { status: 'completed', summary: llmResponse, steps };
					}
				} else {
					return { status: 'completed', summary: llmResponse, steps };
				}
			}

			if (parsed.action === 'complete') {
				const reflectionResult = await this.reflectBeforeComplete(
					messages,
					llmConfig,
					prompt,
					parsed.summary ?? 'Task completed',
					steps,
					budget,
				);
				if (reflectionResult) return reflectionResult;
				// Reflection found gaps — loop continues with LLM's corrective action
				continue;
			}

			if (parsed.action === 'execute_workflow' && parsed.workflowId) {
				const capWorkflow = workflowList.find((w) => w.id === parsed.workflowId);
				const workflowName = capWorkflow?.name ?? parsed.workflowId;

				steps.push({ action: 'execute_workflow', workflowName });
				onStep?.({
					type: 'step',
					action: 'execute_workflow',
					workflowName,
					reasoning: parsed.reasoning,
				});

				try {
					const result = await this.runWorkflow(
						agentUser,
						parsed.workflowId,
						prompt,
						callerId,
						workflowCredentials,
						parsed.inputs,
					);
					const stepResult = result.success ? 'success' : 'failed';
					observe({
						action: 'execute_workflow',
						result: stepResult,
						message: `Workflow "${workflowName}" executed. Result: ${jsonStringify(result).slice(0, 2000)}`,
						extra: { workflowName },
					});
				} catch (error) {
					const errorMsg = error instanceof Error ? error.message : String(error);
					observe({
						action: 'execute_workflow',
						result: 'error',
						message: `Workflow execution failed: ${errorMsg}`,
						extra: { workflowName, error: errorMsg },
					});
				}
			} else if (
				parsed.action === 'send_message' &&
				parsed.toAgentId &&
				parsed.message &&
				canDelegate
			) {
				const targetAgentInfo = otherAgents.find((a) => a.id === parsed.toAgentId);
				const targetName = targetAgentInfo?.firstName ?? parsed.toAgentId;

				const externalAgent = parsed.toAgentId.startsWith('external:')
					? externalAgents?.find((a) => `external:${a.name}` === parsed.toAgentId)
					: undefined;

				steps.push({ action: 'send_message', toAgent: targetName });
				onStep?.({
					type: 'step',
					action: 'send_message',
					toAgent: targetName,
					...(externalAgent ? { external: true } : {}),
				});

				if (externalAgent) {
					try {
						const result = await callExternalAgent(externalAgent, parsed.message);
						const stepResult = result.status === 'completed' ? 'success' : 'failed';
						observe({
							action: 'send_message',
							result: stepResult,
							message: `Agent "${targetName}" responded: ${result.summary ?? 'No summary'}`,
							extra: { toAgent: targetName, summary: result.summary, external: true },
						});
					} catch (error) {
						const errorMsg = error instanceof Error ? error.message : String(error);
						observe({
							action: 'send_message',
							result: 'error',
							message: `External agent delegation failed: ${errorMsg}`,
							extra: { toAgent: targetName, error: errorMsg, external: true },
						});
					}
				} else {
					const targetAgent = await this.userRepository.findOne({
						where: { id: parsed.toAgentId, type: 'agent' },
					});

					if (!targetAgent) {
						observe({
							action: 'send_message',
							result: 'error',
							message: `Agent "${targetName}" not found. Available agents: ${otherAgents.map((a) => `${a.firstName} (id: ${a.id})`).join(', ')}`,
							extra: { toAgent: targetName, error: 'Agent not found' },
						});
					} else if (targetAgent.agentAccessLevel === 'closed') {
						observe({
							action: 'send_message',
							result: 'error',
							message: `Agent "${targetName}" is not accessible.`,
							extra: { toAgent: targetName, error: 'Agent not accessible' },
						});
					} else {
						try {
							await this.enforceAccessLevel(targetAgent.id, agentUser);
							const result = await this.executeAgentTask(targetAgent.id, parsed.message, budget, {
								onStep,
								callChain,
								byokApiKey,
								callerId,
								workflowCredentials,
							});
							const stepResult = result.status === 'completed' ? 'success' : 'failed';
							const responseText = result.summary ?? result.message ?? 'No summary';
							observe({
								action: 'send_message',
								result: stepResult,
								message: `Agent "${targetName}" responded: ${responseText}`,
								extra: { toAgent: targetName, summary: responseText },
							});
						} catch (error) {
							const errorMsg = error instanceof Error ? error.message : String(error);
							observe({
								action: 'send_message',
								result: 'error',
								message: `Agent delegation failed: ${errorMsg}`,
								extra: { toAgent: targetName, error: errorMsg },
							});
						}
					}
				}
			} else {
				const validActions = canDelegate
					? '"execute_workflow", "send_message", or "complete"'
					: '"execute_workflow" or "complete"';
				messages.push({
					role: 'user',
					content: `Observation: Unknown action. Use ${validActions}.`,
				});
			}
		}

		return { status: 'completed', summary: 'Reached maximum iterations', steps };
	}

	// ── Reflection ───────────────────────────────────────────────────────

	/**
	 * Before accepting a "complete" action, ask the LLM to review whether the
	 * original task was fully addressed. If gaps are found the LLM should
	 * respond with a corrective action instead of confirming completion.
	 *
	 * Returns `AgentTaskResult` when the task is genuinely complete, or
	 * `null` when the LLM identified gaps (the caller should continue the loop).
	 */
	private async reflectBeforeComplete(
		messages: LlmMessage[],
		llmConfig: LlmConfig,
		originalPrompt: string,
		proposedSummary: string,
		steps: TaskStep[],
		budget: IterationBudget,
	): Promise<AgentTaskResult | null> {
		// No budget left — accept the completion as-is
		if (budget.remaining <= 0) {
			return { status: 'completed', summary: proposedSummary, steps };
		}

		const stepsSoFar = steps
			.map(
				(s) =>
					`${s.action}${s.workflowName ? `: ${s.workflowName}` : ''}${s.result ? ` → ${s.result}` : ''}`,
			)
			.join('\n');

		const reflectionPrompt = `Before completing, review your work:

Original task: "${originalPrompt}"
Proposed summary: "${proposedSummary}"
Steps taken:
${stepsSoFar || '(none)'}

If everything was addressed, respond with:
{"action": "complete", "summary": "<final summary>"}

If there are gaps or errors that need correcting, respond with the appropriate action instead (e.g. execute_workflow or send_message).`;

		messages.push({ role: 'user', content: reflectionPrompt });
		budget.remaining--;

		const response = await callLlm(messages, llmConfig);
		messages.push({ role: 'assistant', content: response });

		const cleaned = response
			.replace(/^```(?:json)?\s*/i, '')
			.replace(/\s*```\s*$/, '')
			.trim();

		try {
			const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
			const parsed = JSON.parse(jsonMatch?.[0] ?? cleaned) as {
				action: string;
				summary?: string;
			};

			if (parsed.action === 'complete') {
				return {
					status: 'completed',
					summary: parsed.summary ?? proposedSummary,
					steps,
				};
			}
		} catch {
			// Parse failure — accept original completion
			return { status: 'completed', summary: proposedSummary, steps };
		}

		// LLM responded with a non-complete action — return null so the loop continues
		return null;
	}

	// ── Workflow Execution ────────────────────────────────────────────────

	private async runWorkflow(
		user: User,
		workflowId: string,
		agentPrompt?: string,
		callerId?: string,
		workflowCredentials?: Record<string, Record<string, string>>,
		typedInputs?: Record<string, unknown>,
	): Promise<{ success: boolean; executionId: string; data?: unknown }> {
		const workflow = await this.workflowFinderService.findWorkflowForUser(
			workflowId,
			user,
			['workflow:execute'],
			{ includeActiveVersion: true },
		);

		if (!workflow) {
			throw new Error(`Workflow ${workflowId} not found or agent lacks permission`);
		}

		const nodes = workflow.activeVersion?.nodes ?? workflow.nodes ?? [];
		const connections = workflow.activeVersion?.connections ?? workflow.connections ?? {};

		const triggerNode = findSupportedTrigger(nodes);
		if (!triggerNode) {
			throw new Error(
				`Workflow has no supported trigger. Supported: ${Object.values(SUPPORTED_TRIGGERS).join(', ')}`,
			);
		}

		const pinData = buildPinData(triggerNode, agentPrompt, typedInputs);

		let runtimeData: IExecutionContext | undefined;
		if (callerId || workflowCredentials) {
			const credentialContext = JSON.stringify({
				version: 1,
				identity: callerId ?? 'anonymous',
				metadata: { source: 'agent-a2a', agentId: user.id, workflowCredentials },
			});
			runtimeData = {
				version: 1,
				establishedAt: Date.now(),
				source: getExecutionMode(triggerNode),
				triggerNode: { name: triggerNode.name, type: triggerNode.type },
				credentials: this.cipher.encrypt(credentialContext),
			};
		}

		const runData: IWorkflowExecutionDataProcess = {
			executionMode: getExecutionMode(triggerNode),
			workflowData: { ...workflow, nodes, connections },
			userId: user.id,
			startNodes: [{ name: triggerNode.name, sourceData: null }],
			pinData,
			executionData: createRunExecutionData({
				startData: {},
				resultData: { pinData, runData: {} },
				executionData: {
					contextData: {},
					metadata: {},
					nodeExecutionStack: [
						{
							node: triggerNode,
							data: { main: [pinData[triggerNode.name]] },
							source: null,
						},
					],
					waitingExecution: {},
					waitingExecutionSource: {},
					runtimeData,
				},
			}),
		};

		const executionId = await this.workflowRunner.run(runData);

		const resultPromise = this.activeExecutions.getPostExecutePromise(executionId);
		let timeoutHandle: ReturnType<typeof setTimeout>;
		const timeoutPromise = new Promise<never>((_, reject) => {
			timeoutHandle = setTimeout(() => {
				void this.activeExecutions.stopExecution(
					executionId,
					new ManualExecutionCancelledError(executionId),
				);
				reject(new Error('Workflow execution timed out'));
			}, EXECUTION_TIMEOUT_MS);
		});

		try {
			const data = await Promise.race([resultPromise, timeoutPromise]);

			if (data === undefined) {
				throw new Error('Workflow did not return any data');
			}

			const success = data.status !== 'error' && !data.data.resultData?.error;

			return { success, executionId, data: data.data.resultData };
		} finally {
			clearTimeout(timeoutHandle!);
		}
	}
}
