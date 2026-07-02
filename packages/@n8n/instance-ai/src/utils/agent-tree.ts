import { createInitialState, isSafeObjectKey, reduceEvent, toAgentTree } from '@n8n/api-types';
import type { InstanceAiAgentNode, InstanceAiEvent } from '@n8n/api-types';

/**
 * Pre-registered agent identities for rebuilding a tree from a partial event
 * log. The in-process event bus evicts oldest events first, so a long turn
 * loses its `run-start` — the only event that registers the root agent. Without
 * the root, the reducer silently drops every surviving event and the rebuilt
 * tree comes out empty. Seeding the known root (and the orchestrator ids of
 * merged follow-up runs, which normally alias onto the root via their own
 * `run-start`) lets the surviving tail reduce into a renderable tree.
 */
export interface AgentTreeSeed {
	/** Root agent id, e.g. `orchestratorAgentId(<first runId of the group>)`. */
	rootAgentId: string;
	/** Agent ids that alias the root, e.g. orchestrator ids of follow-up runs. */
	aliasAgentIds?: string[];
}

export function buildAgentTreeFromEvents(
	events: InstanceAiEvent[],
	seed?: AgentTreeSeed,
): InstanceAiAgentNode {
	let state = createInitialState(seed?.rootAgentId);
	if (seed) {
		const root = state.agentsById[state.rootAgentId];
		for (const alias of seed.aliasAgentIds ?? []) {
			if (alias === state.rootAgentId || !isSafeObjectKey(alias)) continue;
			state.agentsById[alias] = root;
		}
	}
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
