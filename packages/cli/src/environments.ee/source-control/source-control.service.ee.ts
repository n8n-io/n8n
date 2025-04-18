import type {
	PullWorkFolderRequestDto,
	PushWorkFolderRequestDto,
	SourceControlledFile,
} from '@n8n/api-types';
import { Service } from '@n8n/di';
import { writeFileSync } from 'fs';
import { Logger } from 'n8n-core';
import { UnexpectedError, UserError } from 'n8n-workflow';
import path from 'path';
import type { PushResult } from 'simple-git';

import type { TagEntity } from '@/databases/entities/tag-entity';
import type { User } from '@/databases/entities/user';
import type { Variables } from '@/databases/entities/variables';
import { FolderRepository } from '@/databases/repositories/folder.repository';
import { TagRepository } from '@/databases/repositories/tag.repository';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { EventService } from '@/events/event.service';

import {
	SOURCE_CONTROL_DEFAULT_EMAIL,
	SOURCE_CONTROL_DEFAULT_NAME,
	SOURCE_CONTROL_README,
} from './constants';
import { SourceControlExportService } from './source-control-export.service.ee';
import { SourceControlGitService } from './source-control-git.service.ee';
import {
	getFoldersPath,
	getTagsPath,
	getTrackingInformationFromPostPushResult,
	getTrackingInformationFromPrePushResult,
	getTrackingInformationFromPullResult,
	getVariablesPath,
	isWorkflowModified,
	normalizeAndValidateSourceControlledFilePath,
	sourceControlFoldersExistCheck,
} from './source-control-helper.ee';
import { SourceControlImportService } from './source-control-import.service.ee';
import { SourceControlPreferencesService } from './source-control-preferences.service.ee';
import type { ExportableCredential } from './types/exportable-credential';
import type { ExportableFolder } from './types/exportable-folders';
import type { ImportResult } from './types/import-result';
import type { SourceControlGetStatus } from './types/source-control-get-status';
import type { SourceControlPreferences } from './types/source-control-preferences';
import type { SourceControlWorkflowVersionId } from './types/source-control-workflow-version-id';

@Service()
export class SourceControlService {
	/** Path to SSH private key in filesystem. */
	private sshKeyName: string;

	private sshFolder: string;

	private gitFolder: string;

	constructor(
		private readonly logger: Logger,
		private gitService: SourceControlGitService,
		private sourceControlPreferencesService: SourceControlPreferencesService,
		private sourceControlExportService: SourceControlExportService,
		private sourceControlImportService: SourceControlImportService,
		private tagRepository: TagRepository,
		private folderRepository: FolderRepository,
		private readonly eventService: EventService,
	) {
		const { gitFolder, sshFolder, sshKeyName } = sourceControlPreferencesService;
		this.gitFolder = gitFolder;
		this.sshFolder = sshFolder;
		this.sshKeyName = sshKeyName;
	}

	async init(): Promise<void> {
		this.gitService.resetService();
		sourceControlFoldersExistCheck([this.gitFolder, this.sshFolder]);
		await this.sourceControlPreferencesService.loadFromDbAndApplySourceControlPreferences();
		if (this.sourceControlPreferencesService.isSourceControlLicensedAndEnabled()) {
			await this.initGitService();
		}
	}

	private async initGitService(): Promise<void> {
		await this.gitService.initService({
			sourceControlPreferences: this.sourceControlPreferencesService.getPreferences(),
			gitFolder: this.gitFolder,
			sshKeyName: this.sshKeyName,
			sshFolder: this.sshFolder,
		});
	}

	async sanityCheck(): Promise<void> {
		try {
			const foldersExisted = sourceControlFoldersExistCheck(
				[this.gitFolder, this.sshFolder],
				false,
			);
			if (!foldersExisted) {
				throw new UserError('No folders exist');
			}
			if (!this.gitService.git) {
				await this.initGitService();
			}
			const branches = await this.gitService.getCurrentBranch();
			if (
				branches.current === '' ||
				branches.current !==
					this.sourceControlPreferencesService.sourceControlPreferences.branchName
			) {
				throw new UserError('Branch is not set up correctly');
			}
		} catch (error) {
			throw new BadRequestError(
				'Source control is not properly set up, please disconnect and reconnect.',
			);
		}
	}

