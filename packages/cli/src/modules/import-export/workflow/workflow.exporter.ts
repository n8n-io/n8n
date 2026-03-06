import { Service } from '@n8n/di';
import { WorkflowRepository } from '@n8n/db';
import { In } from '@n8n/typeorm';

import type { EntityExporter } from '../entity-exporter';
import type { EntityKey, ExportScope, ManifestEntry } from '../import-export.types';
import { generateSlug } from '../slug.utils';

import { WorkflowSerializer } from './workflow.serializer';

@Service()
export class WorkflowExporter implements EntityExporter {
	readonly entityKey: EntityKey = 'workflows';

	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowSerializer: WorkflowSerializer,
	) {}

	async export(scope: ExportScope): Promise<ManifestEntry[]> {
		const workflows = await this.fetchWorkflows(scope);

		if (workflows.length === 0) return [];

		const entries: ManifestEntry[] = [];

		for (const workflow of workflows) {
			const slug = generateSlug(workflow.name, workflow.id);
			const parentFolderId = workflow.parentFolder?.id ?? null;

			let target: string;
			if (parentFolderId !== null && scope.state.folderPathMap.has(parentFolderId)) {
				target = `${scope.state.folderPathMap.get(parentFolderId)}/workflows/${slug}`;
			} else {
				target = `${scope.basePath}/workflows/${slug}`;
			}

			const serialized = this.workflowSerializer.serialize(workflow);

			scope.writer.writeDirectory(target);
			scope.writer.writeFile(`${target}/workflow.json`, JSON.stringify(serialized, null, '\t'));

			entries.push({
				id: workflow.id,
				name: workflow.name,
				target,
			});

			scope.state.nodesByWorkflow.push({
				workflowId: workflow.id,
				nodes: workflow.nodes ?? [],
			});
		}

		return entries;
	}

	private async fetchWorkflows(scope: ExportScope) {
		const select: Array<keyof import('@n8n/db').WorkflowEntity> = [
			'id',
			'name',
			'nodes',
			'connections',
			'settings',
			'versionId',
			'isArchived',
		];

		if (scope.workflowIds?.length) {
			return await this.workflowRepository.find({
				select,
				where: { id: In(scope.workflowIds) },
				relations: ['parentFolder'],
			});
		}

		if (scope.folderIds?.length) {
			// Folder-scoped export: fetch workflows in any of the resolved folders.
			// folderPathMap is populated by FolderExporter (which runs first)
			// and contains the target folders + all their descendants.
			const folderIdsToQuery = [...scope.state.folderPathMap.keys()];
			if (folderIdsToQuery.length > 0) {
				return await this.workflowRepository.find({
					select,
					where: { parentFolder: { id: In(folderIdsToQuery) } },
					relations: ['parentFolder'],
				});
			}
			return [];
		}

		if (scope.projectId) {
			return await this.workflowRepository.find({
				select,
				where: { shared: { projectId: scope.projectId } },
				relations: ['parentFolder'],
			});
		}

		return [];
	}
}
