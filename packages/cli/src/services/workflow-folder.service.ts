import { WorkflowRepository, type OperationContext, type User } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowService } from '@/workflows/workflow.service';
import type { FolderContentHandler } from './folder-content.service';

// Folder routes check folder scopes. WorkflowService checks access during archival.
@Service()
export class WorkflowFolderService implements FolderContentHandler {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowService: WorkflowService,
	) {}

	async directCounts(_projectId: string, folderIds: string[]): Promise<Map<string, number>> {
		return await this.workflowRepository.countByFolder(folderIds);
	}

	async relocate(
		_projectId: string,
		fromFolderId: string,
		toFolderId: string | null,
		ctx: OperationContext,
	): Promise<void> {
		await this.workflowRepository.relocateFolderContents(fromFolderId, toFolderId, ctx);
	}

	async archiveContents(user: User, _projectId: string, folderIds: string[]): Promise<void> {
		const workflowIds = await this.workflowRepository.findIdsInFolders(folderIds);

		for (const workflowId of workflowIds) {
			await this.workflowService.archive(user, workflowId, { skipArchived: true });
		}
	}

	async moveArchivedToRoot(
		_projectId: string,
		folderIds: string[],
		ctx: OperationContext,
	): Promise<void> {
		await this.workflowRepository.moveArchivedFolderContentsToRoot(folderIds, ctx);
	}
}
