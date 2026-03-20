import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstanceAiPlanState } from '../entities/instance-ai-plan-state.entity';

@Service()
export class InstanceAiPlanStateRepository extends Repository<InstanceAiPlanState> {
	constructor(dataSource: DataSource) {
		super(InstanceAiPlanState, dataSource.manager);
	}
}
