import { AddAgentMessageQueueSteeringPairCheck1790936314732 as BaseMigration } from '../common/1790936314732-AddAgentMessageQueueSteeringPairCheck';
import type { MigrationContext } from '../migration-types';

export class AddAgentMessageQueueSteeringPairCheck1790936314732 extends BaseMigration {
	async up(context: MigrationContext) {
		await this.preserveQueueSequence(context, async () => await super.up(context));
	}

	async down(context: MigrationContext) {
		await this.preserveQueueSequence(context, async () => await super.down(context));
	}

	private async preserveQueueSequence(context: MigrationContext, migrate: () => Promise<void>) {
		const name = `${context.tablePrefix}agent_message_queue`;
		const [sequence] = await context.runQuery<Array<{ seq: string }>>(
			'SELECT CAST("seq" AS TEXT) AS "seq" FROM "sqlite_sequence" WHERE "name" = :name',
			{ name },
		);
		await migrate();
		if (!sequence) return;
		// Table recreation resets AUTOINCREMENT to the largest retained ID. Keep retired IDs reserved.
		await context.runQuery('UPDATE "sqlite_sequence" SET "seq" = :seq WHERE "name" = :name', {
			name,
			seq: sequence.seq,
		});
	}
}
