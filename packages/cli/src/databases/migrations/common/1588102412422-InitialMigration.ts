import type { MigrationContext, ReversibleMigration } from '@db/types';

export class InitialMigration1588102412422 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('credentials_entity')
			.withColumns(
				column('id').int.primary.autoGenerate,
				column('name').varchar(128).notNull,
				column('data').text.notNull,
				column('type').varchar(32).notNull,
				column('nodesAccess').json.notNull,
			)
			.withTimestamps.withIndexOn('type', { name: '07fde106c0b471d8cc80a64fc8' });

		await createTable('workflow_entity').withColumns(
			column('id').int.primary.autoGenerate,
			column('name').varchar(128).notNull,
			column('active').bool.notNull,
			column('nodes').json.notNull,
			column('connections').json.notNull,
			column('settings').json,
			column('staticData').json,
		).withTimestamps;

		await createTable('execution_entity')
			.withColumns(
				column('id').int.primary.autoGenerate,
				column('data').text.notNull,
				column('finished').bool.notNull,
				column('mode').text.notNull,
				column('retryOf').text,
				column('retrySuccessId').text,
				column('startedAt').timestamp().notNull,
				column('stoppedAt').timestamp().notNull,
				column('workflowData').json.notNull,
				column('workflowId').text,
			)
			.withIndexOn('workflowId', { name: 'c4d999a5e90784e8caccf5589d' });
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('execution_entity');
		await dropTable('workflow_entity');
		await dropTable('credentials_entity');
	}
}
