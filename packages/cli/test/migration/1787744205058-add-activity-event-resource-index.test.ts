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

const MIGRATION_NAME = 'AddActivityEventResourceIndex1787744205058';
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

	async function resourceIndexColumns(): Promise<string[] | undefined> {
		return await withContext(async (context) => await indexColumnsInOrder(context, INDEX_NAME));
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await withContext(async (context) => await context.queryRunner.clearDatabase());
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('indexes a resource and its entry order, in that order', async () => {
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		// Order matters: this index serves "everything about one resource, newest first", so the
		// resource columns have to lead and `id` has to trail.
		expect(await resourceIndexColumns()).toEqual(['resourceType', 'resourceId', 'id']);
	});

	it('drops the index on revert, and can be applied again afterwards', async () => {
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);
		expect(await resourceIndexColumns()).toBeDefined();

		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);
		expect(await resourceIndexColumns()).toBeUndefined();

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);
		expect(await resourceIndexColumns()).toBeDefined();
	});
});
