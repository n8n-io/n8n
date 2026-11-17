import { type OperationContext, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError } from '@n8n/errors';

import type {
	AccountProject,
	ServiceAccountProjectSource,
} from '@/services/service-account-projects';
import { ServiceAccountService } from '@/services/service-account.service';
import type { SystemDeletionActor } from '@/services/user.service';

import type { Agent } from './entities/agent.entity';
import { AgentRepository } from './repositories/agent.repository';

/** Links an agent to the service account that acts for it. */
@Service()
export class AgentServiceAccountService implements ServiceAccountProjectSource {
	constructor(
		private readonly serviceAccountService: ServiceAccountService,
		private readonly agentRepository: AgentRepository,
	) {}

	/**
	 * Creates a service account with a personal project for a new agent and sets
	 * `agent.identityId`. Every agent has an identity. Call it in the transaction
	 * that inserts the agent, so a failed insert leaves no account behind.
	 */
	async assignToNewAgent(agent: Agent, ctx: OperationContext): Promise<void> {
		// The REST create trims the name, but an import takes it from the package.
		if (agent.name.trim() === '') throw new BadRequestError('An agent needs a name');

		const { serviceAccount } = await this.serviceAccountService.create(agent.name, ctx);
		agent.identityId = serviceAccount.id;
	}

	/**
	 * Deletes an agent with its service account, the personal project and the
	 * shares to that project. With `transferId`, the work of the personal project
	 * moves to that project.
	 *
	 * The order keeps the agent intact when a policy blocks the transfer: first
	 * the work moves, then `deleteAgent` removes the agent, then the account goes.
	 * The account cannot go first, because every agent needs one.
	 */
	async deleteForAgent(
		agent: Pick<Agent, 'identityId'>,
		actor: User | SystemDeletionActor,
		transferId: string | undefined,
		ctx: OperationContext,
		deleteAgent: () => Promise<void>,
	): Promise<void> {
		await this.serviceAccountService.remove(agent.identityId, actor, transferId, ctx, deleteAgent);
	}

	/** The project of each agent, by the ID of its service account. */
	async findProjectsOfAccounts(accountIds: string[]): Promise<Map<string, AccountProject>> {
		return await this.agentRepository.findProjectsByIdentityIds(accountIds);
	}

	/** The service accounts of the agents in these projects. */
	async findAccountIdsInProjects(projectIds: string[]): Promise<string[]> {
		return await this.agentRepository.findIdentityIdsInProjects(projectIds);
	}
}
