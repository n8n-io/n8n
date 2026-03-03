import { Service } from '@n8n/di';
import { WorkflowRepository } from '@n8n/db';

import type { ProjectExportContext } from '../import-export.types';
import { generateSlug } from '../slug.utils';

import { WorkflowSerializer } from './workflow.serializer';
import type { ManifestWorkflowEntry } from './workflow.types';

@Service()
export class WorkflowExporter {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowSerializer: WorkflowSerializer,
	) {}

	async exportForProject(ctx: ProjectExportContext): Promise<ManifestWorkflowEntry[]> {
		const workflows = await this.workflowRepository.find({
			where: { shared: { projectId: ctx.projectId } },
			relations: ['parentFolder'],
		});

		if (workflows.length === 0) return [];

		const entries: ManifestWorkflowEntry[] = [];

		for (const workflow of workflows) {
			const slug = generateSlug(workflow.name, workflow.id);
			const parentFolderId = workflow.parentFolder?.id ?? null;

			let target: string;
			if (parentFolderId !== null && ctx.folderPathMap.has(parentFolderId)) {
				target = `${ctx.folderPathMap.get(parentFolderId)}/workflows/${slug}`;
			} else {
				target = `${ctx.projectTarget}/workflows/${slug}`;
			}

			const serialized = this.workflowSerializer.serialize(workflow);

			ctx.writer.writeDirectory(target);
			ctx.writer.writeFile(`${target}/workflow.json`, JSON.stringify(serialized, null, '\t'));

			entries.push({
				id: workflow.id,
				name: workflow.name,
				target,
			});
		}

		return entries;
	}
}
