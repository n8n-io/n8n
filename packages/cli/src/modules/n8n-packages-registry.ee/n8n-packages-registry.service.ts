import type { SourceControlledFile } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { GitFolderReaderService } from './git-resource-reader/git-folder-reader.service';
import { SourceControlImportService } from '../source-control.ee/source-control-import.service.ee';
import { SourceControlPreferencesService } from '../source-control.ee/source-control-preferences.service.ee';
import {
	getDeletedResources,
	getNonDeletedResources,
} from '../source-control.ee/source-control-resource-helper';
import { SourceControlService } from '../source-control.ee/source-control.service.ee';
import type { SourceControlGetStatus } from '../source-control.ee/types/source-control-get-status';

type SourceControlProjectGroup = {
	project: {
		id: string | null;
		name: string;
		type: 'team' | 'personal' | 'global';
	};
	changes: SourceControlledFile[];
};

type ProjectGroupIdentifier = SourceControlProjectGroup['project'] & {
	groupId: string;
};

const PROJECT_IMPORT_RESOURCE_TYPES = new Set<SourceControlledFile['type']>([
	'project',
	'workflow',
	'credential',
	'datatable',
]);

@Service()
export class N8nPackagesRegistryService {
	constructor(
		private readonly logger: Logger,
		private readonly sourceControlPreferencesService: SourceControlPreferencesService,
		private readonly gitFolderReaderService: GitFolderReaderService,
		private readonly sourceControlService: SourceControlService,
		private readonly sourceControlImportService: SourceControlImportService,
	) {}

	isConnected(): boolean {
		const isConnected = this.sourceControlPreferencesService.isSourceControlConnected();
		this.logger.info(`Source control is connected: ${isConnected}`);
		return isConnected;
	}

	/**
	 * @deprecated for now we'll try to re-use as much as possible the existing implemenation in the sources-control.ee module
	 */
	async findAllProjects() {
		return await this.gitFolderReaderService.findAllResources({ resourceType: 'project' });
	}

	async findImportableChangesGroupedByProject(user: User): Promise<SourceControlProjectGroup[]> {
		const options = {
			direction: 'pull',
			preferLocalVersion: false,
			verbose: false,
		} satisfies SourceControlGetStatus;

		const status = await this.sourceControlService.getStatus(user, options);
		const changes = Array.isArray(status) ? status : status.sourceControlledFiles;
		const groupsByProjectId = new Map<string, SourceControlProjectGroup>();

		for (const change of changes) {
			const project = this.getProjectGroupIdentifier(change);
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

	async importProjectChanges(user: User, projectId: string): Promise<SourceControlledFile[]> {
		const groups = await this.findImportableChangesGroupedByProject(user);
		const projectGroup = groups.find((group) => group.project.id === projectId);

		if (!projectGroup) {
			throw new BadRequestError(
				`No importable changes found for project ${projectId}. Available groups: ${JSON.stringify(
					this.summarizeGroups(groups),
				)}`,
			);
		}

		const changesToImport = projectGroup.changes.filter((change) =>
			PROJECT_IMPORT_RESOURCE_TYPES.has(change.type),
		);

		if (changesToImport.length === 0) {
			throw new BadRequestError(
				`No supported importable changes found for project ${projectId}. Supported types: ${[
					...PROJECT_IMPORT_RESOURCE_TYPES,
				].join(', ')}. Found types: ${[
					...new Set(projectGroup.changes.map((change) => change.type)),
				].join(', ')}`,
			);
		}

		return await this.importSelectedWorkfolderChanges(user, changesToImport);
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

		const projectsToBeDeleted = getDeletedResources(statusResult, 'project');
		await this.sourceControlImportService.deleteTeamProjectsNotInWorkfolder(projectsToBeDeleted);

		return statusResult;
	}

	private summarizeGroups(groups: SourceControlProjectGroup[]) {
		return groups.map((group) => ({
			id: group.project.id,
			name: group.project.name,
			type: group.project.type,
			changeTypes: [...new Set(group.changes.map((change) => change.type))],
		}));
	}

	private getProjectGroupIdentifier(change: SourceControlledFile): ProjectGroupIdentifier {
		if (change.owner) {
			return {
				groupId: change.owner.projectId,
				id: change.owner.projectId,
				name: change.owner.projectName,
				type: change.owner.type,
			};
		}

		return {
			groupId: 'global',
			id: null,
			name: 'Global changes',
			type: 'global',
		};
	}
}
