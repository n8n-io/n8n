import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddJweKeyIndexesToDeploymentKey1777023444000 implements ReversibleMigration {
	async up({ schemaBuilder: { createIndex } }: MigrationContext) {
		// Partial unique index keyed on (type, algorithm) and scoped to active JWE
		// private-key rows. This guarantees at most one active key per algorithm
		// (so multi-main boots race-safely on a single algorithm) while leaving
		// room for additional active keys under different algorithms in future.
		await createIndex(
			'deployment_key',
			['type', 'algorithm'],
			true,
			'IDX_deployment_key_jwe_private_key_active',
			"status = 'active' AND type = 'jwe.private-key'",
		);
	}

	async down({ schemaBuilder: { dropIndex } }: MigrationContext) {
		await dropIndex('deployment_key', ['type', 'algorithm'], {
			customIndexName: 'IDX_deployment_key_jwe_private_key_active',
			skipIfMissing: true,
		});
	}
}
