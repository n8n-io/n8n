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
	VERSION_CONTROL_TAGS_EXPORT_FILE,
	VERSION_CONTROL_VARIABLES_EXPORT_FILE,
	VERSION_CONTROL_WORKFLOW_EXPORT_FOLDER,
} from './constants';
import * as Db from '@/Db';
import { jsonParse, LoggerProxy } from 'n8n-workflow';
import type { ValidationError } from 'class-validator';
import { validate } from 'class-validator';
import { readFileSync as fsReadFileSync, existsSync as fsExistsSync } from 'fs';
import { writeFile as fsWriteFile, rm as fsRm } from 'fs/promises';
import { VersionControlGitService } from './git.service.ee';
import { UserSettings } from 'n8n-core';
import type {
	CommitResult,
	DiffResult,
	FetchResult,
	PullResult,
	PushResult,
	StatusResult,
} from 'simple-git';
import type { ExportResult } from './types/exportResult';
import { VersionControlExportService } from './versionControlExport.service.ee';
import { BadRequestError } from '../../ResponseHelper';
import type { ImportResult } from './types/importResult';
import type { VersionControlPushWorkFolder } from './types/versionControlPushWorkFolder';
import type { VersionControlPullWorkFolder } from './types/versionControlPullWorkFolder';
import type {
	VersionControlledFileLocation,
	VersionControlledFile,
	VersionControlledFileStatus,
	VersionControlledFileType,
} from './types/versionControlledFile';

@Service()
export class VersionControlService {
	private _versionControlPreferences: VersionControlPreferences = new VersionControlPreferences();

	private sshKeyName: string;

	private sshFolder: string;

	private gitFolder: string;

	constructor(
		private gitService: VersionControlGitService,
		private versionControlExportService: VersionControlExportService,
	) {
		const userFolder = UserSettings.getUserN8nFolderPath();
		this.sshFolder = path.join(userFolder, VERSION_CONTROL_SSH_FOLDER);
		this.gitFolder = path.join(userFolder, VERSION_CONTROL_GIT_FOLDER);
		this.sshKeyName = path.join(this.sshFolder, VERSION_CONTROL_SSH_KEY_NAME);
	}

