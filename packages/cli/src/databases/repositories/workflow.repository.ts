import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import { WorkflowEntity } from '../entities/WorkflowEntity';

@Service()
export class WorkflowRepository extends Repository<WorkflowEntity> {
	constructor(dataSource: DataSource) {
		super(WorkflowEntity, dataSource.manager);
	}

	async getAllActiveWorkflows(): Promise<WorkflowEntity[]> {
		return this.find({
			where: { active: true },
			relations: ['shared', 'shared.user', 'shared.user.globalRole', 'shared.role'],
		});
	}
}
