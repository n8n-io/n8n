import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAgentQueueMessageReferences1790605116208 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const {
			schemaBuilder: { addColumns, dropColumns, addForeignKey, createIndex, column },
			escape,
			runQuery,
		} = ctx;
		await this.requireEmptyQueue(ctx);
		if (ctx.isSqlite) {
			// Native ALTER keeps the queue ID sequence, including IDs of deleted entries.
			await runQuery(`ALTER TABLE ${escape.tableName('agent_message_queue')}
				ADD COLUMN ${escape.columnName('messageId')} varchar(36) NOT NULL
				CONSTRAINT ${escape.columnName('FK_agent_message_queue_messageId')}
				REFERENCES ${escape.tableName('agents_messages')} (${escape.columnName('id')}) ON DELETE CASCADE`);
			await runQuery(
				`ALTER TABLE ${escape.tableName('agent_message_queue')} DROP COLUMN ${escape.columnName('source')}`,
			);
		} else {
			await dropColumns('agent_message_queue', ['source'], { recreatesOnSqlite: true });
			await addColumns(
				'agent_message_queue',
				[
					column('messageId')
						.varchar(36)
						.notNull.comment('Canonical input created when the queue accepts it'),
				],
				{ recreatesOnSqlite: true },
			);
			await addForeignKey(
				'agent_message_queue',
				'messageId',
				['agents_messages', 'id'],
				'FK_agent_message_queue_messageId',
				'CASCADE',
			);
			await runQuery(`COMMENT ON COLUMN ${escape.tableName('agent_message_queue')}.${escape.columnName('payload')}
				IS 'Dispatch, authorization, and reply context. Input is stored on the message'`);
		}
		await createIndex('agent_message_queue', ['messageId'], true);
	}

	async down(ctx: MigrationContext) {
		const {
			schemaBuilder: { dropIndex, dropForeignKey, dropColumns, addColumns, column },
			escape,
			runQuery,
		} = ctx;
		await this.requireEmptyQueue(ctx);
		await dropIndex('agent_message_queue', ['messageId']);
		if (ctx.isSqlite) {
			await runQuery(
				`ALTER TABLE ${escape.tableName('agent_message_queue')} DROP COLUMN ${escape.columnName('messageId')}`,
			);
			await runQuery(
				`ALTER TABLE ${escape.tableName('agent_message_queue')} ADD COLUMN ${escape.columnName('source')} varchar(32) NOT NULL`,
			);
		} else {
			await dropForeignKey(
				'agent_message_queue',
				'messageId',
				['agents_messages', 'id'],
				'FK_agent_message_queue_messageId',
			);
			await dropColumns('agent_message_queue', ['messageId'], { recreatesOnSqlite: true });
			await addColumns(
				'agent_message_queue',
				[column('source').varchar(32).notNull.comment('Preview or integration source')],
				{ recreatesOnSqlite: true },
			);
			await runQuery(`COMMENT ON COLUMN ${escape.tableName('agent_message_queue')}.${escape.columnName('payload')}
				IS 'Input, attachment references, identity, and reply context'`);
		}
	}

	private async requireEmptyQueue({ runQuery, escape }: MigrationContext) {
		const rows = await runQuery<Array<{ id: string }>>(
			`SELECT ${escape.columnName('id')} FROM ${escape.tableName('agent_message_queue')} LIMIT 1`,
		);
		if (rows.length)
			throw new Error('The agent message queue must be empty to change its message references');
	}
}
