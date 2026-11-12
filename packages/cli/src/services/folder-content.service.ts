import type { OperationContext, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError } from '@n8n/errors';

export interface FolderContentHandler {
	assertAccess(
		user: User,
		projectId: string,
		operation: 'read' | 'update' | 'delete',
	): Promise<void>;
	directCounts(projectId: string, folderIds: string[]): Promise<Map<string, number>>;
	relocate(
		projectId: string,
		fromFolderId: string,
		toFolderId: string | null,
		ctx: OperationContext,
	): Promise<void>;
	archiveContents(user: User, projectId: string, folderIds: string[]): Promise<void>;
	moveArchivedToRoot(projectId: string, folderIds: string[], ctx: OperationContext): Promise<void>;
}

@Service()
export class FolderContentService {
	private agentHandler: FolderContentHandler | null = null;

	setAgentHandler(handler: FolderContentHandler): void {
		this.agentHandler = handler;
	}

	getAgentHandler(): FolderContentHandler {
		if (!this.agentHandler) {
			throw new BadRequestError('Folder contents are not available for this resource type');
		}

		return this.agentHandler;
	}
}
