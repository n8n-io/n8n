import { DataSource, Repository } from '@n8n/typeorm';

import { WorkflowEntity } from '../entities';

export class WorkflowRepository extends Repository<WorkflowEntity> {
	constructor(dataSource: DataSource) {
		super(WorkflowEntity, dataSource.manager);
	}

	async findLatestVersion(workflowId: string): Promise<WorkflowEntity | null> {
		return await this.findOne({
			where: { id: workflowId },
			order: { version: 'DESC' },
		});
	}

	async findByIdAndVersion(workflowId: string, version: number): Promise<WorkflowEntity | null> {
		return await this.findOne({
			where: { id: workflowId, version },
		});
	}
}
