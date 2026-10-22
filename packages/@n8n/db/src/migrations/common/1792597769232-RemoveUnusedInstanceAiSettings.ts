import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const instanceAiSettingsKey = 'instanceAi.settings';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(object: Record<string, unknown>, key: string) {
	return Object.prototype.hasOwnProperty.call(object, key);
}

export class RemoveUnusedInstanceAiSettings1792597769232 implements IrreversibleMigration {
	async up(ctx: MigrationContext) {
		await this.removeAdminSettingKeys(ctx);
		await this.removeUserPreferenceKey(ctx);
	}

	private async removeAdminSettingKeys({
		escape,
		logger,
		migrationName,
		parseJson,
		runQuery,
	}: MigrationContext) {
		const table = escape.tableName('settings');
		const keyColumn = escape.columnName('key');
		const valueColumn = escape.columnName('value');
		const rows = await runQuery<Array<{ value: string | Record<string, unknown> }>>(
			`SELECT ${valueColumn} AS value FROM ${table} WHERE ${keyColumn} = :key`,
			{ key: instanceAiSettingsKey },
		);
		if (rows.length === 0) return;

		let settings: unknown;
		try {
			settings = parseJson<unknown>(rows[0].value);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			logger.warn(`[${migrationName}] Skipped ${instanceAiSettingsKey}: ${message}`);
			return;
		}
		if (!isRecord(settings)) return;

		const cleaned = { ...settings };
		let changed = false;
		if (hasOwn(cleaned, 'localGatewayDisabled')) {
			delete cleaned.localGatewayDisabled;
			changed = true;
		}
		if (isRecord(cleaned.permissions) && hasOwn(cleaned.permissions, 'readFilesystem')) {
			const permissions = { ...cleaned.permissions };
			delete permissions.readFilesystem;
			cleaned.permissions = permissions;
			changed = true;
		}
		if (!changed) return;

		await runQuery(`UPDATE ${table} SET ${valueColumn} = :value WHERE ${keyColumn} = :key`, {
			key: instanceAiSettingsKey,
			value: JSON.stringify(cleaned),
		});
	}

	private async removeUserPreferenceKey({
		escape,
		logger,
		migrationName,
		parseJson,
		runInBatches,
		runQuery,
	}: MigrationContext) {
		const table = escape.tableName('user');
		const idColumn = escape.columnName('id');
		const settingsColumn = escape.columnName('settings');

		await runInBatches<{ id: string; settings: string | Record<string, unknown> }>(
			`SELECT ${idColumn} AS id, ${settingsColumn} AS settings
			 FROM ${table}
			 WHERE ${settingsColumn} IS NOT NULL
			 ORDER BY ${idColumn}`,
			async (rows) => {
				for (const row of rows) {
					let settings: unknown;
					try {
						settings = parseJson<unknown>(row.settings);
					} catch (error) {
						const message = error instanceof Error ? error.message : String(error);
						logger.warn(`[${migrationName}] Skipped user ${row.id} settings: ${message}`);
						continue;
					}
					if (
						!isRecord(settings) ||
						!isRecord(settings.instanceAi) ||
						!hasOwn(settings.instanceAi, 'localGatewayDisabled')
					) {
						continue;
					}

					const instanceAi = { ...settings.instanceAi };
					delete instanceAi.localGatewayDisabled;
					await runQuery(
						`UPDATE ${table} SET ${settingsColumn} = :settings WHERE ${idColumn} = :id`,
						{
							id: row.id,
							settings: JSON.stringify({ ...settings, instanceAi }),
						},
					);
				}
			},
		);
	}
}
