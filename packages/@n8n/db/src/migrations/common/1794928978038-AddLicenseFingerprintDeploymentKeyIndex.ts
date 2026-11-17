import type { MigrationContext, ReversibleMigration } from '../migration-types';

const INDEX_NAME = 'IDX_deployment_key_license_fingerprint_active';

/** One active license fingerprint per deployment, so concurrent mains agree on a single row. */
export class AddLicenseFingerprintDeploymentKeyIndex1794928978038 implements ReversibleMigration {
	async up({ schemaBuilder: { createIndex } }: MigrationContext) {
		await createIndex(
			'deployment_key',
			['type'],
			true,
			INDEX_NAME,
			"status = 'active' AND type = 'license.fingerprint'",
		);
	}

	async down({ schemaBuilder: { dropIndex } }: MigrationContext) {
		await dropIndex('deployment_key', ['type'], { customIndexName: INDEX_NAME });
	}
}
