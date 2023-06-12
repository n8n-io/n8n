import { Service } from 'typedi';
import path from 'path';
import * as Db from '@/Db';
import { versionControlFoldersExistCheck } from './versionControlHelper.ee';
import type { VersionControlPreferences } from './types/versionControlPreferences';
import {
	VERSION_CONTROL_CREDENTIAL_EXPORT_FOLDER,
	VERSION_CONTROL_GIT_FOLDER,
	VERSION_CONTROL_README,
	VERSION_CONTROL_SSH_FOLDER,
	VERSION_CONTROL_SSH_KEY_NAME,
	VERSION_CONTROL_TAGS_EXPORT_FILE,
	VERSION_CONTROL_VARIABLES_EXPORT_FILE,
	VERSION_CONTROL_WORKFLOW_EXPORT_FOLDER,
} from './constants';
import { LoggerProxy } from 'n8n-workflow';
import { VersionControlGitService } from './versionControlGit.service.ee';
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
import type { VersionControllPullOptions } from './types/versionControlPullWorkFolder';
import type {
	VersionControlledFileLocation,
	VersionControlledFile,
	VersionControlledFileStatus,
	VersionControlledFileType,
} from './types/versionControlledFile';
import { VersionControlPreferencesService } from './versionControlPreferences.service.ee';
import { writeFileSync } from 'fs';
@Service()
export class VersionControlService {
	private sshKeyName: string;

	private sshFolder: string;

	private gitFolder: string;

	constructor(
		private gitService: VersionControlGitService,
		private versionControlPreferencesService: VersionControlPreferencesService,
		private versionControlExportService: VersionControlExportService,
	) {
		const userFolder = UserSettings.getUserN8nFolderPath();
		this.sshFolder = path.join(userFolder, VERSION_CONTROL_SSH_FOLDER);
		this.gitFolder = path.join(userFolder, VERSION_CONTROL_GIT_FOLDER);
		this.sshKeyName = path.join(this.sshFolder, VERSION_CONTROL_SSH_KEY_NAME);
	}

	async init(): Promise<void> {
		this.gitService.resetService();
		versionControlFoldersExistCheck([this.gitFolder, this.sshFolder]);
		await this.versionControlPreferencesService.loadFromDbAndApplyVersionControlPreferences();
		await this.gitService.initService({
			versionControlPreferences: this.versionControlPreferencesService.getPreferences(),
			gitFolder: this.gitFolder,
			sshKeyName: this.sshKeyName,
			sshFolder: this.sshFolder,
		});
	}

	async disconnect(options: { keepKeyPair?: boolean } = {}) {
		try {
			await this.versionControlPreferencesService.setPreferences({
				connected: false,
				branchName: '',
			});
			await this.versionControlExportService.deleteRepositoryFolder();
			if (!options.keepKeyPair) {
				await this.versionControlPreferencesService.deleteKeyPairFiles();
			}
			this.gitService.resetService();
			return this.versionControlPreferencesService.versionControlPreferences;
		} catch (error) {
			throw Error(`Failed to disconnect from version control: ${(error as Error).message}`);
		}
	}

	async initializeRepository(preferences: VersionControlPreferences) {
		if (!this.gitService.git) {
			await this.init();
		}
		LoggerProxy.debug('Initializing repository...');
		await this.gitService.initRepository(preferences);
		let getBranchesResult;
		try {
			getBranchesResult = await this.getBranches();
		} catch (error) {
			if ((error as Error).message.includes('Warning: Permanently added')) {
				LoggerProxy.debug('Added repository host to the list of known hosts. Retrying...');
				getBranchesResult = await this.getBranches();
			} else {
				throw error;
			}
		}
		if (getBranchesResult.branches.includes(preferences.branchName)) {
			await this.gitService.setBranch(preferences.branchName);
		} else {
			if (getBranchesResult.branches?.length === 0) {
				try {
					writeFileSync(path.join(this.gitFolder, '/README.md'), VERSION_CONTROL_README);

					await this.gitService.stage(new Set<string>(['README.md']));
					await this.gitService.commit('Initial commit');
					await this.gitService.push({
						branch: preferences.branchName,
						force: true,
					});
					getBranchesResult = await this.getBranches();
				} catch (fileError) {
					LoggerProxy.error(`Failed to create initial commit: ${(fileError as Error).message}`);
				}
			} else {
				await this.versionControlPreferencesService.setPreferences({
					branchName: '',
					connected: true,
				});
			}
		}
		return getBranchesResult;
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
			// comment next line if needed
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

	async import(options: VersionControllPullOptions): Promise<ImportResult | undefined> {
		try {
			return await this.versionControlExportService.importFromWorkFolder(options);
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
		await this.versionControlPreferencesService.setPreferences({
			branchName: branch,
			connected: branch?.length > 0,
		});
		return this.gitService.setBranch(branch);
	}

	// will reset the branch to the remote branch and pull
	// this will discard all local changes
	async resetWorkfolder(options: VersionControllPullOptions): Promise<ImportResult | undefined> {
		const currentBranch = await this.gitService.getCurrentBranch();
		await this.versionControlExportService.cleanWorkFolder();
		await this.gitService.resetBranch({
			hard: true,
			target: currentBranch.remote,
		});
		await this.gitService.pull();
		if (options.importAfterPull) {
			return this.import(options);
		}
		return;
	}

	async pushWorkfolder(
		options: VersionControlPushWorkFolder,
	): Promise<PushResult | VersionControlledFile[]> {
		if (this.versionControlPreferencesService.isBranchReadOnly()) {
			throw new BadRequestError('Cannot push onto read-only branch.');
		}
		if (!options.skipDiff) {
			const diffResult = await this.getStatus();
			const possibleConflicts = diffResult?.filter((file) => file.conflict);
			if (possibleConflicts?.length > 0 && options.force !== true) {
				await this.unstage();
				return diffResult;
			}
		}
		await this.unstage();
		await this.stage(options);
		await this.gitService.commit(options.message ?? 'Updated Workfolder');
		return this.gitService.push({
			branch: this.versionControlPreferencesService.getBranchName(),
			force: options.force ?? false,
		});
	}

	async pullWorkfolder(
		options: VersionControllPullOptions,
	): Promise<ImportResult | StatusResult | undefined> {
		await this.resetWorkfolder({
			importAfterPull: false,
			userId: options.userId,
			force: false,
		});
		await this.export(); // refresh workfolder
		const status = await this.gitService.status();

		if (status.modified.length > 0 && options.force !== true) {
			return status;
		}
		await this.resetWorkfolder({ ...options, importAfterPull: false });
		if (options.importAfterPull) {
			return this.import(options);
		}
		return;
	}

	async stage(
		options: Pick<VersionControlPushWorkFolder, 'fileNames' | 'credentialIds' | 'workflowIds'>,
	): Promise<{ staged: string[] } | string> {
		const { fileNames, credentialIds, workflowIds } = options;
		const status = await this.gitService.status();
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
				...status.modified,
			]);
		}
		const deletedFiles = new Set<string>(status.deleted);
		deletedFiles.forEach((e) => mergedFileNames.delete(e));
		await this.unstage();
		const stageResult = await this.gitService.stage(mergedFileNames, deletedFiles);
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

