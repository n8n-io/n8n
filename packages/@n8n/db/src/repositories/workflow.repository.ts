import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, Repository, In, Like } from '@n8n/typeorm';
import type {
	SelectQueryBuilder,
	UpdateResult,
	FindOptionsWhere,
	FindOptionsSelect,
	FindManyOptions,
	FindOptionsRelations,
	EntityManager,
} from '@n8n/typeorm';
import { PROJECT_ROOT } from 'n8n-workflow';

import { FolderRepository } from './folder.repository';
import { WebhookEntity, TagEntity, WorkflowEntity, WorkflowTagMapping } from '../entities';
import type {
	ListQueryDb,
	FolderWithWorkflowAndSubFolderCount,
	ListQuery,
} from '../entities/types-db';
import { buildWorkflowsByNodesQuery } from '../utils/build-workflows-by-nodes-query';
import { isStringArray } from '../utils/is-string-array';
import { TimedQuery } from '../utils/timed-query';

type ResourceType = 'folder' | 'workflow';

type WorkflowFolderUnionRow = {
	id: string;
	name: string;
	name_lower?: string;
	resource: ResourceType;
	createdAt: Date;
	updatedAt: Date;
};

export type WorkflowFolderUnionFull = (
	| ListQueryDb.Workflow.Plain
	| ListQueryDb.Workflow.WithSharing
	| FolderWithWorkflowAndSubFolderCount
) & {
	resource: ResourceType;
};

@Service()
export class WorkflowRepository extends Repository<WorkflowEntity> {
	constructor(
		dataSource: DataSource,
		private readonly globalConfig: GlobalConfig,
		private readonly folderRepository: FolderRepository,
	) {
		super(WorkflowEntity, dataSource.manager);
	}

	async get(
		where: FindOptionsWhere<WorkflowEntity>,
		options?: { relations: string[] | FindOptionsRelations<WorkflowEntity> },
	) {
		return await this.findOne({
			where,
			relations: options?.relations,
		});
	}

	async getAllActiveIds() {
		const result = await this.find({
			select: { id: true },
			where: { active: true },
			relations: { shared: { project: { projectRelations: true } } },
		});

		return result.map(({ id }) => id);
	}

	async getActiveIds({ maxResults }: { maxResults?: number } = {}) {
		const activeWorkflows = await this.find({
			select: ['id'],
			where: { active: true },
			// 'take' and 'order' are only needed when maxResults is provided:
			...(maxResults ? { take: maxResults, order: { createdAt: 'ASC' } } : {}),
		});
		return activeWorkflows.map((workflow) => workflow.id);
	}

	async getActiveCount() {
		return await this.count({
			where: { active: true },
		});
	}

	async findById(workflowId: string) {
		return await this.findOne({
			where: { id: workflowId },
			relations: { shared: { project: { projectRelations: true } } },
		});
	}

	async findByIds(workflowIds: string[], { fields }: { fields?: string[] } = {}) {
		const options: FindManyOptions<WorkflowEntity> = {
			where: { id: In(workflowIds) },
		};

		if (fields?.length) options.select = fields as FindOptionsSelect<WorkflowEntity>;

		return await this.find(options);
	}

	async getActiveTriggerCount() {
		const totalTriggerCount = await this.sum('triggerCount', {
			active: true,
		});
		return totalTriggerCount ?? 0;
	}

	async updateWorkflowTriggerCount(id: string, triggerCount: number): Promise<UpdateResult> {
		const qb = this.createQueryBuilder('workflow');
		const dbType = this.globalConfig.database.type;
		return await qb
			.update()
			.set({
				triggerCount,
				updatedAt: () => {
					if (['mysqldb', 'mariadb'].includes(dbType)) {
						return 'updatedAt';
					}
					return '"updatedAt"';
				},
			})
			.where('id = :id', { id })
			.execute();
	}

