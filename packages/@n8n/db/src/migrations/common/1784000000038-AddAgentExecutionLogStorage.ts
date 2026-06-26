import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAgentExecutionLogStorage1784000000038 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column, dropColumns } }: MigrationContext) {
		await addColumns(
			'agent_execution',
			[
				column('storedAt')
					.varchar(2)
					.notNull.default("'fs'")
					.withEnumCheck(['fs', 's3', 'az'])
					.comment('Where the external agent execution log payload is stored.'),
				column('logSizeBytes')
					.bigint.notNull.default(0)
					.comment('Size in bytes of the serialized agent execution log payload. 0 means unknown.'),
			],
			{ recreatesOnSqlite: true },
		);

		await dropColumns('agent_execution', ['assistantResponse', 'toolCalls', 'timeline', 'error'], {
			recreatesOnSqlite: true,
		});
	}

	async down({ schemaBuilder: { addColumns, column, dropColumns } }: MigrationContext) {
		await addColumns(
			'agent_execution',
			[
				column('assistantResponse').text.notNull.default("''"),
				column('toolCalls').json,
				column('timeline').json,
				column('error').text,
			],
			{ recreatesOnSqlite: true },
		);

		await dropColumns('agent_execution', ['storedAt', 'logSizeBytes'], {
			recreatesOnSqlite: true,
		});
	}
}
