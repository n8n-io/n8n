import { EventService, loginIdOf } from '@n8n/backend-services';
import { type OperationContext, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError } from '@n8n/errors';

import type { PolicyActor } from '@/policy/policy-enforcement-backend';
import type {
	AccountProject,
	ServiceAccountProjectSource,
} from '@/services/service-account-projects';
import { ServiceAccountService } from '@/services/service-account.service';
import type { SystemDeletionActor } from '@/services/user.service';

import type { Agent } from './entities/agent.entity';
import { AgentRepository } from './repositories/agent.repository';

/** Who caused n8n to create an agent service account. `startup` gives an instance agent its account. */
export type ServiceAccountCreationActor = PolicyActor | { kind: 'system'; reason: 'startup' };

/** Links an agent to the service account that acts for it. */
@Service()
export class AgentServiceAccountService implements ServiceAccountProjectSource {
	constructor(
		private readonly serviceAccountService: ServiceAccountService,
		private readonly agentRepository: AgentRepository,
		private readonly eventService: EventService,
	) {}

	/**
	 * Creates a service account with a personal project for a new agent and sets
	 * `agent.identityId`. Every agent has an identity. Call it in the transaction
	 * that inserts the agent, so a failed insert leaves no account behind.
	 * Call {@link reportCreated} after that transaction commits.
	 */
	async assignToNewAgent(agent: Agent, ctx: OperationContext): Promise<void> {
		// The REST create trims the name, but an import takes it from the package.
		if (agent.name.trim() === '') throw new BadRequestError('An agent needs a name');

		const { serviceAccount } = await this.serviceAccountService.create(agent.name, ctx);
		agent.identityId = serviceAccount.id;
	}

	/**
	 * Sends the audit event of a new agent service account. Call it only after
	 * the transaction that created the account commits, so a rollback sends no event.
	 * `ctx` is the context of the request, for the login of a service account.
	 */
	reportCreated(
		agent: Pick<Agent, 'id' | 'identityId' | 'projectId'>,
		actor: ServiceAccountCreationActor,
		ctx?: OperationContext,
	): void {
		this.eventService.emit('agent-service-account-created', {
			...(actor.kind === 'user'
				? { user: actor.user, loginId: loginIdOf(ctx) }
				: {
						user: null,
						source: actor.reason,
						...('executionId' in actor && actor.executionId && { executionId: actor.executionId }),
					}),
			serviceAccountId: agent.identityId,
			agentId: agent.id,
			projectId: agent.projectId,
		});
	}

	/**
	 * Deletes an agent with its service account, the personal project and the
	 * shares to that project. With `transferId`, the work of the personal project
	 * moves to that project.
	 *
	 * The order keeps the agent intact when a policy blocks the transfer: first
	 * the work moves, then `cleanUp` removes the data of the agent, then one
	 * transaction deletes the agent row and the account row. The audit event is
	 * sent after that transaction commits.
	 *
	 * `source` says why the account goes when a user did not delete the agent
	 * itself, for the audit event.
	 */
	async deleteForAgent(
		agent: Pick<Agent, 'id' | 'identityId' | 'projectId'>,
		actor: User | SystemDeletionActor,
		transferId: string | undefined,
		ctx: OperationContext,
		cleanUp: () => Promise<void>,
		{ source }: { source?: 'project-deletion' } = {},
	): Promise<void> {
		const deleted = await this.serviceAccountService.remove(
			agent.identityId,
			actor,
			transferId,
			ctx,
			{
				cleanUp,
				deleteInTransaction: async (txCtx) => {
					if (agent.projectId) {
						await this.agentRepository.removeAfterApprovalCleanup(agent.id, agent.projectId, txCtx);
					} else {
						await this.agentRepository.deleteById(agent.id, txCtx);
					}
				},
			},
		);
		if (!deleted) return;

		// A user also has a `kind` (person or service), so test the value.
		const by =
			actor.kind === 'system'
				? { user: null, source: actor.reason }
				: { user: actor, loginId: loginIdOf(ctx), ...(source && { source }) };
		this.eventService.emit('agent-service-account-deleted', {
			...by,
			serviceAccountId: agent.identityId,
			agentId: agent.id,
			projectId: agent.projectId,
		});
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
