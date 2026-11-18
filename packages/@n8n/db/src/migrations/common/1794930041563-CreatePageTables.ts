import type { MigrationContext, ReversibleMigration } from '../migration-types';

const pageTable = 'page';
const pageReferenceTable = 'page_reference';

export class CreatePageTables1794930041563 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(pageTable)
			.withColumns(
				column('id').varchar(36).primary,
				column('projectId').varchar(36).notNull,
				column('title').varchar(255).notNull,
				column('content')
					.text.notNull.default("''")
					.comment('Markdown. A link to an editor path is a reference to an n8n resource'),
				column('version')
					.int.notNull.default(1)
					.comment('Grows by one on each saved change. Detects edits of a stale copy'),
				column('createdById').uuid.comment('Author. NULL after the author is deleted'),
			)
			.withTimestamps.withIndexOn('projectId')
			.withForeignKey('projectId', { tableName: 'project', columnName: 'id', onDelete: 'CASCADE' })
			.withForeignKey('createdById', { tableName: 'user', columnName: 'id', onDelete: 'SET NULL' });

		await createTable(pageReferenceTable)
			.withColumns(
				column('pageId').varchar(36).primary,
				column('resourceType')
					.varchar(32)
					.primary.withEnumCheck(['workflow', 'node', 'page', 'credential', 'dataTable'])
					.comment('Kind of the n8n resource that the page content links to'),
				column('resourceId')
					.varchar(255)
					.primary.comment('ID of the linked resource. Derived from the page content, so no FK'),
				column('parentResourceId')
					.varchar(255)
					.comment('Workflow ID when resourceType is node. NULL for the other types'),
			)
			.withIndexOn(['resourceType', 'resourceId'])
			.withIndexOn('parentResourceId')
			.withForeignKey('pageId', { tableName: pageTable, columnName: 'id', onDelete: 'CASCADE' });
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(pageReferenceTable);
		await dropTable(pageTable);
	}
}