	async getWorkflowsWithEvaluationCount() {
		// Count workflows having test runs
		const totalWorkflowCount = await this.createQueryBuilder('workflow')
			.innerJoin('workflow.testRuns', 'testrun')
			.distinct(true)
			.getCount();

		return totalWorkflowCount ?? 0;
	}

	private buildBaseUnionQuery(workflowIds: string[], options: ListQuery.Options = {}) {
		const subQueryParameters: ListQuery.Options = {
			select: {
				createdAt: true,
				updatedAt: true,
				id: true,
				name: true,
			},
			filter: options.filter,
		};

		const columnNames = [...Object.keys(subQueryParameters.select ?? {}), 'resource'];

		const [sortByColumn, sortByDirection] = this.parseSortingParams(
			options.sortBy ?? 'updatedAt:asc',
		);

		const foldersQuery = this.folderRepository
			.getManyQuery(subQueryParameters)
			.addSelect("'folder'", 'resource');

		const workflowsQuery = this.getManyQuery(workflowIds, subQueryParameters).addSelect(
			"'workflow'",
			'resource',
		);

		const qb = this.manager.createQueryBuilder();

		return {
			baseQuery: qb
				.createQueryBuilder()
				.addCommonTableExpression(foldersQuery, 'FOLDERS_QUERY', { columnNames })
				.addCommonTableExpression(workflowsQuery, 'WORKFLOWS_QUERY', { columnNames })
				.addCommonTableExpression(
					`SELECT * FROM ${qb.escape('FOLDERS_QUERY')} UNION ALL SELECT * FROM ${qb.escape('WORKFLOWS_QUERY')}`,
					'RESULT_QUERY',
				),
			sortByColumn,
			sortByDirection,
		};
	}

	async getWorkflowsAndFoldersUnion(workflowIds: string[], options: ListQuery.Options = {}) {
		const { baseQuery, sortByColumn, sortByDirection } = this.buildBaseUnionQuery(
			workflowIds,
			options,
		);

		const query = this.buildUnionQuery(baseQuery, {
			sortByColumn,
			sortByDirection,
			pagination: {
				take: options.take,
				skip: options.skip ?? 0,
			},
		});

		const workflowsAndFolders = await query.getRawMany<WorkflowFolderUnionRow>();
		return this.removeNameLowerFromResults(workflowsAndFolders);
	}

	private buildUnionQuery(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		baseQuery: SelectQueryBuilder<any>,
		options: {
			sortByColumn: string;
			sortByDirection: 'ASC' | 'DESC';
			pagination: {
				take?: number;
				skip: number;
			};
		},
	) {
		const query = baseQuery
			.select(`${baseQuery.escape('RESULT')}.*`)
			.from('RESULT_QUERY', 'RESULT');

		this.applySortingToUnionQuery(query, baseQuery, options);
		this.applyPaginationToUnionQuery(query, options.pagination);

		return query;
	}

	private applySortingToUnionQuery(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		query: SelectQueryBuilder<any>,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		baseQuery: SelectQueryBuilder<any>,
		options: { sortByColumn: string; sortByDirection: 'ASC' | 'DESC' },
	) {
		const { sortByColumn, sortByDirection } = options;

		const resultTableEscaped = baseQuery.escape('RESULT');
		const nameColumnEscaped = baseQuery.escape('name');
		const resourceColumnEscaped = baseQuery.escape('resource');
		const sortByColumnEscaped = baseQuery.escape(sortByColumn);

		// Guarantee folders show up first
		query.orderBy(`${resultTableEscaped}.${resourceColumnEscaped}`, 'ASC');

		if (sortByColumn === 'name') {
			query
				.addSelect(`LOWER(${resultTableEscaped}.${nameColumnEscaped})`, 'name_lower')
				.addOrderBy('name_lower', sortByDirection);
		} else {
			query.addOrderBy(`${resultTableEscaped}.${sortByColumnEscaped}`, sortByDirection);
		}
	}

