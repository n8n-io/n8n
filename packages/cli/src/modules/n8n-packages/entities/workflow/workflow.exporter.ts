import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { WorkflowSerializer } from './workflow.serializer';
import type { PackageWriter } from '../../io/package-writer';
import { UniqueFilenameAllocator } from '../../io/unique-filename-allocator';
import type { ManifestEntry } from '../../spec/manifest.schema';
import { CredentialRequirementsExtractor } from '../credential/credential-requirements.extractor';
import type { WorkflowCredentialRequirement } from '../credential/credential.types';

export interface WorkflowExportRequest {
	user: User;
	workflowIds: string[];
	writer: PackageWriter;
}

export interface WorkflowExportRequirements {
	credentials: WorkflowCredentialRequirement[];
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
	) {}

	async export(request: WorkflowExportRequest): Promise<WorkflowExportResult> {
		const workflows = await this.workflowFinder.findWorkflowsByIdsForUser(
			request.workflowIds,
			request.user,
			['workflow:export'],
			{ includeParentFolder: true },
		);

		this.assertAllRequestedWorkflowsFound(request.workflowIds, workflows);

		const entries: ManifestEntry[] = [];
		const credentials: WorkflowCredentialRequirement[] = [];
		const fileNames = new UniqueFilenameAllocator('workflows');

		for (const workflow of workflows) {
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
		}

		return { entries, requirements: { credentials } };
	}

	private assertAllRequestedWorkflowsFound(
		requestedWorkflowIds: string[],
		foundWorkflows: Array<{ id: string }>,
	) {
		const foundWorkflowIds = new Set(foundWorkflows.map(({ id }) => id));
		const missingWorkflowIds = requestedWorkflowIds.filter((id) => !foundWorkflowIds.has(id));

		if (missingWorkflowIds.length > 0) {
			const displayedWorkflowIds = missingWorkflowIds.slice(0, 20);
			const omittedCount = missingWorkflowIds.length - displayedWorkflowIds.length;

			throw new UserError(
				`${missingWorkflowIds.length} workflow(s) not found or not accessible. Export aborted.`,
				{
					description: `Missing workflow IDs: ${displayedWorkflowIds.join(', ')}${
						omittedCount > 0 ? `, and ${omittedCount} more` : ''
					}`,
				},
			);
		}
	}
}
