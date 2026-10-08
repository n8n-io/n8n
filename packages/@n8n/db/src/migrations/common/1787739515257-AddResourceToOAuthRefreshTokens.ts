import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE_NAME = 'oauth_refresh_tokens';
const COLUMN_NAME = 'resource';

/**
 * Binds every refresh token to the protected resource its grant was approved for,
 * so rotation reissues the same audience instead of taking one from the request.
 *
 * Existing rows are cleared first: they predate the column and carry no record of
 * the resource they were granted for, so there is nothing to backfill them with.
 * Defaulting them to the instance MCP resource would widen those grants, so they
 * are dropped instead — clients re-run the authorization flow on their next
 * refresh. Access tokens are left alone; they are already audience-bound and
 * expire within the hour, so live sessions are unaffected.
 *
 * Reversible on purpose, following `DisallowOrphanExecutions1693554410387`: the column
 * is NOT NULL with no default, so a downgrade needs it dropped for the older code to
 * insert tokens again. Reversal excludes restoring deleted rows.
 */
export class AddResourceToOAuthRefreshTokens1787739515257 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column }, escape, runQuery }: MigrationContext) {
		await runQuery(`DELETE FROM ${escape.tableName(TABLE_NAME)}`);

		// No default on purpose: an insert that forgets the resource must fail instead
		// of silently binding the grant to something the user never approved.
		await addColumns(
			TABLE_NAME,
			[
				column(COLUMN_NAME)
					.varchar()
					.notNull.comment(
						'RFC 8707 resource indicator the grant was approved for (e.g. https://n8n.example.com/mcp-server/http); ' +
							'the audience of every access token minted from this refresh token.',
					),
			],
			{ recreatesOnSqlite: true },
		);
	}

	/** Reversal excludes restoring the cleared refresh tokens. */
	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(TABLE_NAME, [COLUMN_NAME], { recreatesOnSqlite: true });
	}
}
