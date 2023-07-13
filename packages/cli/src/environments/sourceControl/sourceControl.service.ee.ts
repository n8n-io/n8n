import { Service } from 'typedi';
import path from 'path';
import * as Db from '@/Db';
import { sourceControlFoldersExistCheck } from './sourceControlHelper.ee';
import type { SourceControlPreferences } from './types/sourceControlPreferences';
import {
	SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER,
	SOURCE_CONTROL_GIT_FOLDER,
	SOURCE_CONTROL_README,
	SOURCE_CONTROL_SSH_FOLDER,
	SOURCE_CONTROL_SSH_KEY_NAME,
	SOURCE_CONTROL_TAGS_EXPORT_FILE,
	SOURCE_CONTROL_VARIABLES_EXPORT_FILE,
	SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER,
} from './constants';
import { LoggerProxy } from 'n8n-workflow';
import { SourceControlGitService } from './sourceControlGit.service.ee';
import { UserSettings } from 'n8n-core';
import type { PushResult, StatusResult } from 'simple-git';
import type { ExportResult } from './types/exportResult';
import { SourceControlExportService } from './sourceControlExport.service.ee';
import { BadRequestError } from '../../ResponseHelper';
import type { ImportResult } from './types/importResult';
import type { SourceControlPushWorkFolder } from './types/sourceControlPushWorkFolder';
import type { SourceControllPullOptions } from './types/sourceControlPullWorkFolder';
import type {
	SourceControlledFileLocation,
	SourceControlledFile,
	SourceControlledFileStatus,
	SourceControlledFileType,
} from './types/sourceControlledFile';
import { SourceControlPreferencesService } from './sourceControlPreferences.service.ee';
import { writeFileSync } from 'fs';
import { SourceControlImportService } from './sourceControlImport.service.ee';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import type { CredentialsEntity } from '@db/entities/CredentialsEntity';

@Service()
export class SourceControlService {
	private sshKeyName: string;

	private sshFolder: string;

	private gitFolder: string;

	constructor(
		private gitService: SourceControlGitService,
		private sourceControlPreferencesService: SourceControlPreferencesService,
		private sourceControlExportService: SourceControlExportService,
		private sourceControlImportService: SourceControlImportService,
	) {
		const userFolder = UserSettings.getUserN8nFolderPath();
		this.sshFolder = path.join(userFolder, SOURCE_CONTROL_SSH_FOLDER);
		this.gitFolder = path.join(userFolder, SOURCE_CONTROL_GIT_FOLDER);
		this.sshKeyName = path.join(this.sshFolder, SOURCE_CONTROL_SSH_KEY_NAME);
	}

	async init(): Promise<void> {
		this.gitService.resetService();
		sourceControlFoldersExistCheck([this.gitFolder, this.sshFolder]);
		await this.sourceControlPreferencesService.loadFromDbAndApplySourceControlPreferences();
		await this.gitService.initService({
			sourceControlPreferences: this.sourceControlPreferencesService.getPreferences(),
			gitFolder: this.gitFolder,
			sshKeyName: this.sshKeyName,
			sshFolder: this.sshFolder,
		});
	}

	async disconnect(options: { keepKeyPair?: boolean } = {}) {
		try {
			await this.sourceControlPreferencesService.setPreferences({
				connected: false,
				branchName: '',
			});
			await this.sourceControlExportService.deleteRepositoryFolder();
			if (!options.keepKeyPair) {
				await this.sourceControlPreferencesService.deleteKeyPairFiles();
			}
			this.gitService.resetService();
			return this.sourceControlPreferencesService.sourceControlPreferences;
		} catch (error) {
			throw Error(`Failed to disconnect from source control: ${(error as Error).message}`);
		}
	}

