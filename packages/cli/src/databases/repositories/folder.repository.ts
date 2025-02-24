import { Service } from '@n8n/di';
import type { SelectQueryBuilder } from '@n8n/typeorm';
import { DataSource, Repository } from '@n8n/typeorm';

import type { ListQuery } from '@/requests';

import type { FolderWithWorkflowsCount } from '../entities/folder';
import { Folder } from '../entities/folder';
import { FolderTagMapping } from '../entities/folder-tag-mapping';
import { TagEntity } from '../entities/tag-entity';

@Service()
export class FolderRepository extends Repository<FolderWithWorkflowsCount> {
	constructor(dataSource: DataSource) {
		super(Folder, dataSource.manager);
	}

	async getManyAndCount(
		options: ListQuery.Options = {},
	): Promise<[FolderWithWorkflowsCount[], number]> {
		const query = this.getManyQuery(options);
		return await query.getManyAndCount();
	}

	async getMany(options: ListQuery.Options = {}): Promise<FolderWithWorkflowsCount[]> {
		const query = this.getManyQuery(options);
		return await query.getMany();
	}

	getManyQuery(options: ListQuery.Options = {}): SelectQueryBuilder<FolderWithWorkflowsCount> {
		const query = this.createQueryBuilder('folder');

		this.applySelections(query, options.select);
		this.applyFilters(query, options.filter);
		this.applySorting(query, options.sortBy);
		this.applyPagination(query, options);

		return query;
	}

	private applySelections(
		query: SelectQueryBuilder<FolderWithWorkflowsCount>,
		select?: Record<string, boolean>,
	): void {
		if (select) {
			this.applyCustomSelect(query, select);
		} else {
			this.applyDefaultSelect(query);
		}
	}

	private applyDefaultSelect(query: SelectQueryBuilder<FolderWithWorkflowsCount>): void {
		query
			.leftJoinAndSelect('folder.homeProject', 'homeProject')
			.leftJoinAndSelect('folder.parentFolder', 'parentFolder')
			.leftJoinAndSelect('folder.tags', 'tags')
			.loadRelationCountAndMap('folder.workflowsCount', 'folder.workflows')
			.select([
				'folder',
				...this.getProjectFields('homeProject'),
				...this.getTagFields(),
				...this.getParentFolderFields('parentFolder'),
			]);
	}

	private applyCustomSelect(
		query: SelectQueryBuilder<FolderWithWorkflowsCount>,
		select?: Record<string, boolean>,
	): void {
		const selections = ['folder.id'];

		this.addBasicFields(selections, select);
		this.addRelationFields(query, selections, select);

		query.select(selections);
	}

	private addBasicFields(selections: string[], select?: Record<string, boolean>): void {
		if (select?.name) selections.push('folder.name');
		if (select?.createdAt) selections.push('folder.createdAt');
		if (select?.updatedAt) selections.push('folder.updatedAt');
	}

	private addRelationFields(
		query: SelectQueryBuilder<FolderWithWorkflowsCount>,
		selections: string[],
		select?: Record<string, boolean>,
	): void {
		if (select?.project) {
			query.leftJoin('folder.homeProject', 'homeProject');
			selections.push(...this.getProjectFields('homeProject'));
		}

		if (select?.tags) {
			query.leftJoin('folder.tags', 'tags').addOrderBy('tags.createdAt', 'ASC');
			selections.push(...this.getTagFields());
		}

		if (select?.parentFolder) {
			query.leftJoin('folder.parentFolder', 'parentFolder');
			selections.push(...this.getParentFolderFields('parentFolder'));
		}

		if (select?.workflowsCount) {
			query.loadRelationCountAndMap('folder.workflowsCount', 'folder.workflows');
		}
	}

	private getProjectFields(alias: string): string[] {
		return [`${alias}.id`, `${alias}.name`, `${alias}.type`, `${alias}.icon`];
	}

	private getTagFields(): string[] {
		return ['tags.id', 'tags.name'];
	}

