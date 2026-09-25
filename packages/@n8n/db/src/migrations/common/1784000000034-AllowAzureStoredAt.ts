import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const EXECUTION_ENTITY = 'execution_entity';
const STORED_AT = 'storedAt';
const STORED_AT_VALUES = ['db', 'fs', 's3', 'az'];

export class AllowAzureStoredAt1784000000034 implements IrreversibleMigration {
	async up({ queryRunner, tablePrefix, schemaBuilder }: MigrationContext) {
		const table = await queryRunner.getTable(`${tablePrefix}${EXECUTION_ENTITY}`);

		const storedAtCheck = table?.checks.find(
			(c) =>
				(c.columnNames?.includes(STORED_AT) ?? false) ||
				(c.expression?.includes(STORED_AT) ?? false),
		);

		if (table && storedAtCheck) {
			await queryRunner.dropCheckConstraint(table, storedAtCheck);
		}

		await schemaBuilder.addEnumCheck(EXECUTION_ENTITY, STORED_AT, STORED_AT_VALUES, {
			recreatesOnSqlite: true,
		});
	}
}
