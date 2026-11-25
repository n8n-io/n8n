import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import type { KnowledgeFileStorageReference } from '../files/knowledge-file-store';

/** Reads storage references even when the module has not registered AgentFile. */
@Service()
export class KnowledgeFileCleanupRepository {
	constructor(private readonly dataSource: DataSource) {}

	async findStorageReferencesByAgentId(agentId: string): Promise<KnowledgeFileStorageReference[]> {
		const { driver, options } = this.dataSource;
		const tableName = driver.buildTableName(
			`${options.entityPrefix ?? ''}agent_files`,
			options.type === 'postgres' ? options.schema : undefined,
		);

		return await this.dataSource
			.createQueryBuilder()
			.select(driver.escape('storedAt'), 'storedAt')
			.addSelect(driver.escape('storageKey'), 'storageKey')
			.from(tableName, 'file')
			.where(`${driver.escape('agentId')} = :agentId`, { agentId })
			.getRawMany<KnowledgeFileStorageReference>();
	}
}
