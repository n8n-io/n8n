import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateOAuthEntities1760116750277 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		// Create oauth_clients table
		await createTable('oauth_clients').withColumns(
			column('id').varchar().primary.notNull,
			column('name').varchar(255).notNull,
			column('redirectUris').json.notNull,
			column('grantTypes').json.notNull,
			column('clientSecret').varchar(255),
			column('clientSecretExpiresAt').bigint,
			column('tokenEndpointAuthMethod')
				.varchar(255)
				.notNull.default("'none'")
				.comment('Possible values: none, client_secret_basic or client_secret_post'),
		).withTimestamps;

		// Create oauth_authorization_codes table
		await createTable('oauth_authorization_codes')
			.withColumns(
				column('code').varchar(255).primary.notNull,
				column('clientId').varchar().notNull,
				column('userId').uuid.notNull,
				column('redirectUri').varchar(255).notNull,
				column('codeChallenge').varchar(255).notNull,
				column('codeChallengeMethod').varchar(255).notNull,
				column('expiresAt').bigint.notNull.comment('Unix timestamp in milliseconds'),
				column('state').varchar(255), // Should be nullable
				column('used').bool.notNull.default(false),
			)
			.withForeignKey('clientId', {
				tableName: 'oauth_clients',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		// Create oauth_access_tokens table
		await createTable('oauth_access_tokens')
			.withColumns(
				column('token').varchar(255).primary.notNull,
				column('clientId').varchar().notNull,
				column('userId').uuid.notNull,
			)
			.withForeignKey('clientId', {
				tableName: 'oauth_clients',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			});

		// Create oauth_refresh_tokens table
		await createTable('oauth_refresh_tokens')
			.withColumns(
				column('token').varchar(255).primary.notNull,
				column('clientId').varchar().notNull,
				column('userId').uuid.notNull,
				column('expiresAt').bigint.notNull.comment('Unix timestamp in milliseconds'),
			)
			.withForeignKey('clientId', {
				tableName: 'oauth_clients',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		// Create oauth_user_consents table
		await createTable('oauth_user_consents')
			.withColumns(
				column('id').int.primary.autoGenerate2.notNull,
				column('userId').uuid.notNull,
				column('clientId').varchar().notNull,
				column('grantedAt').bigint.notNull.comment('Unix timestamp in milliseconds'),
			)
			.withForeignKey('clientId', {
				tableName: 'oauth_clients',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withUniqueConstraintOn(['userId', 'clientId']);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('oauth_user_consents');
		await dropTable('oauth_refresh_tokens');
		await dropTable('oauth_access_tokens');
		await dropTable('oauth_authorization_codes');
		await dropTable('oauth_clients');
	}
}
