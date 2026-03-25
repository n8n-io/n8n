import type { MigrationContext, ReversibleMigration } from '../migration-types';

const ruleTable = 'role_mapping_rule';
const joinTable = 'role_mapping_rule_project';

/**
 * IAM-396: Role mapping rules — expression → role assignment with ordered
 * evaluation (first match wins) within a rule type. Rules apply to many projects
 * via join table `role_mapping_rule_project`.
 */
export class CreateRoleMappingRuleTable1772800000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(ruleTable)
			.withColumns(
				column('id').varchar(16).primary.notNull,
				column('expression').text.notNull,
				column('role').varchar(128).notNull, // matches slug length of role table
				column('type')
					.varchar(64)
					.notNull.comment(
						"Expected values: 'instance' (maps to a global role) or 'project' (maps to a project role; projects linked via role_mapping_rule_project).",
					),
				column('order').int.notNull,
			)
			.withIndexOn('role')
			.withIndexOn(['type', 'order'])
			.withForeignKey('role', {
				tableName: 'role',
				columnName: 'slug',
				onDelete: 'CASCADE',
				onUpdate: 'CASCADE',
			}).withTimestamps;

		await createTable(joinTable)
			.withColumns(
				column('roleMappingRuleId').varchar(16).primary.notNull,
				column('projectId').varchar(36).primary.notNull,
			)
			.withIndexOn('projectId')
			.withForeignKey('roleMappingRuleId', {
				tableName: ruleTable,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(joinTable);
		await dropTable(ruleTable);
	}
}
