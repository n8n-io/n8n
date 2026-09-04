import type { User, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { WorkflowSerializer } from './workflow.serializer';
import { applyWorkflowVersionPolicy, needsActiveVersion } from './workflow-version-policy';
import type { PackageWriter } from '../../io/package-writer';
import type { WorkflowVersionPolicy } from '../../n8n-packages.types';
import { UniqueFilenameAllocator } from '../../io/unique-filename-allocator';
import type { ManifestEntry } from '../../spec/manifest.schema';
import { CredentialRequirementsExtractor } from '../credential/credential-requirements.extractor';
import type { WorkflowCredentialRequirement } from '../credential/credential.types';
import { DataTableRequirementsExtractor } from '../data-table/data-table-requirements.extractor';
import type { WorkflowDataTableRequirement } from '../data-table/data-table.types';
import type { WorkflowNodeTypeSource } from './node-type-usage';
import { assertEveryRequestedEntityAccessible } from '../package-export.errors';
import type { WorkflowExportRequirements } from '../requirements.types';
import { TagRequirementsExtractor } from '../tag/tag-requirements.extractor';
import type { WorkflowTagUsage } from '../tag/tag.types';
import { VariableRequirementsExtractor } from '../variable/variable-requirements.extractor';
import type { WorkflowVariableRequirement } from '../variable/variable.types';

export interface WorkflowExportRequest {
	user: User;
	workflowIds: string[];
	writer: PackageWriter;
	includeTags: boolean;
	workflowVersionPolicy: WorkflowVersionPolicy;

	// Directory the workflow is written under. e.g. folders/{folderId}/
	basePrefix?: string;

	/**
	 * Write and report only these workflows. Every id in `workflowIds` still
	 * claims its file name, so duplicate-name suffixes match a full export.
	 */
	selectedWorkflowIds?: ReadonlySet<string>;
}

export interface WorkflowExportResult {
	entries: ManifestEntry[];
	requirements: WorkflowExportRequirements;
}

interface FilenameClaim {
	id: string;
	name: string;
	/** Set only for workflows that are written to the package. */
	workflow?: WorkflowEntity;
}

@Service()
export class WorkflowExporter {
	constructor(
		private readonly workflowFinder: WorkflowFinderService,
		private readonly workflowSerializer: WorkflowSerializer,
		private readonly credentialRequirementsExtractor: CredentialRequirementsExtractor,
		private readonly dataTableRequirementsExtractor: DataTableRequirementsExtractor,
		private readonly variableRequirementsExtractor: VariableRequirementsExtractor,
		private readonly tagRequirementsExtractor: TagRequirementsExtractor,
	) {}

	async export(request: WorkflowExportRequest): Promise<WorkflowExportResult> {
		const { selectedWorkflowIds } = request;
		const selectedIds = selectedWorkflowIds
			? request.workflowIds.filter((id) => selectedWorkflowIds.has(id))
			: request.workflowIds;

		const workflows = await this.workflowFinder.findWorkflowsByIdsForUser(
			selectedIds,
			request.user,
			['workflow:export'],
			{
				includeParentFolder: true,
				includeTags: request.includeTags,
				includeActiveVersion: needsActiveVersion(request.workflowVersionPolicy),
			},
		);

		await assertEveryRequestedEntityAccessible(
			'workflow',
			selectedIds,
			workflows,
			async (ids) => await this.workflowFinder.findExistingWorkflowIds(ids),
		);

		const claims = await this.collectFilenameClaims(
			request,
			applyWorkflowVersionPolicy(workflows, request.workflowVersionPolicy),
		);
		const entries: ManifestEntry[] = [];
		const credentials: WorkflowCredentialRequirement[] = [];
		const dataTables: WorkflowDataTableRequirement[] = [];
		const variables: WorkflowVariableRequirement[] = [];
		const tags: WorkflowTagUsage[] = [];
		const nodeTypes: WorkflowNodeTypeSource[] = [];
		const fileNames = new UniqueFilenameAllocator(
			request.basePrefix ? `${request.basePrefix}/workflows` : 'workflows',
			'workflow',
		);

		for (const { name, workflow } of claims) {
			const target = fileNames.allocate(name);
			if (!workflow) continue;

			const serialized = this.workflowSerializer.serialize(workflow, {
				includeTags: request.includeTags,
			});

			await request.writer.writeDirectory(target);
			await request.writer.writeFile(
				`${target}/workflow.json`,
				JSON.stringify(serialized, null, '\t'),
			);

			entries.push({
				id: workflow.id,
				name: workflow.name,
				target,
			});

			credentials.push(...this.credentialRequirementsExtractor.extract(workflow));
			dataTables.push(...this.dataTableRequirementsExtractor.extract(workflow));
			variables.push(...this.variableRequirementsExtractor.extract(workflow));
			tags.push(...this.tagRequirementsExtractor.extract(workflow));
			nodeTypes.push({ workflowId: workflow.id, nodes: workflow.nodes ?? [] });
		}

		return { entries, requirements: { credentials, dataTables, variables, tags, nodeTypes } };
	}

	/**
	 * Every requested id claims its file name in request order, so a partial export
	 * gets the same duplicate-name suffixes as a full one. Only selected workflows
	 * carry an entity and are written; unselected siblings claim a name by id only.
	 */
	private async collectFilenameClaims(
		request: WorkflowExportRequest,
		workflows: WorkflowEntity[],
	): Promise<FilenameClaim[]> {
		const { selectedWorkflowIds } = request;
		// Unselected siblings are never loaded, so a version policy that skips
		// workflows cannot skip them here. Suffix parity is exact for `latest`.
		const unselectedNames = selectedWorkflowIds
			? await this.workflowFinder.findWorkflowNamesByIds(
					request.workflowIds.filter((id) => !selectedWorkflowIds.has(id)),
				)
			: new Map<string, string>();

		const workflowsById = new Map(workflows.map((workflow) => [workflow.id, workflow]));
		const seen = new Set<string>();
		const claims: FilenameClaim[] = [];

		for (const id of request.workflowIds) {
			if (seen.has(id)) continue;
			seen.add(id);

			const workflow = workflowsById.get(id);
			if (workflow) {
				claims.push({ id, name: workflow.name, workflow });
				continue;
			}

			const name = unselectedNames.get(id);
			if (name !== undefined) claims.push({ id, name });
		}

		return claims;
	}
}
