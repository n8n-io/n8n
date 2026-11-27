import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE = 'execution_limit_audit';

const FIELDS_BEFORE = [
	'periodUnit',
	'instanceMaxExecutions',
	'defaultProjectMaxExecutions',
	'projectMaxExecutions',
];
const POLICY_FIELDS = ['policy', 'projectPolicy', 'newProjectsPolicy', 'personalProjectsPolicy'];
const PROJECT_FIELDS_BEFORE = ['projectMaxExecutions'];

const COMMENTS_BEFORE = {
	field:
		'What changed. periodUnit, instanceMaxExecutions and defaultProjectMaxExecutions are ' +
		'the instance settings in features.executionLimits. projectMaxExecutions is the ' +
		'limit of the project in projectId',
	oldValue:
		'Value before the change: a period unit or a maximum number of executions. NULL for no limit',
	newValue:
		'Value after the change: a period unit or a maximum number of executions. NULL for no limit',
};
const VALUE_COMMENT =
	'a period unit, a maximum number of executions, the name and the maximum of a policy, ' +
	'or a policy ID. NULL for no value';
const COMMENTS_AFTER = {
	field:
		'What changed. periodUnit and instanceMaxExecutions are the instance settings in ' +
		'features.executionLimits. policy is the name or the maximum of the policy in policyId. ' +
		'projectPolicy is the policy of the project in projectId. newProjectsPolicy and ' +
		'personalProjectsPolicy are the policy of that project group. ' +
		'defaultProjectMaxExecutions and projectMaxExecutions are from earlier versions',
	oldValue: `Value before the change: ${VALUE_COMMENT}`,
	newValue: `Value after the change: ${VALUE_COMMENT}`,
};

const quoted = (values: string[]) => values.map((value) => `'${value}'`).join(', ');

/**
 * Lets the audit table record a change to an execution limit policy and a change to
 * the policy of a project or a project group. SQLite has its own file.
 */
export class ExpandExecutionLimitAuditForPolicies1795781487123 implements ReversibleMigration {
	async up(context: MigrationContext) {
		const { runQuery, escape, tablePrefix } = context;
		const table = escape.tableName(TABLE);
		const policyId = escape.columnName('policyId');

		await runQuery(`ALTER TABLE ${table} ADD COLUMN ${policyId} uuid`);
		await runQuery(
			`COMMENT ON COLUMN ${table}.${policyId} IS 'Policy that changed, or the policy that was assigned or removed. NULL for a change to the instance settings. No foreign key, so the row stays when the policy is deleted'`,
		);
		await this.replaceChecks(
			context,
			[...FIELDS_BEFORE, ...POLICY_FIELDS],
			[...PROJECT_FIELDS_BEFORE, 'projectPolicy'],
			COMMENTS_AFTER,
		);
		await runQuery(
			`ALTER TABLE ${table} ADD CONSTRAINT "CHK_${tablePrefix}${TABLE}_policy_field" CHECK (${escape.columnName('field')} NOT IN (${quoted(POLICY_FIELDS)}) OR ${policyId} IS NOT NULL)`,
		);
	}

	async down(context: MigrationContext) {
		const { runQuery, escape, tablePrefix } = context;
		const table = escape.tableName(TABLE);

		// The old checks reject these rows, so the policy history is lost.
		await runQuery(
			`DELETE FROM ${table} WHERE ${escape.columnName('field')} IN (${quoted(POLICY_FIELDS)})`,
		);
		await runQuery(
			`ALTER TABLE ${table} DROP CONSTRAINT "CHK_${tablePrefix}${TABLE}_policy_field"`,
		);
		await this.replaceChecks(context, FIELDS_BEFORE, PROJECT_FIELDS_BEFORE, COMMENTS_BEFORE);
		await runQuery(`ALTER TABLE ${table} DROP COLUMN ${escape.columnName('policyId')}`);
	}

	private async replaceChecks(
		{ runQuery, escape, tablePrefix }: MigrationContext,
		fields: string[],
		projectFields: string[],
		comments: typeof COMMENTS_AFTER,
	) {
		const table = escape.tableName(TABLE);
		const field = escape.columnName('field');
		const projectId = escape.columnName('projectId');
		const fieldCheck = `"CHK_${tablePrefix}${TABLE}_field"`;
		const projectCheck = `"CHK_${tablePrefix}${TABLE}_project_field"`;
		const inProjectFields = `${field} IN (${quoted(projectFields)})`;

		await runQuery(`ALTER TABLE ${table} DROP CONSTRAINT ${fieldCheck}`);
		await runQuery(
			`ALTER TABLE ${table} ADD CONSTRAINT ${fieldCheck} CHECK (${field} IN (${quoted(fields)}))`,
		);

		// A row has a project when, and only when, its field is a field of a project.
		await runQuery(`ALTER TABLE ${table} DROP CONSTRAINT ${projectCheck}`);
		await runQuery(
			`ALTER TABLE ${table} ADD CONSTRAINT ${projectCheck} CHECK ((${inProjectFields} AND ${projectId} IS NOT NULL) OR (NOT ${inProjectFields} AND ${projectId} IS NULL))`,
		);

		for (const [column, comment] of Object.entries(comments)) {
			await runQuery(`COMMENT ON COLUMN ${table}.${escape.columnName(column)} IS '${comment}'`);
		}
	}
}
