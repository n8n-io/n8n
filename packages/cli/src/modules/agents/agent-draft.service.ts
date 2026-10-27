import type { AgentModelCredentialConfig } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';
import type { Scope } from '@n8n/permissions';

import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentDefaultModelResolverService } from './agent-default-model-resolver.service';
import type {
	AgentDraftReference,
	CreateAgentDraftOptions,
	PersistAgentDraftOptions,
	PersistedAgentDraft,
} from './agent-draft.contracts';
import { AgentRunnableStateService } from './agent-runnable-state.service';
import { AgentsService, type AgentCreationResult } from './agents.service';
import { AgentsSettingsService } from './agents-settings.service';

@Service()
export class AgentDraftService {
	constructor(
		private readonly settings: AgentsSettingsService,
		private readonly agents: AgentsService,
		private readonly defaultModel: AgentDefaultModelResolverService,
		private readonly runnableState: AgentRunnableStateService,
	) {}

	async createDraft(
		user: User,
		projectId: string,
		name: string,
		options: CreateAgentDraftOptions = {},
	): Promise<AgentDraftReference> {
		const scopes: Scope[] = options.adoptOnCollision
			? ['agent:create', 'agent:update']
			: ['agent:create'];
		await this.settings.assertEnabled();
		if (!(await userHasScopes(user, scopes, false, { projectId }))) {
			throw new ForbiddenError('You do not have permission to access agents in this project.');
		}
		const { agent, adopted } = await this.agents.createOrAdopt(projectId, name, {
			...options,
			actor: { kind: 'user', user },
			...(options.createdBy ? { user } : {}),
			...(options.skills ? { skillCreator: user } : {}),
		});
		return { agentId: agent.id, projectId, name: agent.name, adopted };
	}

	async persistDraft(
		user: User,
		projectId: string,
		options: PersistAgentDraftOptions,
	): Promise<PersistedAgentDraft | null> {
		await this.settings.assertEnabled();
		const existing = await this.agents.findById(options.id, projectId);
		if (existing && !options.adoptOnCollision) return null;
		const scopes: Scope[] =
			existing || options.adoptOnCollision ? ['agent:create', 'agent:update'] : ['agent:create'];
		if (!(await userHasScopes(user, scopes, false, { projectId }))) {
			throw new ForbiddenError('You do not have permission to create agents in this project.');
		}
		let creationResult: AgentCreationResult;
		if (existing) {
			creationResult = await this.agents.getCreationResult(existing, true);
		} else {
			creationResult = await this.createPendingDraft(user, projectId, options);
		}
		const { agent, ...creationState } = creationResult;
		return {
			id: agent.id,
			name: agent.name,
			getState: async () => ({
				...(await this.runnableState.addRunnableState(agent, projectId, user)),
				...creationState,
				projectId,
			}),
		};
	}

	private async createPendingDraft(
		user: User,
		projectId: string,
		options: PersistAgentDraftOptions,
	) {
		let defaultModel: AgentModelCredentialConfig | null = null;
		if (options.config?.model === undefined) {
			defaultModel = await this.defaultModel.resolve(user, projectId);
		}
		return await this.agents.createOrAdopt(projectId, options.name, {
			actor: { kind: 'user', user },
			user,
			createdBy: 'user',
			id: options.id,
			adoptOnCollision: options.adoptOnCollision,
			config: options.config,
			pushRef: options.pushRef,
			...(defaultModel ? { defaultModel } : {}),
		});
	}

	async deleteDraft(user: User, projectId: string, agentId: string): Promise<void> {
		if (!(await userHasScopes(user, ['agent:delete'], false, { projectId }))) {
			throw new ForbiddenError('You do not have permission to access agents in this project.');
		}
		await this.agents.delete(agentId, projectId);
	}
}
