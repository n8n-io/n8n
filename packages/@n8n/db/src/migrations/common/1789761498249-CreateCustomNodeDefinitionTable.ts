import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE_NAME = 'custom_node_definition';

/**
 * Stores user-defined Custom Nodes and Custom Operations for the
 * `custom-nodes` module. The full definition (request template, inputs and
 * version history) lives in one JSON column so that the schema stays stable
 * while the definition format evolves.
 */
export class CreateCustomNodeDefinitionTable1789761498249 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(TABLE_NAME).withColumns(
			column('id').varchar(36).primary,
			column('name').varchar(255).notNull,
			column('type')
				.varchar(16)
				.notNull.withEnumCheck(['operation', 'node'])
				.comment('`operation` extends an existing node type, `node` is a standalone custom node.'),
			column('definition').json.notNull.comment(
				'CustomOperationDefinition or CustomNodeDefinition JSON, see @n8n/api-types.',
			),
		).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(TABLE_NAME);
	}
}
