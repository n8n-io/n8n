import type { IrreversibleMigration, MigrationContext } from '../migration-types';

export class RemoveFailedExecutionStatus1711018413374 implements IrreversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const executionEntity = escape.tableName('execution_entity');

		await runQuery(`UPDATE ${executionEntity} SET status = 'error' WHERE status = 'failed';`);
	}
}
