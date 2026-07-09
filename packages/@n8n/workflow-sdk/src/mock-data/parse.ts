import { AGENT_NODE_TYPE } from './ai-root-shapes';
import { findOutputParserTargets } from './context';
import type { PinData } from './types';
import type { WorkflowJSON } from '../types/base';

/**
 * Parse the LLM response into PinData format.
 * Handles both `{ "json": {...} }` wrapped and unwrapped items.
 */
export function parsePinDataResponse(responseText: string, expectedNodes: string[]): PinData {
	let cleaned = responseText.trim();
	if (cleaned.startsWith('```')) {
		cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
	}

	let parsed: Record<string, unknown>;
	try {
		parsed = JSON.parse(cleaned) as Record<string, unknown>;
	} catch {
		return {};
	}

	const pinData: PinData = {};

	for (const nodeName of expectedNodes) {
		const nodeData = parsed[nodeName];
		// Keep empty arrays — a valid "no stored data" pin; dropping one falls back to real execution.
		if (!Array.isArray(nodeData)) continue;

		pinData[nodeName] = nodeData.map((item: unknown) => {
			// The execution engine expects { json: IDataObject } format.
			// The LLM may return items with or without the json wrapper.
			if (typeof item === 'object' && item !== null && 'json' in item) {
				return item as Record<string, unknown>;
			}
			// Wrap raw objects in { json: ... } for the execution engine
			return { json: item ?? {} };
		});
	}

	return pinData;
}

/** Parse a string as a JSON object/array; undefined when it isn't one. */
function tryParseJsonContainer(text: string): Record<string, unknown> | unknown[] | undefined {
	const trimmed = text.trim();
	if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return undefined;
	try {
		const parsed: unknown = JSON.parse(trimmed);
		if (typeof parsed === 'object' && parsed !== null) {
			return parsed as Record<string, unknown> | unknown[];
		}
	} catch {
		// Not JSON — leave the original value alone.
	}
	return undefined;
}

/**
 * Deterministically repair pinned items for AGENT roots that have a
 * structured output parser attached. The Agent filter lives HERE, not at the
 * call sites: Agent is the only root type that wraps parser output in an
 * `{ output: ... }` envelope — chainLlm unwraps it flat, so wrapping its
 * items would corrupt downstream references.
 * Two LLM failure modes observed in eval runs: `output` emitted as a
 * JSON-encoded string (downstream `$json.output.field` resolves undefined),
 * and the parsed fields spread flat at the top level with no `output`
 * envelope. Both are mechanical fixes — the prompt asks for the right shape,
 * this guarantees it. Returns a new object; the input is not mutated.
 */
export function repairStructuredAgentOutput(pinData: PinData, workflow: WorkflowJSON): PinData {
	const nodeTypeByName = new Map(
		workflow.nodes.filter((node) => node.name).map((node) => [node.name, node.type] as const),
	);
	const repaired: PinData = { ...pinData };

	for (const nodeName of findOutputParserTargets(workflow).keys()) {
		const items = repaired[nodeName];
		if (!items || nodeTypeByName.get(nodeName) !== AGENT_NODE_TYPE) continue;

		repaired[nodeName] = items.map((item) => {
			const json = item.json;
			if (typeof json !== 'object' || json === null || Array.isArray(json)) return item;
			const record = json as Record<string, unknown>;

			if (typeof record.output === 'string') {
				const parsed = tryParseJsonContainer(record.output);
				if (parsed !== undefined) {
					return { ...item, json: { ...record, output: parsed } };
				}
				return item;
			}

			if (!('output' in record)) {
				return { ...item, json: { output: record } };
			}

			return item;
		});
	}

	return repaired;
}
