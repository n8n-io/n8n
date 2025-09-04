import { Logger } from '@n8n/backend-common';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ValidationError, validate } from 'class-validator';
import { rm as fsRm } from 'fs/promises';
import { Cipher, InstanceSettings } from 'n8n-core';
import { jsonParse, UserError, OperationalError } from 'n8n-workflow';
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

		if (!dbKeyPair) throw new OperationalError('SSH key pair not found in database');

		return this.cipher.decrypt(dbKeyPair.encryptedPrivateKey);
	}

	private async getPublicKeyFromDatabase() {
		const dbKeyPair = await this.getKeyPairFromDatabase();

		if (!dbKeyPair) throw new OperationalError('SSH key pair not found in database');

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
			throw new OperationalError('Failed to create SSH private key file', { cause: error });
		}

		return tempFilePath;
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
			throw new OperationalError('Failed to save SSH key pair to database', { cause: error });
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

	/**
	 * Get preferences with sensitive fields redacted for API responses
	 */
	getPreferencesForResponse(): Omit<SourceControlPreferences, 'personalAccessToken'> {
		const preferences = this.sourceControlPreferences;
		// Return preferences without the personalAccessToken field
		const { personalAccessToken, ...safePreferences } = preferences;
		return safePreferences;
	}

	/**
	 * Encrypts a personal access token for secure storage
	 */
	private encryptPersonalAccessToken(token: string): string {
		return this.cipher.encrypt(token);
	}

	/**
	 * Decrypts a personal access token from storage
	 */
	private decryptPersonalAccessToken(encryptedToken: string): string {
		return this.cipher.decrypt(encryptedToken);
	}

	/**
	 * Prepares preferences for database storage by encrypting sensitive fields
	 */
	private preparePreferencesForStorage(
		preferences: Partial<SourceControlPreferences>,
	): Partial<SourceControlPreferences> {
		const preferencesToStore = { ...preferences };

		// Encrypt personal access token if provided
		if (preferencesToStore.personalAccessToken) {
			preferencesToStore.personalAccessToken = this.encryptPersonalAccessToken(
				preferencesToStore.personalAccessToken,
			);
		}

		return preferencesToStore;
	}

	/**
	 * Checks if a value is encrypted using n8n's cipher envelope format
	 * n8n's cipher creates base64 strings that start with 'Salted__' when decoded
	 */
	private isEncryptedValue(value: string): boolean {
		try {
			// n8n cipher always creates base64 strings that start with the RANDOM_BYTES 'Salted__'
			// when decoded. Check for valid base64 and minimum length for encrypted content.
			if (value.length < 24) return false; // Too short to be encrypted

			// Check if it's valid base64
			const decoded = Buffer.from(value, 'base64');
			if (decoded.length < 16) return false;

			// Check if it starts with n8n's cipher prefix 'Salted__'
			const expectedPrefix = Buffer.from('53616c7465645f5f', 'hex'); // 'Salted__'
			return decoded.subarray(0, 8).equals(expectedPrefix);
		} catch {
			return false;
		}
	}

	/**
	 * Prepares preferences from database by decrypting sensitive fields
	 */
	private preparePreferencesFromStorage(
		preferences: Partial<SourceControlPreferences>,
	): Partial<SourceControlPreferences> {
		const decryptedPreferences = { ...preferences };

		// Decrypt personal access token if it exists and is encrypted
		if (decryptedPreferences.personalAccessToken) {
			try {
				// Only attempt decryption if it has the proper encryption envelope
				if (this.isEncryptedValue(decryptedPreferences.personalAccessToken)) {
					decryptedPreferences.personalAccessToken = this.decryptPersonalAccessToken(
						decryptedPreferences.personalAccessToken,
					);
				}
			} catch (error) {
				this.logger.warn('Failed to decrypt personal access token, treating as plain text', {
					error: error instanceof Error ? error.message : String(error),
				});
				// If decryption fails, assume it's already plain text (backward compatibility)
			}
		}

		return decryptedPreferences;
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

		// Add custom cross-field validation for HTTPS protocol
		if (preferencesObject.protocol === 'https') {
			const httpsValidationErrors: ValidationError[] = [];

			if (!preferencesObject.username) {
				const usernameError = new ValidationError();
				usernameError.property = 'username';
				usernameError.constraints = {
					required: 'Username is required when using HTTPS protocol',
				};
				httpsValidationErrors.push(usernameError);
			}

			if (!preferencesObject.personalAccessToken) {
				const tokenError = new ValidationError();
				tokenError.property = 'personalAccessToken';
				tokenError.constraints = {
					required: 'Personal access token is required when using HTTPS protocol',
				};
				httpsValidationErrors.push(tokenError);
			}

			validationResult.push(...httpsValidationErrors);
		}

		if (validationResult.length > 0) {
			throw new UserError('Invalid source control preferences', {
				extra: { validationErrors: validationResult },
			});
		}
		return validationResult;
	}

	async setPreferences(
		preferences: Partial<SourceControlPreferences>,
		saveToDb = true,
	): Promise<SourceControlPreferences> {
		const noKeyPair = (await this.getKeyPairFromDatabase()) === null;

		if (noKeyPair) await this.generateAndSaveKeyPair();

		// Set preferences in memory (without encryption for runtime use)
		this.sourceControlPreferences = preferences;

		if (saveToDb) {
			// Prepare preferences for storage by encrypting sensitive fields
			const preferencesForStorage = this.preparePreferencesForStorage({
				...this._sourceControlPreferences,
			});
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
				throw new OperationalError('Failed to save source control preferences', { cause: error });
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
				const storedPreferences = jsonParse<SourceControlPreferences>(loadedPreferences.value);
				if (storedPreferences) {
					// Decrypt sensitive fields from storage
					const decryptedPreferences = this.preparePreferencesFromStorage(storedPreferences);
					// set local preferences but don't write back to db
					await this.setPreferences(decryptedPreferences, false);
					return this.sourceControlPreferences;
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
