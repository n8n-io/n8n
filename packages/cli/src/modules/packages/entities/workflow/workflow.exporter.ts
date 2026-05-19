import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { WorkflowSerializer } from './workflow.serializer';
import type { PackageWriter } from '../../io/package-writer';
import { generateSlug } from '../../io/slug.utils';
import type { ManifestEntry } from '../../spec/manifest.schema';

export interface WorkflowExportRequest {
	user: User;
	workflowIds: string[];
	writer: PackageWriter;
}

@Service()
export class WorkflowExporter {
	constructor(
		private readonly workflowFinder: WorkflowFinderService,
		private readonly workflowSerializer: WorkflowSerializer,
	) {}

	async export(request: WorkflowExportRequest): Promise<ManifestEntry[]> {
		const workflows = await this.workflowFinder.findWorkflowsByIdsForUser(
			request.workflowIds,
			request.user,
			['workflow:export'],
			{ includeParentFolder: true },
		);

		this.assertAllRequestedWorkflowsFound(request.workflowIds, workflows);

		const entries: ManifestEntry[] = [];

		for (const workflow of workflows) {
			const slug = generateSlug(workflow.name, workflow.id);
			const target = `workflows/${slug}`;
			const serialized = this.workflowSerializer.serialize(workflow);

			request.writer.writeDirectory(target);
			request.writer.writeFile(`${target}/workflow.json`, JSON.stringify(serialized, null, '\t'));

			entries.push({
				id: workflow.id,
				name: workflow.name,
				target,
			});
		}

		return entries;
	}

	private assertAllRequestedWorkflowsFound(
		requestedWorkflowIds: string[],
		foundWorkflows: Array<{ id: string }>,
	) {
		const foundWorkflowIds = new Set(foundWorkflows.map(({ id }) => id));
		const missingWorkflowIds = requestedWorkflowIds.filter((id) => !foundWorkflowIds.has(id));

		if (missingWorkflowIds.length > 0) {
			throw new UserError(
				`Workflow(s) not found or not accessible: ${missingWorkflowIds.join(', ')}. Export aborted.`,
			);
		}
	}
}
