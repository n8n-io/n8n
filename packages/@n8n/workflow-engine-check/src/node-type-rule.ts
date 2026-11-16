import type { INode } from 'n8n-workflow';

import { NODE_TYPE_DENYLIST, type NodeTypeDenylistEntry } from './node-type-denylist';
import { makeReason } from './reason';
import type { EngineV2Reason, EngineV2ReasonCode } from './types';

/**
 * The packages that n8n loads as its own nodes. Every other package is a community
 * or custom package. CET-785 removes this rule.
 */
const CORE_NODE_PACKAGES = ['n8n-nodes-base.', '@n8n/n8n-nodes-langchain.'];

function matchesEntry(node: INode, entry: NodeTypeDenylistEntry): boolean {
	return entry.type.endsWith('.') ? node.type.startsWith(entry.type) : node.type === entry.type;
}

function findDenialCode(node: INode): EngineV2ReasonCode | undefined {
	const entry = NODE_TYPE_DENYLIST.find((candidate) => matchesEntry(node, candidate));
	if (entry) return entry.code;
	if (!CORE_NODE_PACKAGES.some((prefix) => node.type.startsWith(prefix))) return 'COMMUNITY_NODE';
	return undefined;
}

/** Engine v2 skips disabled nodes, so only enabled nodes count. */
export function findNodeTypeReasons(nodes: INode[]): EngineV2Reason[] {
	return nodes.flatMap((node) => {
		if (node.disabled === true) return [];
		const code = findDenialCode(node);
		if (!code) return [];
		const problem =
			code === 'COMMUNITY_NODE'
				? `Engine v2 does not run community or custom nodes such as "${node.name}" yet.`
				: `Engine v2 does not run the "${node.name}" node yet.`;
		return [makeReason({ code, kind: 'temporary', node, problem })];
	});
}
