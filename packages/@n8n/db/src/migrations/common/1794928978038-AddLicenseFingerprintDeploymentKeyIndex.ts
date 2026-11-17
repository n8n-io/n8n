import type { MigrationContext, ReversibleMigration } from '../migration-types';

const indexName = (tablePrefix: string) =>
	`IDX_${tablePrefix}deployment_key_license_fingerprint_active`;

export class AddLicenseFingerprintDeploymentKeyIndex1794928978038 implements ReversibleMigration {
	async up({ schemaBuilder: { createIndex }, escape, tablePrefix }: MigrationContext) {
		// One active license fingerprint per deployment, so concurrent mains agree on a single row.
		const status = escape.columnName('status');
		const type = escape.columnName('type');
		await createIndex(
			'deployment_key',
			['type'],
			true,
			indexName(tablePrefix),
			`${status} = 'active' AND ${type} = 'license.fingerprint'`,
		);
	}

	async down({ schemaBuilder: { dropIndex }, tablePrefix }: MigrationContext) {
		await dropIndex('deployment_key', ['type'], {
			customIndexName: indexName(tablePrefix),
			skipIfMissing: true,
		});
	}
}
