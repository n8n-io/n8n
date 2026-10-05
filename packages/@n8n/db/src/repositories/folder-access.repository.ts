import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';

import { Folder, Role } from '../entities';
import type { OperationContext } from '../services/transaction';
import { TransactionRunner } from '../services/transaction';
import { chunkIds } from '../utils/chunk-ids';
import { BaseRepository } from './base-repository';

@Service()
export class FolderAccessRepository extends BaseRepository<Folder> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(Folder, dataSource.manager, transactionRunner);
	}

	async findRolesForAccessCheck(ctx: OperationContext = {}): Promise<Role[]> {
		return await this.managerFor(ctx).find(Role, { relations: ['scopes'] });
	}

	async findExistingFolderIds(
		folderIds: string[],
		ctx: OperationContext = {},
	): Promise<Set<string>> {
		const ids = new Set<string>();
		const manager = this.managerFor(ctx);
		for (const chunk of chunkIds(folderIds)) {
			const rows = await manager.find(Folder, {
				select: { id: true },
				where: { id: In(chunk) },
			});
			for (const row of rows) ids.add(row.id);
		}
		return ids;
	}

	async findDescendantIds(
		parentFolderIds: string[],
		ctx: OperationContext = {},
	): Promise<string[]> {
		const ids = new Set<string>();
		const manager = this.managerFor(ctx);
		for (const chunk of chunkIds(parentFolderIds)) {
			const baseQuery = manager
				.createQueryBuilder(Folder, 'f')
				.select('f.id', 'id')
				.where('f.parentFolderId IN (:...parentFolderIds)', { parentFolderIds: chunk });
			const recursiveQuery = manager
				.createQueryBuilder(Folder, 'child')
				.select('child.id', 'id')
				.innerJoin('folder_tree', 'parent', 'child.parentFolderId = parent.id');
			const query = manager
				.createQueryBuilder()
				.addCommonTableExpression(
					`${baseQuery.getQuery()} UNION ALL ${recursiveQuery.getQuery()}`,
					'folder_tree',
					{ recursive: true },
				)
				.select('DISTINCT tree.id', 'id')
				.from('folder_tree', 'tree')
				.setParameters(baseQuery.getParameters());
			for (const row of await query.getRawMany<{ id: string }>()) ids.add(row.id);
		}
		return [...ids];
	}

	async findFoldersByIdsForUser(
		folderIds: string[],
		access: { userId: string; projectRoles: string[] } | null,
		ctx: OperationContext = {},
	): Promise<Folder[]> {
		const folders = new Map<string, Folder>();
		const manager = this.managerFor(ctx);
		for (const chunk of chunkIds(folderIds)) {
			const rows = await manager.find(Folder, {
				where: {
					id: In(chunk),
					...(access
						? {
								homeProject: {
									projectRelations: {
										role: In(access.projectRoles),
										userId: access.userId,
									},
								},
							}
						: {}),
				},
			});
			for (const folder of rows) folders.set(folder.id, folder);
		}
		return [...folders.values()];
	}

	async findFolderIdsInProject(projectId: string, ctx: OperationContext = {}): Promise<string[]> {
		const rows = await this.managerFor(ctx).find(Folder, {
			select: { id: true },
			where: { homeProject: { id: projectId } },
		});
		return rows.map((row) => row.id);
	}
}
