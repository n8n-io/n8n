import { createHash } from 'node:crypto';

import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const tableName = 'scim_token';

/** The audience that SCIM keys had in `user_api_keys`. */
const scimAudience = 'scim-api';

/** The settings page shows this many last characters of the token. */
const tokenHintLength = 4;

type ScimApiKeyRow = {
	apiKey: string;
	userId: string;
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
 *
 * The table keeps only a SHA-256 hash of the token and its last four
 * characters. The token is shown once, when it is created, so no code path
 * needs the value again.
 *
 * Irreversible: `up()` deletes the SCIM keys from `user_api_keys` and keeps
 * only the hash, so a `down()` cannot restore a working key. After a
 * downgrade, an admin generates a new SCIM token and enters it in the
 * identity provider.
 */
export class CreateScimTokenTable1792408455181 implements IrreversibleMigration {
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
				column('tokenHash')
					.varchar(64)
					.notNull.comment(
						'Hex SHA-256 hash of the signed JWT that the identity provider sends as its bearer token',
					),
				column('tokenHint')
					.varchar(tokenHintLength)
					.notNull.comment('Last four characters of the token, so that admins can identify it'),
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

	/**
	 * Copies the newest SCIM key that authenticates before this migration. The
	 * previous check accepted a key only while its user was not disabled and
	 * held `scim:manage`. An identity provider that uses this key keeps working.
	 */
	private async keepNewestWorkingScimKey({ escape, runQuery }: MigrationContext) {
		const apiKey = escape.tableName('user_api_keys');
		const user = escape.tableName('user');
		const roleScope = escape.tableName('role_scope');
		const col = (name: string) => escape.columnName(name);

		const [key] = await runQuery<ScimApiKeyRow[]>(
			`SELECT k.${col('apiKey')} AS ${col('apiKey')}, k.${col('userId')} AS ${col('userId')},
			        k.${col('createdAt')} AS ${col('createdAt')}, k.${col('lastUsedAt')} AS ${col('lastUsedAt')}
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

		if (!key) return;

		await runQuery(
			`INSERT INTO ${escape.tableName(tableName)}
			 (${col('tokenHash')}, ${col('tokenHint')}, ${col('createdById')}, ${col('createdAt')}, ${col('lastUsedAt')})
			 VALUES (:tokenHash, :tokenHint, :createdById, :createdAt, :lastUsedAt)`,
			{
				tokenHash: createHash('sha256').update(key.apiKey).digest('hex'),
				tokenHint: key.apiKey.slice(-tokenHintLength),
				createdById: key.userId,
				createdAt: key.createdAt,
				lastUsedAt: key.lastUsedAt,
			},
		);
	}

	private async deleteScimKeys({ escape, runQuery }: MigrationContext) {
		await runQuery(
			`DELETE FROM ${escape.tableName('user_api_keys')} WHERE ${escape.columnName('audience')} = '${scimAudience}'`,
		);
	}
}
