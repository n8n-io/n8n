import type { SourceControlledFile } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { FolderRepository, TagRepository, type User, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import { In } from '@n8n/typeorm';
import pick from 'lodash/pick';
import { UserError } from 'n8n-workflow';

import { SOURCE_CONTROL_DATATABLES_EXPORT_FOLDER } from './constants';
import { SourceControlGitService } from './source-control-git.service.ee';
import {
	hasOwnerChanged,
	getDataTableExportPath,
	getFoldersPath,
	getTagsPath,
	getTrackingInformationFromPrePushResult,
	getTrackingInformationFromPullResult,
	getVariablesPath,
	isWorkflowModified,
	isDataTableModified,
	areSameCredentials,
} from './source-control-helper.ee';
import { SourceControlImportService } from './source-control-import.service.ee';
import { SourceControlPreferencesService } from './source-control-preferences.service.ee';
import { SourceControlContextFactory } from './source-control-context.factory';
import type { StatusExportableCredential } from './types/exportable-credential';
import type {
	DataTableResourceOwner,
	ExportableDataTable,
	StatusExportableDataTable,
} from './types/exportable-data-table';
import type { ExportableFolder, FolderPathNode } from './types/exportable-folders';
import type { ExportableProjectWithFileName } from './types/exportable-project';
import { ExportableVariable } from './types/exportable-variable';
import type { StatusResourceOwner } from './types/resource-owner';
import { SourceControlContext } from './types/source-control-context';
import type {
	SourceControlGetStatus,
	SourceControlGetStatusVerboseResult,
} from './types/source-control-get-status';
import type { SourceControlWorkflowVersionId } from './types/source-control-workflow-version-id';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { EventService } from '@/events/event.service';
import { ExportableTagEntity } from '@/modules/source-control.ee/types/exportable-tags';

@Service()
export class SourceControlStatusService {
	constructor(
		private readonly logger: Logger,
		private readonly gitService: SourceControlGitService,
		private readonly sourceControlImportService: SourceControlImportService,
		private readonly sourceControlPreferencesService: SourceControlPreferencesService,
		private readonly sourceControlContextFactory: SourceControlContextFactory,
		private readonly tagRepository: TagRepository,
		private readonly folderRepository: FolderRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly eventService: EventService,
	) {}

	private get gitFolder(): string {
		return this.sourceControlPreferencesService.gitFolder;
	}

	private get dataTableExportFolder(): string {
		return `${this.gitFolder}/${SOURCE_CONTROL_DATATABLES_EXPORT_FOLDER}`;
	}

	/**
	 * Converts data table ownership (from file or DB) to StatusResourceOwner (for API).
	 * Returns undefined for personal projects since IDs don't sync across instances.
	 */
	private convertToStatusResourceOwner(
		owner: DataTableResourceOwner | StatusResourceOwner | null | undefined,
	): StatusResourceOwner | undefined {
		if (!owner) {
			return;
		}

		if (owner.type === 'personal') {
			return;
		}

		if ('teamId' in owner && 'teamName' in owner) {
			return {
				type: 'team',
				projectId: owner.teamId,
				projectName: owner.teamName,
			};
		}

		if ('projectId' in owner) {
			return owner;
		}

		return;
	}

	/**
	 * Checks whether a local and remote data table belong to the same project.
	 * For team projects, compares the project/team ID.
	 * Returns true when both owners are null (unowned) or when neither is a team
	 * (conservative match to avoid suppressing real collisions).
	 */
	private isSameDataTableProject(
		localOwner: StatusResourceOwner | null,
		remoteOwner: DataTableResourceOwner | null,
	): boolean {
		if (!localOwner && !remoteOwner) {
			return true;
		}

		if (localOwner?.type === 'team' && remoteOwner?.type === 'team') {
			return localOwner.projectId === remoteOwner.teamId;
		}

		// Personal projects don't have stable IDs across instances,
		// so we can't reliably determine if they're the same project.
		// Return false to avoid false-positive collision flags.
		if (localOwner?.type === 'personal' || remoteOwner?.type === 'personal') {
			return false;
		}

		// Mixed (one null, one not) — different projects
		return false;
	}

	private buildFolderPath(
		parentFolderId: string | null | undefined,
		foldersById: Map<string, FolderPathNode>,
	): string[] {
		if (!parentFolderId) {
			return [];
		}

		const pathSegments: string[] = [];
		const visited = new Set<string>();
		let currentFolderId: string | null | undefined = parentFolderId;

		while (currentFolderId && !visited.has(currentFolderId)) {
			visited.add(currentFolderId);
			const folder = foldersById.get(currentFolderId);
			if (!folder) {
				break;
			}

			pathSegments.unshift(folder.name);
			currentFolderId = folder.parentFolderId;
		}

		return pathSegments;
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
	async getStatus(
		user: User,
		options: SourceControlGetStatus & { verbose: true },
	): Promise<SourceControlGetStatusVerboseResult>;
	async getStatus(
		user: User,
		options: SourceControlGetStatus & { verbose?: false },
	): Promise<SourceControlledFile[]>;
	async getStatus(
		user: User,
		options: SourceControlGetStatus & { verbose: boolean },
	): Promise<SourceControlledFile[] | SourceControlGetStatusVerboseResult>;
	async getStatus(
		user: User,
		options: SourceControlGetStatus,
	): Promise<SourceControlledFile[] | SourceControlGetStatusVerboseResult> {
		const context = await this.sourceControlContextFactory.createContext(user);
		const collectVerbose = options?.verbose ?? false;

		if (options.direction === 'pull' && !hasGlobalScope(user, 'sourceControl:pull')) {
			throw new ForbiddenError('You do not have permission to pull from source control');
		}

		await this.resetWorkfolder();

		const remoteFolders =
			await this.sourceControlImportService.getRemoteFoldersAndMappingsFromFile(context);

		const [
			workflowsResult,
			credentialsResult,
			variablesResult,
			dataTablesResult,
			tagsMappingsResult,
			foldersMappingResult,
			projectsResult,
		] = await Promise.all([
			this.getStatusWorkflows(options, context, collectVerbose, remoteFolders),
			this.getStatusCredentials(options, context, collectVerbose),
			this.getStatusVariables(options, collectVerbose),
			this.getStatusDataTables(options, collectVerbose),
			this.getStatusTagsMappings(options, context, collectVerbose),
			this.getStatusFoldersMapping(options, context, collectVerbose, remoteFolders),
			this.getStatusProjects(options, context, collectVerbose),
		]);

		const sourceControlledFiles: SourceControlledFile[] = [
			...workflowsResult.files,
			...credentialsResult.files,
			...variablesResult.files,
			...dataTablesResult.files,
			...tagsMappingsResult.files,
			...foldersMappingResult.files,
			...projectsResult.files,
		];

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

		if (collectVerbose) {
			return {
				...workflowsResult.verbose,
				...credentialsResult.verbose,
				...variablesResult.verbose,
				...dataTablesResult.verbose,
				...tagsMappingsResult.verbose,
				...foldersMappingResult.verbose,
				...projectsResult.verbose,
				sourceControlledFiles,
			};
		}

		return sourceControlledFiles;
	}

	private async resetWorkfolder(): Promise<void> {
		try {
			if (!this.gitService.git) {
				throw new Error('Git service not initialized');
			}
			await this.gitService.resetBranch();
			await this.gitService.pull();
		} catch (error) {
			this.logger.error(
				`Failed to reset workfolder: ${error instanceof Error ? error.message : String(error)}`,
			);
			throw new UserError(
				`Unable to fetch updates from git - your folder might be out of sync. Try reconnecting from the Source Control settings page. Git error message: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Populates the provided localFoldersById map with all missing parent folder path nodes required by the given workflows.
	 * For each workflow, traverses up the parent chain and injects any folders missing from localFoldersById.
	 *
	 * @param localFoldersById - Map to inject missing folder nodes into.
	 * @param localWorkflows - List of workflows, each referencing a parent folder.
	 * @returns Promise<void>
	 */
	private async populateMissingLocalFolderPathNodes(
		localFoldersById: Map<string, FolderPathNode>,
		localWorkflows: SourceControlWorkflowVersionId[],
	): Promise<void> {
		const getMissingFolderIds = (folderIds: Array<string | null>): Set<string> => {
			const missingFolderIds = folderIds.filter(
				(id): id is string => id !== null && !localFoldersById.has(id),
			);

			return new Set<string>(missingFolderIds);
		};

		const initialParentFolderIds = localWorkflows.map((workflow) => workflow.parentFolderId);
		const folderIdsToProcessQueue = getMissingFolderIds(initialParentFolderIds);

		while (folderIdsToProcessQueue.size > 0) {
			const currentBatchFolderIds = Array.from(folderIdsToProcessQueue);
			folderIdsToProcessQueue.clear();

			const loadedFolders = await this.folderRepository.find({
				where: { id: In(currentBatchFolderIds) },
				relations: ['parentFolder'],
				select: {
					id: true,
					name: true,
					parentFolder: {
						id: true,
					},
				},
			});

			loadedFolders.forEach((folder) => {
				localFoldersById.set(folder.id, {
					name: folder.name,
					parentFolderId: folder.parentFolder?.id ?? null,
				});
			});

			const parentFolderIds = loadedFolders.map((folder) => folder.parentFolder?.id ?? null);
			const missingParentFolderIds = getMissingFolderIds(parentFolderIds);

			missingParentFolderIds.forEach((folderId) => {
				folderIdsToProcessQueue.add(folderId);
			});
		}
	}

	private async getStatusWorkflows(
		options: SourceControlGetStatus,
		context: SourceControlContext,
		collectVerbose: boolean,
		prefetchedRemoteFolders: { folders: ExportableFolder[] },
	) {
		const sourceControlledFiles: SourceControlledFile[] = [];
		// TODO: We need to check the case where it exists in the DB (out of scope) but is in GIT
		const [wfRemoteVersionIds, wfLocalVersionIds, foldersMappingsLocal] = await Promise.all([
			this.sourceControlImportService.getRemoteVersionIdsFromFiles(context),
			this.sourceControlImportService.getLocalVersionIdsFromDb(context),
			this.sourceControlImportService.getLocalFoldersAndMappingsFromDb(context),
		]);
		const remoteFoldersById = new Map<string, FolderPathNode>(
			prefetchedRemoteFolders.folders.map((folder) => [
				folder.id,
				pick(folder, ['name', 'parentFolderId']),
			]),
		);
		const localFoldersById = new Map<string, FolderPathNode>(
			foldersMappingsLocal.folders.map((folder) => [
				folder.id,
				pick(folder, ['name', 'parentFolderId']),
			]),
		);
		await this.populateMissingLocalFolderPathNodes(localFoldersById, wfLocalVersionIds);

		const wfRemoteById = new Map(wfRemoteVersionIds.map((w) => [w.id, w]));
		const wfRemoteIds = new Set(wfRemoteVersionIds.map((w) => w.id));
		const wfLocalIds = new Set(wfLocalVersionIds.map((w) => w.id));

		// Fetch published status for local workflows to determine isLocalPublished
		const candidateIds = [...new Set([...wfLocalIds, ...wfRemoteIds])];
		const localWorkflowsWithStatus = await this.workflowRepository.findByIds(candidateIds, {
			fields: ['id', 'activeVersionId'],
		});
		const publishedWorkflowIds = new Set(
			localWorkflowsWithStatus.filter((w) => !!w.activeVersionId).map((w) => w.id),
		);

		// Create map of isArchived from remote workflows to determine isRemoteArchived
		const archivedWorkflowIds = new Map(
			wfRemoteVersionIds.filter((w) => w.isRemoteArchived).map((w) => [w.id, true]),
		);

		let outOfScopeWF: SourceControlWorkflowVersionId[] = [];

		if (!context.hasAccessToAllProjects()) {
			// we need to query for all wf in the DB to hide possible deletions,
			// when a wf went out of scope locally
			outOfScopeWF = await this.sourceControlImportService.getAllLocalVersionIdsFromDb();
			outOfScopeWF = outOfScopeWF.filter((wf) => !wfLocalIds.has(wf.id));
		}

		const outOfScopeIds = new Set(outOfScopeWF.map((wf) => wf.id));

		const wfMissingInLocal: SourceControlWorkflowVersionId[] = [];
		const wfMissingInRemote: SourceControlWorkflowVersionId[] = [];
		const wfModifiedInEither: SourceControlWorkflowVersionId[] = [];

		// If we have out of scope workflows, these are workflows, that are not
		// visible locally, but exist locally but are available in remote
		// we skip them and hide them from deletion from the user.
		for (const remoteWorkflow of wfRemoteVersionIds) {
			if (!wfLocalIds.has(remoteWorkflow.id) && !outOfScopeIds.has(remoteWorkflow.id)) {
				if (collectVerbose) {
					wfMissingInLocal.push(remoteWorkflow);
				}
				sourceControlledFiles.push({
					id: remoteWorkflow.id,
					name: remoteWorkflow.name ?? 'Workflow',
					type: 'workflow',
					status: options.direction === 'push' ? 'deleted' : 'created',
					location: options.direction === 'push' ? 'local' : 'remote',
					conflict: false,
					file: remoteWorkflow.filename,
					updatedAt: remoteWorkflow.updatedAt ?? new Date().toISOString(),
					isLocalPublished: false, // New workflow, not published locally
					isRemoteArchived: archivedWorkflowIds.get(remoteWorkflow.id) ?? false,
					parentFolderId: remoteWorkflow.parentFolderId,
					folderPath: this.buildFolderPath(remoteWorkflow.parentFolderId, remoteFoldersById),
					owner: remoteWorkflow.owner,
				});
			}
		}

		for (const localWorkflow of wfLocalVersionIds) {
			const remoteWorkflowWithSameId = wfRemoteById.get(localWorkflow.id);

			if (!remoteWorkflowWithSameId) {
				if (collectVerbose) {
					wfMissingInRemote.push(localWorkflow);
				}
				sourceControlledFiles.push({
					id: localWorkflow.id,
					name: localWorkflow.name ?? 'Workflow',
					type: 'workflow',
					status: options.direction === 'push' ? 'created' : 'deleted',
					location: options.direction === 'push' ? 'local' : 'remote',
					conflict: options.direction === 'push' ? false : true,
					file: localWorkflow.filename,
					updatedAt: localWorkflow.updatedAt ?? new Date().toISOString(),
					isLocalPublished: publishedWorkflowIds.has(localWorkflow.id),
					isRemoteArchived: false, // Workflow deleted from remote, no archived status
					parentFolderId: localWorkflow.parentFolderId,
					folderPath: this.buildFolderPath(localWorkflow.parentFolderId, localFoldersById),
					owner: localWorkflow.owner,
				});
				continue;
			}

			if (!isWorkflowModified(localWorkflow, remoteWorkflowWithSameId)) {
				continue;
			}

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

			const preferredParentFolderId = options.preferLocalVersion
				? localWorkflow.parentFolderId
				: remoteWorkflowWithSameId.parentFolderId;
			const preferredFolderPath = this.buildFolderPath(
				preferredParentFolderId,
				options.preferLocalVersion ? localFoldersById : remoteFoldersById,
			);

			const wfModified: SourceControlWorkflowVersionId = {
				...localWorkflow,
				name,
				parentFolderId: preferredParentFolderId,
				versionId: options.preferLocalVersion
					? localWorkflow.versionId
					: remoteWorkflowWithSameId.versionId,
				localId: localWorkflow.versionId,
				remoteId: remoteWorkflowWithSameId.versionId,
			};

			if (collectVerbose) {
				wfModifiedInEither.push(wfModified);
			}

			sourceControlledFiles.push({
				id: wfModified.id,
				name: wfModified.name ?? 'Workflow',
				type: 'workflow',
				status: 'modified',
				location: options.direction === 'push' ? 'local' : 'remote',
				conflict: true,
				file: wfModified.filename,
				updatedAt: wfModified.updatedAt ?? new Date().toISOString(),
				isLocalPublished: publishedWorkflowIds.has(wfModified.id),
				isRemoteArchived: archivedWorkflowIds.get(wfModified.id) ?? false,
				parentFolderId: preferredParentFolderId,
				folderPath: preferredFolderPath,
				owner: wfModified.owner,
			});
		}

		return {
			files: sourceControlledFiles,
			verbose: {
				wfRemoteVersionIds,
				wfLocalVersionIds,
				wfMissingInLocal,
				wfMissingInRemote,
				wfModifiedInEither,
			},
		};
	}

	private async getStatusCredentials(
		options: SourceControlGetStatus,
		context: SourceControlContext,
		collectVerbose: boolean,
	) {
		const sourceControlledFiles: SourceControlledFile[] = [];
		const credRemoteIds =
			await this.sourceControlImportService.getRemoteCredentialsFromFiles(context);
		const credLocalIds = await this.sourceControlImportService.getLocalCredentialsFromDb(context);

		const credRemoteById = new Map(credRemoteIds.map((cred) => [cred.id, cred]));
		const credLocalIdsSet = new Set(credLocalIds.map((cred) => cred.id));

		const credMissingInLocal: StatusExportableCredential[] = [];
		const credMissingInRemote: StatusExportableCredential[] = [];
		const credModifiedInEither: StatusExportableCredential[] = [];

		for (const remoteCredential of credRemoteIds) {
			if (!credLocalIdsSet.has(remoteCredential.id)) {
				if (collectVerbose) {
					credMissingInLocal.push(remoteCredential);
				}
				sourceControlledFiles.push({
					id: remoteCredential.id,
					name: remoteCredential.name ?? 'Credential',
					type: 'credential',
					status: options.direction === 'push' ? 'deleted' : 'created',
					location: options.direction === 'push' ? 'local' : 'remote',
					conflict: false,
					file: remoteCredential.filename,
					updatedAt: new Date().toISOString(),
					owner: remoteCredential.ownedBy,
				});
			}
		}

		for (const localCredential of credLocalIds) {
			const credRemote = credRemoteById.get(localCredential.id);
			if (credRemote) {
				// Compare name, type, owner and isGlobal since those are the synced properties for credentials
				if (areSameCredentials(localCredential, credRemote)) {
					continue;
				}

				const modifiedCredential = {
					...localCredential,
					name: options?.preferLocalVersion ? localCredential.name : credRemote.name,
				};
				if (collectVerbose) {
					credModifiedInEither.push(modifiedCredential);
				}
				sourceControlledFiles.push({
					id: modifiedCredential.id,
					name: modifiedCredential.name ?? 'Credential',
					type: 'credential',
					status: 'modified',
					location: options.direction === 'push' ? 'local' : 'remote',
					conflict: true,
					file: modifiedCredential.filename,
					updatedAt: new Date().toISOString(),
					owner: modifiedCredential.ownedBy,
				});
			} else {
				if (collectVerbose) {
					credMissingInRemote.push(localCredential);
				}
				sourceControlledFiles.push({
					id: localCredential.id,
					name: localCredential.name ?? 'Credential',
					type: 'credential',
					status: options.direction === 'push' ? 'created' : 'deleted',
					location: options.direction === 'push' ? 'local' : 'remote',
					conflict: options.direction === 'push' ? false : true,
					file: localCredential.filename,
					updatedAt: new Date().toISOString(),
					owner: localCredential.ownedBy,
				});
			}
		}

		return {
			files: sourceControlledFiles,
			verbose: {
				credMissingInLocal,
				credMissingInRemote,
				credModifiedInEither,
			},
		};
	}

	private async getStatusVariables(options: SourceControlGetStatus, collectVerbose: boolean) {
		const sourceControlledFiles: SourceControlledFile[] = [];
		const varRemoteIds = await this.sourceControlImportService.getRemoteVariablesFromFile();
		const varLocalIds = await this.sourceControlImportService.getLocalGlobalVariablesFromDb();

		const varRemoteIdsSet = new Set(varRemoteIds.map((remote) => remote.id));
		const varLocalIdsSet = new Set(varLocalIds.map((local) => local.id));

		const varMissingInLocal: ExportableVariable[] = [];
		const varMissingInRemote: ExportableVariable[] = [];
		const varModifiedInEither: ExportableVariable[] = [];

		for (const remoteVariable of varRemoteIds) {
			if (!varLocalIdsSet.has(remoteVariable.id)) {
				if (collectVerbose) {
					varMissingInLocal.push(remoteVariable);
				}
				sourceControlledFiles.push({
					id: remoteVariable.id,
					name: remoteVariable.key,
					type: 'variables',
					status: options.direction === 'push' ? 'deleted' : 'created',
					location: options.direction === 'push' ? 'local' : 'remote',
					conflict: false,
					file: getVariablesPath(this.gitFolder),
					updatedAt: new Date().toISOString(),
				});
			}
		}

		for (const localVariable of varLocalIds) {
			if (!varRemoteIdsSet.has(localVariable.id)) {
				if (collectVerbose) {
					varMissingInRemote.push(localVariable);
				}
				sourceControlledFiles.push({
					id: localVariable.id,
					name: localVariable.key,
					type: 'variables',
					status: options.direction === 'push' ? 'created' : 'deleted',
					location: options.direction === 'push' ? 'local' : 'remote',
					// if the we pull and the file is missing in the remote, we will delete
					// it locally, which is communicated by marking this as a conflict
					conflict: options.direction === 'push' ? false : true,
					file: getVariablesPath(this.gitFolder),
					updatedAt: new Date().toISOString(),
				});
			}
		}

		for (const localVariable of varLocalIds) {
			const mismatchingIds = varRemoteIds.find(
				(remote) =>
					(remote.id === localVariable.id && remote.key !== localVariable.key) ||
					(remote.id !== localVariable.id && remote.key === localVariable.key),
			);
			if (!mismatchingIds) {
				continue;
			}

			const modified = options.preferLocalVersion ? localVariable : mismatchingIds;
			if (collectVerbose) {
				varModifiedInEither.push(modified);
			}
			sourceControlledFiles.push({
				id: modified.id,
				name: modified.key,
				type: 'variables',
				status: 'modified',
				location: options.direction === 'push' ? 'local' : 'remote',
				conflict: true,
				file: getVariablesPath(this.gitFolder),
				updatedAt: new Date().toISOString(),
			});
		}

		return {
			files: sourceControlledFiles,
			verbose: {
				varMissingInLocal,
				varMissingInRemote,
				varModifiedInEither,
			},
		};
	}

	private async getStatusDataTables(options: SourceControlGetStatus, collectVerbose: boolean) {
		const sourceControlledFiles: SourceControlledFile[] = [];
		const dataTablesRemote =
			(await this.sourceControlImportService.getRemoteDataTablesFromFiles()) ?? [];
		const dataTablesLocal =
			(await this.sourceControlImportService.getLocalDataTablesFromDb()) ?? [];

		const localById = new Map(dataTablesLocal.map((dt) => [dt.id, dt]));
		const remoteById = new Map(dataTablesRemote.map((dt) => [dt.id, dt]));
		const remoteByName = new Map(dataTablesRemote.map((dt) => [dt.name, dt]));

		// Query git history to find data table IDs that were previously synced.
		// This lets us distinguish "deleted from remote" (should delete locally on pull)
		// from "never pushed" (should preserve locally on pull), and vice versa for push.
		const historicallyTrackedFiles = await this.gitService.getHistoricallyTrackedFiles(
			SOURCE_CONTROL_DATATABLES_EXPORT_FOLDER,
		);
		const previouslySyncedIds = new Set<string>();
		for (const filePath of historicallyTrackedFiles) {
			const match = filePath.match(/([^/]+)\.json$/);
			if (match) {
				previouslySyncedIds.add(match[1]);
			}
		}

		const dtMissingInLocal: ExportableDataTable[] = [];
		const dtMissingInRemote: StatusExportableDataTable[] = [];
		const dtModifiedInEither: Array<ExportableDataTable | StatusExportableDataTable> = [];

		for (const remote of dataTablesRemote) {
			if (!localById.has(remote.id)) {
				// During push, a remote-only table would be marked as "deleted" from remote.
				// Skip if this table was never synced from this instance (it was pushed by
				// another instance and should not be deleted).
				if (options.direction === 'push' && !previouslySyncedIds.has(remote.id)) {
					continue;
				}

				if (collectVerbose) {
					dtMissingInLocal.push(remote);
				}
				sourceControlledFiles.push({
					id: remote.id,
					name: remote.name,
					type: 'datatable',
					status: options.direction === 'push' ? 'deleted' : 'created',
					location: options.direction === 'push' ? 'local' : 'remote',
					conflict: false,
					file: getDataTableExportPath(remote.id, this.dataTableExportFolder),
					updatedAt: new Date().toISOString(),
					owner: this.convertToStatusResourceOwner(remote.ownedBy),
				});
			}
		}

		for (const local of dataTablesLocal) {
			const remote = remoteById.get(local.id);

			if (!remote) {
				// Check for cross-ID name collision (different tables sharing the same name
				// in the same project). This must run before the never-synced early-continue
				// below, otherwise a pull would silently create a remote table that collides
				// with an unsynced local one.
				const nameCandidate = remoteByName.get(local.name);
				const nameCollision =
					nameCandidate &&
					nameCandidate.id !== local.id &&
					this.isSameDataTableProject(local.ownedBy, nameCandidate.ownedBy)
						? nameCandidate
						: undefined;
				if (nameCollision) {
					const modified = options.preferLocalVersion ? local : nameCollision;
					if (collectVerbose) {
						dtModifiedInEither.push(modified);
					}
					sourceControlledFiles.push({
						id: modified.id,
						name: modified.name,
						type: 'datatable',
						status: 'modified',
						location: options.direction === 'push' ? 'local' : 'remote',
						conflict: true,
						file: getDataTableExportPath(modified.id, this.dataTableExportFolder),
						updatedAt: new Date().toISOString(),
						owner: this.convertToStatusResourceOwner(modified.ownedBy),
					});
				}

				// During pull, a local-only table would be marked as "deleted" locally.
				// Skip if this table was never synced — it was created locally and not yet
				// pushed, so it should not be deleted.
				if (options.direction === 'pull' && !previouslySyncedIds.has(local.id)) {
					continue;
				}

				if (collectVerbose) {
					dtMissingInRemote.push(local);
				}
				sourceControlledFiles.push({
					id: local.id,
					name: local.name,
					type: 'datatable',
					status: options.direction === 'push' ? 'created' : 'deleted',
					location: options.direction === 'push' ? 'local' : 'remote',
					conflict: options.direction !== 'push',
					file: getDataTableExportPath(local.id, this.dataTableExportFolder),
					updatedAt: new Date().toISOString(),
					owner: local.ownedBy ?? undefined,
				});

				continue;
			}

			const isModified = isDataTableModified(local, remote);

			if (isModified) {
				const modified = options.preferLocalVersion ? local : remote;
				if (collectVerbose) {
					dtModifiedInEither.push(modified);
				}
				sourceControlledFiles.push({
					id: modified.id,
					name: modified.name,
					type: 'datatable',
					status: 'modified',
					location: options.direction === 'push' ? 'local' : 'remote',
					conflict: true,
					file: getDataTableExportPath(modified.id, this.dataTableExportFolder),
					updatedAt: new Date().toISOString(),
					owner: this.convertToStatusResourceOwner(modified.ownedBy),
				});
			}
		}

		return {
			files: sourceControlledFiles,
			verbose: {
				dtMissingInLocal,
				dtMissingInRemote,
				dtModifiedInEither,
			},
		};
	}

	private async getStatusTagsMappings(
		options: SourceControlGetStatus,
		context: SourceControlContext,
		collectVerbose: boolean,
	) {
		const sourceControlledFiles: SourceControlledFile[] = [];
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

		const tagsMissingInLocal: ExportableTagEntity[] = [];
		const tagsMissingInRemote: ExportableTagEntity[] = [];
		const tagsModifiedInEither: ExportableTagEntity[] = [];
		const mappingsMissingInLocal: typeof tagMappingsRemote.mappings = [];
		const mappingsMissingInRemote: typeof tagMappingsLocal.mappings = [];

		let tagsMissingInLocalCount = 0;
		let tagsMissingInRemoteCount = 0;
		let tagsModifiedInEitherCount = 0;
		let mappingsMissingInLocalCount = 0;
		let mappingsMissingInRemoteCount = 0;

		for (const remote of tagMappingsRemote.tags) {
			if (tagMappingsLocal.tags.findIndex((local) => local.id === remote.id) === -1) {
				tagsMissingInLocalCount += 1;
				if (collectVerbose) {
					tagsMissingInLocal.push(remote);
				}
				sourceControlledFiles.push({
					id: remote.id,
					name: remote.name,
					type: 'tags',
					status: options.direction === 'push' ? 'deleted' : 'created',
					location: options.direction === 'push' ? 'local' : 'remote',
					conflict: false,
					file: getTagsPath(this.gitFolder),
					updatedAt: lastUpdatedDate.toISOString(),
				});
			}
		}

		for (const localTag of tagMappingsLocal.tags) {
			if (tagMappingsRemote.tags.findIndex((remote) => remote.id === localTag.id) === -1) {
				tagsMissingInRemoteCount += 1;
				if (collectVerbose) {
					tagsMissingInRemote.push(localTag);
				}
				sourceControlledFiles.push({
					id: localTag.id,
					name: localTag.name,
					type: 'tags',
					status: options.direction === 'push' ? 'created' : 'deleted',
					location: options.direction === 'push' ? 'local' : 'remote',
					conflict: options.direction === 'push' ? false : true,
					file: getTagsPath(this.gitFolder),
					updatedAt: lastUpdatedDate.toISOString(),
				});
			}
		}

		for (const localTag of tagMappingsLocal.tags) {
			const mismatchingIds = tagMappingsRemote.tags.find(
				(remote) => remote.id === localTag.id && remote.name !== localTag.name,
			);
			if (!mismatchingIds) {
				continue;
			}
			tagsModifiedInEitherCount += 1;
			const modified = options.preferLocalVersion ? localTag : mismatchingIds;
			if (collectVerbose) {
				tagsModifiedInEither.push(modified);
			}
			sourceControlledFiles.push({
				id: modified.id,
				name: modified.name,
				type: 'tags',
				status: 'modified',
				location: options.direction === 'push' ? 'local' : 'remote',
				conflict: true,
				file: getTagsPath(this.gitFolder),
				updatedAt: lastUpdatedDate.toISOString(),
			});
		}

		for (const remoteTagMapping of tagMappingsRemote.mappings) {
			const isMissing = tagMappingsLocal.mappings.findIndex(
				(local) =>
					local.tagId === remoteTagMapping.tagId &&
					local.workflowId === remoteTagMapping.workflowId,
			);
			if (isMissing === -1) {
				mappingsMissingInLocalCount += 1;
				if (collectVerbose) {
					mappingsMissingInLocal.push(remoteTagMapping);
				}
			}
		}

		for (const localTagMapping of tagMappingsLocal.mappings) {
			const isMissing = tagMappingsRemote.mappings.findIndex(
				(remote) =>
					remote.tagId === localTagMapping.tagId &&
					remote.workflowId === localTagMapping.workflowId,
			);
			if (isMissing === -1) {
				mappingsMissingInRemoteCount += 1;
				if (collectVerbose) {
					mappingsMissingInRemote.push(localTagMapping);
				}
			}
		}

		// If only mappings changed (not tags themselves), we still need to mark the tags file as modified
		const hasMappingChanges = mappingsMissingInLocalCount > 0 || mappingsMissingInRemoteCount > 0;
		const hasTagChanges =
			tagsMissingInLocalCount > 0 || tagsMissingInRemoteCount > 0 || tagsModifiedInEitherCount > 0;

		if (hasMappingChanges && !hasTagChanges) {
			// Pulling deletes local mappings that don't exist remotely, so mark as conflict
			const isConflict = options.direction === 'pull' && mappingsMissingInRemoteCount > 0;

			sourceControlledFiles.push({
				id: 'tags',
				name: 'Workflow Tags',
				type: 'tags',
				status: 'modified',
				location: options.direction === 'push' ? 'local' : 'remote',
				conflict: isConflict,
				file: getTagsPath(this.gitFolder),
				updatedAt: lastUpdatedDate.toISOString(),
			});
		}

		return {
			files: sourceControlledFiles,
			verbose: {
				tagsMissingInLocal,
				tagsMissingInRemote,
				tagsModifiedInEither,
				mappingsMissingInLocal,
				mappingsMissingInRemote,
			},
		};
	}

	private async getStatusFoldersMapping(
		options: SourceControlGetStatus,
		context: SourceControlContext,
		collectVerbose: boolean,
		prefetchedRemoteFolders: { folders: ExportableFolder[] },
	) {
		const sourceControlledFiles: SourceControlledFile[] = [];
		const lastUpdatedFolder = await this.folderRepository.find({
			order: { updatedAt: 'DESC' },
			take: 1,
			select: ['updatedAt'],
		});

		const lastUpdatedDate = lastUpdatedFolder[0]?.updatedAt ?? new Date();

		const foldersMappingsRemote = prefetchedRemoteFolders;
		const foldersMappingsLocal =
			await this.sourceControlImportService.getLocalFoldersAndMappingsFromDb(context);

		const foldersMissingInLocal: ExportableFolder[] = [];
		const foldersMissingInRemote: ExportableFolder[] = [];

		const allTeamProjects = await this.sourceControlImportService.getLocalTeamProjectsFromDb();

		const foldersModifiedInEither: ExportableFolder[] = [];

		for (const remoteFolder of foldersMappingsRemote.folders) {
			if (foldersMappingsLocal.folders.findIndex((local) => local.id === remoteFolder.id) === -1) {
				if (collectVerbose) {
					foldersMissingInLocal.push(remoteFolder);
				}
				sourceControlledFiles.push({
					id: remoteFolder.id,
					name: remoteFolder.name,
					type: 'folders',
					status: options.direction === 'push' ? 'deleted' : 'created',
					location: options.direction === 'push' ? 'local' : 'remote',
					conflict: false,
					file: getFoldersPath(this.gitFolder),
					updatedAt: lastUpdatedDate.toISOString(),
				});
			}
		}

		for (const localFolder of foldersMappingsLocal.folders) {
			if (
				foldersMappingsRemote.folders.findIndex((remote) => remote.id === localFolder.id) === -1
			) {
				if (collectVerbose) {
					foldersMissingInRemote.push(localFolder);
				}
				sourceControlledFiles.push({
					id: localFolder.id,
					name: localFolder.name,
					type: 'folders',
					status: options.direction === 'push' ? 'created' : 'deleted',
					location: options.direction === 'push' ? 'local' : 'remote',
					conflict: options.direction === 'push' ? false : true,
					file: getFoldersPath(this.gitFolder),
					updatedAt: lastUpdatedDate.toISOString(),
				});
			}
		}

		const teamProjectsById = new Map(allTeamProjects.map((project) => [project.id, project]));
		for (const localFolder of foldersMappingsLocal.folders) {
			const localHomeProject = teamProjectsById.get(localFolder.homeProjectId);

			const mismatchingIds = foldersMappingsRemote.folders.find((remote) => {
				const remoteHomeProject = teamProjectsById.get(remote.homeProjectId);

				const localOwner = localHomeProject
					? {
							type: 'team' as const,
							projectId: localHomeProject.id,
							projectName: localHomeProject.name,
						}
					: undefined;

				const remoteOwner = remoteHomeProject
					? {
							type: 'team' as const,
							projectId: remoteHomeProject?.id,
							projectName: remoteHomeProject?.name,
						}
					: undefined;

				const ownerChanged = hasOwnerChanged(localOwner, remoteOwner);

				return (
					remote.id === localFolder.id &&
					(remote.name !== localFolder.name ||
						remote.parentFolderId !== localFolder.parentFolderId ||
						ownerChanged)
				);
			});

			if (!mismatchingIds) {
				continue;
			}

			const modified = options.preferLocalVersion ? localFolder : mismatchingIds;
			if (collectVerbose) {
				foldersModifiedInEither.push(modified);
			}
			sourceControlledFiles.push({
				id: modified.id,
				name: modified.name,
				type: 'folders',
				status: 'modified',
				location: options.direction === 'push' ? 'local' : 'remote',
				conflict: true,
				file: getFoldersPath(this.gitFolder),
				updatedAt: lastUpdatedDate.toISOString(),
			});
		}

		return {
			files: sourceControlledFiles,
			verbose: {
				foldersMissingInLocal,
				foldersMissingInRemote,
				foldersModifiedInEither,
			},
		};
	}

	private async getStatusProjects(
		options: SourceControlGetStatus,
		context: SourceControlContext,
		collectVerbose: boolean,
	) {
		const sourceControlledFiles: SourceControlledFile[] = [];
		const projectsRemote =
			await this.sourceControlImportService.getRemoteProjectsFromFiles(context);
		const projectsLocal = await this.sourceControlImportService.getLocalTeamProjectsFromDb(context);

		let outOfScopeProjects: ExportableProjectWithFileName[] = [];

		if (!context.hasAccessToAllProjects()) {
			// we need to query for all projects in the DB to hide possible deletions,
			// when a project went out of scope locally
			outOfScopeProjects = await this.sourceControlImportService.getLocalTeamProjectsFromDb();
			outOfScopeProjects = outOfScopeProjects.filter(
				(project) => !projectsLocal.some((local) => local.id === project.id),
			);
		}

		const projectsMissingInLocal: ExportableProjectWithFileName[] = [];

		// BACKWARD COMPATIBILITY: When there are no remote projects we can't safely delete local projects
		// because we don't know if it's the first pull or if all team projects have been removed
		// As a downside this means that it's not possible to delete all team projects via source control sync
		const areRemoteProjectsEmpty = projectsRemote.length === 0;
		const projectsMissingInRemote: ExportableProjectWithFileName[] = [];

		const projectsModifiedInEither: ExportableProjectWithFileName[] = [];
		const projectLocalIds = new Set(projectsLocal.map((localProject) => localProject.id));
		const projectRemoteById = new Map(
			projectsRemote.map((remoteProject) => [remoteProject.id, remoteProject]),
		);
		const outOfScopeProjectIds = new Set(outOfScopeProjects.map((outOfScope) => outOfScope.id));

		const mapExportableProjectWithFileNameToSourceControlledFile = ({
			project,
			status,
			conflict,
		}: {
			project: ExportableProjectWithFileName;
			status: SourceControlledFile['status'];
			conflict: boolean;
		}): SourceControlledFile => {
			return {
				id: project.id,
				name: project.name ?? 'Project',
				type: 'project',
				status,
				location: options.direction === 'push' ? 'local' : 'remote',
				conflict,
				file: project.filename,
				updatedAt: new Date().toISOString(),
				owner: {
					type: project.owner.type,
					projectId: project.owner.teamId,
					projectName: project.owner.teamName,
				},
			};
		};

		for (const remoteProject of projectsRemote) {
			if (!projectLocalIds.has(remoteProject.id) && !outOfScopeProjectIds.has(remoteProject.id)) {
				if (collectVerbose) {
					projectsMissingInLocal.push(remoteProject);
				}
				sourceControlledFiles.push(
					mapExportableProjectWithFileNameToSourceControlledFile({
						project: remoteProject,
						status: options.direction === 'push' ? 'deleted' : 'created',
						conflict: false,
					}),
				);
			}
		}

		if (!(options.direction === 'pull' && areRemoteProjectsEmpty)) {
			for (const localProject of projectsLocal) {
				if (!projectRemoteById.has(localProject.id)) {
					if (collectVerbose) {
						projectsMissingInRemote.push(localProject);
					}
					sourceControlledFiles.push(
						mapExportableProjectWithFileNameToSourceControlledFile({
							project: localProject,
							status: options.direction === 'push' ? 'created' : 'deleted',
							conflict: options.direction === 'push' ? false : true,
						}),
					);
				}
			}
		}

		projectsLocal.forEach((localProject) => {
			const remoteProjectWithSameId = projectRemoteById.get(localProject.id);

			if (!remoteProjectWithSameId) {
				return;
			}

			if (this.isProjectModified(localProject, remoteProjectWithSameId)) {
				let name =
					(options?.preferLocalVersion ? localProject?.name : remoteProjectWithSameId?.name) ??
					'Project';

				if (
					localProject.name &&
					remoteProjectWithSameId?.name &&
					localProject.name !== remoteProjectWithSameId.name
				) {
					name = options?.preferLocalVersion
						? `${localProject.name} (Remote: ${remoteProjectWithSameId.name})`
						: `${remoteProjectWithSameId.name} (Local: ${localProject.name})`;
				}

				const modified = {
					...localProject,
					name,
					description: options.preferLocalVersion
						? localProject.description
						: remoteProjectWithSameId.description,
					icon: options.preferLocalVersion ? localProject.icon : remoteProjectWithSameId.icon,
					variableStubs: options.preferLocalVersion
						? localProject.variableStubs
						: remoteProjectWithSameId.variableStubs,
				};
				if (collectVerbose) {
					projectsModifiedInEither.push(modified);
				}
				sourceControlledFiles.push(
					mapExportableProjectWithFileNameToSourceControlledFile({
						project: modified,
						status: 'modified',
						conflict: true,
					}),
				);
			}
		});

		return {
			files: sourceControlledFiles,
			verbose: {
				projectsRemote,
				projectsLocal,
				projectsMissingInLocal,
				projectsMissingInRemote,
				projectsModifiedInEither,
			},
		};
	}

	private areVariablesEqual(
		localVariables: ExportableProjectWithFileName['variableStubs'],
		remoteVariables: ExportableProjectWithFileName['variableStubs'],
	): boolean {
		if (Array.isArray(localVariables) !== Array.isArray(remoteVariables)) {
			return false;
		}

		if (localVariables?.length !== remoteVariables?.length) {
			return false;
		}

		const sortedLocalVars = [...(localVariables ?? [])].sort((a, b) => a.key.localeCompare(b.key));
		const sortedRemoteVars = [...(remoteVariables ?? [])].sort((a, b) =>
			a.key.localeCompare(b.key),
		);

		return sortedLocalVars.every((localVar, index) => {
			const remoteVar = sortedRemoteVars[index];
			return localVar.key === remoteVar.key && localVar.type === remoteVar.type;
		});
	}

	private isProjectModified(
		local: ExportableProjectWithFileName,
		remote: ExportableProjectWithFileName,
	): boolean {
		const isIconModified = this.isProjectIconModified({
			localIcon: local.icon,
			remoteIcon: remote.icon,
		});

		return (
			isIconModified ||
			remote.type !== local.type ||
			remote.name !== local.name ||
			remote.description !== local.description ||
			!this.areVariablesEqual(local.variableStubs, remote.variableStubs)
		);
	}

	private isProjectIconModified({
		localIcon,
		remoteIcon,
	}: {
		localIcon: ExportableProjectWithFileName['icon'];
		remoteIcon: ExportableProjectWithFileName['icon'];
	}): boolean {
		// If one has an icon and the other doesn't, it's modified
		if (!remoteIcon && !!localIcon) return true;
		if (!!remoteIcon && !localIcon) return true;

		// If both have icons, compare their properties
		if (!!remoteIcon && !!localIcon) {
			return remoteIcon.type !== localIcon.type || remoteIcon.value !== localIcon.value;
		}

		// Neither has an icon, so no modification
		return false;
	}
}