	async status(): Promise<StatusResult> {
		return this.gitService.status();
	}

	private async fileNameToVersionControlledFile(
		fileName: string,
		location: VersionControlledFileLocation,
		statusResult: StatusResult,
	): Promise<VersionControlledFile | undefined> {
		let id: string | undefined = undefined;
		let name = '';
		let conflict = false;
		let status: VersionControlledFileStatus = 'unknown';
		let type: VersionControlledFileType = 'file';

		// initialize status from git status result
		if (statusResult.not_added.find((e) => e === fileName)) status = 'new';
		else if (statusResult.conflicted.find((e) => e === fileName)) {
			status = 'conflicted';
			conflict = true;
		} else if (statusResult.created.find((e) => e === fileName)) status = 'created';
		else if (statusResult.deleted.find((e) => e === fileName)) status = 'deleted';
		else if (statusResult.modified.find((e) => e === fileName)) status = 'modified';

		if (fileName.startsWith(VERSION_CONTROL_WORKFLOW_EXPORT_FOLDER)) {
			type = 'workflow';
			if (status === 'deleted') {
				id = fileName
					.replace(VERSION_CONTROL_WORKFLOW_EXPORT_FOLDER, '')
					.replace(/[\/,\\]/, '')
					.replace('.json', '');
				if (location === 'remote') {
					const existingWorkflow = await Db.collections.Workflow.find({
						where: { id },
					});
					if (existingWorkflow?.length > 0) {
						name = existingWorkflow[0].name;
					}
				} else {
					name = '(deleted)';
				}
			} else {
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
			}
		}
		if (fileName.startsWith(VERSION_CONTROL_CREDENTIAL_EXPORT_FOLDER)) {
			type = 'credential';
			if (status === 'deleted') {
				id = fileName
					.replace(VERSION_CONTROL_CREDENTIAL_EXPORT_FOLDER, '')
					.replace(/[\/,\\]/, '')
					.replace('.json', '');
				if (location === 'remote') {
					const existingCredential = await Db.collections.Credentials.find({
						where: { id },
					});
					if (existingCredential?.length > 0) {
						name = existingCredential[0].name;
					}
				} else {
					name = '(deleted)';
				}
			} else {
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
			}
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

		return {
			file: fileName,
			id,
			name,
			type,
			status,
			location,
			conflict,
		};
	}

	async getStatus(): Promise<VersionControlledFile[]> {
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
		versionControlledFiles.forEach((e, index, array) => {
			const similarItems = array.filter(
				(f) => f.type === e.type && (f.file === e.file || f.id === e.id),
			);
			if (similarItems.length > 1) {
				similarItems.forEach((item) => {
					item.conflict = true;
				});
			}
		});
		return versionControlledFiles;
	}

	// #region Version Control Test Functions
	//TODO: SEPARATE FUNCTIONS FOR DEVELOPMENT ONLY
	//TODO: REMOVE THESE FUNCTIONS AFTER TESTING

	async commit(message?: string): Promise<CommitResult> {
		return this.gitService.commit(message ?? 'Updated Workfolder');
	}

	async fetch(): Promise<FetchResult> {
		return this.gitService.fetch();
	}

	async diff(): Promise<DiffResult> {
		return this.gitService.diff();
	}

	async pull(): Promise<PullResult> {
		return this.gitService.pull();
	}

	async push(force = false): Promise<PushResult> {
		return this.gitService.push({
			branch: this.versionControlPreferencesService.getBranchName(),
			force,
		});
	}
	// #endregion
}
