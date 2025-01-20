import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import {
	DataSource,
	Repository,
	In,
	Like,
	type UpdateResult,
	type FindOptionsWhere,
	type FindOptionsSelect,
	type FindManyOptions,
	type FindOptionsRelations,
} from '@n8n/typeorm';

import type { ListQuery } from '@/requests';
import { isStringArray } from '@/utils';

import { WebhookEntity } from '../entities/webhook-entity';
import { WorkflowEntity } from '../entities/workflow-entity';

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

	async getAllActive() {
		return await this.find({
			where: { active: true },
			relations: { shared: { project: { projectRelations: true } } },
		});
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

	async getMany(sharedWorkflowIds: string[], originalOptions: ListQuery.Options = {}) {
		const options = structuredClone(originalOptions);
		if (sharedWorkflowIds.length === 0) return { workflows: [], count: 0 };

		if (typeof options?.filter?.projectId === 'string' && options.filter.projectId !== '') {
			options.filter.shared = { projectId: options.filter.projectId };
			delete options.filter.projectId;
		}

		const where: FindOptionsWhere<WorkflowEntity> = {
			...options?.filter,
			id: In(sharedWorkflowIds),
		};

		const reqTags = options?.filter?.tags;

		if (isStringArray(reqTags)) {
			where.tags = reqTags.map((tag) => ({ name: tag }));
		}

		type Select = FindOptionsSelect<WorkflowEntity> & { ownedBy?: true };

		const select: Select = options?.select
			? { ...options.select } // copy to enable field removal without affecting original
			: {
					name: true,
					active: true,
					createdAt: true,
					updatedAt: true,
					versionId: true,
					shared: { role: true },
				};

		delete select?.ownedBy; // remove non-entity field, handled after query

		const relations: string[] = [];

		const areTagsEnabled = !this.globalConfig.tags.disabled;
		const isDefaultSelect = options?.select === undefined;
		const areTagsRequested = isDefaultSelect || options?.select?.tags === true;
		const isOwnedByIncluded = isDefaultSelect || options?.select?.ownedBy === true;

		if (areTagsEnabled && areTagsRequested) {
			relations.push('tags');
			select.tags = { id: true, name: true };
		}

		if (isOwnedByIncluded) relations.push('shared', 'shared.project');

		if (typeof where.name === 'string' && where.name !== '') {
			where.name = Like(`%${where.name}%`);
		}

		const findManyOptions: FindManyOptions<WorkflowEntity> = {
			select: { ...select, id: true },
			where,
		};

		if (isDefaultSelect || options?.select?.updatedAt === true) {
			findManyOptions.order = { updatedAt: 'ASC' };
		}

		if (relations.length > 0) {
			findManyOptions.relations = relations;
		}

		if (options?.take) {
			findManyOptions.skip = options.skip;
			findManyOptions.take = options.take;
		}

		const [workflows, count] = (await this.findAndCount(findManyOptions)) as [
			ListQuery.Workflow.Plain[] | ListQuery.Workflow.WithSharing[],
			number,
		];

		return { workflows, count };
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
