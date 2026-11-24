import type { INode } from 'n8n-workflow';

import { NODE_TYPE_DENYLIST, type NodeTypeDenylistEntry } from './node-type-denylist';
import { makeReason } from './reason';
import type { EngineV2Reason, EngineV2ReasonCode } from './types';

/**
 * The packages that n8n loads as its own nodes. Every other package is a community
 * or custom package. CET-785 removes this rule.
 */
const CORE_NODE_PACKAGES = ['n8n-nodes-base.', '@n8n/n8n-nodes-langchain.'];

function matchesEntry(nodeType: string, entry: NodeTypeDenylistEntry): boolean {
	return entry.type.endsWith('.') ? nodeType.startsWith(entry.type) : nodeType === entry.type;
}

function findDenialCode(nodeType: string): EngineV2ReasonCode | undefined {
	const entry = NODE_TYPE_DENYLIST.find((candidate) => matchesEntry(nodeType, candidate));
	if (entry) return entry.code;
	if (!CORE_NODE_PACKAGES.some((prefix) => nodeType.startsWith(prefix))) return 'COMMUNITY_NODE';
	return undefined;
}

/**
 * Reports whether engine v2 can run a node of this type, wherever the node is in the workflow.
 * The editor asks this before the node exists, for example in the node creator.
 */
export function isNodeTypeSupported(nodeType: string): boolean {
	return findDenialCode(nodeType) === undefined;
}

/** Engine v2 skips disabled nodes, so only enabled nodes count. */
export function findNodeTypeReasons(nodes: INode[]): EngineV2Reason[] {
	return nodes.flatMap((node) => {
		if (node.disabled === true) return [];
		const code = findDenialCode(node.type);
		if (!code) return [];
		const problem =
			code === 'COMMUNITY_NODE'
				? `Engine v2 does not run community or custom nodes such as "${node.name}" yet.`
				: `Engine v2 does not run the "${node.name}" node yet.`;
		return [makeReason({ code, kind: 'temporary', node, problem })];
	});
}
