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
} from '@n8n/typeorm';

import type { ListQuery } from '@/requests';
import { isStringArray } from '@/utils';

import { TagEntity } from '../entities/tag-entity';
import { WebhookEntity } from '../entities/webhook-entity';
import { WorkflowEntity } from '../entities/workflow-entity';
import { WorkflowTagMapping } from '../entities/workflow-tag-mapping';

@Service()
export class WorkflowRepository extends Repository<WorkflowEntity> {
	constructor(
		dataSource: DataSource,
		private readonly globalConfig: GlobalConfig,
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

	async getMany(sharedWorkflowIds: string[], options: ListQuery.Options = {}) {
		if (sharedWorkflowIds.length === 0) {
			return { workflows: [], count: 0 };
		}

		const qb = this.createBaseQuery(sharedWorkflowIds);

		this.applyFilters(qb, options.filter);
		this.applySelect(qb, options.select);
		this.applyRelations(qb, options.select);
		this.applySorting(qb, options.sortBy);
		this.applyPagination(qb, options);

		const [workflows, count] = (await qb.getManyAndCount()) as [
			ListQuery.Workflow.Plain[] | ListQuery.Workflow.WithSharing[],
			number,
		];

		return { workflows, count };
	}

	private createBaseQuery(sharedWorkflowIds: string[]): SelectQueryBuilder<WorkflowEntity> {
		return this.createQueryBuilder('workflow').where('workflow.id IN (:...sharedWorkflowIds)', {
			sharedWorkflowIds,
		});
	}

	private applyFilters(
		qb: SelectQueryBuilder<WorkflowEntity>,
		filter?: ListQuery.Options['filter'],
	): void {
		if (!filter) return;

		this.applyNameFilter(qb, filter);
		this.applyActiveFilter(qb, filter);
		this.applyTagsFilter(qb, filter);
		this.applyProjectFilter(qb, filter);
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

	private applyActiveFilter(
		qb: SelectQueryBuilder<WorkflowEntity>,
		filter: ListQuery.Options['filter'],
	): void {
		if (typeof filter?.active === 'boolean') {
			qb.andWhere('workflow.active = :active', { active: filter.active });
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
		// Always start with workflow.id
		qb.select(['workflow.id']);

		if (!select) {
			// Default select fields when no select option provided
			qb.addSelect([
				'workflow.name',
				'workflow.active',
				'workflow.createdAt',
				'workflow.updatedAt',
				'workflow.versionId',
			]);
			return;
		}

		// Handle special fields separately
		const regularFields = Object.entries(select).filter(
			([field]) => !['ownedBy', 'tags'].includes(field),
		);

		// Add regular fields
		regularFields.forEach(([field, include]) => {
			if (include) {
				qb.addSelect(`workflow.${field}`);
			}
		});
	}

	private applyRelations(
		qb: SelectQueryBuilder<WorkflowEntity>,
		select?: Record<string, boolean>,
	): void {
		const areTagsEnabled = !this.globalConfig.tags.disabled;
		const isDefaultSelect = select === undefined;
		const areTagsRequested = isDefaultSelect || select?.tags;
		const isOwnedByIncluded = isDefaultSelect || select?.ownedBy;

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
			this.applyDefaultSorting(qb);
			return;
		}

		const [column, direction] = this.parseSortingParams(sortBy);
		this.applySortingByColumn(qb, column, direction);
	}

	private parseSortingParams(sortBy: string): [string, 'ASC' | 'DESC'] {
		const [column, order] = sortBy.split(':');
		return [column, order.toUpperCase() as 'ASC' | 'DESC'];
	}

	private applyDefaultSorting(qb: SelectQueryBuilder<WorkflowEntity>): void {
		qb.orderBy('workflow.updatedAt', 'ASC');
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
}
