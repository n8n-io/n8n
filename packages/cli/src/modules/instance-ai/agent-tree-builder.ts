import { createInitialState, reduceEvent, toAgentTree } from '@n8n/api-types';
import type { InstanceAiEvent, InstanceAiAgentNode } from '@n8n/api-types';

/**
 * Builds an InstanceAiAgentNode tree from a sequence of events.
 *
 * Delegates to the shared reducer in @n8n/api-types so frontend live updates
 * and backend snapshot building use the exact same state machine.
 *
 * Used to create snapshots after a run finishes, so that session restore
 * can serve the complete agent tree without replaying all events.
 */
export function buildAgentTreeFromEvents(events: InstanceAiEvent[]): InstanceAiAgentNode {
	let state = createInitialState();
	for (const event of events) {
		state = reduceEvent(state, event);
	}
	return toAgentTree(state);
}

/**
 * Find an agent node in the tree by agentId.
 * Searches the full tree recursively (no depth limit).
 */
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
