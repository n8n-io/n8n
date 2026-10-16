import type { CredentialProvider, StreamChunk } from '@n8n/agents';
import type { AgentJsonConfig, AgentSkill } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';
import type { Scope } from '@n8n/permissions';
import { UserError } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentConfigService } from './agent-config.service';
import { AgentContextService } from './agent-context.service';
import type { AgentContextReader, AgentSessionDetail } from './agent-context.contracts';
import type { AgentDraftState } from './agent-draft.contracts';
import { toAgentSessionDetail } from './agent-session-read';
import { AgentDefaultModelResolverService } from './agent-default-model-resolver.service';
import { AgentExecutionService } from './agent-execution.service';
import { AgentRunnableStateService } from './agent-runnable-state.service';
import { AgentSkillsService } from './agent-skills.service';
import { AgentsService } from './agents.service';
import { AgentsSettingsService } from './agents-settings.service';
import { AgentsBuilderService } from './builder/agents-builder.service';
import type { BuilderCredentialService, BuilderSessionOptions } from './builder/builder-session';
import { N8nMemory } from './integrations/n8n-memory';
import type { AiGatewayModelCredentialResolver } from './json-config/model-config';
import { AgentThreadRepository } from './repositories/agent-thread.repository';
import { createAgentCredentialProvider } from './utils/agent-credential-provider';
import { getAgentConfigHash } from './utils/agent-config-hash';
import { AgentEvaluationService } from './evaluation/agent-evaluation.service';
import type { AgentEvaluationPreparationResult } from './evaluation/agent-evaluation.contracts';

export type { BuilderCredentialService, BuilderSessionOptions } from './builder/builder-session';
export type { AgentDraftState } from './agent-draft.contracts';
export type {
	AgentContextLookup,
	AgentContextReader,
	AgentContextResult,
	AgentSessionDetail,
	AgentSessionThread,
	AgentSessionTurn,
} from './agent-context.contracts';
export type {
	AgentRuntimeInstrumentation,
	PrepareWorkflowAgentForEval,
} from './agent-runtime-instrumentation';
export type {
	AgentEvaluationPreparation,
	AgentEvaluationToolSummary,
} from './evaluation/agent-evaluation.contracts';
export { pruneConfigForEval } from './evaluation/evaluation-config';

export type AgentCredentialProvider = CredentialProvider &
	Partial<AiGatewayModelCredentialResolver>;

export interface CreateAgentDraftOptions {
	id?: string;
	adoptOnCollision?: boolean;
	schema?: AgentJsonConfig;
	skills?: Record<string, AgentSkill>;
}

export interface AgentDraftReference {
	agentId: string;
	projectId: string;
	name: string;
	adopted: boolean;
}

export interface PersistedAgentDraft {
	id: string;
	name: string;
	getState(): Promise<AgentDraftState>;
}

interface BuildRequest {
	user: User;
	projectId: string;
	agentId: string;
	credentialProvider: CredentialProvider;
	credentialService: BuilderCredentialService;
	session: BuilderSessionOptions;
}

@Service()
export class AgentsPublicApi {
	constructor(
		private readonly settings: AgentsSettingsService,
		private readonly agents: AgentsService,
		private readonly builder: AgentsBuilderService,
		private readonly context: AgentContextService,
		private readonly config: AgentConfigService,
		private readonly skills: AgentSkillsService,
		private readonly sessions: AgentExecutionService,
		private readonly threads: AgentThreadRepository,
		private readonly memory: N8nMemory,
		private readonly defaultModel: AgentDefaultModelResolverService,
		private readonly runnableState: AgentRunnableStateService,
		private readonly credentials: CredentialsService,
		private readonly evaluation: AgentEvaluationService,
	) {}

	async prepareEvaluation(
		user: User,
		projectId: string,
		agentId: string,
	): Promise<AgentEvaluationPreparationResult> {
		return await this.evaluation.prepare(user, projectId, agentId);
	}

	private async assertAccess(user: User, projectId: string, ...scopes: Scope[]): Promise<void> {
		await this.settings.assertEnabled();
		if (!(await userHasScopes(user, scopes, false, { projectId }))) {
			throw new ForbiddenError('You do not have permission to access agents in this project.');
		}
	}

	async createDraft(
		user: User,
		projectId: string,
		name: string,
		options: CreateAgentDraftOptions = {},
	): Promise<AgentDraftReference> {
		const scopes: Scope[] = options.adoptOnCollision
			? ['agent:create', 'agent:update']
			: ['agent:create'];
		await this.assertAccess(user, projectId, ...scopes);
		const { agent, adopted } = await this.agents.createOrAdopt(projectId, name, {
			...options,
			actor: { kind: 'user', user },
			...(options.skills ? { skillCreator: user } : {}),
		});
		return { agentId: agent.id, projectId, name: agent.name, adopted };
	}

