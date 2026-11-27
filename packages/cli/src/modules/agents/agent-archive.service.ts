import { InstanceWriteAccessService } from '@n8n/backend-services';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError } from '@n8n/errors';

import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentPublishService } from './agent-publish.service';
import { AgentWriteLockService } from './agent-write-lock.service';
import { AgentsSettingsService } from './agents-settings.service';
import { AgentRepository } from './repositories/agent.repository';
import { getAgentOrThrow } from './utils/get-agent-or-throw';

/** Archives a project Agent on behalf of a user without an editor lock. */
@Service()
export class AgentArchiveService {
	constructor(
		private readonly users: UserRepository,
		private readonly agents: AgentRepository,
		private readonly settings: AgentsSettingsService,
		private readonly publish: AgentPublishService,
		private readonly writeLock: AgentWriteLockService,
		private readonly instanceWriteAccess: InstanceWriteAccessService,
	) {}

	async preview(userId: string, projectId: string, agentId: string): Promise<{ name: string }> {
		const { agent } = await this.resolveTarget(userId, projectId, agentId);
		return { name: agent.name };
	}

	async archive(userId: string, projectId: string, agentId: string): Promise<{ name: string }> {
		const { user } = await this.resolveTarget(userId, projectId, agentId);
		this.assertWritable();
		const agent = await this.publish.archiveAgent(agentId, projectId, user, undefined, 'builder');
		return { name: agent.name };
	}

	private async resolveTarget(userId: string, projectId: string, agentId: string) {
		this.assertWritable();
		await this.settings.assertEnabled();
		const user = await this.users.findByIdWithRole(userId);
		if (
			!user ||
			user.disabled ||
			!(await userHasScopes(user, ['agent:delete'], false, { projectId }))
		) {
			throw new ForbiddenError('You do not have permission to archive Agents in this project.');
		}

		const agent = await getAgentOrThrow(this.agents, agentId, projectId);
		if (agent.isArchived) throw new BadRequestError('Agent is already archived.');
		await this.writeLock.ensureAgentEditable(agentId);
		return { user, agent };
	}

	private assertWritable(): void {
		if (this.instanceWriteAccess.isReadOnly()) {
			throw new ForbiddenError('You cannot archive an Agent on a read-only instance.');
		}
	}
}
