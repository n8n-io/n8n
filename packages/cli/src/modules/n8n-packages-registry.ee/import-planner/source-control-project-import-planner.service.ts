import type { SourceControlledFile } from '@n8n/api-types';
import { CredentialsRepository, WorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { DataTableRepository } from '@/modules/data-table/data-table.repository';
import { CredentialRequirementsExtractor } from '@/modules/n8n-packages/entities/credential/credential-requirements.extractor';

import type {
	DependencyBlockingIssue,
	ImportValidation,
	ProjectImportPlan,
	WorkflowDependencyEdge,
} from './import-planner.types';
import {
	FutureResourceState,
	LocalResourceSet,
	SelectedResourceIndex,
	PROJECT_IMPORT_RESOURCE_TYPES,
	isImportResourceType,
	resourceKey,
	resourceRef,
} from './import-planner.types';
import { SourceControlRemoteResourceReader } from './source-control-remote-resource-reader.service';
import { WorkflowDependencyExtractor } from './workflow-dependency-extractor';
import { SourceControlService } from '../../source-control.ee/source-control.service.ee';
import type {
	SourceControlGetStatus,
	SourceControlGetStatusVerboseResult,
} from '../../source-control.ee/types/source-control-get-status';

@Service()
export class SourceControlProjectImportPlanner {
	constructor(
		private readonly sourceControlService: SourceControlService,
		private readonly remoteResourceReader: SourceControlRemoteResourceReader,
		private readonly workflowDependencyExtractor: WorkflowDependencyExtractor,
		private readonly credentialRequirementsExtractor: CredentialRequirementsExtractor,
		private readonly workflowRepository: WorkflowRepository,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly dataTableRepository: DataTableRepository,
	) {}

	async planProjectImport(user: User, projectId: string): Promise<ProjectImportPlan> {
		const status = await this.getSourceControlStatus(user);
		const selectedChanges = this.selectChangesForProject(status, projectId);
		const selectedResources = new SelectedResourceIndex(selectedChanges);
		const remoteResources = await this.remoteResourceReader.readSelectedResources(selectedChanges);
		const localResources = await this.loadLocalResources();
		const futureState = this.buildFutureState(selectedChanges, localResources);

		const extractionResults = [...remoteResources.workflows.values()].map((workflow) =>
			this.workflowDependencyExtractor.extract(workflow),
		);
		const dependencyGraph = extractionResults.flatMap(({ edges }) => edges);
		const validation = this.validateDependencies({
			graph: dependencyGraph.filter((edge) => edge.kind !== 'credentialId'),
			selectedResources,
			futureState,
			status: status.sourceControlledFiles,
		});
		validation.warnings.push(...extractionResults.flatMap(({ warnings }) => warnings));
		validation.blockingIssues.push(
			...this.validateCredentialRequirements([...remoteResources.workflows.values()], futureState),
		);

		return {
			projectId,
			selectedChanges,
			remoteResources,
			dependencyGraph,
			validation,
			canApply: validation.blockingIssues.length === 0,
		};
	}

	private async getSourceControlStatus(user: User): Promise<SourceControlGetStatusVerboseResult> {
		const options = {
			direction: 'pull',
			preferLocalVersion: false,
			verbose: true,
		} satisfies SourceControlGetStatus;

		const status = await this.sourceControlService.getStatus(user, options);
		if (!Array.isArray(status)) return status;

		throw new UnexpectedError('Expected verbose source control status for project import');
	}

	private selectChangesForProject(
		status: SourceControlGetStatusVerboseResult,
		projectId: string,
	): SourceControlledFile[] {
		const folderProjectIds = this.buildFolderProjectLookup(status);
		const changes = status.sourceControlledFiles;
		const projectChanges = changes.filter(
			(change) =>
				change.owner?.projectId === projectId ||
				(change.type === 'folders' && folderProjectIds.get(change.id) === projectId),
		);

		if (projectChanges.length === 0) {
			throw new BadRequestError(
				`No importable changes found for project ${projectId}. Available groups: ${JSON.stringify(
					this.summarizeGroups(changes),
				)}`,
			);
		}

		const supportedChanges = projectChanges.filter((change) =>
			PROJECT_IMPORT_RESOURCE_TYPES.has(change.type),
		);

		if (supportedChanges.length === 0) {
			throw new BadRequestError(
				`No supported importable changes found for project ${projectId}. Supported types: ${[
					...PROJECT_IMPORT_RESOURCE_TYPES,
				].join(', ')}. Found types: ${[
					...new Set(projectChanges.map((change) => change.type)),
				].join(', ')}`,
			);
		}

		return supportedChanges;
	}

	private buildFolderProjectLookup(
		status: SourceControlGetStatusVerboseResult,
	): Map<string, string> {
		const folders = [
			...status.foldersMissingInLocal,
			...status.foldersMissingInRemote,
			...status.foldersModifiedInEither,
		];

		return new Map(folders.map((folder) => [folder.id, folder.homeProjectId]));
	}

	private async loadLocalResources(): Promise<LocalResourceSet> {
		const [workflows, credentials, dataTables] = await Promise.all([
			this.workflowRepository.find({ select: ['id'] }),
			this.credentialsRepository.find({ select: ['id'] }),
			this.dataTableRepository.find({ select: ['id'] }),
		]);

		return LocalResourceSet.from([
			...workflows.map(({ id }) => resourceRef('workflow', id)),
			...credentials.map(({ id }) => resourceRef('credential', id)),
			...dataTables.map(({ id }) => resourceRef('datatable', id)),
		]);
	}

	private buildFutureState(
		selectedChanges: SourceControlledFile[],
		localResources: LocalResourceSet,
	): FutureResourceState {
		const future = new FutureResourceState(localResources);

		for (const change of selectedChanges) {
			if (!isImportResourceType(change.type)) continue;

			const ref = resourceRef(change.type, change.id);
			if (change.status === 'deleted') {
				future.markDeleted(ref);
			} else {
				future.upsert(ref);
			}
		}

		return future;
	}

	private validateDependencies({
		graph,
		selectedResources,
		futureState,
		status,
	}: {
		graph: WorkflowDependencyEdge[];
		selectedResources: SelectedResourceIndex;
		futureState: FutureResourceState;
		status: SourceControlledFile[];
	}): ImportValidation {
		const blockingIssues = new Map<string, DependencyBlockingIssue>();
		const statusByResource = this.indexStatus(status);

		for (const edge of graph) {
			const target = edge.to;

			if (futureState.exists(target)) continue;

			let issue: DependencyBlockingIssue;
			if (futureState.wasDeleted(target)) {
				issue = {
					type: 'dependency-deleted-remotely',
					source: edge.from,
					target,
					dependencyKind: edge.kind,
				};
			} else if (statusByResource.has(resourceKey(target)) && !selectedResources.has(target)) {
				issue = {
					type: 'dependency-not-selected',
					source: edge.from,
					target,
					dependencyKind: edge.kind,
				};
			} else {
				issue = {
					type: 'dependency-missing',
					source: edge.from,
					target,
					dependencyKind: edge.kind,
				};
			}

			blockingIssues.set(this.blockingIssueKey(issue), issue);
		}

		return { blockingIssues: [...blockingIssues.values()], warnings: [] };
	}

	private validateCredentialRequirements(
		workflows: Array<Parameters<CredentialRequirementsExtractor['extract']>[0]>,
		futureState: FutureResourceState,
	): DependencyBlockingIssue[] {
		const blockingIssues = new Map<string, DependencyBlockingIssue>();

		for (const requirement of workflows.flatMap((workflow) =>
			this.credentialRequirementsExtractor.extract(workflow),
		)) {
			const credentialRef = resourceRef('credential', requirement.credentialId);
			if (futureState.exists(credentialRef)) continue;

			const issue: DependencyBlockingIssue = {
				type: 'credential-unresolved',
				kind: 'not_found',
				sourceId: requirement.credentialId,
				usedByWorkflows: [requirement.workflowId],
			};
			blockingIssues.set(this.blockingIssueKey(issue), issue);
		}

		return [...blockingIssues.values()];
	}

	private indexStatus(status: SourceControlledFile[]): Map<string, SourceControlledFile> {
		const byResource = new Map<string, SourceControlledFile>();

		for (const change of status) {
			if (!isImportResourceType(change.type)) continue;
			byResource.set(resourceKey(resourceRef(change.type, change.id)), change);
		}

		return byResource;
	}

	private blockingIssueKey(issue: DependencyBlockingIssue): string {
		if (issue.type === 'credential-unresolved') {
			return `${issue.type}:${issue.sourceId}:${issue.usedByWorkflows.join(',')}`;
		}

		return `${issue.type}:${resourceKey(issue.source)}:${resourceKey(issue.target)}:${issue.dependencyKind}`;
	}

	private summarizeGroups(changes: SourceControlledFile[]) {
		const groups = new Map<
			string,
			{
				id: string | null;
				name: string;
				type: 'global' | 'personal' | 'team';
				changeTypes: Set<SourceControlledFile['type']>;
			}
		>();

		for (const change of changes) {
			const id = change.owner?.projectId ?? null;
			const groupKey = id ?? 'global';
			const group = groups.get(groupKey) ?? {
				id,
				name: change.owner?.projectName ?? 'Global changes',
				type: change.owner?.type ?? 'global',
				changeTypes: new Set<SourceControlledFile['type']>(),
			};
			group.changeTypes.add(change.type);
			groups.set(groupKey, group);
		}

		return [...groups.values()].map(({ changeTypes, ...group }) => ({
			...group,
			changeTypes: [...changeTypes],
		}));
	}
}
