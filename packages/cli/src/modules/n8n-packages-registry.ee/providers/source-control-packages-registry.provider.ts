import type { SourceControlledFile } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IWorkflowBase } from 'n8n-workflow';

import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import type { IWorkflowToImport } from '@/interfaces';
import { WorkflowIndexService } from '@/modules/workflow-index/workflow-index.service';

import { GitFolderReaderService } from '../git-resource-reader/git-folder-reader.service';
import { SourceControlProjectImportPlanner } from '../import-planner/source-control-project-import-planner.service';
import type {
	InitializedN8nPackagesRegistry,
	N8nPackagesRegistryConnection,
	N8nPackagesRegistryProjectGroup,
	N8nPackagesRegistryProvider,
} from '../n8n-packages-registry.types';
import { SourceControlImportService } from '../../source-control.ee/source-control-import.service.ee';
import {
	getDeletedResources,
	getNonDeletedResources,
} from '../../source-control.ee/source-control-resource-helper';
import { SourceControlService } from '../../source-control.ee/source-control.service.ee';
import type {
	SourceControlGetStatus,
	SourceControlGetStatusVerboseResult,
} from '../../source-control.ee/types/source-control-get-status';

type ProjectGroupIdentifier = N8nPackagesRegistryProjectGroup['project'] & {
	groupId: string;
};

type FolderProjectLookup = Map<string, string>;

type ProjectGroupLookup = Map<string, ProjectGroupIdentifier>;

@Service()
export class SourceControlPackagesRegistryProvider implements N8nPackagesRegistryProvider {
	readonly type = 'source-control' as const;

	constructor(
		private readonly gitFolderReaderService: GitFolderReaderService,
		private readonly sourceControlService: SourceControlService,
		private readonly sourceControlImportService: SourceControlImportService,
		private readonly sourceControlProjectImportPlanner: SourceControlProjectImportPlanner,
		private readonly workflowIndexService: WorkflowIndexService,
	) {}

	async init(connection: N8nPackagesRegistryConnection): Promise<InitializedN8nPackagesRegistry> {
		return {
			connection,
			listProjects: async () => await this.findAllProjects(),
			getImportableChangesGroupedByProject: async (user) =>
				await this.findImportableChangesGroupedByProject(user),
			importProjectChanges: async (user, projectId) =>
				await this.importProjectChanges(user, projectId),
		};
	}

	private async findAllProjects() {
		return await this.gitFolderReaderService.findAllResources({ resourceType: 'project' });
	}

	private async findImportableChangesGroupedByProject(
		user: User,
	): Promise<N8nPackagesRegistryProjectGroup[]> {
		const options = {
			direction: 'pull',
			preferLocalVersion: false,
			verbose: true,
		} satisfies SourceControlGetStatus;

		const status = await this.sourceControlService.getStatus(user, options);
		const changes = Array.isArray(status) ? status : status.sourceControlledFiles;
		const folderProjectIds = Array.isArray(status)
			? new Map<string, string>()
			: this.buildFolderProjectLookup(status);
		const projectsById = Array.isArray(status)
			? new Map<string, ProjectGroupIdentifier>()
			: this.buildProjectGroupLookup(status);
		const groupsByProjectId = new Map<string, N8nPackagesRegistryProjectGroup>();

		for (const change of changes) {
			const project = this.getProjectGroupIdentifier(change, folderProjectIds, projectsById);
			const existingGroup = groupsByProjectId.get(project.groupId);

			if (existingGroup) {
				existingGroup.changes.push(change);
				continue;
			}

			groupsByProjectId.set(project.groupId, {
				project: {
					id: project.id,
					name: project.name,
					type: project.type,
				},
				changes: [change],
			});
		}

		return [...groupsByProjectId.values()].sort((a, b) =>
			a.project.name.localeCompare(b.project.name),
		);
	}

