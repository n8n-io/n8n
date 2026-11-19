import type { MigrationContext, ReversibleMigration } from '../migration-types';

const SERVER = 'mcp_server';
const TOOL = 'mcp_server_tool';
const RESOURCE = 'mcp_server_resource';
const API_KEY = 'mcp_server_api_key';
const CALL = 'mcp_server_call';

export class CreateMcpServersTables1794600000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column }, tablePrefix }: MigrationContext) {
		await createTable(SERVER)
			.withColumns(
				column('id').varchar(36).primary,
				column('slug').varchar(64).notNull,
				column('name').varchar(128).notNull,
				column('description').text.notNull,
				column('instructions').text.notNull,
				column('active').bool.notNull.default(true),
				column('accessMode').varchar(16).notNull.default("'apiKey'"),
				column('rateLimitPerMinute').int.notNull.default(60),
				column('shareVisibility').varchar(16).notNull.default("'instance'"),
				column('confirmDestructive').bool.notNull.default(true),
				column('confirmWrite').bool.notNull.default(false),
				column('revokedUserIds').json,
				column('ownerId').uuid.notNull,
			)
			.withTimestamps.withIndexOn('slug', true)
			.withForeignKey('ownerId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}${SERVER}_ownerId`,
			});

		await createTable(TOOL)
			.withColumns(
				column('id').varchar(36).primary,
				column('serverId').varchar(36).notNull,
				column('kind').varchar(16).notNull,
				column('targetId').varchar(36).notNull,
				column('name').varchar(64),
				column('description').text,
				column('behavior').varchar(16).notNull.default("'read'"),
				column('inputs').json,
				column('enabled').bool.notNull.default(true),
				column('position').int.notNull.default(0),
			)
			.withTimestamps.withIndexOn('serverId')
			.withForeignKey('serverId', {
				tableName: SERVER,
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}${TOOL}_serverId`,
			});

		await createTable(RESOURCE)
			.withColumns(
				column('id').varchar(36).primary,
				column('serverId').varchar(36).notNull,
				column('kind').varchar(16).notNull,
				column('targetId').varchar(36),
				column('name').varchar(256).notNull,
				column('description').text.notNull,
				column('content').text,
				column('mimeType').varchar(128).notNull.default("'text/plain'"),
			)
			.withTimestamps.withIndexOn('serverId')
			.withForeignKey('serverId', {
				tableName: SERVER,
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}${RESOURCE}_serverId`,
			});

		await createTable(API_KEY)
			.withColumns(
				column('id').varchar(36).primary,
				column('serverId').varchar(36).notNull,
				column('label').varchar(128).notNull,
				column('keyHash').varchar(128).notNull,
				column('keyHint').varchar(16).notNull,
				column('lastUsedAt').timestampTimezone(3),
			)
			.withTimestamps.withIndexOn('serverId')
			.withIndexOn('keyHash', true)
			.withForeignKey('serverId', {
				tableName: SERVER,
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}${API_KEY}_serverId`,
			});

		await createTable(CALL)
			.withColumns(
				column('id').varchar(36).primary,
				column('serverId').varchar(36).notNull,
				column('kind').varchar(16).notNull,
				column('name').varchar(256).notNull,
				column('callerType').varchar(16).notNull,
				column('caller').varchar(320).notNull,
				column('callerUserId').uuid,
				column('apiKeyId').varchar(36),
				column('clientName').varchar(128),
				column('status').varchar(16).notNull,
				column('durationMs').int,
				column('input').text,
				column('output').text,
				column('error').text,
				column('executionId').varchar(36),
				column('workflowId').varchar(36),
			)
			.withTimestamps.withIndexOn(['serverId', 'createdAt'])
			.withForeignKey('serverId', {
				tableName: SERVER,
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}${CALL}_serverId`,
			});
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(CALL);
		await dropTable(API_KEY);
		await dropTable(RESOURCE);
		await dropTable(TOOL);
		await dropTable(SERVER);
	}
}
