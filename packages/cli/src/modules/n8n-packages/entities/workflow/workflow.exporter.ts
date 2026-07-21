import type { User, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { WorkflowSerializer } from './workflow.serializer';
import type { PackageWriter } from '../../io/package-writer';
import { UniqueFilenameAllocator } from '../../io/unique-filename-allocator';
import type { ManifestEntry } from '../../spec/manifest.schema';
import { CredentialRequirementsExtractor } from '../credential/credential-requirements.extractor';
import type { WorkflowCredentialRequirement } from '../credential/credential.types';
import { DataTableRequirementsExtractor } from '../data-table/data-table-requirements.extractor';
import type { WorkflowDataTableRequirement } from '../data-table/data-table.types';
import { assertEveryRequestedEntityAccessible } from '../package-export.errors';
import type { WorkflowExportRequirements } from '../requirements.types';
import { VariableRequirementsExtractor } from '../variable/variable-requirements.extractor';
import type { WorkflowVariableRequirement } from '../variable/variable.types';

export interface WorkflowExportRequest {
	user: User;
	workflowIds: string[];
	writer: PackageWriter;

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
	) {}

	async export(request: WorkflowExportRequest): Promise<WorkflowExportResult> {
		const workflows = await this.workflowFinder.findWorkflowsByIdsForUser(
			request.workflowIds,
			request.user,
			['workflow:export'],
			{ includeParentFolder: true },
		);

		await assertEveryRequestedEntityAccessible(
			'workflow',
			request.workflowIds,
			workflows,
			async (ids) => await this.workflowFinder.findExistingWorkflowIds(ids),
		);

		const workflowsForExport = this.orderWorkflowsByRequest(request.workflowIds, workflows);
		const entries: ManifestEntry[] = [];
		const credentials: WorkflowCredentialRequirement[] = [];
		const dataTables: WorkflowDataTableRequirement[] = [];
		const variables: WorkflowVariableRequirement[] = [];
		const fileNames = new UniqueFilenameAllocator(
			request.basePrefix ? `${request.basePrefix}/workflows` : 'workflows',
			'workflow',
		);

		for (const workflow of workflowsForExport) {
			const target = fileNames.allocate(workflow.name);
			const serialized = this.workflowSerializer.serialize(workflow);

			request.writer.writeDirectory(target);
			request.writer.writeFile(`${target}/workflow.json`, JSON.stringify(serialized, null, '\t'));

			entries.push({
				id: workflow.id,
				name: workflow.name,
				target,
			});

			credentials.push(...this.credentialRequirementsExtractor.extract(workflow));
			dataTables.push(...this.dataTableRequirementsExtractor.extract(workflow));
			variables.push(...this.variableRequirementsExtractor.extract(workflow));
		}

		return { entries, requirements: { credentials, dataTables, variables } };
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
