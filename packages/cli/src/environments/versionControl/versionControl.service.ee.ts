import { Service } from 'typedi';
import path from 'path';
import { generateSshKeyPair, isVersionControlLicensed } from './versionControlHelper';
import { VersionControlPreferences } from './types/versionControlPreferences';
import {
	VERSION_CONTROL_CREDENTIAL_EXPORT_FOLDER,
	VERSION_CONTROL_GIT_FOLDER,
	VERSION_CONTROL_PREFERENCES_DB_KEY,
	VERSION_CONTROL_SSH_FOLDER,
	VERSION_CONTROL_SSH_KEY_NAME,
	VERSION_CONTROL_WORKFLOW_EXPORT_FOLDER,
} from './constants';
import * as Db from '@/Db';
import { jsonParse, LoggerProxy } from 'n8n-workflow';
import type { ValidationError } from 'class-validator';
import { validate } from 'class-validator';
import { readFileSync as fsReadFileSync, existsSync as fsExistsSync } from 'fs';
import { writeFile as fsWriteFile } from 'fs/promises';
import { VersionControlGitService } from './git.service.ee';
import { UserSettings } from 'n8n-core';
import type { FetchResult, StatusResult } from 'simple-git';
import type { ExportResult } from './types/exportResult';
import { VersionControlExportService } from './versionControlExport.service.ee';
import { BadRequestError } from '../../ResponseHelper';

@Service()
export class VersionControlService {
	private _versionControlPreferences: VersionControlPreferences = new VersionControlPreferences();

	private sshKeyName: string;

	private sshFolder: string;

	private gitFolder: string;

	private workflowExportFolder: string;

	private credentialExportFolder: string;

	constructor(
		private gitService: VersionControlGitService,
		private versionControlExportService: VersionControlExportService,
	) {
		const userFolder = UserSettings.getUserN8nFolderPath();
		this.sshFolder = path.join(userFolder, VERSION_CONTROL_SSH_FOLDER);
		this.gitFolder = path.join(userFolder, VERSION_CONTROL_GIT_FOLDER);
		this.workflowExportFolder = path.join(this.gitFolder, VERSION_CONTROL_WORKFLOW_EXPORT_FOLDER);
		this.credentialExportFolder = path.join(
			this.gitFolder,
			VERSION_CONTROL_CREDENTIAL_EXPORT_FOLDER,
		);
		this.sshKeyName = path.join(this.sshFolder, VERSION_CONTROL_SSH_KEY_NAME);
	}

	async init(): Promise<void> {
		this.gitService.reset();
		await this.loadFromDbAndApplyVersionControlPreferences();
		await this.gitService.init({
			versionControlPreferences: this.versionControlPreferences,
			gitFolder: this.gitFolder,
			sshKeyName: this.sshKeyName,
			sshFolder: this.sshFolder,
		});
	}

	public get versionControlPreferences(): VersionControlPreferences {
		return {
			...this._versionControlPreferences,
			connected: this._versionControlPreferences.connected ?? false,
			publicKey: this.getPublicKey(),
		};
	}

	public set versionControlPreferences(preferences: Partial<VersionControlPreferences>) {
		this._versionControlPreferences = VersionControlPreferences.merge(
			preferences,
			this._versionControlPreferences,
		);
	}

	isVersionControlConnected(): boolean {
		return this.versionControlPreferences.connected;
	}

	isVersionControlLicensedAndEnabled(): boolean {
		return this.isVersionControlConnected() && isVersionControlLicensed();
	}

	getPublicKey(): string {
		try {
			return fsReadFileSync(this.sshKeyName + '.pub', { encoding: 'utf8' });
		} catch (error) {
			LoggerProxy.error(`Failed to read public key: ${(error as Error).message}`);
		}
		return '';
	}

	hasKeyPairFiles(): boolean {
		return fsExistsSync(this.sshKeyName) && fsExistsSync(this.sshKeyName + '.pub');
	}

