import { GlobalConfig } from '@n8n/config';
import { WorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { In } from '@n8n/typeorm';

import type { SchemaMap } from './engine';

import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

type NodeIndex = Map<string, string>; // input (name or id) → canonical name

@Service()
export class SchemaMapBuilder {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly globalConfig: GlobalConfig,
	) {}

	async forUser(user: User, referencedInputs: string[]): Promise<SchemaMap> {
		const dialect = this.globalConfig.database.type;
		const tablePrefix = this.globalConfig.database.tablePrefix;

		const accessibleIds = await this.workflowSharingService.getSharedWorkflowIds(user, {
			scopes: ['workflow:read'],
		});
		const accessibleSet = new Set(accessibleIds);

		const nameToId = new Map<string, string>();
		const nodeIndexByWorkflowId = new Map<string, NodeIndex>();

		if (referencedInputs.length > 0 && accessibleIds.length > 0) {
			// Match either by name (when input is a workflow name) or by id (when
			// the user referenced a workflow directly by id). Both branches are
			// scoped to the user's accessible-workflow set.
			const idsReferenced = referencedInputs.filter((s) => accessibleSet.has(s));
			const workflows = await this.workflowRepository.find({
				where: [
					{ id: In(accessibleIds), name: In(referencedInputs) },
					...(idsReferenced.length > 0 ? [{ id: In(idsReferenced) }] : []),
				],
				select: ['id', 'name', 'nodes'],
			});
			for (const w of workflows) {
				nameToId.set(w.name, w.id);
				nodeIndexByWorkflowId.set(w.id, buildNodeIndex(w.nodes));
			}
		}

		return {
			dialect,
			tablePrefix,
			accessibleWorkflowIds: accessibleIds,
			resolveWorkflowId: (nameOrId) => {
				const byName = nameToId.get(nameOrId);
				if (byName) return byName;
				if (accessibleSet.has(nameOrId)) return nameOrId;
				return null;
			},
			resolveNodeName: (workflowId, nameOrId) => {
				return nodeIndexByWorkflowId.get(workflowId)?.get(nameOrId) ?? null;
			},
			hasReadAccess: (id) => accessibleSet.has(id),
		};
	}
}

/**
 * Build a single map keyed by both each node's name and id, both pointing to
 * the canonical name. The runtime keys execution data by node name, so the
 * map value is always the name regardless of how the user referenced it.
 */
function buildNodeIndex(nodes: unknown): NodeIndex {
	const index: NodeIndex = new Map();
	if (!Array.isArray(nodes)) return index;
	for (const node of nodes) {
		if (!node || typeof node !== 'object') continue;
		const { id, name } = node as { id?: unknown; name?: unknown };
		if (typeof name !== 'string') continue;
		index.set(name, name);
		if (typeof id === 'string') index.set(id, name);
	}
	return index;
}
