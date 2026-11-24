import type { AgentRuntimeIdentityStatus } from '@n8n/api-types';
import { EventService, loginIdOf } from '@n8n/backend-services';
import { type OperationContext, ProjectRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, NotFoundError } from '@n8n/errors';

import { AgentRuntimeCacheService } from './agent-runtime-cache.service';
import { AgentRuntimeIdentityService } from './agent-runtime-identity.service';
import { AgentServiceAccountService } from './agent-service-account.service';
import { AgentSessionStopService } from './agent-session-stop.service';
import { AgentRepository } from './repositories/agent.repository';

/**
 * Disables and enables an agent through its service account. A disabled agent
 * does not start a published run on any channel, and its live sessions stop.
 */
@Service()
export class AgentAccountStatusService {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly agentServiceAccount: AgentServiceAccountService,
		private readonly runtimeIdentity: AgentRuntimeIdentityService,
		private readonly runtimeCache: AgentRuntimeCacheService,
		private readonly sessionStop: AgentSessionStopService,
		private readonly eventService: EventService,
		private readonly projectRepository: ProjectRepository,
	) {}

	async getStatus(agentId: string, projectId: string): Promise<AgentRuntimeIdentityStatus> {
		const agent = await this.findAgentOrFail(agentId, projectId);
		const available = this.runtimeIdentity.isEnabled();
		if (!available) {
			return {
				available,
				actsAsServiceAccount: false,
				disabled: false,
				sharedCredentialsOnly: false,
				otherProjects: [],
			};
		}

		const [account, disabled, sharedCredentialsOnly, toolProjectIds] = await Promise.all([
			this.agentServiceAccount.findActingAccount(agent),
			this.agentServiceAccount.isDisabled(agent),
			this.agentServiceAccount.usesSharedCredentialsOnly(agent),
			this.runtimeIdentity.toolProjectIds(agent),
		]);
		const otherIds = toolProjectIds.filter((id) => id !== projectId);
		const otherProjects = await this.projectRepository.findNamesByIds(otherIds);
		return {
			available,
			actsAsServiceAccount: account !== undefined,
			disabled,
			sharedCredentialsOnly,
			otherProjects,
		};
	}

	/**
	 * Limits the agent to credentials shared with it directly, or lifts the
	 * limit. Its project memberships keep giving it workflows and data tables.
	 */
	async setSharedCredentialsOnly(
		agentId: string,
		projectId: string,
		value: boolean,
	): Promise<AgentRuntimeIdentityStatus> {
		if (!this.runtimeIdentity.isEnabled()) {
			throw new BadRequestError('Agent runtime identity is not enabled on this instance');
		}
		const agent = await this.findAgentOrFail(agentId, projectId);
		await this.agentServiceAccount.setSharedCredentialsOnly(agent, value);
		// The next run rebuilds the runtime, so its tools are filtered again.
		this.runtimeCache.clearRuntimes(agent.id);
		return await this.getStatus(agentId, projectId);
	}

	async setDisabled(
		agentId: string,
		projectId: string,
		disabled: boolean,
		user: User,
		ctx: OperationContext = {},
	): Promise<AgentRuntimeIdentityStatus> {
		if (!this.runtimeIdentity.isEnabled()) {
			throw new BadRequestError('Agent runtime identity is not enabled on this instance');
		}
		const agent = await this.findAgentOrFail(agentId, projectId);
		await this.agentServiceAccount.setDisabled(agent, disabled);

		// The next run rebuilds the runtime and checks the account. Peer mains
		// clear their cache through the broadcast.
		this.runtimeCache.clearRuntimes(agent.id);
		if (disabled) await this.sessionStop.stopAgentSessions(agent.id);

		this.eventService.emit('agent-service-account-disabled-changed', {
			user,
			disabled,
			serviceAccountId: agent.identityId,
			agentId: agent.id,
			projectId,
			loginId: loginIdOf(ctx),
		});
		return await this.getStatus(agentId, projectId);
	}

	private async findAgentOrFail(agentId: string, projectId: string) {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		return agent;
	}
}
