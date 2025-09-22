import type { SourceControlledFile } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	type Variables,
	type TagEntity,
	FolderRepository,
	TagRepository,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';

import {
	getFoldersPath,
	getTagsPath,
	getTrackingInformationFromPrePushResult,
	getTrackingInformationFromPullResult,
	getVariablesPath,
	isWorkflowModified,
} from './source-control-helper.ee';
import { SourceControlGitService } from './source-control-git.service.ee';
import { SourceControlImportService } from './source-control-import.service.ee';
import { SourceControlPreferencesService } from './source-control-preferences.service.ee';
import type { StatusExportableCredential } from './types/exportable-credential';
import type { ExportableFolder } from './types/exportable-folders';
import { SourceControlContext } from './types/source-control-context';
import type { SourceControlGetStatus } from './types/source-control-get-status';
import type { SourceControlWorkflowVersionId } from './types/source-control-workflow-version-id';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { EventService } from '@/events/event.service';

@Service()
export class SourceControlStatusService {
	constructor(
		private readonly logger: Logger,
		private readonly gitService: SourceControlGitService,
		private readonly sourceControlImportService: SourceControlImportService,
		private readonly sourceControlPreferencesService: SourceControlPreferencesService,
		private readonly tagRepository: TagRepository,
		private readonly folderRepository: FolderRepository,
		private readonly eventService: EventService,
	) {}

	private get gitFolder(): string {
		return this.sourceControlPreferencesService.gitFolder;
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
		const context = new SourceControlContext(user);

		if (options.direction === 'pull' && !hasGlobalScope(user, 'sourceControl:pull')) {
			// A pull is only allowed by global admins or owners
			throw new ForbiddenError('You do not have permission to pull from source control');
		}

		const sourceControlledFiles: SourceControlledFile[] = [];

		// fetch and reset hard first
		await this.resetWorkfolder();

		const {
			wfRemoteVersionIds,
			wfLocalVersionIds,
			wfMissingInLocal,
			wfMissingInRemote,
			wfModifiedInEither,
		} = await this.getStatusWorkflows(options, context, sourceControlledFiles);

		const { credMissingInLocal, credMissingInRemote, credModifiedInEither } =
			await this.getStatusCredentials(options, context, sourceControlledFiles);

		const { varMissingInLocal, varMissingInRemote, varModifiedInEither } =
			await this.getStatusVariables(options, sourceControlledFiles);

		const {
			tagsMissingInLocal,
			tagsMissingInRemote,
			tagsModifiedInEither,
			mappingsMissingInLocal,
			mappingsMissingInRemote,
		} = await this.getStatusTagsMappings(options, context, sourceControlledFiles);

		const { foldersMissingInLocal, foldersMissingInRemote, foldersModifiedInEither } =
			await this.getStatusFoldersMapping(options, context, sourceControlledFiles);

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

	private async resetWorkfolder(): Promise<void> {
		if (!this.gitService.git) {
			throw new Error('Git service not initialized');
		}
		try {
			await this.gitService.resetBranch();
			await this.gitService.pull();
		} catch (error) {
			this.logger.error(`Failed to reset workfolder: ${(error as Error).message}`);
			throw error;
		}
	}

	private async getStatusWorkflows(
		options: SourceControlGetStatus,
		context: SourceControlContext,
		sourceControlledFiles: SourceControlledFile[],
	) {
		// TODO: We need to check the case where it exists in the DB (out of scope) but is in GIT
		const wfRemoteVersionIds =
			await this.sourceControlImportService.getRemoteVersionIdsFromFiles(context);
		const wfLocalVersionIds =
			await this.sourceControlImportService.getLocalVersionIdsFromDb(context);

		let outOfScopeWF: SourceControlWorkflowVersionId[] = [];

		if (!context.hasAccessToAllProjects()) {
			// we need to query for all wf in the DB to hide possible deletions,
			// when a wf went out of scope locally
			outOfScopeWF = await this.sourceControlImportService.getAllLocalVersionIdsFromDb();
			outOfScopeWF = outOfScopeWF.filter(
				(wf) => !wfLocalVersionIds.some((local) => local.id === wf.id),
			);
		}

		const wfMissingInLocal = wfRemoteVersionIds
			.filter((remote) => wfLocalVersionIds.findIndex((local) => local.id === remote.id) === -1)
			.filter(
				// If we have out of scope workflows, these are workflows, that are not
				// visible locally, but exists locally but are available in remote
				// we skip them and hide them from deletion from the user.
				(remote) => !outOfScopeWF.some((outOfScope) => outOfScope.id === remote.id),
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
				owner: item.owner,
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
				owner: item.owner,
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
				owner: item.owner,
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
		context: SourceControlContext,
		sourceControlledFiles: SourceControlledFile[],
	) {
		const credRemoteIds =
			await this.sourceControlImportService.getRemoteCredentialsFromFiles(context);
		const credLocalIds = await this.sourceControlImportService.getLocalCredentialsFromDb(context);

		const credMissingInLocal = credRemoteIds.filter(
			(remote) => credLocalIds.findIndex((local) => local.id === remote.id) === -1,
		);

		const credMissingInRemote = credLocalIds.filter(
			(local) => credRemoteIds.findIndex((remote) => remote.id === local.id) === -1,
		);

		// only compares the name, since that is the only change synced for credentials
		const credModifiedInEither: StatusExportableCredential[] = [];
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
				owner: item.ownedBy,
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
				owner: item.ownedBy,
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
				owner: item.ownedBy,
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
		context: SourceControlContext,
		sourceControlledFiles: SourceControlledFile[],
	) {
		const lastUpdatedTag = await this.tagRepository.find({
			order: { updatedAt: 'DESC' },
			take: 1,
			select: ['updatedAt'],
		});

		const lastUpdatedDate = lastUpdatedTag[0]?.updatedAt ?? new Date();

		const tagMappingsRemote =
			await this.sourceControlImportService.getRemoteTagsAndMappingsFromFile(context);
		const tagMappingsLocal =
			await this.sourceControlImportService.getLocalTagsAndMappingsFromDb(context);

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
				updatedAt: lastUpdatedDate.toISOString(),
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
				updatedAt: lastUpdatedDate.toISOString(),
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
				updatedAt: lastUpdatedDate.toISOString(),
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
		context: SourceControlContext,
		sourceControlledFiles: SourceControlledFile[],
	) {
		const lastUpdatedFolder = await this.folderRepository.find({
			order: { updatedAt: 'DESC' },
			take: 1,
			select: ['updatedAt'],
		});

		const lastUpdatedDate = lastUpdatedFolder[0]?.updatedAt ?? new Date();

		const foldersMappingsRemote =
			await this.sourceControlImportService.getRemoteFoldersAndMappingsFromFile(context);
		const foldersMappingsLocal =
			await this.sourceControlImportService.getLocalFoldersAndMappingsFromDb(context);

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
				updatedAt: lastUpdatedDate.toISOString(),
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
				updatedAt: lastUpdatedDate.toISOString(),
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
				updatedAt: lastUpdatedDate.toISOString(),
			});
		});

		return {
			foldersMissingInLocal,
			foldersMissingInRemote,
			foldersModifiedInEither,
		};
	}
}
