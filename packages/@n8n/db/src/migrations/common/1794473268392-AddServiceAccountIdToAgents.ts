import type { MigrationContext, ReversibleMigration } from '../migration-types';

const fkName = 'FK_agents_service_account';

export class AddServiceAccountIdToAgents1794473268392 implements ReversibleMigration {
	async up({
		schemaBuilder: { addColumns, addForeignKey, createIndex, column },
		escape,
	}: MigrationContext) {
		await addColumns(
			'agents',
			[
				column('serviceAccountId').uuid.comment(
					'Service account that acts for this agent. Null for an instance agent or an agent without one',
				),
			],
			{ recreatesOnSqlite: true },
		);
		await addForeignKey('agents', 'serviceAccountId', ['user', 'id'], fkName, 'SET NULL');
		await createIndex(
			'agents',
			['serviceAccountId'],
			true,
			undefined,
			`${escape.columnName('serviceAccountId')} IS NOT NULL`,
		);
	}

	async down({ schemaBuilder: { dropColumns, dropForeignKey, dropIndex } }: MigrationContext) {
		await dropIndex('agents', ['serviceAccountId']);
		await dropForeignKey('agents', 'serviceAccountId', ['user', 'id'], fkName);
		await dropColumns('agents', ['serviceAccountId'], { recreatesOnSqlite: true });
	}
}
