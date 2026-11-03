import type { MigrationContext, ReversibleMigration } from '../migration-types';

const entryTable = 'agents_memory_entries';
const candidateTable = 'agents_memory_entry_candidates';
const statusColumn = 'status';
const entryStatusesBefore = ['active', 'superseded', 'dropped'];
const candidateStatusesBefore = ['pending', 'completed', 'failed'];

/**
 * Adds a `deleted` status for memory entries and capture candidates that a
 * user deleted. Before, a user delete stored the entry as `dropped`, which
 * the agent's own reflection also uses.
 */
export class AddDeletedStatusToAgentMemory1793182079956 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.setStatusChecks(context, ['deleted']);
	}

	async down(context: MigrationContext) {
		await this.revertDeletedRows(context);
		await this.setStatusChecks(context, []);
	}

	private async setStatusChecks(
		{ schemaBuilder: { addEnumCheck, dropEnumCheck } }: MigrationContext,
		extraStatuses: string[],
	) {
		await dropEnumCheck(entryTable, statusColumn, { recreatesOnSqlite: true });
		await addEnumCheck(entryTable, statusColumn, [...entryStatusesBefore, ...extraStatuses], {
			recreatesOnSqlite: true,
		});
		await dropEnumCheck(candidateTable, statusColumn, { recreatesOnSqlite: true });
		await addEnumCheck(
			candidateTable,
			statusColumn,
			[...candidateStatusesBefore, ...extraStatuses],
			{ recreatesOnSqlite: true },
		);
	}

	/** Deleted entries become `dropped`, as before. Deleted candidates have no sources left. */
	private async revertDeletedRows({ escape, runQuery }: MigrationContext) {
		const status = escape.columnName(statusColumn);
		await runQuery(
			`UPDATE ${escape.tableName(entryTable)} SET ${status} = 'dropped' WHERE ${status} = 'deleted'`,
		);
		await runQuery(`DELETE FROM ${escape.tableName(candidateTable)} WHERE ${status} = 'deleted'`);
	}
}
