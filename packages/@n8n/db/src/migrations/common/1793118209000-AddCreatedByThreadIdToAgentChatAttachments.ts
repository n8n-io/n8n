import type { MigrationContext, ReversibleMigration } from '../migration-types';

const ATTACHMENTS_TABLE = 'agent_chat_attachments';
const CREATED_BY_COLUMN = 'createdByThreadId';

/**
 * Records the thread that made each agent file. The root thread of a
 * delegation tree owns the file (`threadId`), and a sub-agent thread can make
 * it (`createdByThreadId`).
 *
 * Added nullable, backfilled, then made NOT NULL. Before this column, only the
 * owning thread could make a file, so the backfill copies `threadId`. No table
 * points a foreign key at `agent_chat_attachments`, so the SQLite table
 * recreation carries no cascade risk. There is no foreign key to
 * `agent_execution_threads`: inline agents have no thread rows, as for
 * `threadId`.
 */
export class AddCreatedByThreadIdToAgentChatAttachments1793118209000
	implements ReversibleMigration
{
	async up(context: MigrationContext) {
		const { schemaBuilder } = context;

		await schemaBuilder.addColumns(
			ATTACHMENTS_TABLE,
			[
				schemaBuilder
					.column(CREATED_BY_COLUMN)
					.varchar(128)
					.comment('Thread that made the file; threadId is the root thread that owns it'),
			],
			{ recreatesOnSqlite: true },
		);

		await this.backfillExistingRows(context);

		await schemaBuilder.addNotNull(ATTACHMENTS_TABLE, CREATED_BY_COLUMN, {
			recreatesOnSqlite: true,
		});
	}

	async down({ schemaBuilder }: MigrationContext) {
		await schemaBuilder.dropColumns(ATTACHMENTS_TABLE, [CREATED_BY_COLUMN], {
			recreatesOnSqlite: true,
		});
	}

	private async backfillExistingRows({ escape, runQuery }: MigrationContext) {
		const table = escape.tableName(ATTACHMENTS_TABLE);
		const createdBy = escape.columnName(CREATED_BY_COLUMN);
		const threadId = escape.columnName('threadId');

		await runQuery(`UPDATE ${table} SET ${createdBy} = ${threadId} WHERE ${createdBy} IS NULL`);
	}
}
