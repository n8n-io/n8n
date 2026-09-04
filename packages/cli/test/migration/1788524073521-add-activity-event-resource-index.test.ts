import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	undoLastSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { indexColumnsInOrder } from './shared/index-columns';

const MIGRATION_NAME = 'AddActivityEventResourceIndex1788524073521';
const INDEX_NAME = 'activity_event_resource';

describe('AddActivityEventResourceIndex migration', () => {
	let dataSource: DataSource;

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await withContext(async (context) => await context.queryRunner.clearDatabase());
		await initDbUpToMigration(MIGRATION_NAME);
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('indexes the resource pointer with the id trailing, so one resource reads newest-first', async () => {
		const columns = await withContext(
			async (context) => await indexColumnsInOrder(context, INDEX_NAME),
		);

		expect(columns).toEqual(['resourceType', 'resourceId', 'id']);
	});

	it('drops the index on revert', async () => {
		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);

		const columns = await withContext(
			async (context) => await indexColumnsInOrder(context, INDEX_NAME),
		);

		expect(columns).toBeUndefined();
	});
});
