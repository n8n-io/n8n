import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	undoLastSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const migrationName = 'AddWorkflowSettingsPublicationReason1793543367097';

describe('AddWorkflowSettingsPublicationReason', () => {
	beforeAll(async () => {
		await Container.get(DbConnection).init();
		await initDbUpToMigration(migrationName);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('preserves queued versions through upgrade, downgrade, and reapplication', async () => {
		let context = createTestMigrationContext(Container.get(DataSource));
		const table = context.escape.tableName('workflow_publication_outbox');
		const column = context.escape.columnName;
		const insert = async (workflowId: string, reason: string) => {
			await context.runQuery(
				`INSERT INTO ${table} (${column('workflowId')}, ${column('publishedVersionId')}, ${column('status')}, ${column('reason')})
				 VALUES (:workflowId, 'version-1', 'pending', :reason)`,
				{ workflowId, reason },
			);
		};
		try {
			await insert('existing', 'publish');
			await context.queryRunner.release();
			await runSingleMigration(migrationName);
			context = createTestMigrationContext(Container.get(DataSource));
			await insert('settings', 'settings-update');
			await expect(insert('invalid', 'invalid')).rejects.toThrow();

			await context.queryRunner.release();
			await undoLastSingleMigration();
			context = createTestMigrationContext(Container.get(DataSource));
			expect(
				await context.runQuery(
					`SELECT ${column('workflowId')}, ${column('publishedVersionId')}, ${column('reason')}
					 FROM ${table} ORDER BY ${column('workflowId')}`,
				),
			).toEqual([
				{ workflowId: 'existing', publishedVersionId: 'version-1', reason: 'publish' },
				{ workflowId: 'settings', publishedVersionId: 'version-1', reason: 'publish' },
			]);
			await expect(insert('before-redo', 'settings-update')).rejects.toThrow();
			await context.queryRunner.release();
			await runSingleMigration(migrationName);
			context = createTestMigrationContext(Container.get(DataSource));
			await expect(insert('after-redo', 'settings-update')).resolves.toBeUndefined();
		} finally {
			await context.queryRunner.release();
		}
	});
});
