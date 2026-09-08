import type { MigrationContext, ReversibleMigration } from '../migration-types';

const CREDENTIALS_TABLE = 'credentials_entity';
const ASSIGNMENTS_TABLE = 'instance_credential_assignment';
const INSTANCE_USAGE_SCOPE = 'instance';

// Pinned here, not read from the settings service: the service names and
// credential-use ids can change again later, and this migration must keep
// renaming exactly these rows.
const RENAMES: ReadonlyArray<{ from: string; to: string; credentialUseIds: string[] }> = [
	{
		from: 'AI Assistant model',
		to: 'n8n Assistant model',
		credentialUseIds: ['instance-ai:model'],
	},
	{
		from: 'AI Assistant web search',
		to: 'n8n Assistant web search',
		credentialUseIds: ['instance-ai:search'],
	},
	{
		from: 'AI Assistant sandbox',
		to: 'n8n Assistant sandbox',
		credentialUseIds: ['instance-ai:sandbox:daytona', 'instance-ai:sandbox:n8n'],
	},
];

/**
 * Renames the instance credentials that the Instance AI settings page created
 * under the old product name. The settings service keeps an existing credential's
 * name when it updates the connection, so without this only fresh installs would
 * carry the new name.
 *
 * `up` establishes ownership through the Instance AI credential assignment, not
 * the name alone: an admin can create instance credentials with any name through
 * the API, and those must keep theirs.
 *
 * `down` cannot rely on the assignments: an admin may have cleared or replaced a
 * connection since `up` ran, which leaves the renamed row unassigned. It restores
 * every instance credential that carries a new name instead. Only this version
 * writes those names, so that set is the renamed rows plus any connection the
 * new version created, and both need the old name once it is rolled back.
 */
export class RenameInstanceAiCredentials1788863190206 implements ReversibleMigration {
	async up(context: MigrationContext) {
		for (const { from, to, credentialUseIds } of RENAMES) {
			await this.renameAssigned(context, from, to, credentialUseIds);
		}
	}

	async down(context: MigrationContext) {
		for (const { from, to } of RENAMES) {
			await this.renameInstanceScoped(context, to, from);
		}
	}

	/**
	 * All values are pinned literals, so they are inlined rather than bound: the
	 * credential-use ids contain `:` and would otherwise look like named parameters.
	 */
	private async renameAssigned(
		{ escape, runQuery }: MigrationContext,
		from: string,
		to: string,
		credentialUseIds: string[],
	) {
		const credentials = escape.tableName(CREDENTIALS_TABLE);
		const assignments = escape.tableName(ASSIGNMENTS_TABLE);
		const name = escape.columnName('name');
		const id = escape.columnName('id');
		const credentialId = escape.columnName('credentialId');
		const credentialUseId = escape.columnName('credentialUseId');
		const useIdList = credentialUseIds.map((useId) => `'${useId}'`).join(', ');

		await runQuery(
			`UPDATE ${credentials} SET ${name} = '${to}' WHERE ${name} = '${from}' AND ${id} IN ` +
				`(SELECT ${credentialId} FROM ${assignments} WHERE ${credentialUseId} IN (${useIdList}))`,
		);
	}

	private async renameInstanceScoped(
		{ escape, runQuery }: MigrationContext,
		from: string,
		to: string,
	) {
		const credentials = escape.tableName(CREDENTIALS_TABLE);
		const name = escape.columnName('name');
		const usageScope = escape.columnName('usageScope');

		await runQuery(
			`UPDATE ${credentials} SET ${name} = '${to}' WHERE ${name} = '${from}' ` +
				`AND ${usageScope} = '${INSTANCE_USAGE_SCOPE}'`,
		);
	}
}
