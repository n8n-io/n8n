import type { MigrationContext, ReversibleMigration } from '../migration-types';

const RUN_TABLE = 'promotion_run';
const CONNECTION_TABLE = 'promotion_connection';
const PROJECT_TABLE = 'project';
const USER_TABLE = 'user';

/**
 * One row per Promote that opened a merge request on a Git host. The row holds
 * what n8n knows at promote time, a reference to the merge request, and a cache
 * of the merge request state. The host is authoritative while the run is open;
 * n8n is authoritative once the state is terminal.
 */
export class CreatePromotionRunTable1791212100192 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, createIndex, column }, tablePrefix }: MigrationContext) {
		await createTable(RUN_TABLE)
			.withColumns(
				column('id').varchar(36).primary,
				column('connectionId')
					.varchar(36)
					.comment('The connection that pushed the run. NULL after the connection is deleted.'),
				column('projectId')
					.varchar(36)
					.comment('The n8n project of a project-scoped promote. NULL for an instance promote.'),
				column('createdById').uuid.comment('The user who ran Promote.'),
				column('branchName').varchar(255).notNull.comment('The promotion branch that was pushed.'),
				column('commitSha').varchar(64).notNull.comment('The pushed commit.'),
				column('baselineCommitSha')
					.varchar(64)
					.comment(
						'The Review Baseline, frozen when the run leaves "open". NULL while open: computed at read time.',
					),
				column('title').varchar(255).notNull.comment('The merge request title.'),
				column('gitlabProjectId').int.notNull.comment(
					'Numeric GitLab project id. Stable across repository renames.',
				),
				column('mergeRequestIid').int.notNull.comment(
					'Merge request iid, scoped to the GitLab project.',
				),
				column('webUrl').text.notNull.comment('Merge request URL on the Git host.'),
				column('state')
					.varchar(16)
					.notNull.default("'open'")
					.withEnumCheck(['open', 'merged', 'closed', 'unavailable'])
					.comment(
						'PromotionRunState enum: "open", "merged", "closed", "unavailable". Only "open" rows are refreshed from the host.',
					),
				column('hasConflicts').bool.notNull.default(false),
				column('lastSyncedAt')
					.timestampTimezone()
					.comment('When the state was last read from the host. NULL before the first read.'),
				column('mergedAt').timestampTimezone(),
				column('closedAt').timestampTimezone(),
				column('approvedById').uuid.comment('The n8n user who approved the run in n8n.'),
				column('approvedAt').timestampTimezone(),
			)
			.withTimestamps.withForeignKey('connectionId', {
				tableName: CONNECTION_TABLE,
				columnName: 'id',
				onDelete: 'SET NULL',
				name: `FK_${tablePrefix}promotion_run_connectionId`,
			})
			.withForeignKey('projectId', {
				tableName: PROJECT_TABLE,
				columnName: 'id',
				onDelete: 'SET NULL',
				name: `FK_${tablePrefix}promotion_run_projectId`,
			})
			.withForeignKey('createdById', {
				tableName: USER_TABLE,
				columnName: 'id',
				onDelete: 'SET NULL',
				name: `FK_${tablePrefix}promotion_run_createdById`,
			})
			.withForeignKey('approvedById', {
				tableName: USER_TABLE,
				columnName: 'id',
				onDelete: 'SET NULL',
				name: `FK_${tablePrefix}promotion_run_approvedById`,
			});

		// The inbox lists by state and orders by creation time.
		await createIndex(RUN_TABLE, ['state', 'createdAt']);
		// Index the foreign key, for the SET NULL on connection delete.
		await createIndex(RUN_TABLE, ['connectionId']);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(RUN_TABLE);
	}
}
