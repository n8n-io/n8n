import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'llm_usage';

/**
 * The user that LLM budgets count a call for. No foreign key, like the other ID columns of
 * `llm_usage`: cost history must outlive its users.
 */
export class AddAccountableUserIdToLlmUsage1793098955018 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			tableName,
			[
				column('accountableUserId').uuid.comment(
					'The user that budgets count: userId, else the publisher of the workflow',
				),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(tableName, ['accountableUserId'], { recreatesOnSqlite: true });
	}
}
