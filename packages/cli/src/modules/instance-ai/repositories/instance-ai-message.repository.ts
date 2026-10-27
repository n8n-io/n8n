import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstanceAiMessage } from '../entities/instance-ai-message.entity';

@Service()
export class InstanceAiMessageRepository extends Repository<InstanceAiMessage> {
	constructor(dataSource: DataSource) {
		super(InstanceAiMessage, dataSource.manager);
	}
}
