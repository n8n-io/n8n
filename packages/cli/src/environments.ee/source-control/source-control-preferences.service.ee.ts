import { Logger } from '@n8n/backend-common';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ValidationError } from 'class-validator';
import { validate } from 'class-validator';
import { rm as fsRm } from 'fs/promises';
import { Cipher, InstanceSettings } from 'n8n-core';
import { jsonParse, UnexpectedError } from 'n8n-workflow';
import { writeFile, readFile } from 'node:fs/promises';
import path from 'path';

import {
	SOURCE_CONTROL_SSH_FOLDER,
	SOURCE_CONTROL_GIT_FOLDER,
	SOURCE_CONTROL_SSH_KEY_NAME,
	SOURCE_CONTROL_PREFERENCES_DB_KEY,
} from './constants';
import { generateSshKeyPair, isSourceControlLicensed } from './source-control-helper.ee';
import { SourceControlConfig } from './source-control.config';
import type { KeyPairType } from './types/key-pair-type';
import { SourceControlPreferences } from './types/source-control-preferences';

@Service()
export class SourceControlPreferencesService {
	private _sourceControlPreferences: SourceControlPreferences = new SourceControlPreferences();

	readonly sshKeyName: string;

	readonly sshFolder: string;

	readonly gitFolder: string;

	constructor(
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
		private readonly cipher: Cipher,
		private readonly settingsRepository: SettingsRepository,
		private readonly sourceControlConfig: SourceControlConfig,
	) {
		this.sshFolder = path.join(instanceSettings.n8nFolder, SOURCE_CONTROL_SSH_FOLDER);
		this.gitFolder = path.join(instanceSettings.n8nFolder, SOURCE_CONTROL_GIT_FOLDER);
		this.sshKeyName = path.join(this.sshFolder, SOURCE_CONTROL_SSH_KEY_NAME);
	}

	get sourceControlPreferences(): SourceControlPreferences {
		return {
			...this._sourceControlPreferences,
			connected: this._sourceControlPreferences.connected ?? false,
		};
	}

	// merge the new preferences with the existing preferences when setting
	set sourceControlPreferences(preferences: Partial<SourceControlPreferences>) {
		this._sourceControlPreferences = SourceControlPreferences.merge(
			preferences,
			this._sourceControlPreferences,
		);
	}

	/**
	 * Return preferences with sensitive fields removed for API responses
	 */
	getPreferencesForResponse(): Omit<SourceControlPreferences, 'personalAccessToken'> {
		const { personalAccessToken, ...rest } = this.sourceControlPreferences;
		return rest;
	}

	isSourceControlSetup() {
		return (
			this.isSourceControlLicensedAndEnabled() &&
			this.getPreferences().repositoryUrl &&
			this.getPreferences().branchName
		);
	}

	private async getKeyPairFromDatabase() {
		const dbSetting = await this.settingsRepository.findByKey('features.sourceControl.sshKeys');

		if (!dbSetting?.value) return null;

		type KeyPair = { publicKey: string; encryptedPrivateKey: string };

		return jsonParse<KeyPair | null>(dbSetting.value, { fallbackValue: null });
	}

	private async getPrivateKeyFromDatabase() {
		const dbKeyPair = await this.getKeyPairFromDatabase();

		if (!dbKeyPair) throw new UnexpectedError('Failed to find key pair in database');

		return this.cipher.decrypt(dbKeyPair.encryptedPrivateKey);
	}

	private async getPublicKeyFromDatabase() {
		const dbKeyPair = await this.getKeyPairFromDatabase();

		if (!dbKeyPair) throw new UnexpectedError('Failed to find key pair in database');

		return dbKeyPair.publicKey;
	}

