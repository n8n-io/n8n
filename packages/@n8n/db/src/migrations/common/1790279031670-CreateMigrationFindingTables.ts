import type { MigrationContext, ReversibleMigration } from '../migration-types';

const FINDING_TABLE = 'migration_finding';
const SYNC_TABLE = 'migration_finding_sync';

// Inlined on purpose: a migration must not import live enums from other packages.
const TARGET_VERSIONS = ['v2', 'v3'];
const FINDING_STATUSES = ['open', 'notified', 'fixed', 'fixed_unpublished', 'wont_fix'];

/**
 * Persists the migration report. `migration_finding` holds one row per
 * workflow x rule x target version, so a finding keeps its identity and its
 * triage state across scans. `migration_finding_sync` records when the last
 * scan for a target version wrote to the finding table.
 */
export class CreateMigrationFindingTables1790279031670 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.createFindingTable(context);
		await this.createSyncTable(context);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(SYNC_TABLE);
		await dropTable(FINDING_TABLE);
	}

	private async createFindingTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(FINDING_TABLE)
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('targetVersion')
					.varchar(16)
					.notNull.withEnumCheck(TARGET_VERSIONS)
					.comment('BreakingChangeVersion enum: the n8n major version the finding applies to.'),
				column('ruleId')
					.varchar(128)
					.notNull.comment('Id of the breaking-change rule that produced the finding.'),
				column('workflowId').varchar(36).notNull,
				column('status')
					.varchar(32)
					.notNull.default("'open'")
					.withEnumCheck(FINDING_STATUSES)
					.comment(
						'MigrationFindingStatus enum: "open", "notified", "fixed", "fixed_unpublished", "wont_fix".',
					),
				column('note').text.comment('Free-text triage note set by a user.'),
				column('notifiedAt')
					.timestampTimezone()
					.comment('When the workflow owner was last notified. NULL when never notified.'),
				column('statusChangedAt')
					.timestampTimezone()
					.notNull.comment('When `status` last changed. Set on insert.'),
			)
			.withTimestamps.withIndexOn(['targetVersion', 'ruleId', 'workflowId'], true)
			// The cascade delete and the per-workflow lookups both hit this column.
			.withIndexOn(['workflowId'])
			// A finding is meaningless without its workflow.
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}

	private async createSyncTable({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(SYNC_TABLE).withColumns(
			column('targetVersion')
				.varchar(16)
				.primary.withEnumCheck(TARGET_VERSIONS)
				.comment('BreakingChangeVersion enum: one sync record per target version.'),
			column('syncedAt')
				.timestampTimezone()
				.notNull.comment('When the last scan for this target version wrote to migration_finding.'),
			column('ruleSetFingerprint')
				.varchar(128)
				.notNull.comment(
					'Hash of the rule ids active during the last scan. A change triggers a full re-scan.',
				),
		);
	}
}
