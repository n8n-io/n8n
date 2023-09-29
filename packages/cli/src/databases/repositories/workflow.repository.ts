import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import { WorkflowEntity } from '../entities/WorkflowEntity';

@Service()
export class WorkflowRepository extends Repository<WorkflowEntity> {
	constructor(dataSource: DataSource) {
		super(WorkflowEntity, dataSource.manager);
	}

	/**  Returns if the workflow is active */
	async isActive(id: string): Promise<boolean> {
		return this.exist({ where: { id, active: true } });
	}

	async getActiveWorkflowIds(): Promise<Array<WorkflowEntity['id']>> {
		const activeWorkflows = await this.find({
			select: ['id'],
			where: { active: true },
		});
		return activeWorkflows.map((workflow) => workflow.id);
	}
}
