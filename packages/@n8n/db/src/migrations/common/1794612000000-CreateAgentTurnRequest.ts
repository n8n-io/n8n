import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'agent_turn_request';

/**
 * Holds agent turns that a main sends to a worker, for example the answer to
 * a tool approval. The row carries the input, so a worker can run the turn
 * without the request that started it. The process that runs the turn claims
 * the row with a conditional update, so a turn runs at most once. A turn whose
 * caller waits for one reply, such as a webhook call, stores its outcome in
 * the row for the main that holds the connection.
 */
export class CreateAgentTurnRequest1794612000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table).withColumns(
			column('id').varchar(36).primary.notNull,
			column('kind').varchar(32).notNull.comment('Kind of turn, for example chat-resume'),
			column('payload').json.notNull.comment('Input of the turn and the identity that runs it'),
			column('claimedBy')
				.varchar(64)
				.comment('Instance key of the process that claimed the turn; NULL means pending'),
			column('result').json.comment(
				'Outcome of a turn whose caller waits for one reply; NULL until the turn ends',
			),
		).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(table);
	}
}