	private getParentFolderFields(alias: string): string[] {
		return [`${alias}.id`, `${alias}.name`];
	}

	private applyFilters(
		query: SelectQueryBuilder<FolderWithWorkflowsCount>,
		filter?: ListQuery.Options['filter'],
	): void {
		if (!filter) return;

		this.applyBasicFilters(query, filter);
		this.applyTagsFilter(query, Array.isArray(filter?.tags) ? filter.tags : undefined);
	}

	private applyBasicFilters(
		query: SelectQueryBuilder<FolderWithWorkflowsCount>,
		filter: ListQuery.Options['filter'],
	): void {
		if (filter?.folderIds && Array.isArray(filter.folderIds)) {
			query.andWhere('folder.id IN (:...folderIds)', {
				/*
				 * If folderIds is empty, add a dummy value to prevent an error
				 * when using the IN operator with an empty array.
				 */
				folderIds: !filter?.folderIds.length ? [''] : filter?.folderIds,
			});
		}

		if (filter?.projectId) {
			query.andWhere('folder.projectId = :projectId', { projectId: filter.projectId });
		}

		if (filter?.name && typeof filter.name === 'string') {
			query.andWhere('LOWER(folder.name) LIKE LOWER(:name)', {
				name: `%${filter.name}%`,
			});
		}

		if (filter?.parentFolderId === '0') {
			query.andWhere('folder.parentFolderId IS NULL');
		} else if (filter?.parentFolderId) {
			query.andWhere('folder.parentFolderId = :parentFolderId', {
				parentFolderId: filter.parentFolderId,
			});
		}
	}

	private applyTagsFilter(
		query: SelectQueryBuilder<FolderWithWorkflowsCount>,
		tags?: string[],
	): void {
		if (!Array.isArray(tags) || tags.length === 0) return;

		const subQuery = this.createTagsSubQuery(query, tags);

		query.andWhere(`folder.id IN (${subQuery.getQuery()})`).setParameters({
			tagNames: tags,
			tagCount: tags.length,
		});
	}

	private createTagsSubQuery(
		query: SelectQueryBuilder<FolderWithWorkflowsCount>,
		tags: string[],
	): SelectQueryBuilder<FolderTagMapping> {
		return query
			.subQuery()
			.select('ft.folderId')
			.from(FolderTagMapping, 'ft')
			.innerJoin(TagEntity, 'filter_tags', 'filter_tags.id = ft.tagId')
			.where('filter_tags.name IN (:...tagNames)', { tagNames: tags })
			.groupBy('ft.folderId')
			.having('COUNT(DISTINCT filter_tags.name) = :tagCount', {
				tagCount: tags.length,
			});
	}

	private applySorting(query: SelectQueryBuilder<FolderWithWorkflowsCount>, sortBy?: string): void {
		if (!sortBy) {
			query.orderBy('folder.updatedAt', 'DESC');
			return;
		}

		const [field, order] = this.parseSortingParams(sortBy);
		this.applySortingByField(query, field, order);
	}

	private parseSortingParams(sortBy: string): [string, 'DESC' | 'ASC'] {
		const [field, order] = sortBy.split(':');
		return [field, order?.toLowerCase() === 'desc' ? 'DESC' : 'ASC'];
	}

	private applySortingByField(
		query: SelectQueryBuilder<FolderWithWorkflowsCount>,
		field: string,
		direction: 'DESC' | 'ASC',
	): void {
		if (field === 'name') {
			query.orderBy('LOWER(folder.name)', direction);
		} else if (['createdAt', 'updatedAt'].includes(field)) {
			query.orderBy(`folder.${field}`, direction);
		}
	}

	private applyPagination(
		query: SelectQueryBuilder<FolderWithWorkflowsCount>,
		options: ListQuery.Options,
	): void {
		if (options?.take) {
			query.skip(options.skip ?? 0).take(options.take);
		}
	}
}
