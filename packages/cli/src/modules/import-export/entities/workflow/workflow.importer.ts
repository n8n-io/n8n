import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

import { ImportService } from '@/services/import.service';

import { asImportServicePayload, type WorkflowReadyForImport } from './workflow.types';
import { remapSubWorkflowIds } from './workflow.utils';
import { IdDeriver } from '../../engine/id-deriver';
import type { ImportScope } from '../../import-export.types';
import type { EntityKey, ManifestEntry } from '../../spec/manifest.types';
import type { SerializedWorkflow } from '../../spec/serialized/workflow.serialized';

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

		const workflows: WorkflowReadyForImport[] = entries.map((entry) => {
			const content = scope.reader.readFile(`${entry.target}/workflow.json`);
			const serialized: SerializedWorkflow = jsonParse(content);
			const sourceWorkflowId = serialized.id;

			// When importing into a specific project, derive a deterministic ID
			// keyed by the instance secret. This means:
			// - Same workflow into same project on same instance → upserts (idempotent)
			// - Same workflow into different project → creates a separate copy
			// - Same workflow into a *different instance* → unpredictable ID,
			//   closing the cross-instance squatting risk noted in the RFC.
			if (scope.assignNewIds) {
				serialized.id = this.idDeriver.derive(scope.targetProjectId, sourceWorkflowId);
				subWorkflowBindings.set(sourceWorkflowId, serialized.id);
			}

			// Remap parentFolderId through the folder ID map
			const remappedFolderId = serialized.parentFolderId
				? (folderIdMap.get(serialized.parentFolderId) ?? null)
				: null;

			// Apply credential bindings if present
			if (credentialBindings.size > 0) {
				this.remapCredentials(serialized.nodes, credentialBindings);
			}

			// Remap tags via tagsBySourceId. ImportService.importWorkflows reads
			// `tag.id` and delegates to `TagRepository.setTags`, which matches by
			// name; the minimal `{id, name}` shape is sufficient and idempotent.
			const remappedTags = serialized.tagIds?.length
				? serialized.tagIds
						.map((sourceId) => tagsBySourceId.get(sourceId))
						.filter((t): t is { id: string; name: string } => !!t)
				: undefined;

			// Strip the wire-only `tagIds` field; remaining fields carry through.
			const { tagIds: _tagIds, ...rest } = serialized;

			return {
				...rest,
				parentFolderId: remappedFolderId,
				// Set the relation object — TypeORM's upsert maps by entity property
				// names, and WorkflowEntity uses `parentFolder` (relation) alongside
				// `parentFolderId` (column).
				parentFolder: remappedFolderId ? { id: remappedFolderId } : null,
				tags: remappedTags,
				// Tag the new WorkflowHistory entry so users can find this version
				// in the UI history view and revert from it.
				versionMetadata: {
					name: 'Imported from package',
					description: `Imported at ${importedAt} (source workflow id: ${sourceWorkflowId})`,
				},
			};
		});

		// Remap sub-workflow references now that all new IDs are assigned
		for (const workflow of workflows) {
			if (subWorkflowBindings.size > 0) {
				remapSubWorkflowIds(workflow.nodes, subWorkflowBindings);
			}
		}

		await this.importService.importWorkflows(
			asImportServicePayload(workflows),
			scope.targetProjectId,
			scope.entityManager,
		);
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
