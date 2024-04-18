import path from 'node:path';
import { readFile, writeFile, rm } from 'node:fs/promises';
import Container from 'typedi';
import { Cipher, InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import type { MigrationContext, ReversibleMigration } from '@db/types';

/**
 * Move SSH key pair from file system to database, to enable SSH connections
 * when running n8n in multiple containers - mains, webhooks, workers, etc.
 */
export class MoveSshKeysToDatabase1711390882123 implements ReversibleMigration {
	private readonly settingsKey = 'features.sourceControl.sshKeys';

	private readonly privateKeyPath = path.join(
		Container.get(InstanceSettings).n8nFolder,
		'ssh',
		'key',
	);

	private readonly publicKeyPath = this.privateKeyPath + '.pub';

	private readonly cipher = Container.get(Cipher);

	async up({ escape, runQuery, logger, migrationName }: MigrationContext) {
		let privateKey, publicKey;

		try {
			[privateKey, publicKey] = await Promise.all([
				readFile(this.privateKeyPath, { encoding: 'utf8' }),
				readFile(this.publicKeyPath, { encoding: 'utf8' }),
			]);
		} catch {
			logger.info(`[${migrationName}] No SSH keys in filesystem, skipping`);
			return;
		}

		if (!privateKey && !publicKey) {
			logger.info(`[${migrationName}] No SSH keys in filesystem, skipping`);
			return;
		}

		const settings = escape.tableName('settings');
		const key = escape.columnName('key');
		const value = escape.columnName('value');

		const rows: Array<{ value: string }> = await runQuery(
			`SELECT value FROM ${settings} WHERE ${key} = '${this.settingsKey}';`,
		);

		if (rows.length === 1) {
			logger.info(`[${migrationName}] SSH keys already in database, skipping`);
			return;
		}

		if (!privateKey) {
			logger.error(`[${migrationName}] No private key found, skipping`);
			return;
		}

		const settingsValue = JSON.stringify({
			encryptedPrivateKey: this.cipher.encrypt(privateKey),
			publicKey,
		});

		await runQuery(
			`INSERT INTO ${settings} (${key}, ${value}) VALUES ('${this.settingsKey}', '${settingsValue}');`,
		);

		try {
			await Promise.all([rm(this.privateKeyPath), rm(this.publicKeyPath)]);
		} catch (e) {
			const error = e instanceof Error ? e : new Error(`${e}`);
			logger.error(
				`[${migrationName}] Failed to remove SSH keys from filesystem: ${error.message}`,
			);
		}
	}

	async down({ escape, runQuery, logger, migrationName }: MigrationContext) {
		const settings = escape.tableName('settings');
		const key = escape.columnName('key');

		const rows: Array<{ value: string }> = await runQuery(
			`SELECT value FROM ${settings} WHERE ${key} = '${this.settingsKey}';`,
		);

		if (rows.length !== 1) {
			logger.info(`[${migrationName}] No SSH keys in database, skipping revert`);
			return;
		}

		const [row] = rows;

		type KeyPair = { publicKey: string; encryptedPrivateKey: string };

		const dbKeyPair = jsonParse<KeyPair | null>(row.value, { fallbackValue: null });

		if (!dbKeyPair) {
			logger.info(`[${migrationName}] Malformed SSH keys in database, skipping revert`);
			return;
		}

		const privateKey = this.cipher.decrypt(dbKeyPair.encryptedPrivateKey);
		const { publicKey } = dbKeyPair;

		try {
			await Promise.all([
				writeFile(this.privateKeyPath, privateKey, { encoding: 'utf8', mode: 0o600 }),
				writeFile(this.publicKeyPath, publicKey, { encoding: 'utf8', mode: 0o600 }),
			]);
		} catch {
			logger.error(`[${migrationName}] Failed to write SSH keys to filesystem, skipping revert`);
			return;
		}

		await runQuery(`DELETE FROM ${settings} WHERE ${key} = 'features.sourceControl.sshKeys';`);
	}
}
