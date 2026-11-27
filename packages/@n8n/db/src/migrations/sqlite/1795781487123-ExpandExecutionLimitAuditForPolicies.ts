import { UnexpectedError } from '@n8n/errors';

import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE = 'execution_limit_audit';
const COPY = 'execution_limit_audit_copy';

const FIELDS_BEFORE = [
	'periodUnit',
	'instanceMaxExecutions',
	'defaultProjectMaxExecutions',
	'projectMaxExecutions',
];
const POLICY_FIELDS = ['policy', 'projectPolicy', 'newProjectsPolicy', 'personalProjectsPolicy'];
const PROJECT_FIELDS_BEFORE = ['projectMaxExecutions'];
const COLUMNS_BEFORE = [
	'id',
	'projectId',
	'field',
	'oldValue',
	'newValue',
	'updatedBy',
	'loginId',
	'createdAt',
];

const quoted = (values: string[]) => values.map((value) => `'${value}'`).join(', ');

/**
 * Lets the audit table record a change to an execution limit policy and a change to
 * the policy of a project or a project group. SQLite cannot change a check, so this
 * rebuilds the table one time. Postgres has its own file.
 */
export class ExpandExecutionLimitAuditForPolicies1795781487123 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.rebuild(context, true);
	}

	async down(context: MigrationContext) {
		await this.rebuild(context, false);
	}

	private async rebuild(context: MigrationContext, withPolicies: boolean) {
		const { runQuery, escape, schemaBuilder } = context;
		const table = escape.tableName(TABLE);
		const copy = escape.tableName(COPY);
		const columns = COLUMNS_BEFORE.map((name) => escape.columnName(name)).join(', ');
		// The table before this migration rejects the policy rows, so they are lost on down.
		const kept = withPolicies
			? ''
			: ` WHERE ${escape.columnName('field')} NOT IN (${quoted(POLICY_FIELDS)})`;

		await runQuery(`CREATE TABLE ${copy} AS SELECT ${columns} FROM ${table}${kept}`);
		await schemaBuilder.dropTable(TABLE);
		await this.createTable(context, withPolicies);
		await runQuery(`INSERT INTO ${table} (${columns}) SELECT ${columns} FROM ${copy}`);

		const countRows = async (name: string) => {
			const [{ count }] = await runQuery<Array<{ count: number }>>(
				`SELECT COUNT(*) AS count FROM ${name}`,
			);
			return Number(count);
		};
		if ((await countRows(table)) !== (await countRows(copy))) {
			throw new UnexpectedError(`The rebuild of "${TABLE}" lost rows`);
		}
		await runQuery(`DROP TABLE ${copy}`);
	}

	private async createTable(
		{ schemaBuilder: { createTable, column }, escape, tablePrefix }: MigrationContext,
		withPolicies: boolean,
	) {
		const field = escape.columnName('field');
		const projectId = escape.columnName('projectId');
		const projectFields = withPolicies
			? [...PROJECT_FIELDS_BEFORE, 'projectPolicy']
			: PROJECT_FIELDS_BEFORE;
		const inProjectFields = `${field} IN (${quoted(projectFields)})`;

		const table = createTable(TABLE)
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('projectId').varchar(36),
				column('field')
					.varchar(32)
					.notNull.withEnumCheck(
						withPolicies ? [...FIELDS_BEFORE, ...POLICY_FIELDS] : FIELDS_BEFORE,
					)
					.comment('What changed. The Postgres migration has the full comment'),
				column('oldValue').json,
				column('newValue').json,
				column('updatedBy').uuid,
				column('loginId').varchar(255),
				...(withPolicies ? [column('policyId').uuid] : []),
			)
			.withCreatedAt.withCheck(
				`CHK_${tablePrefix}${TABLE}_project_field`,
				`(${inProjectFields} AND ${projectId} IS NOT NULL) OR (NOT ${inProjectFields} AND ${projectId} IS NULL)`,
			);

		await (withPolicies
			? table.withCheck(
					`CHK_${tablePrefix}${TABLE}_policy_field`,
					`${field} NOT IN (${quoted(POLICY_FIELDS)}) OR ${escape.columnName('policyId')} IS NOT NULL`,
				)
			: table);
	}
}
