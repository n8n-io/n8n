import type { JSONValue } from '@n8n/utils/json/to-json-value';
import isEqual from 'lodash/isEqual';
import type { INode, IRunData } from 'n8n-workflow';

import type { RecordedRun, RecordedToolCall } from './agent-determinism.contracts';
import { pickNodeName } from './draft-builder';
import { effectiveCalls } from './trace-mining';

export type TextJudge = (expected: string, actual: string) => Promise<boolean>;

function asText(value: JSONValue) {
	return typeof value === 'string' ? value : JSON.stringify(value);
}

export async function matchOutput(expected: JSONValue, actual: JSONValue | null, judge: TextJudge) {
	if (actual === null) return false;
	if (typeof expected === 'string') return await judge(expected, asText(actual));
	return isEqual(expected, actual);
}

const MIN_KEY_LENGTH = 5;

function plannedCalls(node: INode, runData: IRunData) {
	let items = 0;
	for (const task of runData[node.name] ?? []) {
		const from = task.source?.[0];
		const fed = from
			? (runData[from.previousNode]?.[from.previousNodeRun ?? 0]?.data?.main?.[
					from.previousNodeOutput ?? 0
				]?.length ?? 0)
			: 1;
		items += node.executeOnce ? Math.min(fed, 1) : fed;
	}
	return items;
}

const isPaginated = (node: INode) =>
	JSON.stringify(node.parameters.options ?? {}).includes('pagination');

const stringLeaves = (value: unknown): string[] =>
	typeof value === 'string'
		? [value]
		: value !== null && typeof value === 'object'
			? Object.values(value).flatMap(stringLeaves)
			: [];

/**
 * Whether the draft did what the agent did: each tool called as often as the
 * agent called it (a paginated read counts as one), and every item a "Pick items
 * for <tool>" Filter let through shows up in the agent's arguments for that tool.
 * Tool nodes are pinned in replay, so this reads the items that reached them.
 */
export function matchActions(
	draft: { nodes: INode[] },
	runData: IRunData,
	run: RecordedRun,
	toolNodes: Set<string>,
) {
	const recorded = new Map<string, RecordedToolCall[]>();
	for (const call of effectiveCalls(run.toolCalls)) {
		recorded.set(call.name, [...(recorded.get(call.name) ?? []), call]);
	}
	const planned = new Map<string, { count: number; paginated: boolean }>();
	for (const node of draft.nodes.filter((n) => toolNodes.has(n.name))) {
		const tool = toolNameOf(node.name);
		const entry = planned.get(tool) ?? { count: 0, paginated: false };
		planned.set(tool, {
			count: entry.count + plannedCalls(node, runData),
			paginated: entry.paginated || isPaginated(node),
		});
	}
	for (const tool of new Set([...recorded.keys(), ...planned.keys()])) {
		const want = recorded.get(tool)?.length ?? 0;
		const { count, paginated } = planned.get(tool) ?? { count: 0, paginated: false };
		if (paginated ? want > 0 !== count > 0 : want !== count) return false;
	}
	for (const [tool, calls] of recorded) {
		const picked = runData[pickNodeName(tool)]?.at(-1)?.data?.main?.[0] ?? [];
		const args = JSON.stringify(calls.map((call) => call.input));
		const allFound = picked.every((item) =>
			stringLeaves(item.json).some((leaf) => leaf.length >= MIN_KEY_LENGTH && args.includes(leaf)),
		);
		if (!allFound) return false;
	}
	return true;
}

/** Draft nodes for a tool are named after it, with " (2)" for a second branch. */
export const toolNameOf = (nodeName: string) => nodeName.replace(/ \(\d+\)$/, '');
