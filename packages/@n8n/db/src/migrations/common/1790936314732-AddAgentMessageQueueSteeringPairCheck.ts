import { TableCheck } from '@n8n/typeorm';

import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'agent_message_queue';
const check = 'agent_message_queue_steering_pair';

export class AddAgentMessageQueueSteeringPairCheck1790936314732 implements ReversibleMigration {
	async up({ escape, runQuery, queryRunner, tablePrefix }: MigrationContext) {
		const executionId = escape.columnName('steeringExecutionId');
		const order = escape.columnName('steeringOrder');
		// A half-set reservation is invalid. Releasing it returns the input to the pending queue.
		await runQuery(
			`UPDATE ${escape.tableName(table)} SET ${executionId} = NULL, ${order} = NULL
			WHERE (${executionId} IS NULL) <> (${order} IS NULL)`,
		);
		await queryRunner.createCheckConstraint(
			`${tablePrefix}${table}`,
			new TableCheck({
				name: `CHK_${tablePrefix}${check}`,
				expression: `(${executionId} IS NULL) = (${order} IS NULL)`,
			}),
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.dropCheckConstraint(`${tablePrefix}${table}`, `CHK_${tablePrefix}${check}`);
	}
}
