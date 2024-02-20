import Container, { Service } from 'typedi';
import { SourceControlPreferences } from './types/sourceControlPreferences';
import type { ValidationError } from 'class-validator';
import { validate } from 'class-validator';
import { readFileSync as fsReadFileSync, existsSync as fsExistsSync } from 'fs';
import { writeFile as fsWriteFile, rm as fsRm } from 'fs/promises';
import {
	generateSshKeyPair,
	isSourceControlLicensed,
	sourceControlFoldersExistCheck,
} from './sourceControlHelper.ee';
import { InstanceSettings } from 'n8n-core';
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
		instanceSettings: InstanceSettings,
		private readonly logger: Logger,
	) {
		this.sshFolder = path.join(instanceSettings.n8nFolder, SOURCE_CONTROL_SSH_FOLDER);
		this.gitFolder = path.join(instanceSettings.n8nFolder, SOURCE_CONTROL_GIT_FOLDER);
		this.sshKeyName = path.join(this.sshFolder, SOURCE_CONTROL_SSH_KEY_NAME);
	}

	public get sourceControlPreferences(): SourceControlPreferences {
		return {
			...this._sourceControlPreferences,
			connected: this._sourceControlPreferences.connected ?? false,
			publicKey: this.getPublicKey(),
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

	getPublicKey(): string {
		try {
			return fsReadFileSync(this.sshKeyName + '.pub', { encoding: 'utf8' });
		} catch (error) {
			this.logger.error(`Failed to read public key: ${(error as Error).message}`);
		}
		return '';
	}

	hasKeyPairFiles(): boolean {
		return fsExistsSync(this.sshKeyName) && fsExistsSync(this.sshKeyName + '.pub');
	}

	async deleteKeyPairFiles(): Promise<void> {
		try {
			await fsRm(this.sshFolder, { recursive: true });
		} catch (error) {
			this.logger.error(`Failed to delete ssh folder: ${(error as Error).message}`);
		}
	}

	/**
	 * Will generate an ed25519 key pair and save it to the database and the file system
	 * Note: this will overwrite any existing key pair
	 */
	async generateAndSaveKeyPair(keyPairType?: KeyPairType): Promise<SourceControlPreferences> {
		sourceControlFoldersExistCheck([this.gitFolder, this.sshFolder]);
		if (!keyPairType) {
			keyPairType =
				this.getPreferences().keyGeneratorType ??
				(config.get('sourceControl.defaultKeyPairType') as KeyPairType) ??
				'ed25519';
		}
		const keyPair = await generateSshKeyPair(keyPairType);
		if (keyPair.publicKey && keyPair.privateKey) {
			try {
				await fsWriteFile(this.sshKeyName + '.pub', keyPair.publicKey, {
					encoding: 'utf8',
					mode: 0o666,
				});
				await fsWriteFile(this.sshKeyName, keyPair.privateKey, { encoding: 'utf8', mode: 0o600 });
			} catch (error) {
				throw new ApplicationError('Failed to save key pair', { cause: error });
			}
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
		sourceControlFoldersExistCheck([this.gitFolder, this.sshFolder]);
		if (!this.hasKeyPairFiles()) {
			const keyPairType =
				preferences.keyGeneratorType ??
				(config.get('sourceControl.defaultKeyPairType') as KeyPairType);
			this.logger.debug(`No key pair files found, generating new pair using type: ${keyPairType}`);
			await this.generateAndSaveKeyPair(keyPairType);
		}
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
