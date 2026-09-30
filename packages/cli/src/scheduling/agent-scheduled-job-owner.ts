import { ModuleRegistry } from '@n8n/backend-common';
import { ScheduledJobOwnerType } from '@n8n/constants';
import type { ScheduledJobOwner, ScheduledJobOwnerRef } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import type { ScheduledJobOwnerResolver } from '@n8n/scheduler';
import { UnexpectedError } from 'n8n-workflow';

/**
 * Marks an agent as the owner of the scheduled jobs that its published tasks create.
 * For reconciliation, an agent exists while it has a published version.
 *
 * The agents module is optional, so this resolver loads the agent repository on
 * demand. When the module is not active on this instance, the resolver cannot
 * tell liveness. Then it throws, and the reconciliation sweep does not touch
 * agent-owned jobs.
 */
@Service()
export class AgentScheduledJobOwner implements ScheduledJobOwnerResolver {
	readonly ownerType = ScheduledJobOwnerType.Agent;

	constructor(private readonly moduleRegistry: ModuleRegistry) {}

	/** The owner of the job that one agent task provisions. */
	member(agentId: string, taskId: string): ScheduledJobOwner {
		return { ownerType: this.ownerType, ownerId: agentId, ownerMemberId: taskId };
	}

	/** The owner of all jobs of the agent, whichever task provisioned them. */
	ref(agentId: string): ScheduledJobOwnerRef {
		return { ownerType: this.ownerType, ownerId: agentId };
	}

	async findExisting(ownerIds: string[]): Promise<Set<string>> {
		if (!this.moduleRegistry.isActive('agents')) {
			throw new UnexpectedError('Cannot resolve agent liveness: the agents module is not active');
		}

		const { AgentRepository } = await import('@/modules/agents/repositories/agent.repository.js');
		return await Container.get(AgentRepository).findPublishedIds(ownerIds);
	}
}
