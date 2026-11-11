import type { INode } from 'n8n-workflow';

import { NODE_TYPE_DENYLIST, type NodeTypeDenylistEntry } from './node-type-denylist';
import type { EngineV2Reason } from './types';

/** The packages that n8n loads as its own nodes. Every other package is a community package. */
const CORE_NODE_PACKAGES = ['n8n-nodes-base.', '@n8n/n8n-nodes-langchain.'];

const MESSAGES: Partial<Record<EngineV2Reason['code'], (nodeName: string) => string>> = {
	TRIGGER_WAITS_FOR_RUN: (nodeName) =>
		`Engine v2 cannot run the "${nodeName}" trigger if it waits for its execution to finish. Set the node to hand off without waiting.`,
	COMMUNITY_NODE: (nodeName) =>
		`Engine v2 does not run community nodes yet. Remove the "${nodeName}" node.`,
};

function matchesEntry(node: INode, entry: NodeTypeDenylistEntry): boolean {
	const typeMatches = entry.type.endsWith('.')
		? node.type.startsWith(entry.type)
		: node.type === entry.type;
	return typeMatches && node.typeVersion >= (entry.minTypeVersion ?? 0);
}

function findDenial(node: INode): Pick<EngineV2Reason, 'code' | 'severity'> | undefined {
	const entry = NODE_TYPE_DENYLIST.find((candidate) => matchesEntry(node, candidate));
	if (entry) return { code: entry.code, severity: entry.severity };
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
			MESSAGES[denial.code]?.(node.name) ??
			`Engine v2 does not run the "${node.name}" node yet. Remove it.`;
		return [{ ...denial, nodeId: node.id, nodeName: node.name, message }];
	});
}
