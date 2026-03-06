import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

import type { IWorkflowWithVersionMetadata } from '@/interfaces';
import { ImportService } from '@/services/import.service';

import type { EntityImporter } from '../entity-importer';
import type { EntityKey, ImportScope, ManifestEntry } from '../import-export.types';
import type { SerializedWorkflow } from './workflow.types';
import { remapSubWorkflowIds } from './workflow.utils';

@Service()
export class WorkflowImporter implements EntityImporter {
	readonly entityKey: EntityKey = 'workflows';

	constructor(private readonly importService: ImportService) {}

	async import(scope: ImportScope, entries: ManifestEntry[]) {
		if (entries.length === 0) return;

		const { folderIdMap, credentialBindings, subWorkflowBindings } = scope.state;

		const workflows = entries.map((entry) => {
			const content = scope.reader.readFile(`${entry.target}/workflow.json`);
			const workflow: SerializedWorkflow = jsonParse(content);

			// When importing into a specific project, derive a deterministic ID
			// prefixed with projectId. This means:
			// - Same workflow into same project → upserts (idempotent)
			// - Same workflow into different project → creates a separate copy
			if (scope.assignNewIds) {
				const sourceId = workflow.id;
				workflow.id = `${scope.targetProjectId}-${sourceId}`;
				subWorkflowBindings.set(sourceId, workflow.id);
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
