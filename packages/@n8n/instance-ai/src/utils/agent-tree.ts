import { createInitialState, reduceEvent, toAgentTree } from '@n8n/api-types';
import type { InstanceAiAgentNode, InstanceAiEvent } from '@n8n/api-types';

export function buildAgentTreeFromEvents(events: InstanceAiEvent[]): InstanceAiAgentNode {
	let state = createInitialState();
	for (const event of events) {
		state = reduceEvent(state, event);
	}
	return toAgentTree(state);
}

export function findAgentNodeInTree(
	tree: InstanceAiAgentNode,
	agentId: string,
): InstanceAiAgentNode | undefined {
	if (tree.agentId === agentId) return tree;
	for (const child of tree.children) {
		const found = findAgentNodeInTree(child, agentId);
		if (found) return found;
	}
	return undefined;
}
