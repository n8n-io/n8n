import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Adds versionId and activeVersionId to the agents table, mirroring the
 * WorkflowEntity pattern for tracking unpublished changes without a JSON diff:
 *   hasUnpublishedChanges = agent.versionId !== agent.activeVersionId
 */
export class AddPublishVersionTracking1781000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('agents', [
			column('versionId').varchar(36),
			column('activeVersionId').varchar(36),
		]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('agents', ['versionId', 'activeVersionId']);
	}
}
