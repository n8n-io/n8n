import type { MigrationContext, ReversibleMigration } from '../migration-types';

const OWNER_TABLE = 'migration_workflow_owner';

// Inlined on purpose: a migration must not import live enums from other packages.
const OWNER_SOURCES = ['suggested', 'assigned'];

/**
 * The user responsible for fixing a workflow's migration findings, one row per
 * workflow. `source` tells a heuristic suggestion from a choice a person made,
 * so a re-run of the heuristic never overwrites an assignment. The row goes
 * with its workflow. A deleted user leaves the row with no user, which reads
 * as unassigned.
 */
export class CreateMigrationWorkflowOwnerTable1791366497000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(OWNER_TABLE)
			.withColumns(
				column('workflowId').varchar(36).primary,
				column('userId').uuid.comment('The owner. NULL after the user was deleted.'),
				column('source')
					.varchar(16)
					.notNull.withEnumCheck(OWNER_SOURCES)
					.comment(
						'MigrationOwnerSource enum: "suggested" by the heuristic, or "assigned" by a person.',
					),
				column('assignedById').uuid.comment(
					'Who assigned the owner. NULL for a suggestion, or after that user was deleted.',
				),
				column('assignedAt')
					.timestampTimezone()
					.comment('When a person assigned the owner. NULL for a suggestion.'),
			)
			.withTimestamps.withIndexOn(['userId'])
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			})
			.withForeignKey('assignedById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			});
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(OWNER_TABLE);
	}
}