	private applyPaginationToUnionQuery(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		query: SelectQueryBuilder<any>,
		pagination: { take?: number; skip: number },
	) {
		if (pagination.take) {
			query.take(pagination.take);
		}
		query.skip(pagination.skip);
	}

	private removeNameLowerFromResults(results: WorkflowFolderUnionRow[]) {
		return results.map(({ name_lower, ...rest }) => rest);
	}

	async getWorkflowsAndFoldersCount(workflowIds: string[], options: ListQuery.Options = {}) {
		const { skip, take, ...baseQueryParameters } = options;

		const { baseQuery } = this.buildBaseUnionQuery(workflowIds, baseQueryParameters);

		const response = await baseQuery
			.select(`COUNT(DISTINCT ${baseQuery.escape('RESULT')}.${baseQuery.escape('id')})`, 'count')
			.from('RESULT_QUERY', 'RESULT')
			.select('COUNT(*)', 'count')
			.getRawOne<{ count: number | string }>();

		return Number(response?.count) || 0;
	}

	async getWorkflowsAndFoldersWithCount(workflowIds: string[], options: ListQuery.Options = {}) {
		if (
			options.filter?.parentFolderId &&
			typeof options.filter?.parentFolderId === 'string' &&
			options.filter.parentFolderId !== PROJECT_ROOT &&
			typeof options.filter?.projectId === 'string' &&
			options.filter.name
		) {
			const folderIds = await this.folderRepository.getAllFolderIdsInHierarchy(
				options.filter.parentFolderId,
				options.filter.projectId,
			);

			options.filter.parentFolderIds = [options.filter.parentFolderId, ...folderIds];
			options.filter.folderIds = folderIds;
			delete options.filter.parentFolderId;
		}

		const [workflowsAndFolders, count] = await Promise.all([
			this.getWorkflowsAndFoldersUnion(workflowIds, options),
			this.getWorkflowsAndFoldersCount(workflowIds, options),
		]);

		const isArchived =
			typeof options.filter?.isArchived === 'boolean' ? options.filter.isArchived : undefined;

		const { workflows, folders } = await this.fetchExtraData(workflowsAndFolders, isArchived);

		const enrichedWorkflowsAndFolders = this.enrichDataWithExtras(workflowsAndFolders, {
			workflows,
			folders,
		});

		return [enrichedWorkflowsAndFolders, count] as const;
	}

	async getAllWorkflowIdsInHierarchy(folderId: string, projectId: string): Promise<string[]> {
		const subFolderIds = await this.folderRepository.getAllFolderIdsInHierarchy(
			folderId,
			projectId,
		);

		const query = this.createQueryBuilder('workflow');

		this.applySelect(query, { id: true });
		this.applyParentFolderFilter(query, { parentFolderIds: [folderId, ...subFolderIds] });

		const workflowIds = (await query.getMany()).map((workflow) => workflow.id);

		return workflowIds;
	}

	private getFolderIds(workflowsAndFolders: WorkflowFolderUnionRow[]) {
		return workflowsAndFolders.filter((item) => item.resource === 'folder').map((item) => item.id);
	}

	private getWorkflowsIds(workflowsAndFolders: WorkflowFolderUnionRow[]) {
		return workflowsAndFolders
			.filter((item) => item.resource === 'workflow')
			.map((item) => item.id);
	}

	private async fetchExtraData(
		workflowsAndFolders: WorkflowFolderUnionRow[],
		isArchived?: boolean,
	) {
		const workflowIds = this.getWorkflowsIds(workflowsAndFolders);
		const folderIds = this.getFolderIds(workflowsAndFolders);

		const [workflows, folders] = await Promise.all([
			this.getMany(workflowIds),
			this.folderRepository.getMany({ filter: { folderIds, isArchived } }),
		]);

		return { workflows, folders };
	}

