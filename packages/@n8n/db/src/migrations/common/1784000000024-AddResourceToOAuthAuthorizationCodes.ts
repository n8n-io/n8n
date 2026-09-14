import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE_NAME = 'oauth_authorization_codes';
const COLUMN_NAME = 'resource';

// NULL in `resource` = legacy flow predating RFC 8707 support; the runtime falls back to the
// instance's canonical MCP resource URL when consuming the code.
export class AddResourceToOAuthAuthorizationCodes1784000000024 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			TABLE_NAME,
			[
				column(COLUMN_NAME)
					.varchar()
					.comment(
						'RFC 8707 resource indicator URI (e.g. https://n8n.example.com/mcp-server/http). ' +
							'NULL = legacy flow predating resource indicator support; defaults to the instance canonical MCP resource URL.',
					),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(TABLE_NAME, [COLUMN_NAME], { recreatesOnSqlite: true });
	}
}
