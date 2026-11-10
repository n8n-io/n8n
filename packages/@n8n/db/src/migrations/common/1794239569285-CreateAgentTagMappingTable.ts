import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Join table linking agents and tags, mirroring `workflows_tags` and
 * `folder_tag`. Both foreign keys cascade: deleting an agent or a tag
 * removes its mappings.
 */
export class CreateAgentTagMappingTable1794239569285 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('agents_tags')
			.withColumns(column('agentId').varchar(36).primary, column('tagId').varchar(36).primary)
			.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('tagId', {
				tableName: 'tag_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			// The composite key only indexes the `agentId` prefix; tag usage
			// counts, tag-id filters and tag-delete cascades lead with `tagId`.
			.withIndexOn(['tagId']);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agents_tags');
	}
}
