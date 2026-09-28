import type { MigrationContext, ReversibleMigration } from '../migration-types';

const indexName = 'IDX_deployment_key_oauth_signing_key_active';

export class AddOAuthSigningKeyIndexToDeploymentKey1790342461308 implements ReversibleMigration {
	async up({ schemaBuilder: { createIndex }, escape }: MigrationContext) {
		// At most one active OAuth access-token signing key per algorithm, so
		// mains and webhook processes that boot at the same time cannot both
		// insert one. The JWE index does not cover this type.
		const status = escape.columnName('status');
		const type = escape.columnName('type');
		await createIndex(
			'deployment_key',
			['type', 'algorithm'],
			true,
			indexName,
			`${status} = 'active' AND ${type} = 'oauth-server.signing-key'`,
		);
	}

	async down({ schemaBuilder: { dropIndex } }: MigrationContext) {
		await dropIndex('deployment_key', ['type', 'algorithm'], {
			customIndexName: indexName,
			skipIfMissing: true,
		});
	}
}
