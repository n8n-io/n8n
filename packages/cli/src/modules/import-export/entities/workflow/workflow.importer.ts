import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

import type { IWorkflowWithVersionMetadata } from '@/interfaces';
import { ImportService } from '@/services/import.service';

import { IdDeriver } from '../../engine/id-deriver';
import type { ImportScope } from '../../import-export.types';
import type { EntityKey, ManifestEntry } from '../../spec/manifest.types';
import type { SerializedWorkflow } from '../../spec/serialized/workflow.serialized';
import { remapSubWorkflowIds } from './workflow.utils';

export interface WorkflowImportDeps {
	/** Source folder ID → target folder ID. Produced by FolderImporter. */
	folderIdMap: Map<string, string>;
	/** Source credential ID → target credential ID. Seeded by BindingResolver, may be grown by CredentialImporter. */
	credentialBindings: Map<string, string>;
	/** Source workflow ID → target workflow ID. Seeded by BindingResolver; mutated here when assigning new IDs. */
	subWorkflowBindings: Map<string, string>;
	/** Source tag ID → target tag (id + name). Produced by TagImporter. */
	tagsBySourceId: Map<string, { id: string; name: string }>;
}

@Service()
export class WorkflowImporter {
	readonly entityKey: EntityKey = 'workflows';

	constructor(
		private readonly importService: ImportService,
		private readonly idDeriver: IdDeriver,
	) {}

	async import(scope: ImportScope, entries: ManifestEntry[], deps: WorkflowImportDeps) {
		if (entries.length === 0) return;

		const { folderIdMap, credentialBindings, subWorkflowBindings, tagsBySourceId } = deps;

		const importedAt = new Date().toISOString();

		const workflows = entries.map((entry) => {
			const content = scope.reader.readFile(`${entry.target}/workflow.json`);
			const workflow: SerializedWorkflow = jsonParse(content);
			const sourceWorkflowId = workflow.id;

			// When importing into a specific project, derive a deterministic ID
			// keyed by the instance secret. This means:
			// - Same workflow into same project on same instance → upserts (idempotent)
			// - Same workflow into different project → creates a separate copy
			// - Same workflow into a *different instance* → unpredictable ID,
			//   closing the cross-instance squatting risk noted in the RFC.
			if (scope.assignNewIds) {
				workflow.id = this.idDeriver.derive(scope.targetProjectId, sourceWorkflowId);
				subWorkflowBindings.set(sourceWorkflowId, workflow.id);
			}

			// Remap parentFolderId through the folder ID map
			const remappedFolderId = workflow.parentFolderId
				? (folderIdMap.get(workflow.parentFolderId) ?? null)
				: null;
			workflow.parentFolderId = remappedFolderId;

			// Also set the relation object — TypeORM's upsert maps by entity
			// property names, and WorkflowEntity uses `parentFolder` (relation)
			// not `parentFolderId` (column).
			(workflow as unknown as Record<string, unknown>).parentFolder = remappedFolderId
				? { id: remappedFolderId }
				: null;

			// Apply credential bindings if present
			if (credentialBindings.size > 0) {
				this.remapCredentials(workflow.nodes, credentialBindings);
			}

			// Remap tags via tagsBySourceId and translate to the shape expected
			// by ImportService.importWorkflows (`tags: { id, name }[]`).
			// `setTags` matches by name when id+createdAt aren't present, so
			// passing `{ id, name }` is sufficient and idempotent.
			if (workflow.tagIds && workflow.tagIds.length > 0) {
				const remappedTags = workflow.tagIds
					.map((sourceId) => tagsBySourceId.get(sourceId))
					.filter((t): t is { id: string; name: string } => !!t);

				(workflow as unknown as Record<string, unknown>).tags = remappedTags;
				delete (workflow as { tagIds?: string[] }).tagIds;
			}

			// Tag the new WorkflowHistory entry so users can find this version
			// in the UI history view and revert from it. ImportService creates
			// a new versionId and inserts a history row using these fields.
			(workflow as unknown as Record<string, unknown>).versionMetadata = {
				name: `Imported from package`,
				description: `Imported at ${importedAt} (source workflow id: ${sourceWorkflowId})`,
			};

			return workflow as unknown as IWorkflowWithVersionMetadata;
		});

		// Remap sub-workflow references now that all new IDs are assigned
		for (const workflow of workflows) {
			if (subWorkflowBindings.size > 0) {
				remapSubWorkflowIds(workflow.nodes, subWorkflowBindings);
			}
		}

		await this.importService.importWorkflows(workflows, scope.targetProjectId, scope.entityManager);
	}

	private remapCredentials(nodes: INode[], credentialBindings: Map<string, string>): void {
		for (const node of nodes) {
			if (!node.credentials) continue;
			for (const details of Object.values(node.credentials)) {
				if (details.id && credentialBindings.has(details.id)) {
					details.id = credentialBindings.get(details.id)!;
				}
			}
		}
	}
}
