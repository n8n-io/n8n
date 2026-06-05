import type { MigrationContext, ReversibleMigration } from '../migration-types';

const userTable = 'user';
const registrationTable = 'external_agent_registration';
const credentialsTable = 'credentials_entity';

/**
 * Adds the schema needed for agentic users (A2A):
 *
 * 1. Agent-related columns on the user table:
 *    - type: discriminator (human/agent), default 'human'
 *    - avatar: custom avatar (emoji/URL), nullable — useful for all users
 *    - description: user bio, nullable — useful for all users
 *    - agentAccessLevel: external/internal/closed visibility tier, nullable — agent-only
 * 2. The external_agent_registration table for registering remote A2A agents.
 */
export class AddAgenticUserSupport1784000000027 implements ReversibleMigration {
	async up({ escape, runQuery, schemaBuilder: { createTable, column } }: MigrationContext) {
		const t = escape.tableName(userTable);

		await runQuery(
			`ALTER TABLE ${t} ADD COLUMN ${escape.columnName('type')} VARCHAR(50) NOT NULL DEFAULT 'human'`,
		);
		await runQuery(
			`ALTER TABLE ${t} ADD COLUMN ${escape.columnName('avatar')} VARCHAR(255) DEFAULT NULL`,
		);
		await runQuery(
			`ALTER TABLE ${t} ADD COLUMN ${escape.columnName('description')} VARCHAR(500) DEFAULT NULL`,
		);
		await runQuery(
			`ALTER TABLE ${t} ADD COLUMN ${escape.columnName('agentAccessLevel')} VARCHAR(20) DEFAULT NULL`,
		);

		await createTable(registrationTable)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('name').varchar(128).notNull,
				column('description').varchar(500),
				column('remoteUrl').varchar(2048).notNull,
				column('remoteAgentId').varchar(128).notNull,
				column('credentialId').varchar(36),
				column('remoteCapabilities').json,
				column('skills').json,
				column('requiredCredentials').json,
				column('credentialMappings').json,
			)
			.withIndexOn('remoteAgentId')
			.withForeignKey('credentialId', {
				tableName: credentialsTable,
				columnName: 'id',
				onDelete: 'SET NULL',
			}).withTimestamps;
	}

	async down({ escape, runQuery, schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(registrationTable);

		const t = escape.tableName(userTable);
		await runQuery(`ALTER TABLE ${t} DROP COLUMN ${escape.columnName('agentAccessLevel')}`);
		await runQuery(`ALTER TABLE ${t} DROP COLUMN ${escape.columnName('description')}`);
		await runQuery(`ALTER TABLE ${t} DROP COLUMN ${escape.columnName('avatar')}`);
		await runQuery(`ALTER TABLE ${t} DROP COLUMN ${escape.columnName('type')}`);
	}
}
