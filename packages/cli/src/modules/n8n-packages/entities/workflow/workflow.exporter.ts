import type { User, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { WorkflowSerializer } from './workflow.serializer';
import { applyWorkflowVersionPolicy, needsActiveVersion } from './workflow-version-policy';
import { createManifestEntry, packageDirectory } from '../../io/manifest-entry';
import type { PackageWriter } from '../../io/package-writer';
import type { WorkflowVersionPolicy } from '../../n8n-packages.types';
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
}

export interface WorkflowExportResult {
	entries: ManifestEntry[];
	requirements: WorkflowExportRequirements;
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
		const workflows = await this.workflowFinder.findWorkflowsByIdsForUser(
			request.workflowIds,
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
			request.workflowIds,
			workflows,
			async (ids) => await this.workflowFinder.findExistingWorkflowIds(ids),
		);

		const workflowsForExport = this.orderWorkflowsByRequest(
			request.workflowIds,
			applyWorkflowVersionPolicy(workflows, request.workflowVersionPolicy),
		);
		const entries: ManifestEntry[] = [];
		const credentials: WorkflowCredentialRequirement[] = [];
		const dataTables: WorkflowDataTableRequirement[] = [];
		const variables: WorkflowVariableRequirement[] = [];
		const tags: WorkflowTagUsage[] = [];
		const nodeTypes: WorkflowNodeTypeSource[] = [];
		const workflowsDir = packageDirectory('workflows', request.basePrefix);

		for (const workflow of workflowsForExport) {
			const entry = createManifestEntry('workflows', workflowsDir, workflow);
			const serialized = this.workflowSerializer.serialize(workflow, {
				includeTags: request.includeTags,
			});

			await request.writer.writeDirectory(entry.target);
			await request.writer.writeFile(
				`${entry.target}/workflow.json`,
				JSON.stringify(serialized, null, '\t'),
			);

			entries.push(entry);

			credentials.push(...this.credentialRequirementsExtractor.extract(workflow));
			dataTables.push(...this.dataTableRequirementsExtractor.extract(workflow));
			variables.push(...this.variableRequirementsExtractor.extract(workflow));
			tags.push(...this.tagRequirementsExtractor.extract(workflow));
			nodeTypes.push({ workflowId: workflow.id, nodes: workflow.nodes ?? [] });
		}

		return { entries, requirements: { credentials, dataTables, variables, tags, nodeTypes } };
	}

	private orderWorkflowsByRequest(
		workflowIds: string[],
		workflows: WorkflowEntity[],
	): WorkflowEntity[] {
		const workflowsById = new Map(workflows.map((workflow) => [workflow.id, workflow]));
		const seen = new Set<string>();
		const orderedWorkflows: WorkflowEntity[] = [];

		for (const workflowId of workflowIds) {
			if (seen.has(workflowId)) continue;

			const workflow = workflowsById.get(workflowId);
			if (!workflow) continue;

			seen.add(workflowId);
			orderedWorkflows.push(workflow);
		}

		return orderedWorkflows;
	}
}
