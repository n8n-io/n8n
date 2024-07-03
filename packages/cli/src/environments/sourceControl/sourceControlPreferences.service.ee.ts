import { writeFile, chmod, readFile } from 'node:fs/promises';
import Container, { Service } from 'typedi';
import { SourceControlPreferences } from './types/sourceControlPreferences';
import type { ValidationError } from 'class-validator';
import { validate } from 'class-validator';
import { rm as fsRm } from 'fs/promises';
import { generateSshKeyPair, isSourceControlLicensed } from './sourceControlHelper.ee';
import { Cipher, InstanceSettings } from 'n8n-core';
import { ApplicationError, jsonParse } from 'n8n-workflow';
import {
	SOURCE_CONTROL_SSH_FOLDER,
	SOURCE_CONTROL_GIT_FOLDER,
	SOURCE_CONTROL_SSH_KEY_NAME,
	SOURCE_CONTROL_PREFERENCES_DB_KEY,
} from './constants';
import path from 'path';
import type { KeyPairType } from './types/keyPairType';
import config from '@/config';
import { Logger } from '@/Logger';
import { SettingsRepository } from '@db/repositories/settings.repository';

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
	) {
		this.sshFolder = path.join(instanceSettings.n8nFolder, SOURCE_CONTROL_SSH_FOLDER);
		this.gitFolder = path.join(instanceSettings.n8nFolder, SOURCE_CONTROL_GIT_FOLDER);
		this.sshKeyName = path.join(this.sshFolder, SOURCE_CONTROL_SSH_KEY_NAME);
	}

	public get sourceControlPreferences(): SourceControlPreferences {
		return {
			...this._sourceControlPreferences,
			connected: this._sourceControlPreferences.connected ?? false,
		};
	}

	// merge the new preferences with the existing preferences when setting
	public set sourceControlPreferences(preferences: Partial<SourceControlPreferences>) {
		this._sourceControlPreferences = SourceControlPreferences.merge(
			preferences,
			this._sourceControlPreferences,
		);
	}

	public isSourceControlSetup() {
		return (
			this.isSourceControlLicensedAndEnabled() &&
			this.getPreferences().repositoryUrl &&
			this.getPreferences().branchName
		);
	}

	private async getKeyPairFromDatabase() {
		const dbSetting = await Container.get(SettingsRepository).findByKey(
			'features.sourceControl.sshKeys',
		);

		if (!dbSetting?.value) return null;

		type KeyPair = { publicKey: string; encryptedPrivateKey: string };

		return jsonParse<KeyPair | null>(dbSetting.value, { fallbackValue: null });
	}

	private async getPrivateKeyFromDatabase() {
		const dbKeyPair = await this.getKeyPairFromDatabase();

		if (!dbKeyPair) throw new ApplicationError('Failed to find key pair in database');

		return this.cipher.decrypt(dbKeyPair.encryptedPrivateKey);
	}

	private async getPublicKeyFromDatabase() {
		const dbKeyPair = await this.getKeyPairFromDatabase();

		if (!dbKeyPair) throw new ApplicationError('Failed to find key pair in database');

		return dbKeyPair.publicKey;
	}

	async getPrivateKeyPath() {
		const dbPrivateKey = await this.getPrivateKeyFromDatabase();

		const tempFilePath = path.join(this.instanceSettings.n8nFolder, 'ssh_private_key_temp');

		await writeFile(tempFilePath, dbPrivateKey);

		await chmod(tempFilePath, 0o600);

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
			await Container.get(SettingsRepository).delete({ key: 'features.sourceControl.sshKeys' });
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
				this.getPreferences().keyGeneratorType ??
				(config.get('sourceControl.defaultKeyPairType') as KeyPairType) ??
				'ed25519';
		}
		const keyPair = await generateSshKeyPair(keyPairType);

		try {
			await Container.get(SettingsRepository).save({
				key: 'features.sourceControl.sshKeys',
				value: JSON.stringify({
					encryptedPrivateKey: this.cipher.encrypt(keyPair.privateKey),
					publicKey: keyPair.publicKey,
				}),
				loadOnStartup: true,
			});
		} catch (error) {
			throw new ApplicationError('Failed to write key pair to database', { cause: error });
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
		if (validationResult.length > 0) {
			throw new ApplicationError('Invalid source control preferences', {
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

		if (noKeyPair) await this.generateAndSaveKeyPair();

		this.sourceControlPreferences = preferences;
		if (saveToDb) {
			const settingsValue = JSON.stringify(this._sourceControlPreferences);
			try {
				await Container.get(SettingsRepository).save(
					{
						key: SOURCE_CONTROL_PREFERENCES_DB_KEY,
						value: settingsValue,
						loadOnStartup: true,
					},
					{ transaction: false },
				);
			} catch (error) {
				throw new ApplicationError('Failed to save source control preferences', { cause: error });
			}
		}
		return this.sourceControlPreferences;
	}

	async loadFromDbAndApplySourceControlPreferences(): Promise<
		SourceControlPreferences | undefined
	> {
		const loadedPreferences = await Container.get(SettingsRepository).findOne({
			where: { key: SOURCE_CONTROL_PREFERENCES_DB_KEY },
		});
		if (loadedPreferences) {
			try {
				const preferences = jsonParse<SourceControlPreferences>(loadedPreferences.value);
				if (preferences) {
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
