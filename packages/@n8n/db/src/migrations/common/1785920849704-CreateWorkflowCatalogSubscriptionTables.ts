import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Two tables behind running a catalog workflow on your own schedule.
 *
 * They are split because the keys differ: consent is one grant per
 * (workflow, person), while one person may want several schedules for the same
 * workflow. A subscription therefore hangs off the grant by composite foreign
 * key, so revoking consent takes the schedules with it.
 */
export class CreateWorkflowCatalogSubscriptionTables1785920849704 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('workflow_credential_binding')
			.withColumns(
				column('workflowId').varchar(36).primary,
				column('userId').uuid.primary,
				column('status')
					.varchar(16)
					.notNull.default("'active'")
					.withEnumCheck(['active', 'revoked'])
					.comment(
						"Whether the person still consents to this workflow running as them; 'revoked' keeps the row rather than deleting the audit trail",
					),
				column('consentAt')
					.timestampTimezone()
					.notNull.comment('When consent was last given; reset when a revoked grant is renewed'),
			)
			.withTimestamps // The primary key indexes workflowId first, so this serves the other
			// direction: the grants one person has given.
			.withIndexOn(['userId'])
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			});

		await createTable('workflow_subscription')
			.withColumns(
				column('id').varchar(36).primary,
				column('workflowId').varchar(36).notNull,
				column('userId').uuid.notNull,
				column('cronExpression')
					.varchar(255)
					.notNull.comment("When this person's run fires, as a 5- or 6-field cron expression"),
				column('timezone')
					.varchar(255)
					.notNull.comment('IANA zone the cron expression is read in, e.g. Europe/Berlin'),
				column('inputs').json.notNull.comment(
					"Values for the fields the workflow's trigger declares, filtered against that contract before each run",
				),
				column('enabled')
					.bool.notNull.default(true)
					.comment(
						'A paused subscription keeps its row and inputs; its scheduler jobs are removed',
					),
			)
			.withTimestamps // "My subscriptions", and the lookup the composite foreign key needs.
			.withIndexOn(['workflowId', 'userId'])
			.withIndexOn(['userId'])
			.withForeignKey(['workflowId', 'userId'], {
				tableName: 'workflow_credential_binding',
				columnName: ['workflowId', 'userId'],
				onDelete: 'CASCADE',
			});
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		// Subscriptions first: they hold the foreign key into the bindings.
		await dropTable('workflow_subscription');
		await dropTable('workflow_credential_binding');
	}
}
