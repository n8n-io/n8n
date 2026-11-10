import type { ExecutionSearchMatch } from '@n8n/api-types';
import type { INodeExecutionData, IRunData, ITaskData } from 'n8n-workflow';

export type ExecutionSearchCriteria = {
	/** Text to find in the item JSON of the executed nodes, field names included. */
	text?: string;
	/** Name of a node that ran. With `text`, only the input and output of this node count. */
	nodeName?: string;
};

type FieldMatch = Required<Pick<ExecutionSearchMatch, 'path' | 'snippet'>>;

const SNIPPET_CHARS_BEFORE = 30;
const SNIPPET_CHARS_AFTER = 50;
const MAX_DEPTH = 100;
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/**
 * Change only the letters A to Z to lower case. The databases fold case this way when
 * they filter the stored data, so the search must do the same to agree with them.
 */
export function toAsciiLowerCase(text: string) {
	return text.replace(/[A-Z]+/g, (letters) => letters.toLowerCase());
}

function formatPath(segments: Array<string | number>) {
	let path = '';
	for (const segment of segments) {
		if (typeof segment === 'number') path += `[${segment}]`;
		else if (IDENTIFIER.test(segment)) path += path ? `.${segment}` : segment;
		else path += `[${JSON.stringify(segment)}]`;
	}
	return path;
}

const collapseWhitespace = (text: string) => text.replace(/\s+/g, ' ');

function matchText(
	text: string,
	needle: string,
	segments: Array<string | number>,
): FieldMatch | undefined {
	const index = toAsciiLowerCase(text).indexOf(needle);
	if (index === -1) return undefined;

	const end = index + needle.length;
	const start = Math.max(0, index - SNIPPET_CHARS_BEFORE);
	const stop = Math.min(text.length, end + SNIPPET_CHARS_AFTER);

	return {
		path: formatPath(segments),
		snippet: {
			before: (start > 0 ? '…' : '') + collapseWhitespace(text.slice(start, index)),
			match: text.slice(index, end),
			after: collapseWhitespace(text.slice(end, stop)) + (stop < text.length ? '…' : ''),
		},
	};
}

function findInValue(
	value: unknown,
	needle: string,
	segments: Array<string | number>,
	ancestors: Set<object>,
): FieldMatch | undefined {
	if (typeof value === 'string') return matchText(value, needle, segments);
	if (typeof value === 'number' || typeof value === 'boolean') {
		return matchText(String(value), needle, segments);
	}
	if (value === null || typeof value !== 'object') return undefined;
	// Stored run data can refer to the same object more than once, also in a cycle.
	if (ancestors.has(value) || ancestors.size >= MAX_DEPTH) return undefined;

	ancestors.add(value);
	try {
		const entries: Array<[string | number, unknown]> = Array.isArray(value)
			? [...value.entries()]
			: Object.entries(value);

		for (const [key, child] of entries) {
			segments.push(key);
			const found =
				(typeof key === 'string' ? matchText(key, needle, segments) : undefined) ??
				findInValue(child, needle, segments, ancestors);
			segments.pop();
			if (found) return found;
		}
	} finally {
		ancestors.delete(value);
	}

	return undefined;
}

function findInItems(items: INodeExecutionData[] | null | undefined, needle: string) {
	for (const item of items ?? []) {
		const found = findInValue(item?.json, needle, [], new Set());
		if (found) return found;
	}
	return undefined;
}

const runsOf = (runData: IRunData, nodeName: string): ITaskData[] =>
	Object.hasOwn(runData, nodeName) ? (runData[nodeName] ?? []) : [];

function findInOutput(run: ITaskData, needle: string) {
	for (const outputs of Object.values(run.data ?? {})) {
		for (const items of outputs ?? []) {
			const found = findInItems(items, needle);
			if (found) return found;
		}
	}
	return undefined;
}

/** Run data holds outputs only. The input of a run is the output of the runs that it names as its source. */
function findInInput(runData: IRunData, run: ITaskData, needle: string) {
	for (const source of run.source ?? []) {
		if (!source) continue;
		const sourceRun = runsOf(runData, source.previousNode)[source.previousNodeRun ?? 0];
		const found = findInItems(sourceRun?.data?.main?.[source.previousNodeOutput ?? 0], needle);
		if (found) return found;
	}
	return undefined;
}

/**
 * Find the first place in the run data that satisfies the search, or `undefined` when
 * the execution does not match. Nodes are examined in the sequence in which they ran.
 */
export function findSearchMatch(
	runData: IRunData | undefined,
	{ text, nodeName }: ExecutionSearchCriteria,
): ExecutionSearchMatch | undefined {
	if (!runData) return undefined;
	if (nodeName !== undefined && !Object.hasOwn(runData, nodeName)) return undefined;
	if (text === undefined) return nodeName === undefined ? undefined : { nodeName };

	const needle = toAsciiLowerCase(text);
	const nodeNames = nodeName === undefined ? Object.keys(runData) : [nodeName];

	for (const name of nodeNames) {
		for (const run of runsOf(runData, name)) {
			const found = findInOutput(run, needle);
			if (found) return { nodeName: name, source: 'output', ...found };
		}
	}

	if (nodeName === undefined) return undefined;

	for (const run of runsOf(runData, nodeName)) {
		const found = findInInput(runData, run, needle);
		if (found) return { nodeName, source: 'input', ...found };
	}

	return undefined;
}
