import type { IrreversibleMigration, MigrationContext } from '../migration-types';

export class MakeExecutionStatusNonNullable1714133768521 implements IrreversibleMigration {
	async up({ escape, runQuery, schemaBuilder }: MigrationContext) {
		const executionEntity = escape.tableName('execution_entity');
		const status = escape.columnName('status');
		const finished = escape.columnName('finished');

		const query = `
			UPDATE ${executionEntity}
			SET ${status} = CASE
				WHEN ${finished} = true THEN 'success'
				WHEN ${finished} = false THEN 'error'
			END
			WHERE ${status} IS NULL;
		`;

		await runQuery(query);

		await schemaBuilder.addNotNull('execution_entity', 'status');
	}
}
