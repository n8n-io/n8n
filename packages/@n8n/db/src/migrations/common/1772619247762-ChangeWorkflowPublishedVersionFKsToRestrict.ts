import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Changes the foreign key constraints on workflow_published_version from CASCADE
 * to RESTRICT. CASCADE could silently remove the published version mapping while
 * triggers and webhooks are still running. RESTRICT ensures the mapping must be
 * explicitly removed (via deactivation) before the referenced rows can be deleted.
 */
export class ChangeWorkflowPublishedVersionFKsToRestrict1772619247762
	implements ReversibleMigration
{
	async up({ schemaBuilder: { dropForeignKey, addForeignKey } }: MigrationContext) {
		await dropForeignKey('workflow_published_version', 'workflowId', ['workflow_entity', 'id']);
		await addForeignKey(
			'workflow_published_version',
			'workflowId',
			['workflow_entity', 'id'],
			undefined,
			'RESTRICT',
		);

		await dropForeignKey('workflow_published_version', 'publishedVersionId', [
			'workflow_history',
			'versionId',
		]);
		await addForeignKey(
			'workflow_published_version',
			'publishedVersionId',
			['workflow_history', 'versionId'],
			undefined,
			'RESTRICT',
		);
	}

	async down({ schemaBuilder: { dropForeignKey, addForeignKey } }: MigrationContext) {
		await dropForeignKey('workflow_published_version', 'workflowId', ['workflow_entity', 'id']);
		await addForeignKey(
			'workflow_published_version',
			'workflowId',
			['workflow_entity', 'id'],
			undefined,
			'CASCADE',
		);

		await dropForeignKey('workflow_published_version', 'publishedVersionId', [
			'workflow_history',
			'versionId',
		]);
		await addForeignKey(
			'workflow_published_version',
			'publishedVersionId',
			['workflow_history', 'versionId'],
			undefined,
			'CASCADE',
		);
	}
}
