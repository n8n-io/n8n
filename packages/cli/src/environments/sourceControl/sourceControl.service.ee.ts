import { Service } from 'typedi';
import path from 'path';
import * as Db from '@/Db';
import {
	getTagsPath,
	getVariablesPath,
	sourceControlFoldersExistCheck,
} from './sourceControlHelper.ee';
import type { SourceControlPreferences } from './types/sourceControlPreferences';
import {
	SOURCE_CONTROL_DEFAULT_EMAIL,
	SOURCE_CONTROL_DEFAULT_NAME,
	SOURCE_CONTROL_GIT_FOLDER,
	SOURCE_CONTROL_README,
	SOURCE_CONTROL_SSH_FOLDER,
	SOURCE_CONTROL_SSH_KEY_NAME,
} from './constants';
import { LoggerProxy } from 'n8n-workflow';
import { SourceControlGitService } from './sourceControlGit.service.ee';
import { UserSettings } from 'n8n-core';
import type { PushResult } from 'simple-git';
import { SourceControlExportService } from './sourceControlExport.service.ee';
import { BadRequestError } from '../../ResponseHelper';
import type { ImportResult } from './types/importResult';
import type { SourceControlPushWorkFolder } from './types/sourceControlPushWorkFolder';
import type { SourceControllPullOptions } from './types/sourceControlPullWorkFolder';
import type { SourceControlledFile } from './types/sourceControlledFile';
import { SourceControlPreferencesService } from './sourceControlPreferences.service.ee';
import { writeFileSync } from 'fs';
import { SourceControlImportService } from './sourceControlImport.service.ee';
import type { User } from '@/databases/entities/User';
import isEqual from 'lodash/isEqual';
import type { SourceControlGetStatus } from './types/sourceControlGetStatus';
import type { TagEntity } from '@/databases/entities/TagEntity';
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

	async initializeRepository(preferences: SourceControlPreferences, user: User) {
		if (!this.gitService.git) {
			await this.initGitService();
		}
		LoggerProxy.debug('Initializing repository...');
		await this.gitService.initRepository(preferences, user);
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
					await this.gitService.setBranch(preferences.branchName);
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

	private async import(options: SourceControllPullOptions): Promise<ImportResult | undefined> {
		try {
			return await this.sourceControlImportService.importFromWorkFolder(options);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	async getBranches(): Promise<{ branches: string[]; currentBranch: string }> {
		// fetch first to get include remote changes
		if (!this.gitService.git) {
			await this.initGitService();
		}
		await this.gitService.fetch();
		return this.gitService.getBranches();
	}

	async setBranch(branch: string): Promise<{ branches: string[]; currentBranch: string }> {
		if (!this.gitService.git) {
			await this.initGitService();
		}
		await this.sourceControlPreferencesService.setPreferences({
			branchName: branch,
			connected: branch?.length > 0,
		});
		return this.gitService.setBranch(branch);
	}

	// will reset the branch to the remote branch and pull
	// this will discard all local changes
	async resetWorkfolder(options: SourceControllPullOptions): Promise<ImportResult | undefined> {
		if (!this.gitService.git) {
			await this.initGitService();
		}
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

	async pushWorkfolder2(options: SourceControlPushWorkFolder): Promise<{
		status: number;
		pushResult: PushResult | undefined;
		diffResult: SourceControlledFile[];
	}> {
		if (!this.gitService.git) {
			await this.initGitService();
		}
		if (this.sourceControlPreferencesService.isBranchReadOnly()) {
			throw new BadRequestError('Cannot push onto read-only branch.');
		}

		// only determine file status if not provided by the frontend
		let diffResult: SourceControlledFile[] = options.fileNames;
		if (diffResult.length === 0) {
			diffResult = (await this.getStatus2({
				direction: 'push',
				verbose: false,
				preferLocalVersion: true,
			})) as SourceControlledFile[];
		}

		// await this.unstage(); // just in case there are staged files

		if (!options.force) {
			const possibleConflicts = diffResult?.filter((file) => file.conflict);
			if (possibleConflicts?.length > 0) {
				return {
					status: 409,
					pushResult: undefined,
					diffResult,
				};
			}
		}

		const filesToBePushed = new Set<string>();
		const filesToBeDeleted = new Set<string>();
		options.fileNames.forEach((e) => {
			if (e.status !== 'deleted') {
				filesToBePushed.add(e.file);
			} else {
				filesToBeDeleted.add(e.file);
			}
		});

		this.sourceControlExportService.rmFilesFromExportFolder(filesToBeDeleted);

		const workflowsToBeExported = options.fileNames.filter(
			(e) => e.type === 'workflow' && e.status !== 'deleted',
		);
		await this.sourceControlExportService.exportWorkflowsToWorkFolder(workflowsToBeExported);

		const credentialsToBeExported = options.fileNames.filter(
			(e) => e.type === 'credential' && e.status !== 'deleted',
		);
		await this.sourceControlExportService.exportCredentialsToWorkFolder(credentialsToBeExported);

		if (options.fileNames.find((e) => e.type === 'tags')) {
			await this.sourceControlExportService.exportTagsToWorkFolder();
		}

		if (options.fileNames.find((e) => e.type === 'variables')) {
			await this.sourceControlExportService.exportVariablesToWorkFolder();
		}

		await this.gitService.resetBranch();
		await this.gitService.stage(filesToBePushed, filesToBeDeleted);

		for (let i = 0; i < diffResult.length; i++) {
			if (options.fileNames.find((file) => file.file === diffResult[i].file)) {
				diffResult[i].pushed = true;
			}
		}

		await this.gitService.commit(options.message ?? 'Updated Workfolder');

		const pushResult = await this.gitService.push({
			branch: this.sourceControlPreferencesService.getBranchName(),
			force: options.force ?? false,
		});

		return {
			status: 200,
			pushResult,
			diffResult,
		};
	}

	// async pullWorkfolder(
	// 	options: SourceControllPullOptions,
	// ): Promise<{ status: number; diffResult: SourceControlledFile[] }> {
	// 	if (!this.gitService.git) {
	// 		await this.initGitService();
	// 	}
	// 	await this.resetWorkfolder({
	// 		importAfterPull: false,
	// 		userId: options.userId,
	// 		force: false,
	// 	});
	// 	const diffResult = (await this.getStatus()).filter((e) => {
	// 		if (e.status === 'created' && e.location === 'local') {
	// 			// ignore local created files so the frontend does not think a pull created new entries
	// 			return false;
	// 		}
	// 		return true;
	// 	});
	// 	const possibleConflicts = diffResult?.filter(
	// 		(file) =>
	// 			(file.conflict || file.status === 'modified') &&
	// 			file.type !== 'credential' &&
	// 			file.type !== 'variables',
	// 	);
	// 	if (possibleConflicts?.length > 0 && options.force !== true) {
	// 		await this.unstage();
	// 		return {
	// 			status: 409,
	// 			diffResult,
	// 		};
	// 	}
	// 	await this.resetWorkfolder({ ...options, importAfterPull: false });
	// 	if (options.importAfterPull) {
	// 		await this.import(options);
	// 	}
	// 	return {
	// 		status: 200,
	// 		diffResult,
	// 	};
	// }

	async pullWorkfolder2(
		options: SourceControllPullOptions,
	): Promise<{ status: number; diffResult: SourceControlledFile[] }> {
		if (!this.gitService.git) {
			await this.initGitService();
		}

		// TODO: update Pull

		// await this.resetWorkfolder({
		// 	importAfterPull: false,
		// 	userId: options.userId,
		// 	force: false,
		// });
		// const status = (await this.getStatus2({
		// 	direction: 'pull',
		// 	verbose: false,
		// 	preferLocalVersion: true,
		// })) as SourceControlledFile[];
		// const filteredResult = diffResult.filter((e) => {
		// 	if (e.status === 'created' && e.location === 'local') {
		// 		// ignore local created files so the frontend does not think a pull created new entries
		// 		return false;
		// 	}
		// 	return true;
		// });
		// const possibleConflicts = filteredResult?.filter(
		// 	(file) =>
		// 		(file.conflict || file.status === 'modified') &&
		// 		file.type !== 'credential' &&
		// 		file.type !== 'variables',
		// );
		// if (possibleConflicts?.length > 0 && options.force !== true) {
		// 	await this.unstage();
		// 	return {
		// 		status: 409,
		// 		diffResult: filteredResult,
		// 	};
		// }
		// await this.resetWorkfolder({ ...options, importAfterPull: false });
		// if (options.importAfterPull) {
		// 	await this.import(options);
		// }
		// return {
		// 	status: 200,
		// 	diffResult: filteredResult,
		// };
		return {
			status: 200,
			diffResult: [],
		};
	}

	/**
	 * Does a comparison between the local and remote workfolder based on NOT the git status,
	 * but certain parameters within the items being synced.
	 * For workflows, it compares the versionIds
	 * For credentials, it compares the name, type and nodeAccess
	 * For variables, it compares the name
	 * For tags, it compares the name and mapping
	 * @returns either SourceControlledFile[] if verbose is false,
	 * or multiple SourceControlledFile[] with all determined differences for debugging purposes
	 */
	async getStatus2(options: SourceControlGetStatus) {
		if (!this.gitService.git) {
			await this.initGitService();
		}

		const sourceControlledFiles: SourceControlledFile[] = [];

		// pull from remore first
		await this.sourceControlExportService.cleanWorkFolder();
		await this.gitService.pull({ ffOnly: false });
		await this.gitService.resetBranch({ hard: true, target: 'HEAD' });

		//
		// #region Workflows
		//
		const wfRemoteVersionIds = await this.sourceControlImportService.getRemoteVersionIdsFromFiles();
		const wfLocalVersionIds = await this.sourceControlImportService.getLocalVersionIdsFromDb();

		const wfMissingInLocal = wfRemoteVersionIds.filter(
			(remote) => wfLocalVersionIds.findIndex((local) => local.id === remote.id) === -1,
		);

		const wfMissingInRemote = wfLocalVersionIds.filter(
			(local) => wfRemoteVersionIds.findIndex((remote) => remote.id === local.id) === -1,
		);

		const wfModifiedInEither = wfLocalVersionIds.map((local) => {
			const mismatchingIds = wfRemoteVersionIds.find(
				(remote) => remote.id === local.id && remote.versionId !== local.versionId,
			);
			if (!mismatchingIds) {
				return;
			}
			return {
				...local,
				name: options.preferLocalVersion ? local.name : mismatchingIds.name,
				versionId: options.preferLocalVersion ? local.versionId : mismatchingIds.versionId,
				localId: local.versionId,
				remoteId: mismatchingIds.versionId,
			};
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
				conflict: false,
				file: item.filename,
				updatedAt: item.updatedAt ?? new Date().toISOString(),
			});
		});

		wfModifiedInEither.forEach((item) => {
			if (!item) return;
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

		// #endregion
		//
		// #region Credentials
		//
		const credRemoteIds = await this.sourceControlImportService.getRemoteCredentialsFromFiles();
		const credLocalIds = await this.sourceControlImportService.getLocalCredentialsFromDb();

		const credMissingInLocal = credRemoteIds.filter(
			(remote) => credLocalIds.findIndex((local) => local.id === remote.id) === -1,
		);

		const credMissingInRemote = credLocalIds.filter(
			(local) => credRemoteIds.findIndex((remote) => remote.id === local.id) === -1,
		);

		// only compares the name, since that is the only change synced for credentials
		const credModifiedInEither = credLocalIds.map((local) => {
			const mismatchingCreds = credRemoteIds.find((remote) => {
				return (
					remote.id === local.id &&
					(remote.name !== local.name ||
						remote.type !== local.type ||
						!isEqual(remote.nodesAccess, local.nodesAccess))
				);
			});
			if (!mismatchingCreds) {
				return;
			}
			return {
				...local,
				name: options?.preferLocalVersion ? local.name : mismatchingCreds.name,
			};
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
				conflict: false,
				file: item.filename,
				updatedAt: new Date().toISOString(),
			});
		});

		credModifiedInEither.forEach((item) => {
			if (!item) return;
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

		// #endregion
		//
		// #region Variables
		//
		const varRemoteIds = await this.sourceControlImportService.getRemoteVariablesFromFile();
		const varLocalIds = await this.sourceControlImportService.getLocalVariablesFromDb();

		const varMissingInLocal = varRemoteIds.filter(
			(remote) => varLocalIds.findIndex((local) => local.id === remote.id) === -1,
		);

		const varMissingInRemote = varLocalIds.filter(
			(local) => varRemoteIds.findIndex((remote) => remote.id === local.id) === -1,
		);

		const varModifiedInEither = varLocalIds.map((local) => {
			const mismatchingIds = varRemoteIds.find(
				(remote) =>
					(remote.id === local.id && remote.key !== local.key) ||
					(remote.id !== local.id && remote.key === local.key),
			);
			if (!mismatchingIds) {
				return;
			}
			return {
				...(options.preferLocalVersion ? local : mismatchingIds),
			};
		});

		if (
			varMissingInLocal.length > 0 ||
			varMissingInRemote.length > 0 ||
			varModifiedInEither.length > 0
		) {
			sourceControlledFiles.push({
				id: 'variables',
				name: 'variables',
				type: 'variables',
				status: 'modified',
				location: options.direction === 'push' ? 'local' : 'remote',
				conflict: true,
				file: getVariablesPath(this.gitFolder),
				updatedAt: new Date().toISOString(),
			});
		}
		// #endregion
		//
		// #region Tags
		//
		const lastUpdatedTag = await Db.collections.Tag.find({
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
		if (
			tagsMissingInLocal.length > 0 ||
			tagsMissingInRemote.length > 0 ||
			tagsModifiedInEither.length > 0 ||
			mappingsMissingInLocal.length > 0 ||
			mappingsMissingInRemote.length > 0
		) {
			sourceControlledFiles.push({
				id: 'mappings',
				name: 'tags',
				type: 'tags',
				status: 'modified',
				location: options.direction === 'push' ? 'local' : 'remote',
				conflict: true,
				file: getTagsPath(this.gitFolder),
				updatedAt: lastUpdatedTag[0]?.updatedAt.toISOString(),
			});
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
				sourceControlledFiles,
			};
		} else {
			return sourceControlledFiles;
		}
	}

	async setGitUserDetails(
		name = SOURCE_CONTROL_DEFAULT_NAME,
		email = SOURCE_CONTROL_DEFAULT_EMAIL,
	): Promise<void> {
		if (!this.gitService.git) {
			await this.initGitService();
		}
		await this.gitService.setGitUserDetails(name, email);
	}
}
