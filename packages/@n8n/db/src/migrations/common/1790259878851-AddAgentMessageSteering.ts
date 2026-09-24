import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAgentMessageSteering1790259878851 implements ReversibleMigration {
	async up({ schemaBuilder, escape, runQuery, isPostgres }: MigrationContext) {
		const { addColumns, addForeignKey, createIndex, column } = schemaBuilder;
		const executionTable = escape.tableName('agent_execution');
		const acceptsSteering = escape.columnName('acceptsSteering');
		// Native ALTER TABLE avoids copying execution history on SQLite.
		await runQuery(
			`ALTER TABLE ${executionTable} ADD COLUMN ${acceptsSteering} BOOLEAN NOT NULL DEFAULT FALSE`,
		);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${executionTable}.${acceptsSteering} IS 'Accept input until the runtime closes admission'`,
			);
		}
		await addColumns(
			'agent_message_queue',
			[
				column('steeringExecutionId')
					.varchar(36)
					.comment('Execution reserved to consume this input'),
				column('steeringOrder').int.comment('Acceptance order among outstanding steers'),
			],
			{ recreatesOnSqlite: true },
		);
		await addForeignKey(
			'agent_message_queue',
			'steeringExecutionId',
			['agent_execution', 'id'],
			undefined,
			'NO ACTION',
		);
		await createIndex(
			'agent_message_queue',
			['steeringExecutionId', 'steeringOrder'],
			true,
			undefined,
			`${escape.columnName('steeringExecutionId')} IS NOT NULL`,
		);
	}

	async down({
		schemaBuilder: { dropIndex, dropForeignKey, dropColumns },
		escape,
		runQuery,
	}: MigrationContext) {
		await dropIndex('agent_message_queue', ['steeringExecutionId', 'steeringOrder']);
		await dropForeignKey('agent_message_queue', 'steeringExecutionId', ['agent_execution', 'id']);
		await dropColumns('agent_message_queue', ['steeringExecutionId', 'steeringOrder'], {
			recreatesOnSqlite: true,
		});
		await runQuery(
			`ALTER TABLE ${escape.tableName('agent_execution')} DROP COLUMN ${escape.columnName('acceptsSteering')}`,
		);
	}
}
