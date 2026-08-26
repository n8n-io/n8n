import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstanceAiLearningRun } from '../entities/instance-ai-learning-run.entity';

@Service()
export class InstanceAiLearningRunRepository extends Repository<InstanceAiLearningRun> {
	constructor(dataSource: DataSource) {
		super(InstanceAiLearningRun, dataSource.manager);
	}

	async findByIdAndProjectId(id: string, projectId: string) {
		return await this.findOneBy({ id, projectId });
	}
}
