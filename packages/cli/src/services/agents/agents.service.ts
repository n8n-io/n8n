import type { User } from '@n8n/db';
import {
	GLOBAL_MEMBER_ROLE,
	UserRepository,
	WorkflowRepository,
	ProjectRelationRepository,
	ProjectRepository,
	ExternalAgentRegistrationRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import crypto from 'node:crypto';
import { Cipher } from 'n8n-core';

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

import { A2A_VERSION } from '@/agents/a2a-adapter';
import { dispatchAction } from './agent-action-handlers';
import type { ExecutionContext, ParsedAction } from './agent-execution-types';
import { discoverWorkflowSkill } from './agent-schema-discovery';
import { callLlm } from './agent-llm-client';
import { buildSystemPrompt } from './agent-prompt-builder';
import { executeWorkflow } from './agent-workflow-executor';
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
import { LLM_BASE_URL, LLM_MODEL, toAgentDto, scrubSecrets } from './agents.types';

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
		private readonly externalAgentRegistrationRepository: ExternalAgentRegistrationRepository,
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

	// ── External Agent Registration ──────────────────────────────────────

	async registerExternalAgent(url: string, apiKey: string, callingUser: User) {
		// Discover the remote agent card — try v0.3 path first, fall back to v0.2
		const baseUrl = url.replace(/\/+$/, '').replace(/\/\.well-known\/agent(?:-card)?\.json$/, '');
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 10_000);

		let card: {
			id?: string;
			name?: string;
			description?: string;
			url?: string;
			protocolVersion?: string;
			provider?: { description?: string; organization?: string };
			additionalInterfaces?: Array<{ transport?: string; url?: string }>;
			skills?: Array<{ id: string; name: string; description?: string }>;
			capabilities?: { streaming?: boolean; multiTurn?: boolean };
			requiredCredentials?: Array<{ type: string; description: string }>;
		};

		const fetchHeaders: Record<string, string> = { Accept: 'application/json' };
		if (apiKey) {
			// Send both headers — n8n uses x-n8n-api-key, standard A2A uses X-API-Key
			fetchHeaders['x-n8n-api-key'] = apiKey;
			fetchHeaders['X-API-Key'] = apiKey;
		}

		try {
			// Try agent-card.json (v0.3) first
			let response = await fetch(`${baseUrl}/.well-known/agent-card.json`, {
				headers: fetchHeaders,
				signal: controller.signal,
			});

			// Fall back to agent.json (v0.2) if v0.3 path not found
			if (response.status === 404) {
				response = await fetch(`${baseUrl}/.well-known/agent.json`, {
					headers: fetchHeaders,
					signal: controller.signal,
				});
			}

			if (!response.ok) {
				throw new Error(`Remote returned ${String(response.status)}`);
			}
			card = (await response.json()) as typeof card;
		} finally {
			clearTimeout(timeout);
		}

		// Extract the task endpoint from the card.
		// n8n cards use additionalInterfaces[0].url; standard A2A cards use top-level url.
		const interfaceUrl = card.additionalInterfaces?.[0]?.url ?? card.url ?? '';
		const remoteIdMatch = /\/agents\/([^/]+)/.exec(interfaceUrl);
		const remoteAgentId = remoteIdMatch?.[1] ?? card.id ?? 'unknown';

		// Use the card's interface URL as the task endpoint when available,
		// otherwise fall back to constructing an n8n-style URL.
		const taskEndpoint = interfaceUrl || `${baseUrl}/api/v1/agents/${remoteAgentId}/task`;

		// Check for duplicate registration
		const existing = await this.externalAgentRegistrationRepository.findOneBy({
			remoteUrl: taskEndpoint,
			remoteAgentId,
		});
		if (existing) {
			return existing;
		}

		// Auto-create n8nApi credential to store the encrypted API key
		const credential = await this.credentialsService.createManagedCredential(
			{
				name: `n8n A2A: ${card.name ?? remoteAgentId}`,
				type: 'n8nApi',
				data: { apiKey, baseUrl },
			},
			callingUser,
		);

		// Persist the registration — remoteUrl stores the full task endpoint
		const registration = this.externalAgentRegistrationRepository.create({
			name: card.name ?? 'Remote Agent',
			description: card.description ?? card.provider?.description ?? null,
			remoteUrl: taskEndpoint,
			remoteAgentId,
			credentialId: credential.id,
			remoteCapabilities: {
				...(card.capabilities ?? {}),
				protocolVersion: card.protocolVersion,
			},
			skills: (card.skills ?? []).map((s) => ({ name: s.name, description: s.description })),
			// Filter out n8nApi — A2A auth is handled by the registration's stored credential
			requiredCredentials: card.requiredCredentials?.filter((c) => c.type !== 'n8nApi') ?? null,
			credentialMappings: null,
		});

		return await this.externalAgentRegistrationRepository.save(registration);
	}

	async listExternalAgents() {
		return await this.externalAgentRegistrationRepository.find({
			order: { createdAt: 'DESC' },
		});
	}

	async updateExternalAgentMappings(
		registrationId: string,
		credentialMappings: Record<string, string>,
	) {
		const registration = await this.externalAgentRegistrationRepository.findOneBy({
			id: registrationId,
		});
		if (!registration) {
			throw new NotFoundError(`External agent registration ${registrationId} not found`);
		}
		registration.credentialMappings = credentialMappings;
		return await this.externalAgentRegistrationRepository.save(registration);
	}

	/**
	 * Resolve credential mappings for an external agent registration.
	 * Decrypts each mapped credential and returns the values as workflowCredentials.
	 */
	async resolveCredentialMappings(
		registrationId: string,
	): Promise<Record<string, Record<string, string>>> {
		const registration = await this.externalAgentRegistrationRepository.findOneBy({
			id: registrationId,
		});
		if (!registration?.credentialMappings) return {};

		const additionalData = await WorkflowExecuteAdditionalData.getBase({});
		const result: Record<string, Record<string, string>> = {};

		for (const [credType, credId] of Object.entries(registration.credentialMappings)) {
			try {
				const decrypted = await this.credentialsHelper.getDecrypted(
					additionalData,
					{ id: credId, name: '' },
					credType,
					'internal',
				);
				// Convert all decrypted values to strings
				const fields: Record<string, string> = {};
				for (const [key, value] of Object.entries(decrypted)) {
					if (typeof value === 'string') {
						fields[key] = value;
					}
				}
				result[credType] = fields;
			} catch {
				// Skip credentials that can't be decrypted
			}
		}

		return result;
	}

	async deleteExternalAgent(registrationId: string) {
		const registration = await this.externalAgentRegistrationRepository.findOneBy({
			id: registrationId,
		});
		if (!registration) {
			throw new NotFoundError(`External agent registration ${registrationId} not found`);
		}
		await this.externalAgentRegistrationRepository.delete({ id: registrationId });
	}

	async resolveProtocolVersion(registrationId: string): Promise<string | undefined> {
		const registration = await this.externalAgentRegistrationRepository.findOneBy({
			id: registrationId,
		});
		return registration?.remoteCapabilities?.protocolVersion;
	}

	async resolveExternalAgentApiKey(registrationId: string): Promise<string> {
		const registration = await this.externalAgentRegistrationRepository.findOneBy({
			id: registrationId,
		});
		if (!registration?.credentialId) {
			throw new NotFoundError(`External agent registration ${registrationId} not found`);
		}

		const additionalData = await WorkflowExecuteAdditionalData.getBase({});
		const decrypted = await this.credentialsHelper.getDecrypted(
			additionalData,
			{ id: registration.credentialId, name: `n8n A2A: ${registration.name}` },
			'n8nApi',
			'internal',
		);
		return (decrypted.apiKey as string) ?? '';
	}

	async listAgents(requestingUser: User): Promise<AgentDto[]> {
		const agents = await this.userRepository.find({ where: { type: 'agent' } });

		// Role may not be eagerly loaded on req.user — load it explicitly
		const caller = await this.userRepository.findOne({
			where: { id: requestingUser.id },
			relations: ['role'],
		});

		const isAdmin = caller?.role?.slug === 'global:owner' || caller?.role?.slug === 'global:admin';

		if (isAdmin) {
			return agents.map(toAgentDto);
		}

		// Members only see agents that share a TEAM project with them, or external agents.
		// Personal projects are 1:1 so they must be excluded from the intersection check.
		const teamProjects = await this.projectRepository.find({ where: { type: 'team' } });
		const teamProjectIds = new Set(teamProjects.map((p) => p.id));

		const userRels = await this.projectRelationRepository.findAllByUser(requestingUser.id);
		const userTeamProjectIds = new Set(
			userRels.filter((r) => teamProjectIds.has(r.projectId)).map((r) => r.projectId),
		);

		const agentProjectMap = new Map<string, Set<string>>();
		for (const agent of agents) {
			const rels = await this.projectRelationRepository.findAllByUser(agent.id);
			agentProjectMap.set(
				agent.id,
				new Set(rels.filter((r) => teamProjectIds.has(r.projectId)).map((r) => r.projectId)),
			);
		}

		const visible = agents.filter((agent) => {
			if (agent.agentAccessLevel === 'external') return true;
			const agentTeamProjects = agentProjectMap.get(agent.id) ?? new Set();
			for (const pid of agentTeamProjects) {
				if (userTeamProjectIds.has(pid)) return true;
			}
			return false;
		});

		return visible.map(toAgentDto);
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

		return {
			agentId: agentUser.id,
			agentName: `${agentUser.firstName} ${agentUser.lastName}`.trim(),
			description: agentUser.description,
			agentAccessLevel: agentUser.agentAccessLevel,
			llmConfigured: hasAnthropicCred,
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
			description?: string | null;
			inputs: Array<{ name: string; type: string }>;
		}> = [];
		if (workflowIds.length) {
			const workflows = await this.workflowRepository.findByIds(workflowIds, {
				includeActiveVersion: true,
			});
			for (const wf of workflows) {
				const nodes = wf.activeVersion?.nodes ?? wf.nodes ?? [];
				const skill = discoverWorkflowSkill(wf.id, wf.name, nodes);
				if (skill) {
					skills.push({
						id: skill.workflowId,
						name: skill.workflowName,
						description: wf.description,
						inputs: skill.inputs,
					});
				}
			}
		}

		const taskUrl = `${baseUrl}/api/v1/agents/${agent.id}/task`;

		return {
			// A2A v0.3 required fields
			name: agent.firstName,
			description: agent.description ?? '',
			url: taskUrl,
			version: '1.0.0',
			protocolVersion: A2A_VERSION,
			defaultInputModes: ['application/json'],
			defaultOutputModes: ['application/json'],
			capabilities: {
				streaming: true,
				pushNotifications: false,
				multiTurn: true,
			},
			skills: skills.map((s) => ({
				id: s.id,
				name: s.name,
				description: s.description ?? '',
				...(s.inputs.length > 0 ? { inputs: s.inputs } : {}),
			})),
			provider: { organization: 'n8n', url: baseUrl },
			securitySchemes: {
				apiKey: {
					type: 'apiKey',
					name: 'x-n8n-api-key',
					in: 'header',
				},
			},
			security: [{ apiKey: [] }],
			additionalInterfaces: [
				{
					transport: 'JSONRPC',
					url: taskUrl,
				},
			],
			// n8n extensions
			id: agent.id,
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
			type: 'task.observation',
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
			isExternalCall?: boolean;
		},
	): Promise<AgentTaskResult> {
		const {
			onStep: originalOnStep,
			externalAgents,
			callChain = new Set<string>(),
			byokApiKey,
			callerId,
			workflowCredentials,
			isExternalCall,
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
				isExternalCall,
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

	private buildExecutionDeps(): import('./agent-execution-types').ExecutionDeps {
		return {
			runWorkflow: (user, workflowId, agentPrompt, callerId, workflowCredentials, typedInputs) =>
				executeWorkflow(
					{
						workflowFinderService: this.workflowFinderService,
						workflowRunner: this.workflowRunner,
						activeExecutions: this.activeExecutions,
						cipher: this.cipher,
					},
					user,
					workflowId,
					agentPrompt,
					callerId,
					workflowCredentials,
					typedInputs,
				),
			executeAgentTask: this.executeAgentTask.bind(this),
			enforceAccessLevel: this.enforceAccessLevel.bind(this),
			findAgentUser: async (id: string) =>
				await this.userRepository.findOne({ where: { id, type: 'agent' } }),
			reflectBeforeComplete: this.reflectBeforeComplete.bind(this),
		};
	}

	private async buildExecutionContext(
		agentId: string,
		budget: IterationBudget,
		onStep: StepCallback | undefined,
		externalAgents: ExternalAgentConfig[] | undefined,
		byokApiKey: string | undefined,
		workflowCredentials: Record<string, Record<string, string>> | undefined,
		isExternalCall: boolean | undefined,
	): Promise<{ ctx: ExecutionContext } | { earlyReturn: AgentTaskResult }> {
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
				earlyReturn: {
					status: 'error',
					message:
						'No LLM API key available. Share an Anthropic credential with this agent or provide a BYOK key.',
					steps: [],
				},
			};
		}

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
			? await this.workflowRepository.findByIds(workflowIds, { includeActiveVersion: true })
			: [];

		const workflowList = workflows.map((w) => ({
			id: w.id,
			name: w.name,
			active: w.active,
			description: w.description,
		}));

		const skills = workflows
			.map((w) => discoverWorkflowSkill(w.id, w.name, w.activeVersion?.nodes ?? w.nodes ?? []))
			.filter((s): s is NonNullable<typeof s> => s !== null);

		const otherAgents: Array<{ id: string; firstName: string; description: string }> = [];
		const externalAgentNames = new Set(externalAgents?.map((a) => a.name) ?? []);
		const myAccessLevel = agentUser.agentAccessLevel ?? 'external';

		if (budget.remaining > 0 && !isExternalCall) {
			const allAgents = await this.userRepository.find({ where: { type: 'agent' } });
			for (const a of allAgents) {
				if (a.id === agentId) continue;
				if (externalAgentNames.has(a.firstName)) continue;

				const targetLevel = a.agentAccessLevel ?? 'external';
				if (targetLevel === 'closed') continue;
				if (myAccessLevel === 'external' && targetLevel !== 'external') continue;

				otherAgents.push({
					id: a.id,
					firstName: a.firstName,
					description: a.description ?? '',
				});
			}
		}

		const resolvedExternalAgents: ExternalAgentConfig[] = [...(externalAgents ?? [])];
		if (!isExternalCall) {
			const registrations = await this.externalAgentRegistrationRepository.find();
			for (const reg of registrations) {
				if (externalAgentNames.has(reg.name)) continue;

				let apiKey = '';
				if (reg.credentialId) {
					try {
						const additionalData = await WorkflowExecuteAdditionalData.getBase({});
						const decrypted = await this.credentialsHelper.getDecrypted(
							additionalData,
							{ id: reg.credentialId, name: `n8n A2A: ${reg.name}` },
							'n8nApi',
							'internal',
						);
						apiKey = (decrypted.apiKey as string) ?? '';
					} catch {
						continue;
					}
				}

				resolvedExternalAgents.push({
					name: reg.name,
					description: reg.description ?? undefined,
					url: reg.remoteUrl,
					apiKey: apiKey || undefined,
				});
				if (apiKey) knownSecrets.push(apiKey);
			}
		}

		for (const ext of resolvedExternalAgents) {
			otherAgents.push({
				id: `external:${ext.name}`,
				firstName: ext.name,
				description: ext.description ?? '',
			});
		}

		const canDelegate = budget.remaining > 0 && otherAgents.length > 0;
		const agentName = `${agentUser.firstName} ${agentUser.lastName}`.trim();
		const steps: TaskStep[] = [];

		const systemPromptText = buildSystemPrompt(
			agentName,
			workflowList,
			otherAgents,
			canDelegate,
			skills,
		);
		const messages: LlmMessage[] = [{ role: 'system', content: systemPromptText }];

		return {
			ctx: {
				agentUser,
				agentName,
				llmConfig,
				knownSecrets,
				workflows: workflowList,
				skills,
				otherAgents,
				resolvedExternalAgents,
				canDelegate,
				steps,
				messages,
				budget,
				onStep,
				deps: this.buildExecutionDeps(),
			},
		};
	}

	private parseLlmResponse(llmResponse: string): ParsedAction | null {
		const cleaned = llmResponse
			.replace(/^```(?:json)?\s*/i, '')
			.replace(/\s*```\s*$/, '')
			.trim();

		try {
			return JSON.parse(cleaned) as ParsedAction;
		} catch {
			const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				try {
					return JSON.parse(jsonMatch[0]) as ParsedAction;
				} catch {
					return null;
				}
			}
			return null;
		}
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
		isExternalCall: boolean | undefined,
	): Promise<AgentTaskResult> {
		const built = await this.buildExecutionContext(
			agentId,
			budget,
			onStep,
			externalAgents,
			byokApiKey,
			workflowCredentials,
			isExternalCall,
		);

		if ('earlyReturn' in built) return built.earlyReturn;

		const { ctx } = built;
		ctx.messages.push({ role: 'user', content: prompt });

		while (ctx.budget.remaining > 0) {
			ctx.budget.remaining--;

			const llmResponse = await callLlm(ctx.messages, ctx.llmConfig);
			ctx.messages.push({ role: 'assistant', content: llmResponse });

			const parsed = this.parseLlmResponse(llmResponse);
			if (!parsed) {
				return { status: 'completed', summary: llmResponse, steps: ctx.steps };
			}

			const outcome = await dispatchAction(
				ctx,
				parsed,
				prompt,
				callChain,
				byokApiKey,
				callerId,
				workflowCredentials,
			);

			switch (outcome.kind) {
				case 'completed':
					return outcome.result;
				case 'continue_loop':
					continue;
				case 'observed':
					this.recordObservation(
						ctx.steps,
						ctx.messages,
						ctx.onStep,
						{
							action: outcome.action,
							result: outcome.result,
							message: outcome.message,
							extra: outcome.extra,
						},
						ctx.knownSecrets,
					);
					break;
				case 'unknown_action':
					ctx.messages.push({
						role: 'user',
						content: `Observation: Unknown action. Use ${outcome.validActions}.`,
					});
					break;
			}
		}

		return { status: 'completed', summary: 'Reached maximum iterations', steps: ctx.steps };
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

If there are gaps or errors that need correcting, respond with the appropriate action instead (e.g. execute_workflow or delegate).`;

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
}
