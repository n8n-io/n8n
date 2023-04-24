import { Service } from 'typedi';
import { generateSshKeyPair } from './versionControlHelper';
import { VersionControlPreferences } from './types/versionControlPreferences';
import { VERSION_CONTROL_PREFERENCES_DB_KEY } from './constants';
import * as Db from '@/Db';
import { jsonParse, LoggerProxy } from 'n8n-workflow';
import type { ValidationError } from 'class-validator';
import { validate } from 'class-validator';

@Service()
export class VersionControlService {
	private _versionControlPreferences: VersionControlPreferences = new VersionControlPreferences();

	async init(): Promise<void> {
		await this.loadFromDbAndApplyVersionControlPreferences();
	}

	public get versionControlPreferences(): VersionControlPreferences {
		return {
			...this._versionControlPreferences,
			privateKey: '(redacted)',
		};
	}

	public set versionControlPreferences(preferences: Partial<VersionControlPreferences>) {
		this._versionControlPreferences = {
			connected: preferences.connected ?? this._versionControlPreferences.connected,
			authorEmail: preferences.authorEmail ?? this._versionControlPreferences.authorEmail,
			authorName: preferences.authorName ?? this._versionControlPreferences.authorName,
			branchName: preferences.branchName ?? this._versionControlPreferences.branchName,
			branchColor: preferences.branchColor ?? this._versionControlPreferences.branchColor,
			branchReadOnly: preferences.branchReadOnly ?? this._versionControlPreferences.branchReadOnly,
			privateKey: preferences.privateKey ?? this._versionControlPreferences.privateKey,
			publicKey: preferences.publicKey ?? this._versionControlPreferences.publicKey,
			repositoryUrl: preferences.repositoryUrl ?? this._versionControlPreferences.repositoryUrl,
		};
	}

	async generateAndSaveKeyPair() {
		const keyPair = generateSshKeyPair('ed25519');
		if (keyPair.publicKey && keyPair.privateKey) {
			await this.setPreferences({ ...keyPair });
		} else {
			LoggerProxy.error('Failed to generate key pair');
		}
		return keyPair;
	}

	async validateVersionControlPreferences(
		preferences: Partial<VersionControlPreferences>,
	): Promise<ValidationError[]> {
		const preferencesObject = new VersionControlPreferences(preferences);
		const validationResult = await validate(preferencesObject, {
			forbidUnknownValues: false,
			skipMissingProperties: true,
			stopAtFirstError: false,
			validationError: { target: false },
		});
		if (validationResult.length > 0) {
			throw new Error(`Invalid version control preferences: ${JSON.stringify(validationResult)}`);
		}
		// TODO: if repositoryUrl is changed, check if it is valid
		// TODO: if branchName is changed, check if it is valid
		return validationResult;
	}

	async setPreferences(
		preferences: Partial<VersionControlPreferences>,
		saveToDb = true,
	): Promise<VersionControlPreferences> {
		this.versionControlPreferences = preferences;
		if (saveToDb) {
			const settingsValue = JSON.stringify(this._versionControlPreferences);
			try {
				await Db.collections.Settings.save({
					key: VERSION_CONTROL_PREFERENCES_DB_KEY,
					value: settingsValue,
					loadOnStartup: true,
				});
			} catch (error) {
				throw new Error(`Failed to save version control preferences: ${(error as Error).message}`);
			}
		}
		return this.versionControlPreferences;
	}

	async loadFromDbAndApplyVersionControlPreferences(): Promise<
		VersionControlPreferences | undefined
	> {
		const loadedPreferences = await Db.collections.Settings.findOne({
			where: { key: VERSION_CONTROL_PREFERENCES_DB_KEY },
		});
		if (loadedPreferences) {
			try {
				const preferences = jsonParse<VersionControlPreferences>(loadedPreferences.value);
				if (preferences) {
					await this.setPreferences(preferences, false);
					return preferences;
				}
			} catch (error) {
				LoggerProxy.warn(
					`Could not parse Version Control settings from database: ${(error as Error).message}`,
				);
			}
		}
		return;
	}
}
