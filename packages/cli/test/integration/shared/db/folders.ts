import { randomName } from '@n8n/backend-test-utils';
import type { Folder, Project, TagEntity } from '@n8n/db';
import { FolderRepository } from '@n8n/db';
import { Container } from '@n8n/di';

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
