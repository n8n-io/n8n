import type { MigrationContext } from '../migration-types';
import { AddAgentQueueMessageReferences1790605116208 as BaseMigration } from '../postgresdb/1790605116208-AddAgentQueueMessageReferences';

export class AddAgentQueueMessageReferences1790605116208 extends BaseMigration {
	async up(ctx: MigrationContext) {
		const {
			schemaBuilder: { addNotNull, addForeignKey, createIndex },
			escape,
			runQuery,
		} = ctx;
		// SQLite rebuilds the table for NOT NULL and otherwise forgets deleted queue IDs.
		const sequence = await this.readQueueSequence(ctx);
		await runQuery(`ALTER TABLE ${escape.tableName('agent_message_queue')}
			ADD COLUMN ${escape.columnName('messageId')} varchar(36)`);
		await this.backfillQueue(ctx);
		await runQuery(
			`ALTER TABLE ${escape.tableName('agent_message_queue')} DROP COLUMN ${escape.columnName('source')}`,
		);
		await addNotNull('agent_message_queue', 'messageId', { recreatesOnSqlite: true });
		await addForeignKey(
			'agent_message_queue',
			'messageId',
			['agents_messages', 'id'],
			'FK_agent_message_queue_messageId',
			'CASCADE',
		);
		await createIndex('agent_message_queue', ['messageId'], true);
		await this.restoreQueueSequence(ctx, sequence);
	}

	async down(ctx: MigrationContext) {
		const {
			schemaBuilder: { dropIndex, dropColumns },
			escape,
			runQuery,
		} = ctx;
		await this.requireEmptyQueue(ctx);
		const sequence = await this.readQueueSequence(ctx);
		await dropIndex('agent_message_queue', ['messageId']);
		await dropColumns('agent_message_queue', ['messageId'], { recreatesOnSqlite: true });
		await runQuery(
			`ALTER TABLE ${escape.tableName('agent_message_queue')} ADD COLUMN ${escape.columnName('source')} varchar(32) NOT NULL`,
		);
		await this.restoreQueueSequence(ctx, sequence);
	}

	private async readQueueSequence({ runQuery, tablePrefix }: MigrationContext) {
		const [sequence] = await runQuery<Array<{ seq: string }>>(
			'SELECT CAST(seq AS TEXT) AS seq FROM sqlite_sequence WHERE name = :tableName',
			{ tableName: `${tablePrefix}agent_message_queue` },
		);
		return sequence?.seq;
	}

	private async restoreQueueSequence(
		{ runQuery, tablePrefix }: MigrationContext,
		sequence: string | undefined,
	) {
		if (sequence === undefined) return;
		await runQuery('UPDATE sqlite_sequence SET seq = :seq WHERE name = :tableName', {
			seq: sequence,
			tableName: `${tablePrefix}agent_message_queue`,
		});
	}
}
