import type { MigrationContext, ReversibleMigration } from '../migration-types';

const CONFIGURATION_TABLE = 'self_healing_configuration';
const AGENT_TABLE = 'self_healing_configuration_agent';

// Raw ALTER avoids SQLite table recreation, which would fire CASCADE on the incoming
// FKs from the reviewer, workflow, investigation, and result tables. For the same reason
// the enum-like columns have no CHECK constraint: adding one recreates the table on SQLite.
// The API schema validates their values.
// `agentGoals` is a JSON list. SQLite stores JSON as text.
const columns = (isSqlite: boolean) =>
	[
		['agentScope', "VARCHAR(16) NOT NULL DEFAULT 'none'"],
		['agentGoals', `${isSqlite ? 'TEXT' : 'JSON'} NOT NULL DEFAULT '["quality"]'`],
		['agentScheduleIntervalHours', 'INTEGER'],
		['agentTraceThreshold', 'INTEGER'],
		['agentPublicationMode', "VARCHAR(16) NOT NULL DEFAULT 'approval'"],
	] as const;

// The default index name on `projectId` belongs to the all-workflows index.
const allAgentsIndexName = (tablePrefix: string) =>
	`IDX_${tablePrefix}self_healing_configuration_projectId_agentScope_all`;

export class AddAgentCoverageToSelfHealingConfiguration1795003766622
	implements ReversibleMigration
{
	async up({
		schemaBuilder: { createTable, column, createIndex },
		escape,
		runQuery,
		tablePrefix,
		isSqlite,
	}: MigrationContext) {
		const table = escape.tableName(CONFIGURATION_TABLE);
		for (const [name, definition] of columns(isSqlite)) {
			await runQuery(`ALTER TABLE ${table} ADD COLUMN ${escape.columnName(name)} ${definition}`);
		}
		await createIndex(
			CONFIGURATION_TABLE,
			['projectId'],
			true,
			allAgentsIndexName(tablePrefix),
			`${escape.columnName('agentScope')} = 'all'`,
		);

		await createTable(AGENT_TABLE)
			.withColumns(
				column('configurationId').int.primary,
				column('agentId').varchar(36).primary,
				column('projectId')
					.varchar(36)
					.notNull.comment('Enforces disjoint selections within a project'),
			)
			.withIndexOn(['projectId', 'agentId'], true)
			.withIndexOn('agentId')
			.withForeignKey('configurationId', {
				tableName: CONFIGURATION_TABLE,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('agentId', { tableName: 'agents', columnName: 'id', onDelete: 'CASCADE' })
			.withForeignKey('projectId', { tableName: 'project', columnName: 'id', onDelete: 'CASCADE' });
	}

	async down({
		schemaBuilder: { dropTable, dropIndex },
		escape,
		runQuery,
		tablePrefix,
		isSqlite,
	}: MigrationContext) {
		await dropTable(AGENT_TABLE);
		// SQLite cannot drop a column that a partial index condition names.
		await dropIndex(CONFIGURATION_TABLE, ['projectId'], {
			customIndexName: allAgentsIndexName(tablePrefix),
		});
		const table = escape.tableName(CONFIGURATION_TABLE);
		for (const [name] of [...columns(isSqlite)].reverse()) {
			await runQuery(`ALTER TABLE ${table} DROP COLUMN ${escape.columnName(name)}`);
		}
	}
}
