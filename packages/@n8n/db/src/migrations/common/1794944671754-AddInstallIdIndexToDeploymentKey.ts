import type { MigrationContext, ReversibleMigration } from '../migration-types';

const indexName = (tablePrefix: string) => `IDX_${tablePrefix}deployment_key_install_id_active`;

export class AddInstallIdIndexToDeploymentKey1794944671754 implements ReversibleMigration {
	async up({ schemaBuilder: { createIndex }, escape, tablePrefix }: MigrationContext) {
		// At most one active install ID, so mains that boot at the same time
		// on a fresh database agree on one value.
		const status = escape.columnName('status');
		const type = escape.columnName('type');
		await createIndex(
			'deployment_key',
			['type'],
			true,
			indexName(tablePrefix),
			`${status} = 'active' AND ${type} = 'install.id'`,
		);
	}

	async down({ schemaBuilder: { dropIndex }, tablePrefix }: MigrationContext) {
		await dropIndex('deployment_key', ['type'], {
			customIndexName: indexName(tablePrefix),
			skipIfMissing: true,
		});
	}
}
