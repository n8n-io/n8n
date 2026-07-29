import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstanceAiMcpRegistryConnection } from '../entities/instance-ai-mcp-registry-connection.entity';

@Service()
export class InstanceAiMcpRegistryConnectionRepository extends Repository<InstanceAiMcpRegistryConnection> {
	constructor(dataSource: DataSource) {
		super(InstanceAiMcpRegistryConnection, dataSource.manager);
	}
}