	private enrichDataWithExtras(
		baseData: WorkflowFolderUnionRow[],
		extraData: {
			workflows: ListQueryDb.Workflow.WithSharing[] | ListQueryDb.Workflow.Plain[];
			folders: FolderWithWorkflowAndSubFolderCount[];
		},
	): WorkflowFolderUnionFull[] {
		const workflowsMap = new Map(extraData.workflows.map((workflow) => [workflow.id, workflow]));
		const foldersMap = new Map(extraData.folders.map((folder) => [folder.id, folder]));

		return baseData.map((item) => {
			const lookupMap = item.resource === 'folder' ? foldersMap : workflowsMap;
			const extraItem = lookupMap.get(item.id);

			return extraItem ? { ...item, ...extraItem } : item;
		});
	}

	@TimedQuery()
	async getMany(workflowIds: string[], options: ListQuery.Options = {}) {
		if (workflowIds.length === 0) {
			return [];
		}

		const query = this.getManyQuery(workflowIds, options);

		const workflows = (await query.getMany()) as
			| ListQueryDb.Workflow.Plain[]
			| ListQueryDb.Workflow.WithSharing[];

		return workflows;
	}

	async getManyAndCount(sharedWorkflowIds: string[], options: ListQuery.Options = {}) {
		if (sharedWorkflowIds.length === 0) {
			return { workflows: [], count: 0 };
		}

		const query = this.getManyQuery(sharedWorkflowIds, options);

		const [workflows, count] = (await query.getManyAndCount()) as [
			ListQueryDb.Workflow.Plain[] | ListQueryDb.Workflow.WithSharing[],
			number,
		];

		return { workflows, count };
	}

	getManyQuery(workflowIds: string[], options: ListQuery.Options = {}) {
		const qb = this.createBaseQuery(workflowIds);

		this.applyFilters(qb, options.filter);
		this.applySelect(qb, options.select);
		this.applyRelations(qb, options.select);
		this.applySorting(qb, options.sortBy);
		this.applyPagination(qb, options);

		return qb;
	}

	private createBaseQuery(workflowIds: string[]): SelectQueryBuilder<WorkflowEntity> {
		return this.createQueryBuilder('workflow').where('workflow.id IN (:...workflowIds)', {
			/*
			 * If workflowIds is empty, add a dummy value to prevent an error
			 * when using the IN operator with an empty array.
			 */
			workflowIds: !workflowIds.length ? [''] : workflowIds,
		});
	}

	private applyFilters(
		qb: SelectQueryBuilder<WorkflowEntity>,
		filter?: ListQuery.Options['filter'],
	): void {
		this.applyNameFilter(qb, filter);
		this.applyActiveFilter(qb, filter);
		this.applyIsArchivedFilter(qb, filter);
		this.applyTagsFilter(qb, filter);
		this.applyProjectFilter(qb, filter);
		this.applyParentFolderFilter(qb, filter);
	}

	private applyNameFilter(
		qb: SelectQueryBuilder<WorkflowEntity>,
		filter: ListQuery.Options['filter'],
	): void {
		if (typeof filter?.name === 'string' && filter.name !== '') {
			qb.andWhere('LOWER(workflow.name) LIKE :name', {
				name: `%${filter.name.toLowerCase()}%`,
			});
		}
	}

	private applyParentFolderFilter(
		qb: SelectQueryBuilder<WorkflowEntity>,
		filter: ListQuery.Options['filter'],
	): void {
		if (filter?.parentFolderId === PROJECT_ROOT) {
			qb.andWhere('workflow.parentFolderId IS NULL');
		} else if (filter?.parentFolderId) {
			qb.andWhere('workflow.parentFolderId = :parentFolderId', {
				parentFolderId: filter.parentFolderId,
			});
		} else if (
			filter?.parentFolderIds &&
			Array.isArray(filter.parentFolderIds) &&
			filter.parentFolderIds.length > 0
		) {
			qb.andWhere('workflow.parentFolderId IN (:...parentFolderIds)', {
				parentFolderIds: filter.parentFolderIds,
			});
		}
	}

