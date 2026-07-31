import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const TABLE = 'agent_chat_subscriptions';
const COLUMN = 'integrationType';
const VALUES = ['telegram', 'slack', 'linear', 'discord'];

export class AllowDiscordAgentChatSubscriptions1785456000000 implements IrreversibleMigration {
	async up({ queryRunner, tablePrefix, schemaBuilder }: MigrationContext) {
		const table = await queryRunner.getTable(`${tablePrefix}${TABLE}`);

		const integrationTypeCheck = table?.checks.find(
			(c) =>
				(c.columnNames?.includes(COLUMN) ?? false) || (c.expression?.includes(COLUMN) ?? false),
		);

		if (table && integrationTypeCheck) {
			await queryRunner.dropCheckConstraint(table, integrationTypeCheck);
		}

		await schemaBuilder.addEnumCheck(TABLE, COLUMN, VALUES, { recreatesOnSqlite: true });
	}
}
