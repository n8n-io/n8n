import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { McpRegistryServerEntity } from './mcp-registry-server.entity';

@Service()
export class McpRegistryServerRepository extends Repository<McpRegistryServerEntity> {
	constructor(dataSource: DataSource) {
		super(McpRegistryServerEntity, dataSource.manager);
	}
}
