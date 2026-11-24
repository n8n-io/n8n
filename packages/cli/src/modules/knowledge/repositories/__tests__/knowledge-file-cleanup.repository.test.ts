import { DataSource, type QueryRunner } from '@n8n/typeorm';
import { DriverFactory } from '@n8n/typeorm/driver/DriverFactory';
import { mock } from 'vitest-mock-extended';

import { KnowledgeFileCleanupRepository } from '../knowledge-file-cleanup.repository';

describe('KnowledgeFileCleanupRepository', () => {
	it('quotes the PostgreSQL schema and table prefix and binds the agent ID without entity metadata', async () => {
		const dataSource = new DataSource({
			type: 'postgres',
			schema: 'knowledge_schema',
			entityPrefix: 'test_',
		});
		dataSource.driver = await DriverFactory.create(dataSource);
		const files = [{ storedAt: 's3', storageKey: 'stored-key' }];
		const queryRunner = mock<QueryRunner>();
		queryRunner.query.mockResolvedValue({ records: files });
		vi.spyOn(dataSource, 'createQueryRunner').mockReturnValue(queryRunner);
		const repository = new KnowledgeFileCleanupRepository(dataSource);
		const agentId = "agent'1";

		expect(dataSource.entityMetadatas).toEqual([]);
		await expect(repository.findStorageReferencesByAgentId(agentId)).resolves.toEqual(files);
		expect(queryRunner.query).toHaveBeenCalledExactlyOnceWith(
			'SELECT "storedAt" AS "storedAt", "storageKey" AS "storageKey" FROM "knowledge_schema"."test_agent_files" "file" WHERE "agentId" = $1',
			[agentId],
			true,
		);
	});
});
