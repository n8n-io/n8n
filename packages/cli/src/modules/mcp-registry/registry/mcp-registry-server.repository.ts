import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { McpRegistryServerEntity } from './mcp-registry-server.entity';
import type { McpRegistryServerUpsertRow } from './mcp-registry.types';

@Service()
export class McpRegistryServerRepository extends Repository<McpRegistryServerEntity> {
	constructor(dataSource: DataSource) {
		super(McpRegistryServerEntity, dataSource.manager);
	}

	// Custom upsert method to handle both updating and inserting servers
	// since we have both id and slug as unique keys and the standard
	// upsert method caused some issues when trying to use it to upsert
	// based on slug
	async upsertServers(entities: McpRegistryServerUpsertRow[]) {
		const toUpdate = entities.filter((entity) => entity.id !== undefined);
		const toInsert = entities.filter((entity) => entity.id === undefined);
		await this.manager.transaction(async (m) => {
			await Promise.all(
				toUpdate.map(async (e) => await m.update(McpRegistryServerEntity, e.id, e)),
			);
			await m.insert(McpRegistryServerEntity, toInsert);
		});
	}
}