	private buildFolderProjectLookup(
		status: SourceControlGetStatusVerboseResult,
	): FolderProjectLookup {
		const folders = [
			...status.foldersMissingInLocal,
			...status.foldersMissingInRemote,
			...status.foldersModifiedInEither,
		];

		return new Map(folders.map((folder) => [folder.id, folder.homeProjectId]));
	}

	private buildProjectGroupLookup(status: SourceControlGetStatusVerboseResult): ProjectGroupLookup {
		const projects = [
			...status.projectsRemote,
			...status.projectsLocal,
			...status.projectsMissingInLocal,
			...status.projectsMissingInRemote,
			...status.projectsModifiedInEither,
		];

		return new Map(
			projects.map((project) => [
				project.id,
				{
					groupId: project.id,
					id: project.id,
					name: project.name,
					type: 'team' as const,
				},
			]),
		);
	}

	private async importProjectChanges(
		user: User,
		projectId: string,
	): Promise<SourceControlledFile[]> {
		const plan = await this.sourceControlProjectImportPlanner.planProjectImport(user, projectId);

		if (!plan.canApply) {
			throw new UnprocessableRequestError('Import has unresolved dependencies', undefined, {
				issues: plan.validation.blockingIssues,
				warnings: plan.validation.warnings,
			});
		}

		const imported = await this.importSelectedWorkfolderChanges(user, plan.selectedChanges);

		for (const workflow of plan.remoteResources.workflows.values()) {
			await this.workflowIndexService.updateIndexForDraft(this.toIndexableWorkflow(workflow));
		}

		return imported;
	}

	private toIndexableWorkflow(workflow: IWorkflowToImport): IWorkflowBase {
		const importedAt = new Date();

		return {
			...workflow,
			createdAt: importedAt,
			updatedAt: importedAt,
		};
	}

	private async importSelectedWorkfolderChanges(
		user: User,
		statusResult: SourceControlledFile[],
	): Promise<SourceControlledFile[]> {
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
		const workflowImportResults =
			await this.sourceControlImportService.importWorkflowFromWorkFolder(
				workflowsToBeImported,
				user.id,
			);

		const statusByWorkflowId = new Map(
			statusResult.filter((item) => item.type === 'workflow').map((item) => [item.id, item]),
		);

		for (const { id, publishingError } of workflowImportResults) {
			if (!publishingError) continue;

			const statusItem = statusByWorkflowId.get(id);
			if (statusItem) {
				statusItem.publishingError = publishingError;
			}
		}

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

		const dataTableCandidates = getNonDeletedResources(statusResult, 'datatable');
		if (dataTableCandidates.length > 0) {
			await this.sourceControlImportService.importDataTablesFromWorkFolder(
				dataTableCandidates,
				user.id,
			);
		}

		const dataTablesToBeDeleted = getDeletedResources(statusResult, 'datatable');
		await this.sourceControlImportService.deleteDataTablesNotInWorkFolder(dataTablesToBeDeleted);

		const foldersToBeDeleted = getDeletedResources(statusResult, 'folders');
		await this.sourceControlImportService.deleteFoldersNotInWorkfolder(foldersToBeDeleted);

		const projectsToBeDeleted = getDeletedResources(statusResult, 'project');
		await this.sourceControlImportService.deleteTeamProjectsNotInWorkfolder(projectsToBeDeleted);

		return statusResult;
	}

	private getProjectGroupIdentifier(
		change: SourceControlledFile,
		folderProjectIds: FolderProjectLookup,
		projectsById: ProjectGroupLookup,
	): ProjectGroupIdentifier {
		if (change.owner) {
			return {
				groupId: change.owner.projectId,
				id: change.owner.projectId,
				name: change.owner.projectName,
				type: change.owner.type,
			};
		}

		if (change.type === 'folders') {
			const projectId = folderProjectIds.get(change.id);
			const project = projectId ? projectsById.get(projectId) : undefined;

			if (project) {
				return project;
			}
		}

		return {
			groupId: 'global',
			id: null,
			name: 'Global changes',
			type: 'global',
		};
	}
}
