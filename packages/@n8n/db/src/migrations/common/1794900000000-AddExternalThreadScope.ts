import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'agent_execution_threads';

/**
 * SPIKE (agent-chat-embed): a session of someone who is not an n8n user (an
 * invitee or a visitor of a public chat page). `externalPrincipal` holds the
 * key of that person; `ownerId` stays null.
 */
export class AddExternalThreadScope1794900000000 implements ReversibleMigration {
	async up({
		schemaBuilder: { addColumns, column, createIndex, dropEnumCheck, addEnumCheck },
	}: MigrationContext) {
		await addColumns(
			table,
			[column('externalPrincipal').varchar(255).comment('Key of an external chat principal')],
			{ recreatesOnSqlite: true },
		);
		await dropEnumCheck(table, 'accessScope', { recreatesOnSqlite: true });
		await addEnumCheck(table, 'accessScope', ['user', 'project', 'external'], {
			recreatesOnSqlite: true,
		});
		await createIndex(table, ['externalPrincipal']);
	}

	async down({
		schemaBuilder: { dropColumns, dropIndex, dropEnumCheck, addEnumCheck },
		escape,
		runQuery,
	}: MigrationContext) {
		await runQuery(
			`DELETE FROM ${escape.tableName(table)} WHERE ${escape.columnName('accessScope')} = 'external'`,
		);
		await dropIndex(table, ['externalPrincipal']);
		await dropEnumCheck(table, 'accessScope', { recreatesOnSqlite: true });
		await addEnumCheck(table, 'accessScope', ['user', 'project'], { recreatesOnSqlite: true });
		await dropColumns(table, ['externalPrincipal'], { recreatesOnSqlite: true });
	}
}
