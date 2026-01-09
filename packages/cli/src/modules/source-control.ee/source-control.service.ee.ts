import type {
	PullWorkFolderRequestDto,
	PushWorkFolderRequestDto,
	SourceControlledFile,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { type User } from '@n8n/db';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { writeFileSync } from 'fs';
import { UnexpectedError, UserError, jsonParse } from 'n8n-workflow';
import * as path from 'path';
import type { PushResult } from 'simple-git';

import {
	SOURCE_CONTROL_DEFAULT_EMAIL,
	SOURCE_CONTROL_DEFAULT_NAME,
	SOURCE_CONTROL_README,
	SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER,
} from './constants';
import { SourceControlExportService } from './source-control-export.service.ee';
import { SourceControlGitService } from './source-control-git.service.ee';
import {
	getTagsPath,
	getTrackingInformationFromPostPushResult,
	getTrackingInformationFromPullResult,
	normalizeAndValidateSourceControlledFilePath,
	sourceControlFoldersExistCheck,
} from './source-control-helper.ee';
import { SourceControlImportService } from './source-control-import.service.ee';
import { SourceControlPreferencesService } from './source-control-preferences.service.ee';
import {
	filterByType,
	getDeletedResources,
	getNonDeletedResources,
} from './source-control-resource-helper';
import { SourceControlScopedService } from './source-control-scoped.service';
import { SourceControlStatusService } from './source-control-status.service.ee';
import type { ImportResult } from './types/import-result';
import { SourceControlContext } from './types/source-control-context';
import type { SourceControlGetStatus } from './types/source-control-get-status';
import type { SourceControlPreferences } from './types/source-control-preferences';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { EventService } from '@/events/event.service';
import { IWorkflowToImport } from '@/interfaces';

@Service()
export class SourceControlService {
	/** Path to SSH private key in filesystem. */
	private sshKeyName: string;

	private sshFolder: string;

	private gitFolder: string;

	/** Flag to prevent concurrent configuration reloads */
	private isReloading = false;

	constructor(
		private readonly logger: Logger,
		private gitService: SourceControlGitService,
		private sourceControlPreferencesService: SourceControlPreferencesService,
		private sourceControlExportService: SourceControlExportService,
		private sourceControlImportService: SourceControlImportService,
		private sourceControlScopedService: SourceControlScopedService,
		private readonly eventService: EventService,
		private readonly sourceControlStatusService: SourceControlStatusService,
	) {
		const { gitFolder, sshFolder, sshKeyName } = sourceControlPreferencesService;
		this.gitFolder = gitFolder;
		this.sshFolder = sshFolder;
		this.sshKeyName = sshKeyName;
	}

	async start(): Promise<void> {
		await this.refreshServiceState();
	}

	private async refreshServiceState(): Promise<void> {
		this.gitService.resetService();
		sourceControlFoldersExistCheck([this.gitFolder, this.sshFolder]);
		await this.sourceControlPreferencesService.loadFromDbAndApplySourceControlPreferences();
		if (this.sourceControlPreferencesService.isSourceControlLicensedAndEnabled()) {
			await this.initGitService();
		}
	}

	/**
	 * Ensures all main instances stay in sync with source control config changes made elsewhere in a multi-main setup.
	 */
	@OnPubSubEvent('reload-source-control-config', { instanceType: 'main' })
	async reloadConfiguration(): Promise<void> {
		if (this.isReloading) {
			this.logger.warn('Source control configuration reload already in progress');
			return;
		}

		this.isReloading = true;
		try {
			this.logger.debug('Source control configuration changed, reloading from database');

			const wasConnected = this.sourceControlPreferencesService.isSourceControlConnected();
			await this.refreshServiceState();
			const isNowConnected = this.sourceControlPreferencesService.isSourceControlConnected();

			if (wasConnected && !isNowConnected) {
				await this.sourceControlExportService.deleteRepositoryFolder();
				this.logger.info('Cleaned up git repository folder after source control disconnect');
			}
		} finally {
			this.isReloading = false;
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
			const preferences = this.sourceControlPreferencesService.getPreferences();

			await this.sourceControlPreferencesService.setPreferences({
				connected: false,
				branchName: '',
				repositoryUrl: '',
				connectionType: preferences.connectionType,
			});
			await this.sourceControlExportService.deleteRepositoryFolder();

			if (preferences.connectionType === 'https') {
				await this.sourceControlPreferencesService.deleteHttpsCredentials();
			} else if (!options.keepKeyPair) {
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

		const context = new SourceControlContext(user);

		let filesToPush: SourceControlledFile[] = options.fileNames.map((file) => {
			const normalizedPath = normalizeAndValidateSourceControlledFilePath(
				this.gitFolder,
				file.file,
			);

			return {
				...file,
				file: normalizedPath,
			};
		});

		const allowedResources = (await this.sourceControlStatusService.getStatus(user, {
			direction: 'push',
			verbose: false,
			preferLocalVersion: true,
		})) as SourceControlledFile[];

		// Fallback to all allowed resources if no fileNames are provided
		if (!filesToPush.length) {
			filesToPush = allowedResources;
		}

		// If fileNames are provided, we need to check if they are allowed
		if (
			filesToPush !== allowedResources &&
			filesToPush.some(
				(file) =>
					!allowedResources.some((allowed) => {
						return allowed.id === file.id && allowed.type === file.type;
					}),
			)
		) {
			throw new ForbiddenError('You are not allowed to push these changes');
		}

		let statusResult: SourceControlledFile[] = filesToPush;

		if (!options.force) {
			const possibleConflicts = filesToPush?.filter((file) => file.conflict);
			if (possibleConflicts?.length > 0) {
				return {
					statusCode: 409,
					pushResult: undefined,
					statusResult: filesToPush,
				};
			}
		}

		try {
			const filesToBePushed = new Set<string>();
			const filesToBeDeleted = new Set<string>();

			/*
			Exclude tags, variables and folders JSON file from being deleted as
			we keep track of them in a single file unlike workflows and credentials
		*/
			filesToPush
				.filter((f) => ['workflow', 'credential', 'project'].includes(f.type))
				.forEach((e) => {
					if (e.status !== 'deleted') {
						filesToBePushed.add(e.file);
					} else {
						filesToBeDeleted.add(e.file);
					}
				});

			this.sourceControlExportService.rmFilesFromExportFolder(filesToBeDeleted);

			const workflowsToBeExported = getNonDeletedResources(filesToPush, 'workflow');
			await this.sourceControlExportService.exportWorkflowsToWorkFolder(workflowsToBeExported);

			const credentialsToBeExported = getNonDeletedResources(filesToPush, 'credential');
			const credentialExportResult =
				await this.sourceControlExportService.exportCredentialsToWorkFolder(
					credentialsToBeExported,
				);
			if (credentialExportResult.missingIds && credentialExportResult.missingIds.length > 0) {
				credentialExportResult.missingIds.forEach((id) => {
					filesToBePushed.delete(this.sourceControlExportService.getCredentialsPath(id));
					statusResult = statusResult.filter(
						(e) => e.file !== this.sourceControlExportService.getCredentialsPath(id),
					);
				});
			}

			const projectsToBeExported = getNonDeletedResources(filesToPush, 'project');
			await this.sourceControlExportService.exportTeamProjectsToWorkFolder(projectsToBeExported);

			// The tags file is always re-generated and exported to make sure the workflow-tag mappings are up to date
			filesToBePushed.add(getTagsPath(this.gitFolder));
			await this.sourceControlExportService.exportTagsToWorkFolder(context);

			const folderChanges = filterByType(filesToPush, 'folders')[0];
			if (folderChanges) {
				filesToBePushed.add(folderChanges.file);
				await this.sourceControlExportService.exportFoldersToWorkFolder(context);
			}

			const variablesChanges = filterByType(filesToPush, 'variables')[0];
			if (variablesChanges) {
				filesToBePushed.add(variablesChanges.file);
				await this.sourceControlExportService.exportGlobalVariablesToWorkFolder();
			}

			await this.gitService.stage(filesToBePushed, filesToBeDeleted);

			await this.gitService.commit(options.commitMessage ?? 'Updated Workfolder');
		} catch (error) {
			this.logger.error('Failed to export or commit changes', { error });
			try {
				await this.gitService.resetBranch({ hard: true, target: 'HEAD' });
			} catch (resetError) {
				this.logger.error('Failed to reset branch after export/commit error', {
					error: resetError,
				});
			}
			throw error;
		}

		const branchName = this.sourceControlPreferencesService.getBranchName();
		let pushResult: PushResult | undefined;
		try {
			pushResult = await this.gitService.push({
				branch: branchName,
				force: options.force ?? false,
			});

			// Only mark files as pushed after successful push
			statusResult.forEach((result) => (result.pushed = true));
		} catch (error) {
			this.logger.error('Failed to push changes', { error });
			try {
				await this.gitService.resetBranch({ hard: true, target: `origin/${branchName}` });
			} catch (resetError) {
				this.logger.error('Failed to reset branch after push error', { error: resetError });
			}
			throw error;
		}

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

	async pullWorkfolder(
		user: User,
		options: PullWorkFolderRequestDto,
	): Promise<{ statusCode: number; statusResult: SourceControlledFile[] }> {
		await this.sanityCheck();

		const statusResult = (await this.sourceControlStatusService.getStatus(user, {
			direction: 'pull',
			verbose: false,
			preferLocalVersion: false,
		})) as SourceControlledFile[];

		if (options.force !== true) {
			const possibleConflicts = statusResult.filter(
				(file) => file.conflict || file.status === 'modified',
			);

			if (possibleConflicts?.length > 0) {
				await this.gitService.resetBranch();
				return {
					statusCode: 409,
					statusResult,
				};
			}
		}

		// IMPORTANT: Make sure the projects and folders get processed first as the workflows depend on them
		const projectsToBeImported = getNonDeletedResources(statusResult, 'project');
		await this.sourceControlImportService.importTeamProjectsFromWorkFolder(
			projectsToBeImported,
			user.id,
		);

		const foldersToBeImported = getNonDeletedResources(statusResult, 'folders')[0];
		if (foldersToBeImported) {
			await this.sourceControlImportService.importFoldersFromWorkFolder(user, foldersToBeImported);
		}

		const workflowsToBeImported = getNonDeletedResources(statusResult, 'workflow');
		await this.sourceControlImportService.importWorkflowFromWorkFolder(
			workflowsToBeImported,
			user.id,
		);
		const workflowsToBeDeleted = getDeletedResources(statusResult, 'workflow');
		await this.sourceControlImportService.deleteWorkflowsNotInWorkfolder(
			user,
			workflowsToBeDeleted,
		);

		const credentialsToBeImported = getNonDeletedResources(statusResult, 'credential');
		await this.sourceControlImportService.importCredentialsFromWorkFolder(
			credentialsToBeImported,
			user.id,
		);
		const credentialsToBeDeleted = getDeletedResources(statusResult, 'credential');
		await this.sourceControlImportService.deleteCredentialsNotInWorkfolder(
			user,
			credentialsToBeDeleted,
		);

		const tagsToBeImported = getNonDeletedResources(statusResult, 'tags')[0];
		if (tagsToBeImported) {
			await this.sourceControlImportService.importTagsFromWorkFolder(tagsToBeImported);
		}
		const tagsToBeDeleted = getDeletedResources(statusResult, 'tags');
		await this.sourceControlImportService.deleteTagsNotInWorkfolder(tagsToBeDeleted);

		const variablesToBeImported = getNonDeletedResources(statusResult, 'variables')[0];
		if (variablesToBeImported) {
			await this.sourceControlImportService.importVariablesFromWorkFolder(variablesToBeImported);
		}
		const variablesToBeDeleted = getDeletedResources(statusResult, 'variables');
		await this.sourceControlImportService.deleteVariablesNotInWorkfolder(variablesToBeDeleted);

		const foldersToBeDeleted = getDeletedResources(statusResult, 'folders');
		await this.sourceControlImportService.deleteFoldersNotInWorkfolder(foldersToBeDeleted);

		const projectsToBeDeleted = getDeletedResources(statusResult, 'project');
		await this.sourceControlImportService.deleteTeamProjectsNotInWorkfolder(projectsToBeDeleted);

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

	async getStatus(user: User, options: SourceControlGetStatus) {
		await this.sanityCheck();
		return await this.sourceControlStatusService.getStatus(user, options);
	}

	async setGitUserDetails(
		name = SOURCE_CONTROL_DEFAULT_NAME,
		email = SOURCE_CONTROL_DEFAULT_EMAIL,
	): Promise<void> {
		await this.sanityCheck();
		await this.gitService.setGitUserDetails(name, email);
	}

	async getRemoteFileEntity({
		user,
		type,
		id,
		commit = 'HEAD',
	}: {
		user: User;
		type: SourceControlledFile['type'];
		id?: string;
		commit?: string;
	}): Promise<IWorkflowToImport> {
		await this.sanityCheck();
		const context = new SourceControlContext(user);
		switch (type) {
			case 'workflow': {
				if (typeof id === 'undefined') {
					throw new BadRequestError('Workflow ID is required to fetch workflow content');
				}

				const authorizedWorkflows =
					await this.sourceControlScopedService.getWorkflowsInAdminProjectsFromContext(context, id);
				if (authorizedWorkflows && authorizedWorkflows.length === 0) {
					throw new ForbiddenError(`You are not allowed to access workflow with id ${id}`);
				}
				const content = await this.gitService.getFileContent(
					`${SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER}/${id}.json`,
					commit,
				);
				return jsonParse<IWorkflowToImport>(content);
			}
			default:
				throw new BadRequestError(`Unsupported file type: ${type}`);
		}
	}
}
