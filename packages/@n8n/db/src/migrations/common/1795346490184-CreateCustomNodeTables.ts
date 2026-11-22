import type { MigrationContext, ReversibleMigration } from '../migration-types';

const userRef = { tableName: 'user', columnName: 'id', onDelete: 'SET NULL' } as const;

/**
 * Tables for administrator-defined custom nodes and custom actions.
 * An action has versions (the input contract). A version has revisions (the request template).
 */
export class CreateCustomNodeTables1795346490184 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		await this.createCustomNodeTable(ctx);
		await this.createCustomActionTable(ctx);
		await this.createCustomActionVersionTable(ctx);
		await this.createCustomActionRevisionTable(ctx);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('custom_action_revision');
		await dropTable('custom_action_version');
		await dropTable('custom_action');
		await dropTable('custom_node');
	}

	private async createCustomNodeTable({
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await createTable('custom_node')
			.withColumns(
				column('id').varchar(36).primary.comment('Nano ID. The node type name contains it'),
				column('displayName').varchar(128).notNull,
				column('description').text,
				column('baseUrl').text.notNull.comment('Base URL of all requests of the node'),
				column('baseUrlHistory')
					.json.notNull.default("'[]'")
					.comment('Earlier base URLs: array of { baseUrl, changedAt, changedById }'),
				column('auth').json.notNull.comment(
					'Authentication of the node: { kind: "none" | "predefined" | "generic", ... }',
				),
				column('iconMimeType')
					.varchar(32)
					.withEnumCheck(['image/png', 'image/svg+xml'])
					.comment('MIME type of iconData. NULL when the node has no icon'),
				column('iconData').binary.comment('Raw icon bytes, not base64 encoded'),
				column('createdById').uuid,
				column('updatedById').uuid,
				column('createdAt').timestampTimezone().notNull.default('NOW()'),
				column('updatedAt').timestampTimezone().notNull.default('NOW()'),
			)
			.withIndexOn('createdById')
			.withIndexOn('updatedById')
			.withForeignKey('createdById', userRef)
			.withForeignKey('updatedById', userRef);
	}

	private async createCustomActionTable({
		schemaBuilder: { createTable, column },
		escape,
		tablePrefix,
	}: MigrationContext) {
		const parentNodeType = escape.columnName('parentNodeType');
		const customNodeId = escape.columnName('customNodeId');

		await createTable('custom_action')
			.withColumns(
				column('id').varchar(36).primary.comment('Nano ID'),
				column('name').varchar(128).notNull,
				column('description').text,
				column('parentNodeType')
					.varchar(255)
					.comment('Type of the built-in node that shows this action. NULL for a custom node'),
				column('customNodeId').varchar(36),
				column('createdById').uuid,
				column('updatedById').uuid,
				column('createdAt').timestampTimezone().notNull.default('NOW()'),
				column('updatedAt').timestampTimezone().notNull.default('NOW()'),
			)
			.withCheck(
				`CHK_${tablePrefix}custom_action_parent`,
				`(${parentNodeType} IS NOT NULL AND ${customNodeId} IS NULL) OR (${parentNodeType} IS NULL AND ${customNodeId} IS NOT NULL)`,
			)
			.withIndexOn('customNodeId')
			.withIndexOn('parentNodeType')
			.withIndexOn('createdById')
			.withIndexOn('updatedById')
			.withForeignKey('customNodeId', {
				tableName: 'custom_node',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('createdById', userRef)
			.withForeignKey('updatedById', userRef);
	}

	private async createCustomActionVersionTable({
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await createTable('custom_action_version')
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('actionId').varchar(36).notNull,
				column('version').int.notNull.comment('Version number in the action, starts at 1'),
				column('inputs').json.notNull.comment(
					'Input contract of the version: array of input definitions',
				),
				column('currentRevision').int.notNull.comment(
					'Revision number of the request that executions of this version use',
				),
			)
			.withCreatedAt.withIndexOn(['actionId', 'version'], true)
			.withForeignKey('actionId', {
				tableName: 'custom_action',
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}

	private async createCustomActionRevisionTable({
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await createTable('custom_action_revision')
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('versionId').int.notNull,
				column('revision').int.notNull.comment('Revision number in the version, starts at 1'),
				column('request').json.notNull.comment(
					'Request template: method, URL, headers, query, body and the target of each input',
				),
				column('changeNote').text,
				column('createdById').uuid,
			)
			.withCreatedAt.withIndexOn(['versionId', 'revision'], true)
			.withIndexOn('createdById')
			.withForeignKey('versionId', {
				tableName: 'custom_action_version',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('createdById', userRef);
	}
}