	async disconnect(options: { keepKeyPair?: boolean } = {}) {
		try {
			await this.sourceControlPreferencesService.setPreferences({
				connected: false,
				branchName: '',
			});
			await this.sourceControlExportService.deleteRepositoryFolder();
			if (!options.keepKeyPair) {
				await this.sourceControlPreferencesService.deleteKeyPair();
			}
			this.gitService.resetService();
			return this.sourceControlPreferencesService.sourceControlPreferences;
		} catch (error) {
			throw new UnexpectedError('Failed to disconnect from source control', { cause: error });
		}
	}

	async initializeRepository(preferences: SourceControlPreferences, user: User) {
		if (!this.gitService.git) {
			await this.initGitService();
		}
		this.logger.debug('Initializing repository...');
		await this.gitService.initRepository(preferences, user);
		let getBranchesResult;
		try {
			getBranchesResult = await this.getBranches();
		} catch (error) {
			if ((error as Error).message.includes('Warning: Permanently added')) {
				this.logger.debug('Added repository host to the list of known hosts. Retrying...');
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
					await this.gitService.setBranch(preferences.branchName);
				} catch (fileError) {
					this.logger.error(`Failed to create initial commit: ${(fileError as Error).message}`);
				}
			}
		}
		await this.sourceControlPreferencesService.setPreferences({
			branchName: getBranchesResult.currentBranch,
			connected: true,
		});
		return getBranchesResult;
	}

	async getBranches(): Promise<{ branches: string[]; currentBranch: string }> {
		// fetch first to get include remote changes
		if (!this.gitService.git) {
			await this.initGitService();
		}
		await this.gitService.fetch();
		return await this.gitService.getBranches();
	}

	async setBranch(branch: string): Promise<{ branches: string[]; currentBranch: string }> {
		if (!this.gitService.git) {
			await this.initGitService();
		}
		await this.sourceControlPreferencesService.setPreferences({
			branchName: branch,
			connected: branch?.length > 0,
		});
		return await this.gitService.setBranch(branch);
	}

	// will reset the branch to the remote branch and pull
	// this will discard all local changes
	async resetWorkfolder(): Promise<ImportResult | undefined> {
		if (!this.gitService.git) {
			await this.initGitService();
		}
		try {
			await this.gitService.resetBranch();
			await this.gitService.pull();
		} catch (error) {
			this.logger.error(`Failed to reset workfolder: ${(error as Error).message}`);
			throw new UserError(
				'Unable to fetch updates from git - your folder might be out of sync. Try reconnecting from the Source Control settings page.',
			);
		}
		return;
	}

	async pushWorkfolder(
		user: User,
		options: PushWorkFolderRequestDto,
	): Promise<{
		statusCode: number;
		pushResult: PushResult | undefined;
		statusResult: SourceControlledFile[];
	}> {
		await this.sanityCheck();

		if (this.sourceControlPreferencesService.isBranchReadOnly()) {
			throw new BadRequestError('Cannot push onto read-only branch.');
		}

		const filesToPush = options.fileNames.map((file) => {
			const normalizedPath = normalizeAndValidateSourceControlledFilePath(
				this.gitFolder,
				file.file,
			);

			return {
				...file,
				file: normalizedPath,
			};
		});

		// only determine file status if not provided by the frontend
		let statusResult: SourceControlledFile[] = filesToPush;
		if (statusResult.length === 0) {
			statusResult = (await this.getStatus(user, {
				direction: 'push',
				verbose: false,
				preferLocalVersion: true,
			})) as SourceControlledFile[];
		}

		if (!options.force) {
			const possibleConflicts = statusResult?.filter((file) => file.conflict);
			if (possibleConflicts?.length > 0) {
				return {
					statusCode: 409,
					pushResult: undefined,
					statusResult,
				};
			}
		}

		const filesToBePushed = new Set<string>();
		const filesToBeDeleted = new Set<string>();

		/*
			Exclude tags, variables and folders JSON file from being deleted as
			we keep track of them in a single file unlike workflows and credentials
		*/
		filesToPush
			.filter((f) => ['workflow', 'credential'].includes(f.type))
			.forEach((e) => {
				if (e.status !== 'deleted') {
					filesToBePushed.add(e.file);
				} else {
					filesToBeDeleted.add(e.file);
				}
			});

		this.sourceControlExportService.rmFilesFromExportFolder(filesToBeDeleted);

		const workflowsToBeExported = filesToPush.filter(
			(e) => e.type === 'workflow' && e.status !== 'deleted',
		);
		await this.sourceControlExportService.exportWorkflowsToWorkFolder(workflowsToBeExported);

		const credentialsToBeExported = filesToPush.filter(
			(e) => e.type === 'credential' && e.status !== 'deleted',
		);
		const credentialExportResult =
			await this.sourceControlExportService.exportCredentialsToWorkFolder(credentialsToBeExported);
		if (credentialExportResult.missingIds && credentialExportResult.missingIds.length > 0) {
			credentialExportResult.missingIds.forEach((id) => {
				filesToBePushed.delete(this.sourceControlExportService.getCredentialsPath(id));
				statusResult = statusResult.filter(
					(e) => e.file !== this.sourceControlExportService.getCredentialsPath(id),
				);
			});
		}

		const tagChanges = filesToPush.find((e) => e.type === 'tags');
		if (tagChanges) {
			filesToBePushed.add(tagChanges.file);
			await this.sourceControlExportService.exportTagsToWorkFolder();
		}

		const folderChanges = filesToPush.find((e) => e.type === 'folders');
		if (folderChanges) {
			filesToBePushed.add(folderChanges.file);
			await this.sourceControlExportService.exportFoldersToWorkFolder();
		}

		const variablesChanges = filesToPush.find((e) => e.type === 'variables');
		if (variablesChanges) {
			filesToBePushed.add(variablesChanges.file);
			await this.sourceControlExportService.exportVariablesToWorkFolder();
		}

		await this.gitService.stage(filesToBePushed, filesToBeDeleted);

		for (let i = 0; i < statusResult.length; i++) {
			// eslint-disable-next-line @typescript-eslint/no-loop-func
			if (filesToPush.find((file) => file.file === statusResult[i].file)) {
				statusResult[i].pushed = true;
			}
		}

		await this.gitService.commit(options.commitMessage ?? 'Updated Workfolder');

		const pushResult = await this.gitService.push({
			branch: this.sourceControlPreferencesService.getBranchName(),
			force: options.force ?? false,
		});

		// #region Tracking Information
		this.eventService.emit(
			'source-control-user-finished-push-ui',
			getTrackingInformationFromPostPushResult(user.id, statusResult),
		);
		// #endregion

		return {
			statusCode: 200,
			pushResult,
			statusResult,
		};
	}

	private getConflicts(files: SourceControlledFile[]): SourceControlledFile[] {
		return files.filter((file) => file.conflict || file.status === 'modified');
	}

	private getWorkflowsToImport(files: SourceControlledFile[]): SourceControlledFile[] {
		return files.filter((e) => e.type === 'workflow' && e.status !== 'deleted');
	}

	private getWorkflowsToDelete(files: SourceControlledFile[]): SourceControlledFile[] {
		return files.filter((e) => e.type === 'workflow' && e.status === 'deleted');
	}

	private getCredentialsToImport(files: SourceControlledFile[]): SourceControlledFile[] {
		return files.filter((e) => e.type === 'credential' && e.status !== 'deleted');
	}

	private getCredentialsToDelete(files: SourceControlledFile[]): SourceControlledFile[] {
		return files.filter((e) => e.type === 'credential' && e.status === 'deleted');
	}

	private getTagsToImport(files: SourceControlledFile[]): SourceControlledFile | undefined {
		return files.find((e) => e.type === 'tags' && e.status !== 'deleted');
	}

	private getTagsToDelete(files: SourceControlledFile[]): SourceControlledFile[] {
		return files.filter((e) => e.type === 'tags' && e.status === 'deleted');
	}

	private getVariablesToImport(files: SourceControlledFile[]): SourceControlledFile | undefined {
		return files.find((e) => e.type === 'variables' && e.status !== 'deleted');
	}

	private getFoldersToImport(files: SourceControlledFile[]): SourceControlledFile | undefined {
		return files.find((e) => e.type === 'folders' && e.status !== 'deleted');
	}

	private getFoldersToDelete(files: SourceControlledFile[]): SourceControlledFile[] {
		return files.filter((e) => e.type === 'folders' && e.status === 'deleted');
	}

	private getVariablesToDelete(files: SourceControlledFile[]): SourceControlledFile[] {
		return files.filter((e) => e.type === 'variables' && e.status === 'deleted');
	}

	async pullWorkfolder(
		user: User,
		options: PullWorkFolderRequestDto,
	): Promise<{ statusCode: number; statusResult: SourceControlledFile[] }> {
		await this.sanityCheck();

		const statusResult = (await this.getStatus(user, {
			direction: 'pull',
			verbose: false,
			preferLocalVersion: false,
		})) as SourceControlledFile[];

		if (options.force !== true) {
			const possibleConflicts = this.getConflicts(statusResult);
			if (possibleConflicts?.length > 0) {
				await this.gitService.resetBranch();
				return {
					statusCode: 409,
					statusResult,
				};
			}
		}

		// Make sure the folders get processed first as the workflows depend on them
		const foldersToBeImported = this.getFoldersToImport(statusResult);
		if (foldersToBeImported) {
			await this.sourceControlImportService.importFoldersFromWorkFolder(user, foldersToBeImported);
		}

		const workflowsToBeImported = this.getWorkflowsToImport(statusResult);
		await this.sourceControlImportService.importWorkflowFromWorkFolder(
			workflowsToBeImported,
			user.id,
		);
		const workflowsToBeDeleted = this.getWorkflowsToDelete(statusResult);
		await this.sourceControlImportService.deleteWorkflowsNotInWorkfolder(
			user,
			workflowsToBeDeleted,
		);
		const credentialsToBeImported = this.getCredentialsToImport(statusResult);
		await this.sourceControlImportService.importCredentialsFromWorkFolder(
			credentialsToBeImported,
			user.id,
		);
		const credentialsToBeDeleted = this.getCredentialsToDelete(statusResult);
		await this.sourceControlImportService.deleteCredentialsNotInWorkfolder(
			user,
			credentialsToBeDeleted,
		);

		const tagsToBeImported = this.getTagsToImport(statusResult);
		if (tagsToBeImported) {
			await this.sourceControlImportService.importTagsFromWorkFolder(tagsToBeImported);
		}
		const tagsToBeDeleted = this.getTagsToDelete(statusResult);
		await this.sourceControlImportService.deleteTagsNotInWorkfolder(tagsToBeDeleted);

		const variablesToBeImported = this.getVariablesToImport(statusResult);
		if (variablesToBeImported) {
			await this.sourceControlImportService.importVariablesFromWorkFolder(variablesToBeImported);
		}
		const variablesToBeDeleted = this.getVariablesToDelete(statusResult);
		await this.sourceControlImportService.deleteVariablesNotInWorkfolder(variablesToBeDeleted);

		const foldersToBeDeleted = this.getFoldersToDelete(statusResult);
		await this.sourceControlImportService.deleteFoldersNotInWorkfolder(foldersToBeDeleted);

		// #region Tracking Information
		this.eventService.emit(
			'source-control-user-finished-pull-ui',
			getTrackingInformationFromPullResult(user.id, statusResult),
		);
		// #endregion

		return {
			statusCode: 200,
			statusResult,
		};
	}

	/**
	 * Does a comparison between the local and remote workfolder based on NOT the git status,
	 * but certain parameters within the items being synced.
	 * For workflows, it compares the versionIds
	 * For credentials, it compares the name and type
	 * For variables, it compares the name
	 * For tags, it compares the name and mapping
	 * @returns either SourceControlledFile[] if verbose is false,
	 * or multiple SourceControlledFile[] with all determined differences for debugging purposes
	 */
	async getStatus(user: User, options: SourceControlGetStatus) {
		await this.sanityCheck();

		const sourceControlledFiles: SourceControlledFile[] = [];

		// fetch and reset hard first
		await this.resetWorkfolder();

		const {
			wfRemoteVersionIds,
			wfLocalVersionIds,
			wfMissingInLocal,
			wfMissingInRemote,
			wfModifiedInEither,
		} = await this.getStatusWorkflows(options, sourceControlledFiles);

		const { credMissingInLocal, credMissingInRemote, credModifiedInEither } =
			await this.getStatusCredentials(options, sourceControlledFiles);

		const { varMissingInLocal, varMissingInRemote, varModifiedInEither } =
			await this.getStatusVariables(options, sourceControlledFiles);

		const {
			tagsMissingInLocal,
			tagsMissingInRemote,
			tagsModifiedInEither,
			mappingsMissingInLocal,
			mappingsMissingInRemote,
		} = await this.getStatusTagsMappings(options, sourceControlledFiles);

		const { foldersMissingInLocal, foldersMissingInRemote, foldersModifiedInEither } =
			await this.getStatusFoldersMapping(options, sourceControlledFiles);

		// #region Tracking Information
		if (options.direction === 'push') {
			this.eventService.emit(
				'source-control-user-started-push-ui',
				getTrackingInformationFromPrePushResult(user.id, sourceControlledFiles),
			);
		} else if (options.direction === 'pull') {
			this.eventService.emit(
				'source-control-user-started-pull-ui',
				getTrackingInformationFromPullResult(user.id, sourceControlledFiles),
			);
		}
		// #endregion

		if (options?.verbose) {
			return {
				wfRemoteVersionIds,
				wfLocalVersionIds,
				wfMissingInLocal,
				wfMissingInRemote,
				wfModifiedInEither,
				credMissingInLocal,
				credMissingInRemote,
				credModifiedInEither,
				varMissingInLocal,
				varMissingInRemote,
				varModifiedInEither,
				tagsMissingInLocal,
				tagsMissingInRemote,
				tagsModifiedInEither,
				mappingsMissingInLocal,
				mappingsMissingInRemote,
				foldersMissingInLocal,
				foldersMissingInRemote,
				foldersModifiedInEither,
				sourceControlledFiles,
			};
		} else {
			return sourceControlledFiles;
		}
	}

	private async getStatusWorkflows(
		options: SourceControlGetStatus,
		sourceControlledFiles: SourceControlledFile[],
	) {
		const wfRemoteVersionIds = await this.sourceControlImportService.getRemoteVersionIdsFromFiles();
		const wfLocalVersionIds = await this.sourceControlImportService.getLocalVersionIdsFromDb();

		const wfMissingInLocal = wfRemoteVersionIds.filter(
			(remote) => wfLocalVersionIds.findIndex((local) => local.id === remote.id) === -1,
		);

		const wfMissingInRemote = wfLocalVersionIds.filter(
			(local) => wfRemoteVersionIds.findIndex((remote) => remote.id === local.id) === -1,
		);

		const wfModifiedInEither: SourceControlWorkflowVersionId[] = [];

		wfLocalVersionIds.forEach((localWorkflow) => {
			const remoteWorkflowWithSameId = wfRemoteVersionIds.find(
				(removeWorkflow) => removeWorkflow.id === localWorkflow.id,
			);

			if (!remoteWorkflowWithSameId) {
				return;
			}

			if (isWorkflowModified(localWorkflow, remoteWorkflowWithSameId)) {
				let name =
					(options?.preferLocalVersion ? localWorkflow?.name : remoteWorkflowWithSameId?.name) ??
					'Workflow';
				if (
					localWorkflow.name &&
					remoteWorkflowWithSameId?.name &&
					localWorkflow.name !== remoteWorkflowWithSameId.name
				) {
					name = options?.preferLocalVersion
						? `${localWorkflow.name} (Remote: ${remoteWorkflowWithSameId.name})`
						: (name = `${remoteWorkflowWithSameId.name} (Local: ${localWorkflow.name})`);
				}
				wfModifiedInEither.push({
					...localWorkflow,
					name,
					versionId: options.preferLocalVersion
						? localWorkflow.versionId
						: remoteWorkflowWithSameId.versionId,
					localId: localWorkflow.versionId,
					remoteId: remoteWorkflowWithSameId.versionId,
				});
			}
		});

		wfMissingInLocal.forEach((item) => {
			sourceControlledFiles.push({
				id: item.id,
				name: item.name ?? 'Workflow',
				type: 'workflow',
				status: options.direction === 'push' ? 'deleted' : 'created',
				location: options.direction === 'push' ? 'local' : 'remote',
				conflict: false,
				file: item.filename,
				updatedAt: item.updatedAt ?? new Date().toISOString(),
			});
		});

		wfMissingInRemote.forEach((item) => {
			sourceControlledFiles.push({
				id: item.id,
				name: item.name ?? 'Workflow',
				type: 'workflow',
				status: options.direction === 'push' ? 'created' : 'deleted',
				location: options.direction === 'push' ? 'local' : 'remote',
				conflict: options.direction === 'push' ? false : true,
				file: item.filename,
				updatedAt: item.updatedAt ?? new Date().toISOString(),
			});
		});

		wfModifiedInEither.forEach((item) => {
			sourceControlledFiles.push({
				id: item.id,
				name: item.name ?? 'Workflow',
				type: 'workflow',
				status: 'modified',
				location: options.direction === 'push' ? 'local' : 'remote',
				conflict: true,
				file: item.filename,
				updatedAt: item.updatedAt ?? new Date().toISOString(),
			});
		});

		return {
			wfRemoteVersionIds,
			wfLocalVersionIds,
			wfMissingInLocal,
			wfMissingInRemote,
			wfModifiedInEither,
		};
	}

	private async getStatusCredentials(
		options: SourceControlGetStatus,
		sourceControlledFiles: SourceControlledFile[],
	) {
		const credRemoteIds = await this.sourceControlImportService.getRemoteCredentialsFromFiles();
		const credLocalIds = await this.sourceControlImportService.getLocalCredentialsFromDb();

		const credMissingInLocal = credRemoteIds.filter(
			(remote) => credLocalIds.findIndex((local) => local.id === remote.id) === -1,
		);

		const credMissingInRemote = credLocalIds.filter(
			(local) => credRemoteIds.findIndex((remote) => remote.id === local.id) === -1,
		);

		// only compares the name, since that is the only change synced for credentials
		const credModifiedInEither: Array<
			ExportableCredential & {
				filename: string;
			}
		> = [];
		credLocalIds.forEach((local) => {
			const mismatchingCreds = credRemoteIds.find((remote) => {
				return remote.id === local.id && (remote.name !== local.name || remote.type !== local.type);
			});
			if (mismatchingCreds) {
				credModifiedInEither.push({
					...local,
					name: options?.preferLocalVersion ? local.name : mismatchingCreds.name,
				});
			}
		});

		credMissingInLocal.forEach((item) => {
			sourceControlledFiles.push({
				id: item.id,
				name: item.name ?? 'Credential',
				type: 'credential',
				status: options.direction === 'push' ? 'deleted' : 'created',
				location: options.direction === 'push' ? 'local' : 'remote',
				conflict: false,
				file: item.filename,
				updatedAt: new Date().toISOString(),
			});
		});

		credMissingInRemote.forEach((item) => {
			sourceControlledFiles.push({
				id: item.id,
				name: item.name ?? 'Credential',
				type: 'credential',
				status: options.direction === 'push' ? 'created' : 'deleted',
				location: options.direction === 'push' ? 'local' : 'remote',
				conflict: options.direction === 'push' ? false : true,
				file: item.filename,
				updatedAt: new Date().toISOString(),
			});
		});

		credModifiedInEither.forEach((item) => {
			sourceControlledFiles.push({
				id: item.id,
				name: item.name ?? 'Credential',
				type: 'credential',
				status: 'modified',
				location: options.direction === 'push' ? 'local' : 'remote',
				conflict: true,
				file: item.filename,
				updatedAt: new Date().toISOString(),
			});
		});
		return {
			credMissingInLocal,
			credMissingInRemote,
			credModifiedInEither,
		};
	}

	private async getStatusVariables(
		options: SourceControlGetStatus,
		sourceControlledFiles: SourceControlledFile[],
	) {
		const varRemoteIds = await this.sourceControlImportService.getRemoteVariablesFromFile();
		const varLocalIds = await this.sourceControlImportService.getLocalVariablesFromDb();

		const varMissingInLocal = varRemoteIds.filter(
			(remote) => varLocalIds.findIndex((local) => local.id === remote.id) === -1,
		);

		const varMissingInRemote = varLocalIds.filter(
			(local) => varRemoteIds.findIndex((remote) => remote.id === local.id) === -1,
		);

		const varModifiedInEither: Variables[] = [];
		varLocalIds.forEach((local) => {
			const mismatchingIds = varRemoteIds.find(
				(remote) =>
					(remote.id === local.id && remote.key !== local.key) ||
					(remote.id !== local.id && remote.key === local.key),
			);
			if (mismatchingIds) {
				varModifiedInEither.push(options.preferLocalVersion ? local : mismatchingIds);
			}
		});

		varMissingInLocal.forEach((item) => {
			sourceControlledFiles.push({
				id: item.id,
				name: item.key,
				type: 'variables',
				status: options.direction === 'push' ? 'deleted' : 'created',
				location: options.direction === 'push' ? 'local' : 'remote',
				conflict: false,
				file: getVariablesPath(this.gitFolder),
				updatedAt: new Date().toISOString(),
			});
		});

		varMissingInRemote.forEach((item) => {
			sourceControlledFiles.push({
				id: item.id,
				name: item.key,
				type: 'variables',
				status: options.direction === 'push' ? 'created' : 'deleted',
				location: options.direction === 'push' ? 'local' : 'remote',
				// if the we pull and the file is missing in the remote, we will delete
				// it locally, which is communicated by marking this as a conflict
				conflict: options.direction === 'push' ? false : true,
				file: getVariablesPath(this.gitFolder),
				updatedAt: new Date().toISOString(),
			});
		});

		varModifiedInEither.forEach((item) => {
			sourceControlledFiles.push({
				id: item.id,
				name: item.key,
				type: 'variables',
				status: 'modified',
				location: options.direction === 'push' ? 'local' : 'remote',
				conflict: true,
				file: getVariablesPath(this.gitFolder),
				updatedAt: new Date().toISOString(),
			});
		});

		return {
			varMissingInLocal,
			varMissingInRemote,
			varModifiedInEither,
		};
	}

	private async getStatusTagsMappings(
		options: SourceControlGetStatus,
		sourceControlledFiles: SourceControlledFile[],
	) {
		const lastUpdatedTag = await this.tagRepository.find({
			order: { updatedAt: 'DESC' },
			take: 1,
			select: ['updatedAt'],
		});

		const tagMappingsRemote =
			await this.sourceControlImportService.getRemoteTagsAndMappingsFromFile();
		const tagMappingsLocal = await this.sourceControlImportService.getLocalTagsAndMappingsFromDb();

		const tagsMissingInLocal = tagMappingsRemote.tags.filter(
			(remote) => tagMappingsLocal.tags.findIndex((local) => local.id === remote.id) === -1,
		);

		const tagsMissingInRemote = tagMappingsLocal.tags.filter(
			(local) => tagMappingsRemote.tags.findIndex((remote) => remote.id === local.id) === -1,
		);

		const tagsModifiedInEither: TagEntity[] = [];
		tagMappingsLocal.tags.forEach((local) => {
			const mismatchingIds = tagMappingsRemote.tags.find(
				(remote) => remote.id === local.id && remote.name !== local.name,
			);
			if (!mismatchingIds) {
				return;
			}
			tagsModifiedInEither.push(options.preferLocalVersion ? local : mismatchingIds);
		});

		const mappingsMissingInLocal = tagMappingsRemote.mappings.filter(
			(remote) =>
				tagMappingsLocal.mappings.findIndex(
					(local) => local.tagId === remote.tagId && local.workflowId === remote.workflowId,
				) === -1,
		);

		const mappingsMissingInRemote = tagMappingsLocal.mappings.filter(
			(local) =>
				tagMappingsRemote.mappings.findIndex(
					(remote) => remote.tagId === local.tagId && remote.workflowId === remote.workflowId,
				) === -1,
		);

		tagsMissingInLocal.forEach((item) => {
			sourceControlledFiles.push({
				id: item.id,
				name: item.name,
				type: 'tags',
				status: options.direction === 'push' ? 'deleted' : 'created',
				location: options.direction === 'push' ? 'local' : 'remote',
				conflict: false,
				file: getTagsPath(this.gitFolder),
				updatedAt: lastUpdatedTag[0]?.updatedAt.toISOString(),
			});
		});
		tagsMissingInRemote.forEach((item) => {
			sourceControlledFiles.push({
				id: item.id,
				name: item.name,
				type: 'tags',
				status: options.direction === 'push' ? 'created' : 'deleted',
				location: options.direction === 'push' ? 'local' : 'remote',
				conflict: options.direction === 'push' ? false : true,
				file: getTagsPath(this.gitFolder),
				updatedAt: lastUpdatedTag[0]?.updatedAt.toISOString(),
			});
		});

		tagsModifiedInEither.forEach((item) => {
			sourceControlledFiles.push({
				id: item.id,
				name: item.name,
				type: 'tags',
				status: 'modified',
				location: options.direction === 'push' ? 'local' : 'remote',
				conflict: true,
				file: getTagsPath(this.gitFolder),
				updatedAt: lastUpdatedTag[0]?.updatedAt.toISOString(),
			});
		});

		return {
			tagsMissingInLocal,
			tagsMissingInRemote,
			tagsModifiedInEither,
			mappingsMissingInLocal,
			mappingsMissingInRemote,
		};
	}

	private async getStatusFoldersMapping(
		options: SourceControlGetStatus,
		sourceControlledFiles: SourceControlledFile[],
	) {
		const lastUpdatedFolder = await this.folderRepository.find({
			order: { updatedAt: 'DESC' },
			take: 1,
			select: ['updatedAt'],
		});

		const foldersMappingsRemote =
			await this.sourceControlImportService.getRemoteFoldersAndMappingsFromFile();
		const foldersMappingsLocal =
			await this.sourceControlImportService.getLocalFoldersAndMappingsFromDb();

		const foldersMissingInLocal = foldersMappingsRemote.folders.filter(
			(remote) => foldersMappingsLocal.folders.findIndex((local) => local.id === remote.id) === -1,
		);

		const foldersMissingInRemote = foldersMappingsLocal.folders.filter(
			(local) => foldersMappingsRemote.folders.findIndex((remote) => remote.id === local.id) === -1,
		);

		const foldersModifiedInEither: ExportableFolder[] = [];
		foldersMappingsLocal.folders.forEach((local) => {
			const mismatchingIds = foldersMappingsRemote.folders.find(
				(remote) =>
					remote.id === local.id &&
					(remote.name !== local.name || remote.parentFolderId !== local.parentFolderId),
			);

			if (!mismatchingIds) {
				return;
			}
			foldersModifiedInEither.push(options.preferLocalVersion ? local : mismatchingIds);
		});

		foldersMissingInLocal.forEach((item) => {
			sourceControlledFiles.push({
				id: item.id,
				name: item.name,
				type: 'folders',
				status: options.direction === 'push' ? 'deleted' : 'created',
				location: options.direction === 'push' ? 'local' : 'remote',
				conflict: false,
				file: getFoldersPath(this.gitFolder),
				updatedAt: lastUpdatedFolder[0]?.updatedAt.toISOString(),
			});
		});
		foldersMissingInRemote.forEach((item) => {
			sourceControlledFiles.push({
				id: item.id,
				name: item.name,
				type: 'folders',
				status: options.direction === 'push' ? 'created' : 'deleted',
				location: options.direction === 'push' ? 'local' : 'remote',
				conflict: options.direction === 'push' ? false : true,
				file: getFoldersPath(this.gitFolder),
				updatedAt: lastUpdatedFolder[0]?.updatedAt.toISOString(),
			});
		});

		foldersModifiedInEither.forEach((item) => {
			sourceControlledFiles.push({
				id: item.id,
				name: item.name,
				type: 'folders',
				status: 'modified',
				location: options.direction === 'push' ? 'local' : 'remote',
				conflict: true,
				file: getFoldersPath(this.gitFolder),
				updatedAt: lastUpdatedFolder[0]?.updatedAt.toISOString(),
			});
		});

		return {
			foldersMissingInLocal,
			foldersMissingInRemote,
			foldersModifiedInEither,
		};
	}

	async setGitUserDetails(
		name = SOURCE_CONTROL_DEFAULT_NAME,
		email = SOURCE_CONTROL_DEFAULT_EMAIL,
	): Promise<void> {
		await this.sanityCheck();
		await this.gitService.setGitUserDetails(name, email);
	}
}
