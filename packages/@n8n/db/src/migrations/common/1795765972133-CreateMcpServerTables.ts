import type { MigrationContext, ReversibleMigration } from '../migration-types';

const SERVER_TABLE = 'mcp_server';
const TOOL_TABLE = 'mcp_server_tool';
const CONNECTION_TABLE = 'mcp_server_connection';
const BLOCK_TABLE = 'mcp_server_block';

/**
 * Custom MCP servers: a builder makes a server in a project and adds tools to it. People of the
 * project connect AI clients to it. The tool table has the columns of the later tool kinds
 * (node, agent, skill) from the start.
 */
export class CreateMcpServerTables1795765972133 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.createServerTable(context);
		await this.createToolTable(context);
		await this.createConnectionTable(context);
		await this.createBlockTable(context);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(BLOCK_TABLE);
		await dropTable(CONNECTION_TABLE);
		await dropTable(TOOL_TABLE);
		await dropTable(SERVER_TABLE);
	}

	private async createServerTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(SERVER_TABLE)
			.withColumns(
				column('id').uuid.primary.comment('UUIDv7, made by the application'),
				column('projectId').varchar(36).notNull,
				column('name').varchar(128).notNull,
				column('slug')
					.varchar(128)
					.notNull.comment(
						'Path segment of the server URL. It never changes. A deleted server keeps it, until its project is deleted',
					),
				column('description')
					.text.notNull.default("''")
					.comment('Clients get it as the MCP instructions'),
				column('createdById').uuid.comment('Creator. NULL after the user is deleted'),
				column('deletedAt')
					.timestampTimezone()
					.comment('Soft delete. NULL for a server that is not deleted'),
			)
			.withTimestamps.withIndexOn('slug', true)
			.withIndexOn('projectId')
			.withIndexOn('createdById')
			.withForeignKey('projectId', { tableName: 'project', columnName: 'id', onDelete: 'CASCADE' })
			.withForeignKey('createdById', { tableName: 'user', columnName: 'id', onDelete: 'SET NULL' });
	}

	private async createToolTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(TOOL_TABLE)
			.withColumns(
				column('id').uuid.primary.comment('UUIDv7, made by the application'),
				column('serverId').uuid.notNull,
				column('kind')
					.varchar(16)
					.notNull.withEnumCheck(['workflow', 'node', 'agent', 'skill'])
					.comment('What the tool runs: a workflow, a node, an agent, or a skill'),
				// No foreign key: the target table depends on the kind. A tool stays when its
				// target goes away, so that the builder sees the reason.
				column('targetId')
					.varchar(36)
					.comment('ID of the workflow, agent, or skill. NULL for a node tool'),
				column('toolName')
					.varchar(64)
					.notNull.comment('Name that clients see. Unique in the server'),
				column('description').text.notNull.default("''"),
				column('draftSource')
					.varchar(16)
					.notNull.default("'defaults'")
					.withEnumCheck(['ai', 'defaults', 'edited'])
					.comment(
						'Who wrote the tool text: an AI draft, the defaults of the target, or the builder',
					),
				column('toolData').json.comment(
					'Fixed input values of a workflow tool, or the node definition of a node tool. NULL when the tool has none',
				),
				column('position').int.notNull.default(0).comment('Order of the tool in the server'),
			)
			.withTimestamps.withIndexOn(['serverId', 'toolName'], true)
			.withForeignKey('serverId', {
				tableName: SERVER_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}

	private async createConnectionTable({
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await createTable(CONNECTION_TABLE)
			.withColumns(
				column('serverId').uuid.primary,
				column('userId').uuid.primary,
				column('oauthClientId').varchar().primary,
				column('clientName')
					.varchar(255)
					.notNull.comment('Name from the OAuth client registration, e.g. "Claude Code"'),
				column('firstUsedAt').timestampTimezone().notNull.default('NOW()'),
				column('lastUsedAt')
					.timestampTimezone()
					.notNull.default('NOW()')
					.comment('Updated at most one time each minute'),
			)
			.withIndexOn('userId')
			.withIndexOn('oauthClientId')
			.withForeignKey('serverId', {
				tableName: SERVER_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', { tableName: 'user', columnName: 'id', onDelete: 'CASCADE' })
			.withForeignKey('oauthClientId', {
				tableName: 'oauth_clients',
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}

	private async createBlockTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(BLOCK_TABLE)
			.withColumns(
				column('serverId').uuid.primary,
				column('userId').uuid.primary.comment(
					'The blocked person. The block applies to all clients',
				),
				column('blockedById').uuid.comment(
					'Who blocked the person. NULL after the user is deleted',
				),
				column('blockedAt').timestampTimezone().notNull.default('NOW()'),
			)
			.withIndexOn('userId')
			.withIndexOn('blockedById')
			.withForeignKey('serverId', {
				tableName: SERVER_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', { tableName: 'user', columnName: 'id', onDelete: 'CASCADE' })
			.withForeignKey('blockedById', { tableName: 'user', columnName: 'id', onDelete: 'SET NULL' });
	}
}
