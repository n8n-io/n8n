import { Service } from '@n8n/di';

import type { IWorkflowWithVersionMetadata } from '@/interfaces';
import { ImportService } from '@/services/import.service';

import type { Importer } from '../importer';
import type { ProjectImportContext } from '../import-export.types';
import type { ManifestWorkflowEntry, SerializedWorkflow } from './workflow.types';

@Service()
export class WorkflowImporter implements Importer<ManifestWorkflowEntry> {
	constructor(private readonly importService: ImportService) {}

	async importForProject(ctx: ProjectImportContext, entries: ManifestWorkflowEntry[]) {
		if (entries.length === 0) return;

		const workflows = entries.map((entry) => {
			const content = ctx.reader.readFile(`${entry.target}/workflow.json`);
			const workflow = JSON.parse(content) as SerializedWorkflow;

			// Remap parentFolderId through the folder ID map
			const remappedFolderId = workflow.parentFolderId
				? (ctx.folderIdMap.get(workflow.parentFolderId) ?? null)
				: null;

			// SerializedWorkflow is a subset of IWorkflowWithVersionMetadata — the import
			// service only reads id, name, nodes, connections, settings, versionId, parentFolderId
			return {
				...workflow,
				parentFolderId: remappedFolderId,
			} as unknown as IWorkflowWithVersionMetadata;
		});

		await this.importService.importWorkflows(workflows, ctx.projectId);
	}
}
