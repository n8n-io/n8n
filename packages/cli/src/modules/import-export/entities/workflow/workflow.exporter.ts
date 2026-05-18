import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { WorkflowSerializer } from './workflow.serializer';
import type { PackageWriter } from '../../io/package-writer';
import { generateSlug } from '../../io/slug.utils';
import type { ManifestEntry } from '../../spec/manifest.types';

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

		// We need to check that all the ids that were found are also in the request
		const foundIds = new Set(workflows.map((w) => w.id));
		const missing = request.workflowIds.filter((id) => !foundIds.has(id));
		if (missing.length > 0) {
			throw new UserError(`Workflow(s) not found: ${missing.join(', ')}. Export aborted.`);
		}

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
}
