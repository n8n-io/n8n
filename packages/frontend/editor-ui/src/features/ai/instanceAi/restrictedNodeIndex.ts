import type {
	InstanceAiAgentNode,
	InstanceAiMessage,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import { reactive, watch } from 'vue';

export type RestrictedNodeEntry = NonNullable<InstanceAiToolCallState['restrictedNodes']>[number];

function collectFromAgentNode(node: InstanceAiAgentNode, found: Map<string, RestrictedNodeEntry>) {
	for (const toolCall of node.toolCalls) {
		for (const restricted of toolCall.restrictedNodes ?? []) {
			if (!found.has(restricted.nodeType)) found.set(restricted.nodeType, restricted);
		}
	}
	for (const child of node.children) collectFromAgentNode(child, found);
}

/**
 * The node types a policy restricts that any tool call in the thread found, keyed by node
 * type. A search and the reply that cites its result can sit in different runs, so the index
 * covers the whole thread.
 */
export function collectRestrictedNodes(
	messages: readonly InstanceAiMessage[],
): Map<string, RestrictedNodeEntry> {
	const found = new Map<string, RestrictedNodeEntry>();
	for (const message of messages) {
		if (message.agentTree) collectFromAgentNode(message.agentTree, found);
	}
	return found;
}

/** Long-lived and reconciled in place, so a rebuild that changes nothing triggers nothing. */
export function useRestrictedNodeIndex(messages: () => InstanceAiMessage[]) {
	const index = reactive(new Map<string, RestrictedNodeEntry>());

	watch(
		() => collectRestrictedNodes(messages()),
		(next) => {
			for (const key of [...index.keys()]) {
				if (!next.has(key)) index.delete(key);
			}
			for (const [key, entry] of next) {
				const existing = index.get(key);
				if (
					existing?.nodeType !== entry.nodeType ||
					existing.displayName !== entry.displayName ||
					existing.scope !== entry.scope
				) {
					index.set(key, { ...entry });
				}
			}
		},
		{ immediate: true },
	);

	return index;
}

/**
 * The entry that a mention of `displayName` stands for. Two types can share a display name. The
 * instance scope wins, because it is the wider restriction.
 */
export function pickEntriesByDisplayName(
	entries: Iterable<RestrictedNodeEntry>,
): Map<string, RestrictedNodeEntry> {
	const byName = new Map<string, RestrictedNodeEntry>();
	for (const entry of entries) {
		const key = entry.displayName.toLowerCase();
		const known = byName.get(key);
		if (!known || (known.scope === 'project' && entry.scope === 'instance')) byName.set(key, entry);
	}
	return byName;
}
