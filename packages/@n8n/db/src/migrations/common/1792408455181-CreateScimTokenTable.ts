import { generateNanoId } from '@n8n/utils/generate-nano-id';

import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'scim_token';

/** The audience and label that SCIM keys had in `user_api_keys`. */
const scimAudience = 'scim-api';
const scimLabel = 'SCIM Provisioning API Key';

type ScimTokenRow = {
	token: string;
	createdById: string;
	createdAt: Date | string;
	lastUsedAt: Date | string | null;
};

/**
 * Moves the SCIM token from `user_api_keys`, one row for each admin, to a
 * table that holds one token for the instance.
 *
 * In `user_api_keys`, the key is deleted with its user, and its fixed label
 * collides with a public API key of the same name. Here, the token keeps
 * working when its creator is deleted.
 */
export class CreateScimTokenTable1792408455181 implements ReversibleMigration {
	async up(context: MigrationContext) {
		const {
			schemaBuilder: { createTable, column },
			tablePrefix,
		} = context;

		// The unique index on `slot` keeps the table to one row. Thus the
		// table needs no other index: each query reads that one row.
		await createTable(tableName)
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('slot')
					.varchar(16)
					.notNull.default("'instance'")
					.withEnumCheck(['instance'])
					.comment(
						'Always instance. The unique index on it allows one SCIM token for the instance',
					),
				column('token').text.notNull.comment(
					'Signed JWT that the identity provider sends as its bearer token',
				),
				column('createdById').uuid.comment(
					'User who generated the token. NULL after that user is deleted',
				),
				column('lastUsedAt')
					.timestampTimezone()
					.comment('Time of the last SCIM request that the token authenticated'),
			)
			.withIndexOn('slot', true)
			.withForeignKey('createdById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
				name: `FK_${tablePrefix}scim_token_createdById`,
			}).withCreatedAt;

		await this.keepNewestWorkingScimKey(context);
		await this.deleteScimKeys(context);
	}

	async down(context: MigrationContext) {
		await this.restoreTokenForCreator(context);
		await context.schemaBuilder.dropTable(tableName);
	}

	/**
	 * Copies the newest SCIM key that authenticates before this migration. The
	 * previous check accepted a key only while its user was not disabled and
	 * held `scim:manage`. An identity provider that uses this key keeps working.
	 */
	private async keepNewestWorkingScimKey({ escape, runQuery }: MigrationContext) {
		const scimToken = escape.tableName(tableName);
		const apiKey = escape.tableName('user_api_keys');
		const user = escape.tableName('user');
		const roleScope = escape.tableName('role_scope');
		const col = (name: string) => escape.columnName(name);

		await runQuery(
			`INSERT INTO ${scimToken} (${col('token')}, ${col('createdById')}, ${col('createdAt')}, ${col('lastUsedAt')})
			 SELECT k.${col('apiKey')}, k.${col('userId')}, k.${col('createdAt')}, k.${col('lastUsedAt')}
			 FROM ${apiKey} k
			 JOIN ${user} u ON u.${col('id')} = k.${col('userId')}
			 WHERE k.${col('audience')} = '${scimAudience}'
			   AND NOT u.${col('disabled')}
			   AND EXISTS (
			     SELECT 1 FROM ${roleScope} rs
			     WHERE rs.${col('roleSlug')} = u.${col('roleSlug')} AND rs.${col('scopeSlug')} = 'scim:manage'
			   )
			 ORDER BY k.${col('createdAt')} DESC, k.${col('id')} DESC
			 LIMIT 1`,
		);
	}

	private async deleteScimKeys({ escape, runQuery }: MigrationContext) {
		await runQuery(
			`DELETE FROM ${escape.tableName('user_api_keys')} WHERE ${escape.columnName('audience')} = '${scimAudience}'`,
		);
	}

	/**
	 * The previous schema keeps SCIM keys per user. Give the instance token
	 * back to its creator. The token is lost when the creator was deleted, or
	 * when the creator now has a public API key with the SCIM label.
	 */
	private async restoreTokenForCreator({
		escape,
		runQuery,
		logger,
		migrationName,
	}: MigrationContext) {
		const col = (name: string) => escape.columnName(name);

		const [row] = await runQuery<ScimTokenRow[]>(
			`SELECT ${col('token')} AS ${col('token')}, ${col('createdById')} AS ${col('createdById')},
			        ${col('createdAt')} AS ${col('createdAt')}, ${col('lastUsedAt')} AS ${col('lastUsedAt')}
			 FROM ${escape.tableName(tableName)}
			 WHERE ${col('createdById')} IS NOT NULL`,
		);

		if (!row) {
			logger.info(`[${migrationName}] No SCIM token with a creator to restore`);
			return;
		}

		await runQuery(
			`INSERT INTO ${escape.tableName('user_api_keys')}
			 (${col('id')}, ${col('userId')}, ${col('label')}, ${col('apiKey')}, ${col('scopes')}, ${col('audience')}, ${col('createdAt')}, ${col('updatedAt')}, ${col('lastUsedAt')})
			 VALUES (:id, :userId, '${scimLabel}', :apiKey, '[]', '${scimAudience}', :createdAt, :createdAt, :lastUsedAt)
			 ON CONFLICT DO NOTHING`,
			{
				id: generateNanoId(),
				userId: row.createdById,
				apiKey: row.token,
				createdAt: row.createdAt,
				lastUsedAt: row.lastUsedAt,
			},
		);
	}
}
