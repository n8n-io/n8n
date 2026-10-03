import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Running budget totals and the model call ids that already added spend.
 * A restart and a second main read the same rows.
 */
export class CreateAgentBudgetSpendTables1790854657240 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column }, tablePrefix, escape }: MigrationContext) {
		await createTable('agent_budget_spend')
			.withColumns(
				column('key')
					.varchar(128)
					.primary.comment('Session key is the root thread id. Month key is {agentId}:{YYYY-MM}.'),
				column('totalUsd')
					.double.notNull.default(0)
					.comment('Running USD estimate for this ledger key. A check rejects a negative total.'),
			)
			.withTimestamps.withCheck(
				`CHK_${tablePrefix}agent_budget_spend_total_usd_non_negative`,
				`${escape.columnName('totalUsd')} >= 0`,
			);

		await createTable('agent_budget_applied_call').withColumns(
			column('callId').uuid.primary.comment(
				'Model call id. A second insert of the same id does not add spend.',
			),
			column('createdAt')
				.timestampTimezone()
				.notNull.default('NOW()')
				.comment('Time this call id was stored. A later prune can delete old rows.'),
		);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_budget_applied_call');
		await dropTable('agent_budget_spend');
	}
}
