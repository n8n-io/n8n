import { Service } from 'typedi';
import {
	DataSource,
	Repository,
	type UpdateResult,
	type FindOptionsWhere,
	type DeleteResult,
	type EntityManager,
	In,
	Not,
} from 'typeorm';
import config from '@/config';
import { WorkflowEntity } from '../entities/WorkflowEntity';
import { SharedWorkflow } from '../entities/SharedWorkflow';

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

	async findById(workflowId: string) {
		return this.findOne({
			where: { id: workflowId },
			relations: ['shared', 'shared.user', 'shared.user.globalRole', 'shared.role'],
		});
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
}
