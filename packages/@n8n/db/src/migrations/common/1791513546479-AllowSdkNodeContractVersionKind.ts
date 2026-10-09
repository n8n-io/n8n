import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'node_contract_version';
const column = 'kind';
const kindsBefore = ['action', 'trigger', 'provider', 'credential'];
const kindsAfter = [...kindsBefore, 'sdk'];

/**
 * Allows `sdk` rows. A registry version can pin an SDK runtime that n8n does not embed, so the
 * store keeps that runtime as a row of its own.
 */
export class AllowSdkNodeContractVersionKind1791513546479 implements ReversibleMigration {
	async up({ schemaBuilder }: MigrationContext) {
		await schemaBuilder.dropEnumCheck(table, column, { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(table, column, kindsAfter, { recreatesOnSqlite: true });
	}

	async down({ escape, runQuery, schemaBuilder }: MigrationContext) {
		await runQuery(
			`DELETE FROM ${escape.tableName(table)} WHERE ${escape.columnName(column)} = 'sdk'`,
		);
		await schemaBuilder.dropEnumCheck(table, column, { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(table, column, kindsBefore, { recreatesOnSqlite: true });
	}
}