	async persistDraft(
		user: User,
		projectId: string,
		options: { id: string; name: string; adoptOnCollision: boolean },
	): Promise<PersistedAgentDraft | null> {
		await this.settings.assertEnabled();
		const existing = await this.agents.findById(options.id, projectId);
		if (existing && !options.adoptOnCollision) return null;
		const scopes: Scope[] =
			existing || options.adoptOnCollision ? ['agent:create', 'agent:update'] : ['agent:create'];
		if (!(await userHasScopes(user, scopes, false, { projectId }))) {
			throw new ForbiddenError('You do not have permission to create agents in this project.');
		}
		let agent = existing;
		if (!agent) {
			const defaultModel = await this.defaultModel.resolve(user, projectId);
			agent = await this.agents.create(projectId, options.name, {
				id: options.id,
				adoptOnCollision: options.adoptOnCollision,
				actor: { kind: 'user', user },
				...(defaultModel ? { defaultModel } : {}),
			});
		}
		const persisted = agent;
		return {
			id: persisted.id,
			name: persisted.name,
			getState: async () => ({
				...(await this.runnableState.addRunnableState(persisted, projectId, user)),
			}),
		};
	}

	async deleteDraft(user: User, projectId: string, agentId: string): Promise<void> {
		await this.assertAccess(user, projectId, 'agent:delete');
		await this.agents.delete(agentId, projectId);
	}

	async createCredentialProvider(
		user: User,
		projectId: string,
		agentId: string,
	): Promise<AgentCredentialProvider> {
		await this.assertAccess(user, projectId, 'agent:update');
		return createAgentCredentialProvider(this.credentials, projectId, user, agentId);
	}

	async build(request: BuildRequest, message: string): Promise<AsyncGenerator<StreamChunk>> {
		const { user, projectId, agentId, credentialProvider, credentialService, session } = request;
		await this.assertAccess(user, projectId, 'agent:update');
		return this.builder.buildAgent(
			agentId,
			projectId,
			message,
			credentialProvider,
			credentialService,
			user,
			session,
		);
	}

	async resumeBuild(
		request: BuildRequest,
		resume: { runId: string; toolCallId: string; resumeData: unknown },
	): Promise<AsyncGenerator<StreamChunk>> {
		const { user, projectId, agentId, credentialProvider, credentialService, session } = request;
		await this.assertAccess(user, projectId, 'agent:update');
		return this.builder.resumeBuild(
			agentId,
			projectId,
			resume.runId,
			resume.toolCallId,
			resume.resumeData,
			credentialProvider,
			credentialService,
			user,
			session,
		);
	}

	async findOpenSuspensions(user: User, projectId: string, agentId: string, threadId: string) {
		await this.assertAccess(user, projectId, 'agent:update');
		const checkpoint = await this.builder.findOpenCheckpointForThread(agentId, threadId);
		return Object.values(checkpoint?.pendingToolCalls ?? {})
			.filter((toolCall) => toolCall.suspended)
			.map(({ runId, toolCallId }) => ({ runId, toolCallId }));
	}

	async cancelOpenSuspension(
		user: User,
		projectId: string,
		agentId: string,
		runId: string,
	): Promise<void> {
		if (!(await userHasScopes(user, ['agent:update'], false, { projectId }))) {
			throw new ForbiddenError('You do not have permission to access agents in this project.');
		}
		await this.builder.cancelCheckpoint(agentId, runId);
	}

	async resolveAgentName(
		user: User,
		projectId: string,
		agentId: string,
	): Promise<string | undefined> {
		await this.assertAccess(user, projectId, 'agent:read');
		return (await this.agents.findById(agentId, projectId))?.name;
	}

	async readArtifact(user: User, projectId: string, agentId: string) {
		await this.assertAccess(user, projectId, 'agent:read');
		const config = await this.config.getConfig(agentId, projectId).catch((error: unknown) => {
			if (error instanceof UserError) return null;
			throw error;
		});
		if (!config) return null;
		return {
			config,
			skills: await this.skills.listSkills(agentId, projectId),
			configHash: getAgentConfigHash(config),
		};
	}

	createContextReader(user: User, projectId: string): AgentContextReader {
		return this.context.createReader(user, projectId);
	}

	async readSession(
		user: User,
		projectId: string,
		agentId: string,
		threadId: string,
	): Promise<AgentSessionDetail | null> {
		await this.assertAccess(user, projectId, 'agent:read');
		const detail = await this.sessions.getThreadDetail(threadId, projectId, agentId, user.id);
		if (!detail) return null;
		return toAgentSessionDetail(detail);
	}

	async deleteBuilderSessions(prefix: string): Promise<void> {
		const threadIds = await this.threads.findBuilderSessionIds(prefix);
		for (const threadId of threadIds) {
			await this.memory.getImplementation(threadId.slice(prefix.length)).deleteThread(threadId);
		}
	}
}
