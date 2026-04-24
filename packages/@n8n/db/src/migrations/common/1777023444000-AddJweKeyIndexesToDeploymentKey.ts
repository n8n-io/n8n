import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddJweKeyIndexesToDeploymentKey1777023444000 implements ReversibleMigration {
	async up({ schemaBuilder: { createIndex } }: MigrationContext) {
		await createIndex(
			'deployment_key',
			['type'],
			true,
			'IDX_deployment_key_jwe_public_key_active',
			"status = 'active' AND type = 'jwe.public-key'",
		);

		await createIndex(
			'deployment_key',
			['type'],
			true,
			'IDX_deployment_key_jwe_private_key_active',
			"status = 'active' AND type = 'jwe.private-key'",
		);
	}

	async down({ schemaBuilder: { dropIndex } }: MigrationContext) {
		await dropIndex('deployment_key', ['type'], {
			customIndexName: 'IDX_deployment_key_jwe_private_key_active',
			skipIfMissing: true,
		});

		await dropIndex('deployment_key', ['type'], {
			customIndexName: 'IDX_deployment_key_jwe_public_key_active',
			skipIfMissing: true,
		});
	}
}
