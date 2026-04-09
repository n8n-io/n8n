import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddSessionColumnsToExecutionThreads1778000000000 implements ReversibleMigration {
	async up({ escape, runQuery, queryRunner }: MigrationContext) {
		const tablePrefix = escape.tableName('').replace(/"/g, '');
		const table = await queryRunner.getTable(`${tablePrefix}execution_threads`);
		if (!table) return;

		const columnsToAdd: Array<{ name: string; type: string; default: string }> = [
			{ name: 'sessionNumber', type: 'integer', default: '0' },
			{ name: 'totalPromptTokens', type: 'integer', default: '0' },
			{ name: 'totalCompletionTokens', type: 'integer', default: '0' },
			{ name: 'totalCost', type: 'real', default: '0' },
			{ name: 'totalDuration', type: 'integer', default: '0' },
		];

		const tableName = escape.tableName('execution_threads');
		for (const col of columnsToAdd) {
			if (!table.findColumnByName(col.name)) {
				const colName = escape.columnName(col.name);
				await runQuery(
					`ALTER TABLE ${tableName} ADD COLUMN ${colName} ${col.type} NOT NULL DEFAULT ${col.default}`,
				);
			}
		}
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('execution_threads', [
			'sessionNumber',
			'totalPromptTokens',
			'totalCompletionTokens',
			'totalCost',
			'totalDuration',
		]);
	}
}
