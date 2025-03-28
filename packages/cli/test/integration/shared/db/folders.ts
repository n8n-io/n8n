import { Container } from '@n8n/di';

import type { Folder } from '@/databases/entities/folder';
import type { Project } from '@/databases/entities/project';
import type { TagEntity } from '@/databases/entities/tag-entity';
import { FolderRepository } from '@/databases/repositories/folder.repository';
import { randomName } from '@test-integration/random';

export const createFolder = async (
	project: Project,
	options: {
		name?: string;
		parentFolder?: Folder;
		tags?: TagEntity[];
		updatedAt?: Date;
		createdAt?: Date;
	} = {},
) => {
	const folderRepository = Container.get(FolderRepository);
	const folder = await folderRepository.save(
		folderRepository.create({
			name: options.name ?? randomName(),
			homeProject: project,
			parentFolder: options.parentFolder ?? null,
			tags: options.tags ?? [],
			updatedAt: options.updatedAt ?? new Date(),
			createdAt: options.updatedAt ?? new Date(),
		}),
	);

	return folder;
};
