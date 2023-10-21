import { FolderRepository } from '@/databases/repositories';
import { Service } from 'typedi';
import { validateEntity } from '@/GenericHelpers';
import type { IFolderWithCountDb } from '@/Interfaces';
import type { FolderEntity } from '@/databases/entities/FolderEntity';
import type { FindManyOptions, FindOneOptions } from 'typeorm';
import type { UpsertOptions } from 'typeorm/repository/UpsertOptions';
import { ExternalHooks } from '@/ExternalHooks';

type GetAllResult<T> = T extends { withUsageCount: true } ? IFolderWithCountDb[] : FolderEntity[];

@Service()
export class FolderService {
	constructor(
		private externalHooks: ExternalHooks,
		private folderRepository: FolderRepository,
	) {}

	toEntity(attrs: { name: string; id?: string }) {
		attrs.name = attrs.name.trim();

		return this.folderRepository.create(attrs);
	}

	async save(folder: FolderEntity, actionKind: 'create' | 'update') {
		await validateEntity(folder);

		const action = actionKind[0].toUpperCase() + actionKind.slice(1);

		await this.externalHooks.run(`folder.before${action}`, [folder]);

		const savedfolder = this.folderRepository.save(folder);

		await this.externalHooks.run(`folder.after${action}`, [folder]);

		return savedfolder;
	}

	async delete(id: string) {
		await this.externalHooks.run('folder.beforeDelete', [id]);

		const deleteResult = this.folderRepository.delete(id);

		// TODO: clean folderid in worfklows

		await this.externalHooks.run('folder.afterDelete', [id]);

		return deleteResult;
	}

	async findOne(options: FindOneOptions<FolderEntity>) {
		return this.folderRepository.findOne(options);
	}

	async findMany(options: FindManyOptions<FolderEntity>) {
		return this.folderRepository.find(options);
	}

	async upsert(folder: FolderEntity, options: UpsertOptions<FolderEntity>) {
		return this.folderRepository.upsert(folder, options);
	}

	async getAll<T extends { withUsageCount: boolean }>(options?: T): Promise<GetAllResult<T>> {
		if (!options?.withUsageCount) {
			const allFolders = await this.folderRepository.find({
				select: ['id', 'name', 'createdAt', 'updatedAt'],
				relations: ['workflows'],
			});

			return allFolders.map(({ workflows, ...rest }) => {
				return {
					...rest,
					usageCount: workflows.length,
				} as IFolderWithCountDb;
			}) as GetAllResult<T>;
		}

		return this.folderRepository.find({
			select: ['id', 'name', 'createdAt', 'updatedAt'],
		}) as Promise<GetAllResult<T>>;
	}

	/**
	 * Sort folders based on the order of the folder IDs in the request.
	 */
	sortByRequestOrder(folders: FolderEntity[], { requestOrder }: { requestOrder: string[] }) {
		const folderMap = folders.reduce<Record<string, FolderEntity>>((acc, folder) => {
			acc[folder.id] = folder;
			return acc;
		}, {});

		return requestOrder.map((folderId) => folderMap[folderId]);
	}
}
