import { GlobalConfig } from '@n8n/config';
import { testDb } from '@n8n/backend-test-utils';
import { WorkflowPublicationOutboxRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import assert from 'node:assert';

const globalConfig = Container.get(GlobalConfig);
const isPostgres = globalConfig.database.type === 'postgresdb';

// The repository issues hand-written SQL that references the table by name only.
// This suite proves those statements still resolve when n8n is configured with a
// non-default Postgres schema (which the driver applies via `search_path`).
// SQLite has no schema concept, so the suite is Postgres-only.
const describeOnPostgres = isPostgres ? describe : describe.skip;

describeOnPostgres('WorkflowPublicationOutboxRepository on a non-default schema', () => {
	let repository: WorkflowPublicationOutboxRepository;
	let originalSchema: string;

	beforeAll(async () => {
		originalSchema = globalConfig.database.postgresdb.schema;
		globalConfig.database.postgresdb.schema = 'outbox_custom_schema';
		await testDb.init();
		repository = Container.get(WorkflowPublicationOutboxRepository);
	});

	afterAll(async () => {
		await testDb.terminate();
		globalConfig.database.postgresdb.schema = originalSchema;
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowPublicationOutbox']);
	});

	it('enqueues, supersedes and claims within the configured schema', async () => {
		await repository.enqueue('wf-1', 'v-1');
		await repository.enqueue('wf-1', 'v-2');

		const claimed = await repository.claimNextPendingRecord();
		assert(claimed);
		expect(claimed.workflowId).toBe('wf-1');
		expect(claimed.publishedVersionId).toBe('v-2');

		const claimedAgain = await repository.claimNextPendingRecord();
		expect(claimedAgain).toBeNull();
	});
});
