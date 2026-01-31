import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddPublishedVersionIdToWorkflowDependency1769000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column, createIndex } }: MigrationContext) {
		await addColumns('workflow_dependency', [column('publishedVersionId').varchar(36)]);
		await createIndex('workflow_dependency', ['publishedVersionId']);
	}

	async down({ schemaBuilder: { dropColumns, dropIndex } }: MigrationContext) {
		await dropIndex('workflow_dependency', ['publishedVersionId']);
		await dropColumns('workflow_dependency', ['publishedVersionId']);
	}
}
