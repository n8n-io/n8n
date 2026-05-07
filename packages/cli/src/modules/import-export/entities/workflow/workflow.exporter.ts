import { Service } from '@n8n/di';
import type { TagEntity } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { In } from '@n8n/typeorm';
import type { INode } from 'n8n-workflow';

import type { ExportScope } from '../../import-export.types';
import { generateSlug } from '../../io/slug.utils';
import type { EntityKey, ManifestEntry } from '../../spec/manifest.types';

import { WorkflowSerializer } from './workflow.serializer';

export interface WorkflowExportDeps {
	/** Folder ID → archive path, produced by FolderExporter. */
	folderPathMap: Map<string, string>;
}

export interface WorkflowExportResult {
	entries: ManifestEntry[];
	/** workflow ID → its nodes. Consumed by PackageRequirementsExtractor. */
	nodesByWorkflow: Array<{ workflowId: string; nodes: INode[] }>;
	/** Distinct tags referenced by exported workflows. Consumed by TagExporter. */
	referencedTags: TagEntity[];
}

@Service()
export class WorkflowExporter {
	readonly entityKey: EntityKey = 'workflows';

	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowSerializer: WorkflowSerializer,
	) {}

	async export(scope: ExportScope, deps: WorkflowExportDeps): Promise<WorkflowExportResult> {
		const workflows = await this.fetchWorkflows(scope, deps.folderPathMap);

		if (workflows.length === 0) {
			return { entries: [], nodesByWorkflow: [], referencedTags: [] };
		}

		const entries: ManifestEntry[] = [];
		const nodesByWorkflow: WorkflowExportResult['nodesByWorkflow'] = [];
		const tagsById = new Map<string, TagEntity>();

		for (const workflow of workflows) {
			const slug = generateSlug(workflow.name, workflow.id);
			const parentFolderId = workflow.parentFolder?.id ?? null;

			let target: string;
			if (parentFolderId !== null && deps.folderPathMap.has(parentFolderId)) {
				target = `${deps.folderPathMap.get(parentFolderId)}/workflows/${slug}`;
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

			nodesByWorkflow.push({
				workflowId: workflow.id,
				nodes: workflow.nodes ?? [],
			});

			for (const tag of workflow.tags ?? []) {
				tagsById.set(tag.id, tag);
			}
		}

		return { entries, nodesByWorkflow, referencedTags: [...tagsById.values()] };
	}

	private async fetchWorkflows(scope: ExportScope, folderPathMap: Map<string, string>) {
		const select: Array<keyof import('@n8n/db').WorkflowEntity> = [
			'id',
			'name',
			'nodes',
			'connections',
			'settings',
			'versionId',
			'isArchived',
		];
		const relations = ['parentFolder', 'tags'];

		if (scope.workflowIds?.length) {
			return await this.workflowRepository.find({
				select,
				where: { id: In(scope.workflowIds) },
				relations,
			});
		}

		if (scope.folderIds?.length) {
			// Folder-scoped export: fetch workflows in any of the resolved folders.
			// folderPathMap is populated by FolderExporter and contains the
			// target folders plus all their descendants.
			const folderIdsToQuery = [...folderPathMap.keys()];
			if (folderIdsToQuery.length > 0) {
				return await this.workflowRepository.find({
					select,
					where: { parentFolder: { id: In(folderIdsToQuery) } },
					relations,
				});
			}
			return [];
		}

		if (scope.projectId) {
			return await this.workflowRepository.find({
				select,
				where: { shared: { projectId: scope.projectId } },
				relations,
			});
		}

		return [];
	}
}
