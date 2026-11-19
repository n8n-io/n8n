import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE = 'execution_limit_audit';

export class CreateExecutionLimitAuditTable1795103803888 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(TABLE).withColumns(
			column('id').int.primary.autoGenerate2,
			column('projectId')
				.varchar(36)
				.comment(
					'Project whose execution limit changed. NULL for a change to the instance settings. ' +
						'No foreign key, so the row stays when the project is deleted',
				),
			column('field')
				.varchar(32)
				.notNull.withEnumCheck([
					'periodUnit',
					'instanceMaxExecutions',
					'defaultProjectMaxExecutions',
					'projectMaxExecutions',
				])
				.comment(
					'What changed. periodUnit, instanceMaxExecutions and defaultProjectMaxExecutions are ' +
						'the instance settings in features.executionLimits. projectMaxExecutions is the ' +
						'limit of the project in projectId',
				),
			column('oldValue').json.comment(
				'Value before the change: a period unit or a maximum number of executions. NULL for no limit',
			),
			column('newValue').json.comment(
				'Value after the change: a period unit or a maximum number of executions. NULL for no limit',
			),
			column('updatedBy').uuid.comment(
				'User who made the change. NULL for a change that n8n made. ' +
					'No foreign key, so the row stays when the user is deleted',
			),
		).withCreatedAt;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(TABLE);
	}
}