	async getPrivateKeyPath() {
		const dbPrivateKey = await this.getPrivateKeyFromDatabase();

		const tempFilePath = path.join(this.instanceSettings.n8nFolder, 'ssh_private_key_temp');

		// Ensure proper line endings (LF only) for SSH keys, especially on Windows
		const normalizedKey = dbPrivateKey.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

		try {
			// Remove existing file if it exists to avoid permission conflicts
			// Using force: true ignores ENOENT but allows other errors to surface
			await fsRm(tempFilePath, { force: true });

			// Always use restrictive permissions for SSH private keys (security requirement)
			await writeFile(tempFilePath, normalizedKey, { mode: 0o600 });
		} catch (error) {
			this.logger.error('Failed to write SSH private key to temp file', {
				tempFilePath,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new UnexpectedError('Failed to create SSH private key file', { cause: error });
		}

		return tempFilePath;
	}

	/**
	 * Prepare preferences for storage by encrypting sensitive values (e.g., PAT)
	 */
	private preparePreferencesForStorage(
		preferences: SourceControlPreferences,
	): SourceControlPreferences {
		const copy: SourceControlPreferences = { ...preferences };
		if (copy.personalAccessToken) {
			try {
				copy.personalAccessToken = this.cipher.encrypt(copy.personalAccessToken);
			} catch (e) {
				// If encryption fails, do not persist a plaintext token
				throw new UnexpectedError('Failed to encrypt personal access token', { cause: e });
			}
		}
		return copy;
	}

	/**
	 * Prepare preferences from storage by decrypting sensitive values (e.g., PAT)
	 */
	private preparePreferencesFromStorage(
		preferences: SourceControlPreferences,
	): SourceControlPreferences {
		const copy: SourceControlPreferences = { ...preferences };
		if (copy.personalAccessToken) {
			try {
				// Attempt to decrypt; if not in expected format, treat as plaintext
				const decrypted = this.cipher.decrypt(copy.personalAccessToken);
				copy.personalAccessToken = decrypted;
			} catch {
				// Leave as-is for backward compatibility
			}
		}
		return copy;
	}

	async getPublicKey() {
		try {
			const dbPublicKey = await this.getPublicKeyFromDatabase();

			if (dbPublicKey) return dbPublicKey;

			return await readFile(this.sshKeyName + '.pub', { encoding: 'utf8' });
		} catch (e) {
			const error = e instanceof Error ? e : new Error(`${e}`);
			this.logger.error(`Failed to read SSH public key: ${error.message}`);
		}
		return '';
	}

	async deleteKeyPair() {
		try {
			await fsRm(this.sshFolder, { recursive: true });
			await this.settingsRepository.delete({ key: 'features.sourceControl.sshKeys' });
		} catch (e) {
			const error = e instanceof Error ? e : new Error(`${e}`);
			this.logger.error(`Failed to delete SSH key pair: ${error.message}`);
		}
	}

	/**
	 * Generate an SSH key pair and write it to the database, overwriting any existing key pair.
	 */
	async generateAndSaveKeyPair(keyPairType?: KeyPairType): Promise<SourceControlPreferences> {
		if (!keyPairType) {
			keyPairType =
				this.getPreferences().keyGeneratorType ?? this.sourceControlConfig.defaultKeyPairType;
		}
		const keyPair = await generateSshKeyPair(keyPairType);

		try {
			await this.settingsRepository.save({
				key: 'features.sourceControl.sshKeys',
				value: JSON.stringify({
					encryptedPrivateKey: this.cipher.encrypt(keyPair.privateKey),
					publicKey: keyPair.publicKey,
				}),
				loadOnStartup: true,
			});
		} catch (error) {
			throw new UnexpectedError('Failed to write key pair to database', { cause: error });
		}

		// update preferences only after generating key pair to prevent endless loop
		if (keyPairType !== this.getPreferences().keyGeneratorType) {
			await this.setPreferences({ keyGeneratorType: keyPairType });
		}

		return this.getPreferences();
	}

	isBranchReadOnly(): boolean {
		return this._sourceControlPreferences.branchReadOnly;
	}

	isSourceControlConnected(): boolean {
		return this.sourceControlPreferences.connected;
	}

	isSourceControlLicensedAndEnabled(): boolean {
		return this.isSourceControlConnected() && isSourceControlLicensed();
	}

	getBranchName(): string {
		return this.sourceControlPreferences.branchName;
	}

	getPreferences(): SourceControlPreferences {
		return this.sourceControlPreferences;
	}

	async validateSourceControlPreferences(
		preferences: Partial<SourceControlPreferences>,
		allowMissingProperties = true,
	): Promise<ValidationError[]> {
		const preferencesObject = new SourceControlPreferences(preferences);
		const validationResult = await validate(preferencesObject, {
			forbidUnknownValues: false,
			skipMissingProperties: allowMissingProperties,
			stopAtFirstError: false,
			validationError: { target: false },
		});
		// Hybrid: add cross-field validation for HTTPS
		const protocol = preferencesObject.protocol ?? 'ssh';
		if (protocol === 'https') {
			if (!preferencesObject.username) {
				const err = new Error('Username is required for HTTPS protocol');
				throw new UnexpectedError('Invalid source control preferences', { cause: err });
			}
			if (!preferencesObject.personalAccessToken) {
				const err = new Error('Personal access token is required for HTTPS protocol');
				throw new UnexpectedError('Invalid source control preferences', { cause: err });
			}
		}
		if (validationResult.length > 0) {
			throw new UnexpectedError('Invalid source control preferences', {
				extra: { preferences: validationResult },
			});
		}
		return validationResult;
	}

	async setPreferences(
		preferences: Partial<SourceControlPreferences>,
		saveToDb = true,
	): Promise<SourceControlPreferences> {
		const noKeyPair = (await this.getKeyPairFromDatabase()) === null;
		const targetProtocol = preferences.protocol ?? this.getPreferences().protocol ?? 'ssh';

		// Only generate SSH key pair for SSH protocol
		if (noKeyPair && targetProtocol !== 'https') await this.generateAndSaveKeyPair();

		this.sourceControlPreferences = preferences;
		if (saveToDb) {
			// Store encrypted token
			const preferencesForStorage = this.preparePreferencesForStorage(
				this._sourceControlPreferences,
			);
			const settingsValue = JSON.stringify(preferencesForStorage);
			try {
				await this.settingsRepository.save(
					{
						key: SOURCE_CONTROL_PREFERENCES_DB_KEY,
						value: settingsValue,
						loadOnStartup: true,
					},
					{ transaction: false },
				);
			} catch (error) {
				throw new UnexpectedError('Failed to save source control preferences', { cause: error });
			}
		}
		return this.sourceControlPreferences;
	}

	async loadFromDbAndApplySourceControlPreferences(): Promise<
		SourceControlPreferences | undefined
	> {
		const loadedPreferences = await this.settingsRepository.findOne({
			where: { key: SOURCE_CONTROL_PREFERENCES_DB_KEY },
		});
		if (loadedPreferences) {
			try {
				const raw = jsonParse<SourceControlPreferences>(loadedPreferences.value);
				if (raw) {
					const preferences = this.preparePreferencesFromStorage(raw);
					// set local preferences but don't write back to db
					await this.setPreferences(preferences, false);
					return preferences;
				}
			} catch (error) {
				this.logger.warn(
					`Could not parse Source Control settings from database: ${(error as Error).message}`,
				);
			}
		}
		await this.setPreferences(new SourceControlPreferences(), true);
		return this.sourceControlPreferences;
	}
}
