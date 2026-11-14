import type { INode } from 'n8n-workflow';

import { NODE_TYPE_DENYLIST, type NodeTypeDenylistEntry } from './node-type-denylist';
import type { EngineV2Reason } from './types';

/**
 * The packages that n8n loads as its own nodes. Every other package is a community
 * or custom package. CET-785 removes this rule.
 */
const CORE_NODE_PACKAGES = ['n8n-nodes-base.', '@n8n/n8n-nodes-langchain.'];

function matchesEntry(node: INode, entry: NodeTypeDenylistEntry): boolean {
	return entry.type.endsWith('.') ? node.type.startsWith(entry.type) : node.type === entry.type;
}

function findDenial(node: INode): Pick<EngineV2Reason, 'code' | 'severity'> | undefined {
	const entry = NODE_TYPE_DENYLIST.find((candidate) => matchesEntry(node, candidate));
	if (entry) return { code: entry.code, severity: 'blocking' };
	if (!CORE_NODE_PACKAGES.some((prefix) => node.type.startsWith(prefix))) {
		return { code: 'COMMUNITY_NODE', severity: 'blocking' };
	}
	return undefined;
}

/** Engine v2 skips disabled nodes, so only enabled nodes count. */
export function findNodeTypeReasons(nodes: INode[]): EngineV2Reason[] {
	return nodes.flatMap((node) => {
		if (node.disabled === true) return [];
		const denial = findDenial(node);
		if (!denial) return [];
		const message =
			denial.code === 'COMMUNITY_NODE'
				? `Engine v2 runs only the nodes that come with n8n. Remove the "${node.name}" node.`
				: `Engine v2 does not run the "${node.name}" node yet. Remove it.`;
		return [{ ...denial, nodeId: node.id, nodeName: node.name, message }];
	});
}
