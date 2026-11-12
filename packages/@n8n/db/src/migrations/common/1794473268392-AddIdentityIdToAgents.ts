import type { MigrationContext, ReversibleMigration } from '../migration-types';

const fkName = 'FK_agents_identity';

export class AddIdentityIdToAgents1794473268392 implements ReversibleMigration {
	async up({
		schemaBuilder: { addColumns, addForeignKey, createIndex, column },
		escape,
	}: MigrationContext) {
		await addColumns(
			'agents',
			[
				column('identityId').uuid.comment(
					'Identity the agent acts as, a service account today. Null for an instance agent or an agent without one',
				),
			],
			{ recreatesOnSqlite: true },
		);
		await addForeignKey('agents', 'identityId', ['user', 'id'], fkName, 'SET NULL');
		await createIndex(
			'agents',
			['identityId'],
			true,
			undefined,
			`${escape.columnName('identityId')} IS NOT NULL`,
		);
	}

	async down({ schemaBuilder: { dropColumns, dropForeignKey, dropIndex } }: MigrationContext) {
		await dropIndex('agents', ['identityId']);
		await dropForeignKey('agents', 'identityId', ['user', 'id'], fkName);
		await dropColumns('agents', ['identityId'], { recreatesOnSqlite: true });
	}
}
