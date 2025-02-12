import { Service } from '@n8n/di';
import type { SelectQueryBuilder } from '@n8n/typeorm';
import { DataSource, Repository } from '@n8n/typeorm';

import type { ListQuery } from '@/requests';

import { Folder } from '../entities/folder';

@Service()
export class FolderRepository extends Repository<Folder> {
	constructor(dataSource: DataSource) {
		super(Folder, dataSource.manager);
	}

	private applySelections(query: SelectQueryBuilder<Folder>, select?: Record<string, true>): void {
		if (!select) {
			query
				.leftJoinAndSelect('folder.project', 'project')
				.leftJoinAndSelect('folder.parentFolder', 'parentFolder')
				.leftJoinAndSelect('folder.tags', 'tags')
				.select([
					'folder',
					'project.id',
					'project.name',
					'project.type',
					'project.icon',
					'tags.id',
					'tags.name',
					'parentFolder',
					'parentFolder.id',
					'parentFolder.name',
				]);
			return;
		}

		const selections = ['folder.id'];

		if (select.name) selections.push('folder.name');
		if (select.createdAt) selections.push('folder.createdAt');
		if (select.updatedAt) selections.push('folder.updatedAt');

		if (select.project) {
			query.leftJoin('folder.project', 'project');
			selections.push('project.id', 'project.name', 'project.type', 'project.icon');
		}

		if (select.tags) {
			query.leftJoin('folder.tags', 'tags');
			selections.push('tags.id', 'tags.name');
		}

		if (select.parentFolder) {
			query.leftJoin('folder.parentFolder', 'parentFolder');
			selections.push('parentFolder.id', 'parentFolder.name');
		}

		query.select(selections);
	}

	private applyFilters(query: SelectQueryBuilder<Folder>, filter?: Record<string, unknown>): void {
		if (!filter) return;

		const { projectId, name, parentFolderId, tags } = filter;

		if (projectId) {
			query.andWhere('folder.projectId = :projectId', { projectId });
		}

		if (name && typeof name === 'string') {
			query.andWhere('LOWER(folder.name) LIKE LOWER(:name)', { name: `%${name}%` });
		}

		if (parentFolderId) {
			query.andWhere('folder.parentFolderId = :parentFolderId', { parentFolderId });
		}

		if (tags) {
			query
				.innerJoin('folder.tags', 'filterTags')
				.andWhere('filterTags.name IN (:...tags)', { tags });
		}
	}

	private applySorting(query: SelectQueryBuilder<Folder>, sortBy?: string): void {
		if (!sortBy) {
			query.orderBy('folder.updatedAt', 'DESC');
			return;
		}

		const [field, order] = sortBy.split(':');
		const direction = order?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

		if (field === 'name') {
			query.orderBy('LOWER(folder.name)', direction);
		} else if (['createdAt', 'updatedAt'].includes(field)) {
			query.orderBy(`folder.${field}`, direction);
		}
	}

	private applyPagination(query: SelectQueryBuilder<Folder>, skip?: number, take?: number): void {
		if (skip) query.skip(skip);
		if (take) query.take(take);
	}

	async getMany(options: ListQuery.Options = {}): Promise<[Folder[], number]> {
		const query = this.createQueryBuilder('folder');

		this.applySelections(query, options.select);
		this.applyFilters(query, options.filter);
		this.applySorting(query, options.sortBy);
		this.applyPagination(query, options.skip, options.take);

		return await query.getManyAndCount();
	}
}
