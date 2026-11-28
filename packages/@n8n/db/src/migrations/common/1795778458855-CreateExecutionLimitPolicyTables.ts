import type { MigrationContext, ReversibleMigration } from '../migration-types';

const POLICY_TABLE = 'execution_limit_policy';
const ASSIGNMENT_TABLE = 'execution_limit_policy_assignment';
const GROUP_ASSIGNMENT_TABLE = 'execution_limit_policy_group_assignment';
const PROJECT_LIMIT_TABLE = 'project_execution_limit';

/**
 * Named execution limit policies replace the limit of one project. A policy applies to
 * the projects and the project groups that it is assigned to.
 */
export class CreateExecutionLimitPolicyTables1795778458855 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.createPolicyTable(context);
		await this.createAssignmentTable(context);
		await this.createGroupAssignmentTable(context);

		// No route can write to this table, so it has no rows to convert.
		await context.schemaBuilder.dropTable(PROJECT_LIMIT_TABLE);
	}

	async down(context: MigrationContext) {
		const { dropTable } = context.schemaBuilder;

		await dropTable(GROUP_ASSIGNMENT_TABLE);
		await dropTable(ASSIGNMENT_TABLE);
		await dropTable(POLICY_TABLE);
		await this.createProjectLimitTable(context);
	}

	private async createPolicyTable({
		schemaBuilder: { createTable, column },
		escape,
		tablePrefix,
	}: MigrationContext) {
		await createTable(POLICY_TABLE)
			.withColumns(
				column('id').uuid.primary.comment('UUIDv7, made by the application'),
				column('name').varchar(128).notNull,
				column('maxExecutions').int.notNull.comment(
					'Maximum number of executions for each project of the policy in one period. The instance setting features.executionLimits sets the period',
				),
			)
			.withTimestamps.withIndexOn('name', true)
			.withCheck(
				`CHK_${tablePrefix}${POLICY_TABLE}_max_executions_positive`,
				`${escape.columnName('maxExecutions')} > 0`,
			);
	}

	private async createAssignmentTable({
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await createTable(ASSIGNMENT_TABLE)
			.withColumns(column('policyId').uuid.primary, column('projectId').varchar(36).primary)
			.withCreatedAt.withIndexOn('projectId')
			.withForeignKey('policyId', {
				tableName: POLICY_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}

	private async createGroupAssignmentTable({
		schemaBuilder: { createTable, column },
	}: MigrationContext) {
		await createTable(GROUP_ASSIGNMENT_TABLE)
			.withColumns(
				column('policyId').uuid.primary,
				column('group')
					.varchar(32)
					.primary.withEnumCheck(['newProjects', 'personalProjects'])
					.comment(
						'Projects that get the policy. newProjects is each new team project. personalProjects is each personal project',
					),
			)
			.withCreatedAt.withForeignKey('policyId', {
				tableName: POLICY_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}

	private async createProjectLimitTable({
		schemaBuilder: { createTable, column },
		escape,
		tablePrefix,
	}: MigrationContext) {
		await createTable(PROJECT_LIMIT_TABLE)
			.withColumns(
				column('projectId').varchar(36).primary,
				column('maxExecutions').int.notNull.comment(
					'Maximum number of executions for the project in one period. The instance setting features.executionLimits sets the period',
				),
			)
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}${PROJECT_LIMIT_TABLE}_projectId`,
			})
			.withCheck(
				`CHK_${tablePrefix}${PROJECT_LIMIT_TABLE}_max_executions_positive`,
				`${escape.columnName('maxExecutions')} > 0`,
			).withTimestamps;
	}
}