	private applyActiveFilter(
		qb: SelectQueryBuilder<WorkflowEntity>,
		filter: ListQuery.Options['filter'],
	): void {
		if (typeof filter?.active === 'boolean') {
			qb.andWhere('workflow.active = :active', { active: filter.active });
		}
	}

	private applyIsArchivedFilter(
		qb: SelectQueryBuilder<WorkflowEntity>,
		filter: ListQuery.Options['filter'],
	): void {
		if (typeof filter?.isArchived === 'boolean') {
			qb.andWhere('workflow.isArchived = :isArchived', { isArchived: filter.isArchived });
		}
	}

	private applyTagsFilter(
		qb: SelectQueryBuilder<WorkflowEntity>,
		filter: ListQuery.Options['filter'],
	): void {
		if (isStringArray(filter?.tags) && filter.tags.length > 0) {
			const subQuery = qb
				.subQuery()
				.select('wt.workflowId')
				.from(WorkflowTagMapping, 'wt')
				.innerJoin(TagEntity, 'filter_tags', 'filter_tags.id = wt.tagId')
				.where('filter_tags.name IN (:...tagNames)', { tagNames: filter.tags })
				.groupBy('wt.workflowId')
				.having('COUNT(DISTINCT filter_tags.name) = :tagCount', { tagCount: filter.tags.length });

			qb.andWhere(`workflow.id IN (${subQuery.getQuery()})`).setParameters({
				tagNames: filter.tags,
				tagCount: filter.tags.length,
			});
		}
	}

	private applyProjectFilter(
		qb: SelectQueryBuilder<WorkflowEntity>,
		filter: ListQuery.Options['filter'],
	): void {
		if (typeof filter?.projectId === 'string' && filter.projectId !== '') {
			qb.innerJoin('workflow.shared', 'shared').andWhere('shared.projectId = :projectId', {
				projectId: filter.projectId,
			});
		}
	}

	private applyOwnedByRelation(qb: SelectQueryBuilder<WorkflowEntity>): void {
		// Check if 'shared' join already exists from project filter
		if (!qb.expressionMap.aliases.find((alias) => alias.name === 'shared')) {
			qb.leftJoin('workflow.shared', 'shared');
		}

		// Add the necessary selects
		qb.addSelect([
			'shared.role',
			'shared.createdAt',
			'shared.updatedAt',
			'shared.workflowId',
			'shared.projectId',
		])
			.leftJoin('shared.project', 'project')
			.addSelect([
				'project.id',
				'project.name',
				'project.type',
				'project.icon',
				'project.createdAt',
				'project.updatedAt',
			]);
	}

	private applySelect(
		qb: SelectQueryBuilder<WorkflowEntity>,
		select?: Record<string, boolean>,
	): void {
		if (!select) {
			// Instead of selecting id first and then adding more fields,
			// select all fields at once
			qb.select([
				'workflow.id',
				'workflow.name',
				'workflow.active',
				'workflow.isArchived',
				'workflow.createdAt',
				'workflow.updatedAt',
				'workflow.versionId',
			]);
			return;
		}

		// For custom select, still start with ID but don't add it again
		const fieldsToSelect = ['workflow.id'];

		// Handle special fields separately
		const regularFields = Object.entries(select).filter(
			([field]) => !['ownedBy', 'tags', 'parentFolder'].includes(field),
		);

		// Add regular fields
		regularFields.forEach(([field, include]) => {
			if (include && field !== 'id') {
				// Skip id since we already added it
				fieldsToSelect.push(`workflow.${field}`);
			}
		});

		qb.select(fieldsToSelect);
	}

	private applyRelations(
		qb: SelectQueryBuilder<WorkflowEntity>,
		select?: Record<string, boolean>,
	): void {
		const areTagsEnabled = !this.globalConfig.tags.disabled;
		const isDefaultSelect = select === undefined;
		const areTagsRequested = isDefaultSelect || select?.tags;
		const isOwnedByIncluded = isDefaultSelect || select?.ownedBy;
		const isParentFolderIncluded = isDefaultSelect || select?.parentFolder;

		if (isParentFolderIncluded) {
			qb.leftJoin('workflow.parentFolder', 'parentFolder').addSelect([
				'parentFolder.id',
				'parentFolder.name',
				'parentFolder.parentFolderId',
			]);
		}

		if (areTagsEnabled && areTagsRequested) {
			this.applyTagsRelation(qb);
		}

		if (isOwnedByIncluded) {
			this.applyOwnedByRelation(qb);
		}
	}

