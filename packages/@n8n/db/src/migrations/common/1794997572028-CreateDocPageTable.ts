import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Documentation pages for workflows and agents. A root page belongs to one
 * workflow or agent. A child page hangs below another page and has no resource.
 */
export class CreateDocPageTable1794997572028 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column, createIndex } }: MigrationContext) {
		await createTable('doc_page')
			.withColumns(
				column('id').varchar(36).primary,
				column('projectId').varchar(36).notNull,
				column('parentId').varchar(36).comment('Parent page. Set only on child pages'),
				column('resourceType')
					.varchar(16)
					.withEnumCheck(['workflow', 'agent'])
					.comment('Type of the documented resource. Null on child pages'),
				column('resourceId')
					.varchar(36)
					.comment('Id of the workflow or agent. Null on child pages'),
				column('kind')
					.varchar(16)
					.withEnumCheck(['api', 'schedule', 'event', 'agent'])
					.comment('Template of the page, from the trigger nodes. Null on child pages'),
				column('title').varchar(255).notNull,
				column('content').json.comment('Tiptap editor document. Null until the first save'),
				column('markdown').text.comment('LLM output that waits for the editor to convert it'),
				column('contentText').text.notNull.comment('Plain text for search'),
				column('writtenAgainstVersionId')
					.varchar(36)
					.comment('Published version id of the resource when the page was generated'),
				column('updatedById').uuid,
			)
			.withTimestamps.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('parentId', {
				tableName: 'doc_page',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('updatedById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			.withIndexOn(['projectId'])
			.withIndexOn(['parentId']);

		await createIndex(
			'doc_page',
			['resourceType', 'resourceId'],
			/*isUnique=*/ true,
			/*customIndexName=*/ undefined,
			/*whereClause=*/ '"resourceId" IS NOT NULL',
		);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('doc_page');
	}
}
