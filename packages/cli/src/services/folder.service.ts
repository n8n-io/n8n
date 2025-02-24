import type { CreateFolderDto } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { FolderRepository } from '@/databases/repositories/folder.repository';
import { FolderNotFoundError } from '@/errors/folder-not-found.error';

@Service()
export class FolderService {
	constructor(private readonly folderRepository: FolderRepository) {}

	async createFolder({ parentFolderId, name }: CreateFolderDto, projectId: string) {
		let parentFolder = null;
		if (parentFolderId) {
			try {
				parentFolder = await this.folderRepository.findOneOrFailFolderInProject(
					parentFolderId,
					projectId,
				);
			} catch {
				throw new FolderNotFoundError(parentFolderId);
			}
		}

		const folderEntity = this.folderRepository.create({
			name,
			homeProject: { id: projectId },
			parentFolder,
		});

		const { homeProject, ...folder } = await this.folderRepository.save(folderEntity);

		return folder;
	}
}
