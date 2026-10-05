import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { NodeConnectionTypes } from 'n8n-workflow';

import type { ValidationWarning } from './workflow-validation-warnings';

interface SubnodeLink {
	subnode: string;
	parent: string;
}

function collectSubnodeLinks(json: WorkflowJSON): { links: SubnodeLink[]; hasMain: Set<string> } {
	const links: SubnodeLink[] = [];
	const hasMain = new Set<string>();

	for (const [sourceName, byType] of Object.entries(json.connections ?? {})) {
		for (const [type, outputs] of Object.entries(byType)) {
			for (const targets of outputs ?? []) {
				for (const target of targets ?? []) {
					if (type === NodeConnectionTypes.Main) {
						hasMain.add(sourceName);
						hasMain.add(target.node);
					} else {
						links.push({ subnode: sourceName, parent: target.node });
					}
				}
			}
		}
	}

	return { links, hasMain };
}

/**
 * A model, tool, or memory sub-node must sit in the same group as the node it
 * serves, or the save drops the whole group. A sub-node has no main connections,
 * so moving it to its parent's side of the boundary never breaks another group
 * rule. This adds a missing sub-node to its parent's group and removes a
 * sub-node from a group its parent is not in. Sub-nodes and parents that sit
 * in two different groups are left for the validator to report.
 */
export function keepSubnodesWithParentGroup(json: WorkflowJSON): ValidationWarning[] {
	const groups = json.nodeGroups;
	if (!groups?.length) return [];

	const idByName = new Map<string, string>();
	const nameById = new Map<string, string>();
	for (const node of json.nodes ?? []) {
		if (node.name && node.id) {
			idByName.set(node.name, node.id);
			nameById.set(node.id, node.name);
		}
	}

	const { links, hasMain } = collectSubnodeLinks(json);
	const warnings: ValidationWarning[] = [];

	const groupOf = (nodeId: string) => groups.find((group) => group.nodeIds.includes(nodeId));

	// Sub-nodes can chain (an embeddings node under a vector store under an
	// Agent), so repeat until no member moves.
	let moved = true;
	while (moved) {
		moved = false;
		for (const { subnode, parent } of links) {
			if (hasMain.has(subnode)) continue;
			const subnodeId = idByName.get(subnode);
			const parentId = idByName.get(parent);
			if (!subnodeId || !parentId) continue;

			const subnodeGroup = groupOf(subnodeId);
			const parentGroup = groupOf(parentId);
			if (subnodeGroup === parentGroup) continue;

			if (parentGroup && !subnodeGroup) {
				parentGroup.nodeIds.push(subnodeId);
				warnings.push({
					code: 'AUTO_GROUPED_SUBNODE',
					nodeName: subnode,
					severity: 'informational',
					message: `Added '${subnode}' to node group "${parentGroup.name}" because it serves '${parent}'. Keep sub-nodes in their parent's group in the source.`,
				});
				moved = true;
			} else if (subnodeGroup && !parentGroup) {
				subnodeGroup.nodeIds = subnodeGroup.nodeIds.filter((id) => id !== subnodeId);
				warnings.push({
					code: 'AUTO_UNGROUPED_SUBNODE',
					nodeName: subnode,
					severity: 'informational',
					message: `Removed '${subnode}' from node group "${subnodeGroup.name}" because '${parent}', the node it serves, is outside the group. Keep sub-nodes in their parent's group in the source.`,
				});
				moved = true;
			}
		}
	}

	return warnings;
}
