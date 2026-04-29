import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddRestoreFieldsToWorkflowBuilderSession1774280963551 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('workflow_builder_session', [
			column('activeVersionCardId').varchar(255),
			column('resumeAfterRestoreMessageId').varchar(255),
		]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('workflow_builder_session', [
			'activeVersionCardId',
			'resumeAfterRestoreMessageId',
		]);
	}
}