	async init(): Promise<void> {
		this.gitService.resetService();
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
			const fetchResult = await this.gitService.fetch();
			return fetchResult;
		} catch (error) {
			throw Error(`Failed to connect to version control: ${(error as Error).message}`);
		}
	}

	async disconnect() {
		try {
			await this.setPreferences({ connected: false });
			await this.versionControlExportService.cleanWorkFolder();
			try {
				await fsRm(path.join(this.gitFolder, '.git'), { recursive: true, force: true });
			} catch (error) {
				LoggerProxy.error(`Failed to remove .git folder: ${(error as Error).message}`);
			}
			this.gitService.resetService();
			return this.versionControlPreferences;
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

	async export() {
		const result: {
			tags: ExportResult | undefined;
			credentials: ExportResult | undefined;
			variables: ExportResult | undefined;
			workflows: ExportResult | undefined;
		} = {
			credentials: undefined,
			tags: undefined,
			variables: undefined,
			workflows: undefined,
		};
		try {
			await this.versionControlExportService.cleanWorkFolder();
			result.tags = await this.versionControlExportService.exportTagsToWorkFolder();
			result.variables = await this.versionControlExportService.exportVariablesToWorkFolder();
			result.workflows = await this.versionControlExportService.exportWorkflowsToWorkFolder();
			result.credentials = await this.versionControlExportService.exportCredentialsToWorkFolder();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
		return result;
	}

	async import(userId: string): Promise<ImportResult | undefined> {
		try {
			return await this.versionControlExportService.importFromWorkFolder(userId);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
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

	// TODO: temp
	async fetch(): Promise<FetchResult> {
		return this.gitService.fetch();
	}

	// TODO: temp
	async diff(): Promise<DiffResult> {
		return this.gitService.diff();
	}

	// TODO: temp
	async pull(): Promise<PullResult> {
		return this.gitService.pull();
	}

	// TODO: temp
	async push(force = false): Promise<PushResult> {
		return this.gitService.push({ force });
	}

	// will reset the branch to the remote branch and pull
	// this will discard all local changes
	async resetWorkfolder(userId: string): Promise<ImportResult | undefined> {
		const currentBranch = await this.gitService.getCurrentBranch();
		await this.gitService.resetBranch({
			hard: true,
			target: currentBranch.remote,
		});
		await this.gitService.pull();
		return this.import(userId);
	}

	async pushWorkfolder(options: VersionControlPushWorkFolder): Promise<PushResult | DiffResult> {
		const diffResult = await this.updateLocalAndDiff();
		if (diffResult.files.length > 0 && options.force !== true) {
			await this.unstage();
			return diffResult;
		}
		await this.stage(options);
		await this.gitService.commit(options.message ?? 'Updated Workfolder');
		return this.gitService.push({ force: options.force ?? false });
	}

	async pullWorkfolder(
		options: VersionControlPullWorkFolder,
		userId: string,
	): Promise<ImportResult | DiffResult | undefined> {
		const diffResult = await this.updateLocalAndDiff();
		if (diffResult.files.length > 0) {
			await this.unstage();
			if (options.force === true) {
				return this.resetWorkfolder(userId);
			} else {
				return diffResult;
			}
		}
		await this.gitService.pull();
		return this.import(userId);
	}

	private async updateLocalAndDiff(): Promise<DiffResult> {
		await this.export(); // refresh workfolder
		await this.gitService.fetch();
		return this.gitService.diff();
	}

	async stage(
		options: Pick<VersionControlPushWorkFolder, 'fileNames' | 'credentialIds' | 'workflowIds'>,
	): Promise<{ staged: string[] } | string> {
		const { fileNames, credentialIds, workflowIds } = options;
		const status = await this.gitService.status();
		await this.unstage();
		let mergedFileNames = new Set<string>();
		fileNames?.forEach((e) => mergedFileNames.add(e));
		credentialIds?.forEach((e) =>
			mergedFileNames.add(this.versionControlExportService.getCredentialsPath(e)),
		);
		workflowIds?.forEach((e) =>
			mergedFileNames.add(this.versionControlExportService.getWorkflowPath(e)),
		);
		if (mergedFileNames.size === 0) {
			mergedFileNames = new Set<string>([
				...status.not_added,
				...status.created,
				...status.deleted,
				...status.modified,
			]);
		}
		const stageResult = await this.gitService.stage(mergedFileNames);
		if (!stageResult) {
			const statusResult = await this.gitService.status();
			return { staged: statusResult.staged };
		}
		return stageResult;
	}

	async unstage(): Promise<StatusResult | string> {
		const stageResult = await this.gitService.resetBranch();
		if (!stageResult) {
			return this.gitService.status();
		}
		return stageResult;
	}

	async commit(message?: string): Promise<CommitResult> {
		return this.gitService.commit(message ?? 'Updated Workfolder');
	}

	async status(): Promise<StatusResult> {
		return this.gitService.status();
	}

	// async getStatus(): Promise<StatusResult> {

	private async fileNameToVersionControlledFile(
		fileName: string,
		location: VersionControlledFileLocation,
		statusResult: StatusResult,
	): Promise<VersionControlledFile | undefined> {
		let id: string | undefined = undefined;
		let name = '';
		let status: VersionControlledFileStatus | undefined = undefined;
		let type: VersionControlledFileType = 'file';
		if (fileName.startsWith(VERSION_CONTROL_WORKFLOW_EXPORT_FOLDER)) {
			const workflow = await this.versionControlExportService.getWorkflowFromFile(fileName);
			if (!workflow?.id) {
				if (location === 'local') {
					return;
				}
				id = fileName
					.replace(VERSION_CONTROL_WORKFLOW_EXPORT_FOLDER + '/', '')
					.replace('.json', '');
				status = 'created';
			} else {
				id = workflow.id;
				name = workflow.name;
			}
			type = 'workflow';
		}
		if (fileName.startsWith(VERSION_CONTROL_CREDENTIAL_EXPORT_FOLDER)) {
			const credential = await this.versionControlExportService.getCredentialFromFile(fileName);
			if (!credential?.id) {
				if (location === 'local') {
					return;
				}
				id = fileName
					.replace(VERSION_CONTROL_CREDENTIAL_EXPORT_FOLDER + '/', '')
					.replace('.json', '');
				status = 'created';
			} else {
				id = credential.id;
				name = credential.name;
			}
			type = 'credential';
		}

		if (fileName.startsWith(VERSION_CONTROL_VARIABLES_EXPORT_FILE)) {
			id = 'variables';
			name = 'variables';
			type = 'variables';
		}

		if (fileName.startsWith(VERSION_CONTROL_TAGS_EXPORT_FILE)) {
			id = 'tags';
			name = 'tags';
			type = 'tags';
		}

		if (!id) return;

		if (!status) {
			if (statusResult.not_added.find((e) => e === fileName)) status = 'new';
			else if (statusResult.conflicted.find((e) => e === fileName)) status = 'conflicted';
			else if (statusResult.created.find((e) => e === fileName)) status = 'created';
			else if (statusResult.deleted.find((e) => e === fileName)) status = 'deleted';
			else if (statusResult.modified.find((e) => e === fileName)) status = 'modified';
			else {
				status = 'unknown';
			}
		}

		return {
			file: fileName,
			id,
			name,
			type,
			status,
			location,
		};

		return;
	}

	async getStatus(): Promise<VersionControlledFile[]> {
		await this.versionControlExportService.cleanWorkFolder();
		await this.export();
		await this.stage({});
		await this.gitService.fetch();
		const versionControlledFiles: VersionControlledFile[] = [];
		const diffRemote = await this.gitService.diffRemote();
		const diffLocal = await this.gitService.diffLocal();
		const status = await this.gitService.status();
		await Promise.all([
			...(diffRemote?.files.map(async (e) => {
				const resolvedFile = await this.fileNameToVersionControlledFile(e.file, 'remote', status);
				if (resolvedFile) {
					versionControlledFiles.push(resolvedFile);
				}
			}) ?? []),
			...(diffLocal?.files.map(async (e) => {
				const resolvedFile = await this.fileNameToVersionControlledFile(e.file, 'local', status);
				if (resolvedFile) {
					versionControlledFiles.push(resolvedFile);
				}
			}) ?? []),
		]);
		return versionControlledFiles;
	}
}