	async initializeRepository(preferences: SourceControlPreferences) {
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
					writeFileSync(path.join(this.gitFolder, '/README.md'), SOURCE_CONTROL_README);

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
				await this.sourceControlPreferencesService.setPreferences({
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
			await this.sourceControlExportService.cleanWorkFolder();
			result.tags = await this.sourceControlExportService.exportTagsToWorkFolder();
			result.variables = await this.sourceControlExportService.exportVariablesToWorkFolder();
			result.workflows = await this.sourceControlExportService.exportWorkflowsToWorkFolder();
			result.credentials = await this.sourceControlExportService.exportCredentialsToWorkFolder();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
		return result;
	}

	async import(options: SourceControllPullOptions): Promise<ImportResult | undefined> {
		try {
			return await this.sourceControlImportService.importFromWorkFolder(options);
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
		await this.sourceControlPreferencesService.setPreferences({
			branchName: branch,
			connected: branch?.length > 0,
		});
		return this.gitService.setBranch(branch);
	}

	// will reset the branch to the remote branch and pull
	// this will discard all local changes
	async resetWorkfolder(options: SourceControllPullOptions): Promise<ImportResult | undefined> {
		const currentBranch = await this.gitService.getCurrentBranch();
		await this.sourceControlExportService.cleanWorkFolder();
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
		options: SourceControlPushWorkFolder,
	): Promise<PushResult | SourceControlledFile[]> {
		if (this.sourceControlPreferencesService.isBranchReadOnly()) {
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
			branch: this.sourceControlPreferencesService.getBranchName(),
			force: options.force ?? false,
		});
	}

	async pullWorkfolder(
		options: SourceControllPullOptions,
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
		options: Pick<SourceControlPushWorkFolder, 'fileNames' | 'credentialIds' | 'workflowIds'>,
	): Promise<{ staged: string[] } | string> {
		const { fileNames, credentialIds, workflowIds } = options;
		const status = await this.gitService.status();
		let mergedFileNames = new Set<string>();
		fileNames?.forEach((e) => mergedFileNames.add(e));
		credentialIds?.forEach((e) =>
			mergedFileNames.add(this.sourceControlExportService.getCredentialsPath(e)),
		);
		workflowIds?.forEach((e) =>
			mergedFileNames.add(this.sourceControlExportService.getWorkflowPath(e)),
		);
		if (mergedFileNames.size === 0) {
			mergedFileNames = new Set<string>([
				...status.not_added,
				...status.created,
				...status.modified,
			]);
		}
		mergedFileNames.add(this.sourceControlExportService.getOwnersPath());
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

	private async fileNameToSourceControlledFile(
		fileName: string,
		location: SourceControlledFileLocation,
		statusResult: StatusResult,
	): Promise<SourceControlledFile | undefined> {
		let id: string | undefined = undefined;
		let name = '';
		let conflict = false;
		let status: SourceControlledFileStatus = 'unknown';
		let type: SourceControlledFileType = 'file';
		let updatedAt = '';

		const allWorkflows: Map<string, WorkflowEntity> = new Map();
		(await Db.collections.Workflow.find({ select: ['id', 'name', 'updatedAt'] })).forEach(
			(workflow) => {
				allWorkflows.set(workflow.id, workflow);
			},
		);
		const allCredentials: Map<string, CredentialsEntity> = new Map();
		(await Db.collections.Credentials.find({ select: ['id', 'name', 'updatedAt'] })).forEach(
			(credential) => {
				allCredentials.set(credential.id, credential);
			},
		);

		// initialize status from git status result
		if (statusResult.not_added.find((e) => e === fileName)) status = 'new';
		else if (statusResult.conflicted.find((e) => e === fileName)) {
			status = 'conflicted';
			conflict = true;
		} else if (statusResult.created.find((e) => e === fileName)) status = 'created';
		else if (statusResult.deleted.find((e) => e === fileName)) status = 'deleted';
		else if (statusResult.modified.find((e) => e === fileName)) status = 'modified';

		if (fileName.startsWith(SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER)) {
			type = 'workflow';
			if (status === 'deleted') {
				id = fileName
					.replace(SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER, '')
					.replace(/[\/,\\]/, '')
					.replace('.json', '');
				if (location === 'remote') {
					const existingWorkflow = allWorkflows.get(id);
					if (existingWorkflow) {
						name = existingWorkflow.name;
						updatedAt = existingWorkflow.updatedAt.toISOString();
					}
				} else {
					name = '(deleted)';
					// todo: once we have audit log, this deletion date could be looked up
				}
			} else {
				const workflow = await this.sourceControlExportService.getWorkflowFromFile(fileName);
				if (!workflow?.id) {
					if (location === 'local') {
						return;
					}
					id = fileName
						.replace(SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER + '/', '')
						.replace('.json', '');
					status = 'created';
				} else {
					id = workflow.id;
					name = workflow.name;
				}
				const existingWorkflow = allWorkflows.get(id);
				if (existingWorkflow) {
					name = existingWorkflow.name;
					updatedAt = existingWorkflow.updatedAt.toISOString();
				}
			}
		}
		if (fileName.startsWith(SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER)) {
			type = 'credential';
			if (status === 'deleted') {
				id = fileName
					.replace(SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER, '')
					.replace(/[\/,\\]/, '')
					.replace('.json', '');
				if (location === 'remote') {
					const existingCredential = allCredentials.get(id);
					if (existingCredential) {
						name = existingCredential.name;
						updatedAt = existingCredential.updatedAt.toISOString();
					}
				} else {
					name = '(deleted)';
				}
			} else {
				const credential = await this.sourceControlExportService.getCredentialFromFile(fileName);
				if (!credential?.id) {
					if (location === 'local') {
						return;
					}
					id = fileName
						.replace(SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER + '/', '')
						.replace('.json', '');
					status = 'created';
				} else {
					id = credential.id;
					name = credential.name;
				}
				const existingCredential = allCredentials.get(id);
				if (existingCredential) {
					name = existingCredential.name;
					updatedAt = existingCredential.updatedAt.toISOString();
				}
			}
		}

		if (fileName.startsWith(SOURCE_CONTROL_VARIABLES_EXPORT_FILE)) {
			id = 'variables';
			name = 'variables';
			type = 'variables';
		}

		if (fileName.startsWith(SOURCE_CONTROL_TAGS_EXPORT_FILE)) {
			const lastUpdatedTag = await Db.collections.Tag.find({
				order: { updatedAt: 'DESC' },
				take: 1,
				select: ['updatedAt'],
			});
			id = 'tags';
			name = 'tags';
			type = 'tags';
			updatedAt = lastUpdatedTag[0]?.updatedAt.toISOString();
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
			updatedAt,
		};
	}

	async getStatus(): Promise<SourceControlledFile[]> {
		await this.export();
		await this.stage({});
		await this.gitService.fetch();
		const sourceControlledFiles: SourceControlledFile[] = [];
		const diffRemote = await this.gitService.diffRemote();
		const diffLocal = await this.gitService.diffLocal();
		const status = await this.gitService.status();
		await Promise.all([
			...(diffRemote?.files.map(async (e) => {
				const resolvedFile = await this.fileNameToSourceControlledFile(e.file, 'remote', status);
				if (resolvedFile) {
					sourceControlledFiles.push(resolvedFile);
				}
			}) ?? []),
			...(diffLocal?.files.map(async (e) => {
				const resolvedFile = await this.fileNameToSourceControlledFile(e.file, 'local', status);
				if (resolvedFile) {
					sourceControlledFiles.push(resolvedFile);
				}
			}) ?? []),
		]);
		sourceControlledFiles.forEach((e, index, array) => {
			const similarItems = array.filter(
				(f) => f.type === e.type && (f.file === e.file || f.id === e.id),
			);
			if (similarItems.length > 1) {
				similarItems.forEach((item) => {
					item.conflict = true;
				});
			}
		});
		return sourceControlledFiles;
	}
}
