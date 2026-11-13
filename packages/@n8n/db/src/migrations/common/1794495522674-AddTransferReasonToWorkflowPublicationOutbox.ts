import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'workflow_publication_outbox';
const columnName = 'reason';

/** Allows `transfer`, the reason a move to another project enqueues to re-register every trigger. */
export class AddTransferReasonToWorkflowPublicationOutbox1794495522674
	implements ReversibleMigration
{
	async up({ schemaBuilder: { dropEnumCheck, addEnumCheck } }: MigrationContext) {
		await dropEnumCheck(tableName, columnName, { recreatesOnSqlite: true });
		await addEnumCheck(
			tableName,
			columnName,
			['publish', 'startup', 'leadership-takeover', 'reconcile', 'transfer'],
			{ recreatesOnSqlite: true },
		);
	}

	async down({
		schemaBuilder: { dropEnumCheck, addEnumCheck },
		escape,
		runQuery,
	}: MigrationContext) {
		const table = escape.tableName(tableName);
		const reason = escape.columnName(columnName);
		await runQuery(`UPDATE ${table} SET ${reason} = 'publish' WHERE ${reason} = 'transfer'`);
		await dropEnumCheck(tableName, columnName, { recreatesOnSqlite: true });
		await addEnumCheck(
			tableName,
			columnName,
			['publish', 'startup', 'leadership-takeover', 'reconcile'],
			{ recreatesOnSqlite: true },
		);
	}
}