	private applyTagsRelation(qb: SelectQueryBuilder<WorkflowEntity>): void {
		qb.leftJoin('workflow.tags', 'tags')
			.addSelect(['tags.id', 'tags.name'])
			.addOrderBy('tags.createdAt', 'ASC');
	}

	private applySorting(qb: SelectQueryBuilder<WorkflowEntity>, sortBy?: string): void {
		if (!sortBy) {
			qb.orderBy('workflow.updatedAt', 'ASC');
			return;
		}

		const [column, direction] = this.parseSortingParams(sortBy);
		this.applySortingByColumn(qb, column, direction);
	}

	private parseSortingParams(sortBy: string): [string, 'ASC' | 'DESC'] {
		const [column, order] = sortBy.split(':');
		return [column, order.toUpperCase() as 'ASC' | 'DESC'];
	}

	private applySortingByColumn(
		qb: SelectQueryBuilder<WorkflowEntity>,
		column: string,
		direction: 'ASC' | 'DESC',
	): void {
		if (column === 'name') {
			qb.addSelect('LOWER(workflow.name)', 'workflow_name_lower').orderBy(
				'workflow_name_lower',
				direction,
			);
			return;
		}

		qb.orderBy(`workflow.${column}`, direction);
	}

	private applyPagination(
		qb: SelectQueryBuilder<WorkflowEntity>,
		options: ListQuery.Options,
	): void {
		if (options?.take) {
			qb.skip(options.skip ?? 0).take(options.take);
		}
	}

	async findStartingWith(workflowName: string): Promise<Array<{ name: string }>> {
		return await this.find({
			select: ['name'],
			where: { name: Like(`${workflowName}%`) },
		});
	}

	async findIn(workflowIds: string[]) {
		return await this.find({
			select: ['id', 'name'],
			where: { id: In(workflowIds) },
		});
	}

	async findWebhookBasedActiveWorkflows() {
		return await (this.createQueryBuilder('workflow')
			.select('DISTINCT workflow.id, workflow.name')
			.innerJoin(WebhookEntity, 'webhook_entity', 'workflow.id = webhook_entity.workflowId')
			.execute() as Promise<Array<{ id: string; name: string }>>);
	}

	async updateActiveState(workflowId: string, newState: boolean) {
		return await this.update({ id: workflowId }, { active: newState });
	}

	async deactivateAll() {
		return await this.update({ active: true }, { active: false });
	}

	async activateAll() {
		return await this.update({ active: false }, { active: true });
	}

	async findByActiveState(activeState: boolean) {
		return await this.findBy({ active: activeState });
	}

	async moveAllToFolder(fromFolderId: string, toFolderId: string, tx: EntityManager) {
		await tx.update(
			WorkflowEntity,
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

	async moveToFolder(workflowIds: string[], toFolderId: string) {
		await this.update(
			{ id: In(workflowIds) },
			{ parentFolder: toFolderId === PROJECT_ROOT ? null : { id: toFolderId } },
		);
	}

	async findWorkflowsWithNodeType(nodeTypes: string[]) {
		if (!nodeTypes?.length) return [];

		const qb = this.createQueryBuilder('workflow');

		const { whereClause, parameters } = buildWorkflowsByNodesQuery(
			nodeTypes,
			this.globalConfig.database.type,
		);

		const workflows: Array<{ id: string; name: string; active: boolean }> = await qb
			.select(['workflow.id', 'workflow.name', 'workflow.active'])
			.where(whereClause, parameters)
			.getMany();

		return workflows;
	}
}
