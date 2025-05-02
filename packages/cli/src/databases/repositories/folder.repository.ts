import type { FolderWithWorkflowAndSubFolderCount } from '@n8n/db';
import { Folder, FolderTagMapping, TagEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import type { EntityManager, SelectQueryBuilder } from '@n8n/typeorm';
import { DataSource, Repository } from '@n8n/typeorm';
import { PROJECT_ROOT } from 'n8n-workflow';

import type { ListQuery } from '@/requests';

@Service()
export class FolderRepository extends Repository<FolderWithWorkflowAndSubFolderCount> {
	constructor(dataSource: DataSource) {
		super(Folder, dataSource.manager);
	}

	async getManyAndCount(
		options: ListQuery.Options = {},
	): Promise<[FolderWithWorkflowAndSubFolderCount[], number]> {
		const query = this.getManyQuery(options);
		return await query.getManyAndCount();
	}

	async getMany(options: ListQuery.Options = {}): Promise<FolderWithWorkflowAndSubFolderCount[]> {
		const query = this.getManyQuery(options);
		return await query.getMany();
	}

	getManyQuery(
		options: ListQuery.Options = {},
	): SelectQueryBuilder<FolderWithWorkflowAndSubFolderCount> {
		const query = this.createQueryBuilder('folder');

		this.applySelections(query, options.select);
		this.applyFilters(query, options.filter);
		this.applySorting(query, options.sortBy);
		this.applyPagination(query, options);

		return query;
	}

	private applySelections(
		query: SelectQueryBuilder<FolderWithWorkflowAndSubFolderCount>,
		select?: Record<string, boolean>,
	): void {
		if (select) {
			this.applyCustomSelect(query, select);
		} else {
			this.applyDefaultSelect(query);
		}
	}

	private applyDefaultSelect(query: SelectQueryBuilder<FolderWithWorkflowAndSubFolderCount>): void {
		query
			.leftJoinAndSelect('folder.homeProject', 'homeProject')
			.leftJoinAndSelect('folder.parentFolder', 'parentFolder')
			.leftJoinAndSelect('folder.tags', 'tags')
			.loadRelationCountAndMap('folder.workflowCount', 'folder.workflows')
			.loadRelationCountAndMap('folder.subFolderCount', 'folder.subFolders')
			.select([
				'folder',
				...this.getProjectFields('homeProject'),
				...this.getTagFields(),
				...this.getParentFolderFields('parentFolder'),
			]);
	}

	private applyCustomSelect(
		query: SelectQueryBuilder<FolderWithWorkflowAndSubFolderCount>,
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
		query: SelectQueryBuilder<FolderWithWorkflowAndSubFolderCount>,
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

		if (select?.workflowCount) {
			query.loadRelationCountAndMap('folder.workflowCount', 'folder.workflows');
		}

		if (select?.subFolderCount) {
			if (!query.hasRelation(Folder, 'folder.parentFolder')) {
				query.loadRelationCountAndMap('folder.subFolderCount', 'folder.subFolders');
			}
		}
	}

	private getProjectFields(alias: string): string[] {
		return [`${alias}.id`, `${alias}.name`, `${alias}.type`, `${alias}.icon`];
	}

	private getTagFields(): string[] {
		return ['tags.id', 'tags.name'];
	}

	private getParentFolderFields(alias: string): string[] {
		return [`${alias}.id`, `${alias}.name`, `${alias}.parentFolderId`];
	}

	private applyFilters(
		query: SelectQueryBuilder<FolderWithWorkflowAndSubFolderCount>,
		filter?: ListQuery.Options['filter'],
	): void {
		if (!filter) return;

		this.applyBasicFilters(query, filter);
		this.applyTagsFilter(query, Array.isArray(filter?.tags) ? filter.tags : undefined);

		if (
			filter?.excludeFolderIdAndDescendants &&
			typeof filter.excludeFolderIdAndDescendants === 'string'
		) {
			this.applyExcludeFolderFilter(query, filter.excludeFolderIdAndDescendants);
		}
	}

	private applyBasicFilters(
		query: SelectQueryBuilder<FolderWithWorkflowAndSubFolderCount>,
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

		if (filter?.parentFolderId === PROJECT_ROOT) {
			query.andWhere('folder.parentFolderId IS NULL');
		} else if (filter?.parentFolderId) {
			query.andWhere('folder.parentFolderId = :parentFolderId', {
				parentFolderId: filter.parentFolderId,
			});
		}
	}

	private applyTagsFilter(
		query: SelectQueryBuilder<FolderWithWorkflowAndSubFolderCount>,
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
		query: SelectQueryBuilder<FolderWithWorkflowAndSubFolderCount>,
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

	private applySorting(
		query: SelectQueryBuilder<FolderWithWorkflowAndSubFolderCount>,
		sortBy?: string,
	): void {
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
		query: SelectQueryBuilder<FolderWithWorkflowAndSubFolderCount>,
		field: string,
		direction: 'DESC' | 'ASC',
	): void {
		if (field === 'name') {
			query
				.addSelect('LOWER(folder.name)', 'folder_name_lower')
				.orderBy('folder_name_lower', direction);
		} else if (['createdAt', 'updatedAt'].includes(field)) {
			query.orderBy(`folder.${field}`, direction);
		}
	}

	private applyPagination(
		query: SelectQueryBuilder<FolderWithWorkflowAndSubFolderCount>,
		options: ListQuery.Options,
	): void {
		if (options?.take) {
			query.skip(options.skip ?? 0).take(options.take);
		}
	}

	async findOneOrFailFolderInProject(
		folderId: string,
		projectId: string,
		em?: EntityManager,
	): Promise<Folder> {
		const manager = em ?? this.manager;
		return await manager.findOneOrFail(Folder, {
			where: {
				id: folderId,
				homeProject: {
					id: projectId,
				},
			},
		});
	}

	async moveAllToFolder(
		fromFolderId: string,
		toFolderId: string,
		tx: EntityManager,
	): Promise<void> {
		await tx.update(
			Folder,
			{ parentFolder: { id: fromFolderId } },
			{
				parentFolder:
					toFolderId === PROJECT_ROOT
						? null
						: {
								id: toFolderId,
							},
			},
		);
	}

	async transferAllFoldersToProject(
		fromProjectId: string,
		toProjectId: string,
		tx?: EntityManager,
	) {
		const manager = tx ?? this.manager;
		return await manager.update(
			Folder,
			{
				homeProject: { id: fromProjectId },
			},
			{
				homeProject: { id: toProjectId },
			},
		);
	}

	private applyExcludeFolderFilter(
		query: SelectQueryBuilder<FolderWithWorkflowAndSubFolderCount>,
		excludeFolderIdAndDescendants: string,
	): void {
		// Exclude the specific folder by ID
		query.andWhere('folder.id != :excludeFolderIdAndDescendants', {
			excludeFolderIdAndDescendants,
		});

		// Use a WITH RECURSIVE CTE to find all child folders of the excluded folder
		const baseQuery = this.createQueryBuilder('f')
			.select('f.id', 'id')
			.addSelect('f.parentFolderId', 'parentFolderId')
			.where('f.id = :excludeFolderIdAndDescendants', { excludeFolderIdAndDescendants });

		const recursiveQuery = this.createQueryBuilder('child')
			.select('child.id', 'id')
			.addSelect('child.parentFolderId', 'parentFolderId')
			.innerJoin('folder_tree', 'parent', 'child.parentFolderId = parent.id');

		const subQuery = this.createQueryBuilder()
			.select('tree.id')
			.addCommonTableExpression(
				`${baseQuery.getQuery()} UNION ALL ${recursiveQuery.getQuery()}`,
				'folder_tree',
				{ recursive: true },
			)
			.from('folder_tree', 'tree')
			.setParameters({ excludeFolderIdAndDescendants });

		// Exclude all children of the specified folder
		query.andWhere(`folder.id NOT IN (${subQuery.getQuery()})`);
	}

	/**
	 * Get all folder and subfolder IDs in a hierarchy (including direct children and all descendants)
	 * @param parentFolderId The ID of the parent folder
	 * @param projectId Optional project ID to restrict search to a project
	 * @returns Array of unique folder IDs including direct children and all descendants
	 */
	async getAllFolderIdsInHierarchy(parentFolderId: string, projectId?: string): Promise<string[]> {
		// Start with direct children as the base case
		const baseQuery = this.createQueryBuilder('f')
			.select('f.id', 'id')
			.where('f.parentFolderId = :parentFolderId', { parentFolderId });

		// Add project filter if provided
		if (projectId) {
			baseQuery.andWhere('f.projectId = :projectId', { projectId });
		}

		// Create the recursive query for descendants
		const recursiveQuery = this.createQueryBuilder('child')
			.select('child.id', 'id')
			.innerJoin('folder_tree', 'parent', 'child.parentFolderId = parent.id');

		// Add project filter if provided
		if (projectId) {
			recursiveQuery.andWhere('child.projectId = :projectId', { projectId });
		}

		// Create the main query with CTE
		const query = this.createQueryBuilder()
			.addCommonTableExpression(
				`${baseQuery.getQuery()} UNION ALL ${recursiveQuery.getQuery()}`,
				'folder_tree',
				{ recursive: true },
			)
			.select('DISTINCT tree.id', 'id')
			.from('folder_tree', 'tree')
			.setParameters(baseQuery.getParameters());

		// Execute the query and extract IDs
		const result = await query.getRawMany<{ id: string }>();
		return result.map((row) => row.id);
	}
}
