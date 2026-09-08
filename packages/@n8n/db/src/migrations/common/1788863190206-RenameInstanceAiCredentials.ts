import type { MigrationContext, ReversibleMigration } from '../migration-types';

const CREDENTIALS_TABLE = 'credentials_entity';
const ASSIGNMENTS_TABLE = 'instance_credential_assignment';
const SETTINGS_TABLE = 'settings';

/** Settings key that records which credential rows `up` renamed, so `down` restores exactly those. */
const RENAMED_IDS_KEY = 'instanceAi.renamedCredentialIds';

// Credential ids are nanoids or UUIDs. Anything else in the stored record is
// ignored rather than inlined into SQL.
const SAFE_ID = /^[A-Za-z0-9_-]+$/;

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
 * the API, and those must keep theirs. It records the ids it renamed in the
 * settings table.
 *
 * `down` restores exactly the recorded rows. It cannot re-derive them from the
 * assignments, because an admin may have cleared or replaced a connection since
 * `up` ran, and it must not touch a credential that `up` never renamed.
 */
export class RenameInstanceAiCredentials1788863190206 implements ReversibleMigration {
	async up(context: MigrationContext) {
		const renamedIds: string[] = [];
		for (const { from, to, credentialUseIds } of RENAMES) {
			const ids = await this.findAssignedCredentialIds(context, from, credentialUseIds);
			await this.renameByIds(context, ids, from, to);
			renamedIds.push(...ids);
		}
		await this.writeRenamedIds(context, renamedIds);
	}

	async down(context: MigrationContext) {
		const renamedIds = await this.readRenamedIds(context);
		for (const { from, to } of RENAMES) {
			await this.renameByIds(context, renamedIds, to, from);
		}
		await this.deleteRenamedIds(context);
	}

	/**
	 * All values are pinned literals, so they are inlined rather than bound: the
	 * credential-use ids contain `:` and would otherwise look like named parameters.
	 */
	private async findAssignedCredentialIds(
		{ escape, runQuery }: MigrationContext,
		name: string,
		credentialUseIds: string[],
	): Promise<string[]> {
		const credentials = escape.tableName(CREDENTIALS_TABLE);
		const assignments = escape.tableName(ASSIGNMENTS_TABLE);
		const nameColumn = escape.columnName('name');
		const idColumn = escape.columnName('id');
		const credentialId = escape.columnName('credentialId');
		const credentialUseId = escape.columnName('credentialUseId');
		const useIdList = credentialUseIds.map((useId) => `'${useId}'`).join(', ');

		const rows = await runQuery<Array<{ id: string }>>(
			`SELECT ${idColumn} AS ${idColumn} FROM ${credentials} WHERE ${nameColumn} = '${name}' AND ${idColumn} IN ` +
				`(SELECT ${credentialId} FROM ${assignments} WHERE ${credentialUseId} IN (${useIdList}))`,
		);
		return rows.map((row) => row.id);
	}

	/** Renames only the given rows, and only while they still carry `from`. */
	private async renameByIds(
		{ escape, runQuery }: MigrationContext,
		ids: string[],
		from: string,
		to: string,
	) {
		const safeIds = ids.filter((id) => SAFE_ID.test(id));
		if (safeIds.length === 0) return;

		const credentials = escape.tableName(CREDENTIALS_TABLE);
		const nameColumn = escape.columnName('name');
		const idColumn = escape.columnName('id');
		const idList = safeIds.map((id) => `'${id}'`).join(', ');

		await runQuery(
			`UPDATE ${credentials} SET ${nameColumn} = '${to}' WHERE ${nameColumn} = '${from}' AND ${idColumn} IN (${idList})`,
		);
	}

	private async writeRenamedIds(context: MigrationContext, ids: string[]) {
		const { escape, runQuery } = context;
		await this.deleteRenamedIds(context);
		await runQuery(
			`INSERT INTO ${escape.tableName(SETTINGS_TABLE)} (${escape.columnName('key')}, ${escape.columnName('value')}, ${escape.columnName('loadOnStartup')}) ` +
				'VALUES (:key, :value, :loadOnStartup)',
			{ key: RENAMED_IDS_KEY, value: JSON.stringify(ids), loadOnStartup: false },
		);
	}

	private async readRenamedIds({ escape, runQuery }: MigrationContext): Promise<string[]> {
		const rows = await runQuery<Array<{ value: string }>>(
			`SELECT ${escape.columnName('value')} AS ${escape.columnName('value')} FROM ${escape.tableName(SETTINGS_TABLE)} WHERE ${escape.columnName('key')} = :key`,
			{ key: RENAMED_IDS_KEY },
		);
		if (rows.length === 0) return [];

		let parsed: unknown;
		try {
			parsed = JSON.parse(rows[0].value);
		} catch {
			// A damaged record means nothing can be restored safely.
			return [];
		}
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((id): id is string => typeof id === 'string');
	}

	private async deleteRenamedIds({ escape, runQuery }: MigrationContext) {
		await runQuery(
			`DELETE FROM ${escape.tableName(SETTINGS_TABLE)} WHERE ${escape.columnName('key')} = :key`,
			{ key: RENAMED_IDS_KEY },
		);
	}
}
