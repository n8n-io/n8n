// ---------------------------------------------------------------------------
// Shared agent-tree discovery walk, reused by workflow discovery and the
// static (agent, config-eval) artifact handlers.
//
// Lives in outcome/ rather than harness/artifacts/ because
// harness/artifacts/* already imports from outcome/workflow-discovery — a
// shared helper in harness/artifacts imported back into outcome/ would be a
// circular import.
// ---------------------------------------------------------------------------

import type { InstanceAiAgentNode, InstanceAiMessage } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

export interface ArtifactRefSpec {
	/** targetResource.type to match on an agent-tree node. */
	targetType: string;
	/**
	 * Optional: tool names whose results carry the artifact id. Only workflow discovery
	 * uses this today — the assistant does not yet emit tool results with agent/config-eval
	 * ids, so those handlers rely on `targetResource` alone and omit it.
	 */
	toolNames?: Set<string>;
	/** Keys to read the id from a tool result (in priority order). Paired with `toolNames`. */
	resultKeys?: string[];
}

/**
 * Walk assistant agent-trees collecting artifact ids per the spec:
 * a `targetResource.type` match on the node, plus (when the spec supplies them)
 * tool-call results from `spec.toolNames` read via `spec.resultKeys`.
 */
export function collectArtifactRefIds(
	messages: InstanceAiMessage[],
	spec: ArtifactRefSpec,
): string[] {
	const ids = new Set<string>();

	for (const message of messages) {
		if (message.role === 'assistant' && message.agentTree) {
			collectFromNode(message.agentTree, spec, ids);
		}
	}

	return [...ids];
}

function collectFromNode(node: InstanceAiAgentNode, spec: ArtifactRefSpec, ids: Set<string>): void {
	if (node.targetResource?.type === spec.targetType && node.targetResource.id) {
		ids.add(node.targetResource.id);
	}

	if (spec.toolNames && spec.resultKeys) {
		for (const tc of node.toolCalls) {
			if (spec.toolNames.has(tc.toolName)) {
				const id = extractIdFromResult(tc.result, spec.resultKeys);
				if (id) ids.add(id);
			}
		}
	}

	for (const child of node.children) {
		collectFromNode(child, spec, ids);
	}
}

function extractIdFromResult(result: unknown, keys: string[]): string | undefined {
	if (!isRecord(result)) {
		if (typeof result === 'string') {
			try {
				const parsed: unknown = JSON.parse(result);
				if (isRecord(parsed)) {
					return extractIdFromRecord(parsed, keys);
				}
			} catch {
				return undefined;
			}
		}
		return undefined;
	}
	return extractIdFromRecord(result, keys);
}

function extractIdFromRecord(record: Record<string, unknown>, keys: string[]): string | undefined {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === 'string' && value.length > 0) {
			return value;
		}
		if (typeof value === 'number') {
			return String(value);
		}
	}
	return undefined;
}
