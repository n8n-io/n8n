import { Container } from '@n8n/di';
import { Cipher } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';

import type { IrreversibleMigration, MigrationContext } from '../migration-types';

interface ProviderData {
	connected: boolean;
	connectedAt: string | Date | null;
	settings: Record<string, unknown>;
}

interface ExternalSecretsSettings {
	[providerName: string]: ProviderData;
}

const EXTERNAL_SECRETS_DB_KEY = 'feature.externalSecrets';

/**
 * Migrates external secrets provider settings from a single encrypted JSON blob
 * in the `settings` table to individual entity rows in the `secrets_provider_connection` table.
 *
 * Existing providers are migrated as global providers (no project access rows).
 * The old settings row is preserved for backward compatibility.
 */
export class MigrateExternalSecretsToEntityStorage1771500000000 implements IrreversibleMigration {
	private readonly cipher = Container.get(Cipher);

	async up({ escape, runQuery, logger, migrationName }: MigrationContext) {
		const settingsTable = escape.tableName('settings');
		const keyCol = escape.columnName('key');
		const valueCol = escape.columnName('value');

		// Step 1: Read the encrypted settings blob
		const rows: Array<{ value: string }> = await runQuery(
			`SELECT ${valueCol} FROM ${settingsTable} WHERE ${keyCol} = '${EXTERNAL_SECRETS_DB_KEY}';`,
		);

		if (rows.length === 0) {
			logger.info(`[${migrationName}] No external secrets settings found, skipping`);
			return;
		}

		const [row] = rows;

		// Step 2: Decrypt the blob
		let allSettings: ExternalSecretsSettings;
		try {
			const decrypted = this.cipher.decrypt(row.value);
			allSettings = jsonParse<ExternalSecretsSettings>(decrypted);
		} catch (e) {
			logger.error(
				`[${migrationName}] Failed to decrypt external secrets settings, skipping migration`,
			);
			return;
		}

		const providerNames = Object.keys(allSettings);
		if (providerNames.length === 0) {
			logger.info(`[${migrationName}] External secrets settings blob is empty, skipping`);
			return;
		}

		// Step 3: Insert each provider into secrets_provider_connection
		const connectionTable = escape.tableName('secrets_provider_connection');
		const providerKeyCol = escape.columnName('providerKey');
		const typeCol = escape.columnName('type');
		const encryptedSettingsCol = escape.columnName('encryptedSettings');

		for (const providerName of providerNames) {
			const providerData = allSettings[providerName];

			// Idempotency check: skip if provider already exists
			const existing: Array<{ providerKey: string }> = await runQuery(
				`SELECT ${providerKeyCol} FROM ${connectionTable} WHERE ${providerKeyCol} = :providerKey;`,
				{ providerKey: providerName },
			);

			if (existing.length > 0) {
				logger.info(
					`[${migrationName}] Provider "${providerName}" already exists in secrets_provider_connection, skipping`,
				);
				continue;
			}

			// Re-encrypt just the settings object for the new entity
			const encryptedSettings = this.cipher.encrypt(providerData.settings ?? {});

			// Insert row: providerKey = type = providerName (per ticket spec)
			// isEnabled, createdAt, updatedAt have DB defaults and are omitted
			// No project_secrets_provider_access rows = global provider
			await runQuery(
				`INSERT INTO ${connectionTable} (${providerKeyCol}, ${typeCol}, ${encryptedSettingsCol}) VALUES (:providerKey, :type, :encryptedSettings);`,
				{
					providerKey: providerName,
					type: providerName,
					encryptedSettings,
				},
			);

			logger.info(
				`[${migrationName}] Migrated provider "${providerName}" to secrets_provider_connection`,
			);
		}

		logger.info(
			`[${migrationName}] Migration complete. Old settings row preserved in settings table.`,
		);
	}
}
