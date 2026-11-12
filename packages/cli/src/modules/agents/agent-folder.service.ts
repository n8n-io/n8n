import { ProjectScopeService } from '@n8n/backend-services';
import type { OperationContext, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';

import type { FolderContentHandler } from '@/services/folder-content.service';
import { AgentPublishService } from './agent-publish.service';
import { AgentRepository } from './repositories/agent.repository';

@Service()
export class AgentFolderService implements FolderContentHandler {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly agentPublishService: AgentPublishService,
		private readonly projectScopeService: ProjectScopeService,
	) {}

	async assertAccess(
		user: User,
		projectId: string,
		operation: 'read' | 'update' | 'delete',
	): Promise<void> {
		const allowed = await this.projectScopeService.hasScopes(user, projectId, [
			`agent:${operation}`,
		]);

		if (!allowed) {
			throw new ForbiddenError('You do not have permission to access these Agents');
		}
	}

	async directCounts(projectId: string, folderIds: string[]): Promise<Map<string, number>> {
		return await this.agentRepository.countByFolder(projectId, folderIds);
	}

	async relocate(
		projectId: string,
		fromFolderId: string,
		toFolderId: string | null,
		ctx: OperationContext,
	): Promise<void> {
		await this.agentRepository.relocateFolderContents(projectId, fromFolderId, toFolderId, ctx);
	}

	async archiveContents(user: User, projectId: string, folderIds: string[]): Promise<void> {
		await this.assertAccess(user, projectId, 'delete');
		const agents = await this.agentRepository.findInFolders(projectId, folderIds);

		for (const agent of agents) {
			if (agent.isArchived) {
				continue;
			}

			await this.agentPublishService.archiveAgent(agent.id, projectId, user);
		}
	}

	async moveArchivedToRoot(
		projectId: string,
		folderIds: string[],
		ctx: OperationContext,
	): Promise<void> {
		await this.agentRepository.moveArchivedFolderContentsToRoot(projectId, folderIds, ctx);
	}
}
