import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateDeploymentKeyTable1777000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column, createIndex } }: MigrationContext) {
		await createTable('deployment_key').withColumns(
			column('type').varchar(64).notNull,
			column('value').text.notNull,
			column('algorithm').varchar(20),
			column('status').varchar(20).notNull,
			column('deprecatedAt').timestamp(),
		).withTimestamps;

		await createIndex(
			'deployment_key',
			['type'],
			true,
			'IDX_deployment_key_data_encryption_active',
			"status = 'active' AND type = 'data_encryption'",
		);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('deployment_key');
	}
}
