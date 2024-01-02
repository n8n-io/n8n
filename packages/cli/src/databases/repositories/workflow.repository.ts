import { Service } from 'typedi';
import {
	DataSource,
	Repository,
	In,
	Like,
	type UpdateResult,
	type FindOptionsWhere,
	type FindOptionsSelect,
	type FindManyOptions,
	type EntityManager,
	type DeleteResult,
	Not,
} from 'typeorm';
import type { ListQuery } from '@/requests';
import { isStringArray } from '@/utils';
import config from '@/config';
import { WorkflowEntity } from '../entities/WorkflowEntity';
import { SharedWorkflow } from '../entities/SharedWorkflow';
import { WebhookEntity } from '../entities/WebhookEntity';

@Service()
export class WorkflowRepository extends Repository<WorkflowEntity> {
	constructor(dataSource: DataSource) {
		super(WorkflowEntity, dataSource.manager);
	}

	async get(where: FindOptionsWhere<WorkflowEntity>, options?: { relations: string[] }) {
		return this.findOne({
			where,
			relations: options?.relations,
		});
	}

	async getAllActive() {
		return this.find({
			where: { active: true },
			relations: ['shared', 'shared.user', 'shared.user.globalRole', 'shared.role'],
		});
	}

	async getActiveIds() {
		const activeWorkflows = await this.find({
			select: ['id'],
			where: { active: true },
		});
		return activeWorkflows.map((workflow) => workflow.id);
	}

	async findById(workflowId: string) {
		return this.findOne({
			where: { id: workflowId },
			relations: ['shared', 'shared.user', 'shared.user.globalRole', 'shared.role'],
		});
	}

	async findByIds(workflowIds: string[]) {
		return this.find({ where: { id: In(workflowIds) } });
	}

	async getActiveTriggerCount() {
		const totalTriggerCount = await this.sum('triggerCount', {
			active: true,
		});
		return totalTriggerCount ?? 0;
	}

	async getSharings(
		transaction: EntityManager,
		workflowId: string,
		relations = ['shared'],
	): Promise<SharedWorkflow[]> {
		const workflow = await transaction.findOne(WorkflowEntity, {
			where: { id: workflowId },
			relations,
		});
		return workflow?.shared ?? [];
	}

	async pruneSharings(
		transaction: EntityManager,
		workflowId: string,
		userIds: string[],
	): Promise<DeleteResult> {
		return transaction.delete(SharedWorkflow, {
			workflowId,
			userId: Not(In(userIds)),
		});
	}

	async updateWorkflowTriggerCount(id: string, triggerCount: number): Promise<UpdateResult> {
		const qb = this.createQueryBuilder('workflow');
		return qb
			.update()
			.set({
				triggerCount,
				updatedAt: () => {
					if (['mysqldb', 'mariadb'].includes(config.getEnv('database.type'))) {
						return 'updatedAt';
					}
					return '"updatedAt"';
				},
			})
			.where('id = :id', { id })
			.execute();
	}

	async getMany(sharedWorkflowIds: string[], options?: ListQuery.Options) {
		if (sharedWorkflowIds.length === 0) return { workflows: [], count: 0 };

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
					shared: { userId: true, roleId: true },
			  };

		delete select?.ownedBy; // remove non-entity field, handled after query

		const relations: string[] = [];

		const areTagsEnabled = !config.getEnv('workflowTagsDisabled');
		const isDefaultSelect = options?.select === undefined;
		const areTagsRequested = isDefaultSelect || options?.select?.tags === true;
		const isOwnedByIncluded = isDefaultSelect || options?.select?.ownedBy === true;

		if (areTagsEnabled && areTagsRequested) {
			relations.push('tags');
			select.tags = { id: true, name: true };
		}

		if (isOwnedByIncluded) relations.push('shared', 'shared.role', 'shared.user');

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
		return this.find({
			select: ['name'],
			where: { name: Like(`${workflowName}%`) },
		});
	}

	async findIn(workflowIds: string[]) {
		return this.find({
			select: ['id', 'name'],
			where: { id: In(workflowIds) },
		});
	}

	async findWebhookBasedActiveWorkflows() {
		return this.createQueryBuilder('workflow')
			.select('DISTINCT workflow.id, workflow.name')
			.innerJoin(WebhookEntity, 'webhook_entity', 'workflow.id = webhook_entity.workflowId')
			.execute() as Promise<Array<{ id: string; name: string }>>;
	}

	async updateActiveState(workflowId: string, newState: boolean) {
		return this.update({ id: workflowId }, { active: newState });
	}

	async deactivateAll() {
		return this.update({ active: true }, { active: false });
	}

	async findByActiveState(activeState: boolean) {
		return this.findBy({ active: activeState });
	}
}
