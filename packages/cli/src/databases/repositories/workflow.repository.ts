import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import { WorkflowEntity } from '../entities/WorkflowEntity';

@Service()
export class WorkflowRepository extends Repository<WorkflowEntity> {
	constructor(dataSource: DataSource) {
		super(WorkflowEntity, dataSource.manager);
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
}
