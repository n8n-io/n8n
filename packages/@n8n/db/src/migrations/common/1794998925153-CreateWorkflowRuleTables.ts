import type { MigrationContext, ReversibleMigration } from '../migration-types';

const RULE_SET_TABLE = 'workflow_rule_set';
const EXEMPTION_TABLE = 'workflow_rule_exemption';

/**
 * Storage for Workflow Rules: one rule set for the instance and at most one for each
 * project, plus per-workflow exemptions from single rules.
 */
export class CreateWorkflowRuleTables1794998925153 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, createIndex, column }, tablePrefix }: MigrationContext) {
		await createTable(RULE_SET_TABLE)
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('scope')
					.varchar(16)
					.notNull.withEnumCheck(['instance', 'project'])
					.comment(
						'instance: the rule set for every workflow. project: extra rules for one project',
					),
				column('projectId').varchar(36).comment('NULL for the instance rule set'),
				column('config').json.notNull.comment(
					'The rule set: catalogue rule settings and custom rules, validated by @n8n/workflow-rules',
				),
				column('version')
					.int.notNull.default(1)
					.comment('Increments on each write. Used for optimistic locking'),
				column('updatedById').uuid.comment(
					'The last user who saved the rule set. NULL after the user was deleted',
				),
			)
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('updatedById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			}).withTimestamps;

		// NULLs are distinct in unique indexes on Postgres and SQLite, so two partial indexes
		// allow one row for each project and exactly one instance row.
		await createIndex(
			RULE_SET_TABLE,
			['projectId'],
			true,
			`${tablePrefix}uq_workflow_rule_set_project`,
			'"projectId" IS NOT NULL',
		);
		await createIndex(
			RULE_SET_TABLE,
			['scope'],
			true,
			`${tablePrefix}uq_workflow_rule_set_instance`,
			'"projectId" IS NULL',
		);

		// The unique pair also serves lookups by workflow, so no separate workflowId index.
		await createTable(EXEMPTION_TABLE)
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('workflowId').varchar(36).notNull,
				column('ruleId').varchar(80).notNull.comment('A catalogue rule id or a custom rule id'),
				column('reason').text.notNull,
				column('createdById').uuid.comment(
					'The admin who granted the exemption. NULL after the user was deleted',
				),
			)
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('createdById', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'SET NULL',
			}).withTimestamps;

		await createIndex(
			EXEMPTION_TABLE,
			['workflowId', 'ruleId'],
			true,
			`${tablePrefix}uq_workflow_rule_exemption_workflow_rule`,
		);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(EXEMPTION_TABLE);
		await dropTable(RULE_SET_TABLE);
	}
}
