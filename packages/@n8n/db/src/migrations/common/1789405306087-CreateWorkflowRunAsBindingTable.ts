import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'workflow_run_as_binding';

export class CreateWorkflowRunAsBindingTable1789405306087 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column, createIndex } }: MigrationContext) {
		await createTable(tableName)
			.withColumns(
				column('id').uuid.primary,
				column('workflowId').varchar(36).notNull,
				column('userId').uuid.notNull.comment('The n8n user scheduled runs execute as'),
				column('setBy').uuid.comment(
					'Who claimed the binding. The service enforces setBy equal to userId.',
				),
				column('status')
					.varchar(16)
					.notNull.withEnumCheck(['active', 'revoked'])
					.comment('active: scheduled runs use userId. revoked: kept for audit only.'),
			)
			.withTimestamps.withIndexOn(['userId'])
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', { tableName: 'user', columnName: 'id', onDelete: 'CASCADE' })
			.withForeignKey('setBy', { tableName: 'user', columnName: 'id', onDelete: 'SET NULL' });

		// One active binding per workflow. Revoked rows stay for audit.
		await createIndex(tableName, ['workflowId'], true, undefined, '"status" = \'active\'');
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
