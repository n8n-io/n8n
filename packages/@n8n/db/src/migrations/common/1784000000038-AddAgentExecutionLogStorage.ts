import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAgentExecutionLogStorage1784000000038 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			'agent_execution',
			[
				column('storedAt')
					.varchar(2)
					.notNull.default("'db'")
					.withEnumCheck(['db', 'fs', 's3', 'az'])
					.comment(
						'Where the agent execution log payload is stored. Defaults to db for migrated inline logs.',
					),
				column('logSizeBytes')
					.bigint.notNull.default(0)
					.comment('Size in bytes of the serialized agent execution log payload. 0 means unknown.'),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('agent_execution', ['storedAt', 'logSizeBytes'], {
			recreatesOnSqlite: true,
		});
	}
}
