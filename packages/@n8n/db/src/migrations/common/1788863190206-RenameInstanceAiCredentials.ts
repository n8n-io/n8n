import type { MigrationContext, ReversibleMigration } from '../migration-types';

const CREDENTIALS_TABLE = 'credentials_entity';
const INSTANCE_USAGE_SCOPE = 'instance';

// Pinned here, not read from the settings service: the service names can change
// again later, and this migration must keep renaming exactly these rows.
const RENAMES: ReadonlyArray<{ from: string; to: string }> = [
	{ from: 'AI Assistant model', to: 'n8n Assistant model' },
	{ from: 'AI Assistant web search', to: 'n8n Assistant web search' },
	{ from: 'AI Assistant sandbox', to: 'n8n Assistant sandbox' },
];

/**
 * Renames the instance credentials that the Instance AI settings page created
 * under the old product name. The settings service keeps an existing credential's
 * name when it updates the connection, so without this only fresh installs would
 * carry the new name. Scoped to instance credentials so a user's own credential
 * with the same name is left alone.
 */
export class RenameInstanceAiCredentials1788863190206 implements ReversibleMigration {
	async up(context: MigrationContext) {
		for (const { from, to } of RENAMES) {
			await this.rename(context, from, to);
		}
	}

	async down(context: MigrationContext) {
		for (const { from, to } of RENAMES) {
			await this.rename(context, to, from);
		}
	}

	private async rename({ escape, runQuery }: MigrationContext, from: string, to: string) {
		const table = escape.tableName(CREDENTIALS_TABLE);
		const name = escape.columnName('name');
		const usageScope = escape.columnName('usageScope');

		await runQuery(
			`UPDATE ${table} SET ${name} = :to WHERE ${name} = :from AND ${usageScope} = :scope`,
			{ to, from, scope: INSTANCE_USAGE_SCOPE },
		);
	}
}
