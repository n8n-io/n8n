import type { FolderResourceType } from '@n8n/api-types';
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
	deleteContents(user: User, projectId: string, folderIds: string[]): Promise<void>;
}

@Service()
export class FolderContentService {
	private readonly handlers = new Map<FolderResourceType, FolderContentHandler>();

	register(resourceType: FolderResourceType, handler: FolderContentHandler): void {
		this.handlers.set(resourceType, handler);
	}

	get(resourceType: FolderResourceType): FolderContentHandler {
		const handler = this.handlers.get(resourceType);

		if (!handler) {
			throw new BadRequestError('Folder contents are not available for this resource type');
		}

		return handler;
	}
}
