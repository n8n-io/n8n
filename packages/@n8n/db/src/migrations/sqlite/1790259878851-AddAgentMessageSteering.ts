import { AddAgentMessageSteering1790259878851 as BaseMigration } from '../common/1790259878851-AddAgentMessageSteering';
import type { MigrationContext } from '../migration-types';

export class AddAgentMessageSteering1790259878851 extends BaseMigration {
	async up(context: MigrationContext) {
		await this.preserveQueueSequence(context, async () => await super.up(context));
	}

	async down(context: MigrationContext) {
		await this.preserveQueueSequence(context, async () => await super.down(context));
	}

	private async preserveQueueSequence(context: MigrationContext, migrate: () => Promise<void>) {
		const name = `${context.tablePrefix}agent_message_queue`;
		const [sequence] = await context.runQuery<Array<{ seq: number }>>(
			'SELECT "seq" FROM "sqlite_sequence" WHERE "name" = :name',
			{ name },
		);
		await migrate();
		if (!sequence) return;
		// Table recreation resets AUTOINCREMENT to the largest retained ID. Keep retired IDs reserved.
		await context.runQuery('DELETE FROM "sqlite_sequence" WHERE "name" = :name', { name });
		await context.runQuery('INSERT INTO "sqlite_sequence" ("name", "seq") VALUES (:name, :seq)', {
			name,
			seq: sequence.seq,
		});
	}
}