	/**
	 * Will generate an ed25519 key pair and save it to the database and the file system
	 * Note: this will overwrite any existing key pair
	 */
	async generateAndSaveKeyPair() {
		const keyPair = generateSshKeyPair('ed25519');
		if (keyPair.publicKey && keyPair.privateKey) {
			try {
				await fsWriteFile(this.sshKeyName + '.pub', keyPair.publicKey, {
					encoding: 'utf8',
					mode: 0o666,
				});
				await fsWriteFile(this.sshKeyName, keyPair.privateKey, { encoding: 'utf8', mode: 0o600 });
			} catch (error) {
				throw Error(`Failed to save key pair: ${(error as Error).message}`);
			}
		}
	}

	async connect() {
		try {
			await this.setPreferences({ connected: true });
			await this.init();
			const fetchResult = await this.fetch();
			return fetchResult;
		} catch (error) {
			throw Error(`Failed to connect to version control: ${(error as Error).message}`);
		}
	}

	async disconnect() {
		try {
			await this.setPreferences({ connected: false });
			// TODO: remove key pair from disk?
			this.gitService.reset();
		} catch (error) {
			throw Error(`Failed to disconnect from version control: ${(error as Error).message}`);
		}
	}

	async validateVersionControlPreferences(
		preferences: Partial<VersionControlPreferences>,
		allowMissingProperties = true,
	): Promise<ValidationError[]> {
		if (this.isVersionControlConnected()) {
			if (preferences.repositoryUrl !== this._versionControlPreferences.repositoryUrl) {
				throw new Error('Cannot change repository while connected');
			}
		}
		const preferencesObject = new VersionControlPreferences(preferences);
		const validationResult = await validate(preferencesObject, {
			forbidUnknownValues: false,
			skipMissingProperties: allowMissingProperties,
			stopAtFirstError: false,
			validationError: { target: false },
		});
		if (validationResult.length > 0) {
			throw new Error(`Invalid version control preferences: ${JSON.stringify(validationResult)}`);
		}
		if (preferencesObject.branchName !== this._versionControlPreferences.branchName) {
			const branches = await this.getBranches();
			if (!branches.branches.includes(preferencesObject.branchName)) {
				throw new Error(
					`Selected branch ${preferencesObject.branchName} does not exist in repo: ${JSON.stringify(
						branches.branches,
					)}`,
				);
			}
		}
		return validationResult;
	}

	async setPreferences(
		preferences: Partial<VersionControlPreferences>,
		saveToDb = true,
	): Promise<VersionControlPreferences> {
		if (!this.hasKeyPairFiles()) {
			LoggerProxy.debug('No key pair files found, generating new pair');
			await this.generateAndSaveKeyPair();
		}
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
					// set local preferences but don't write back to db
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

	async export(): Promise<{
		credentials: ExportResult | undefined;
		workflows: ExportResult | undefined;
	}> {
		const result: {
			credentials: ExportResult | undefined;
			workflows: ExportResult | undefined;
		} = {
			credentials: undefined,
			workflows: undefined,
		};
		try {
			result.workflows = await this.versionControlExportService.exportWorkflowsToWorkFolder();
			result.credentials = await this.versionControlExportService.exportCredentialsToWorkFolder();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
		return result;
	}

	async import(): Promise<{
		credentials: ExportResult | undefined;
		workflows: ExportResult | undefined;
	}> {
		const result: {
			credentials: ExportResult | undefined;
			workflows: ExportResult | undefined;
		} = {
			credentials: undefined,
			workflows: undefined,
		};
		try {
			result.workflows = await this.versionControlExportService.importFromWorkFolder();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
		return result;
	}

	async getBranches(): Promise<{ branches: string[]; currentBranch: string }> {
		// fetch first to get include remote changes
		await this.gitService.fetch();
		return this.gitService.getBranches();
	}

	async setBranch(branch: string): Promise<{ branches: string[]; currentBranch: string }> {
		await this.setPreferences({ branchName: branch });
		return this.gitService.setBranch(branch);
	}

	async fetch(): Promise<FetchResult> {
		return this.gitService.fetch();
	}

	async pull(): Promise<void> {
		return this.gitService.pull();
	}

	async push(): Promise<void> {
		return this.gitService.push();
	}

	async stage(): Promise<void> {
		return this.gitService.stage();
	}

	async commit(message: string): Promise<void> {
		return this.gitService.commit(message);
	}

	async status(): Promise<StatusResult> {
		return this.gitService.status();
	}
}
