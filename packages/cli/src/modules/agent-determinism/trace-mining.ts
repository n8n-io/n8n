import type { JSONObject, JSONValue } from '@n8n/utils/json/to-json-value';

import type { RecordedRun, RecordedToolCall } from './agent-determinism.contracts';

/**
 * Pure part of the trace miner: groups runs by intent, then by tool path, and
 * scores each group. Ported from the lab script (`research/agent-traces/mine.mjs`).
 */

export const MIN_GROUP_RUNS = 5;
export const MIN_PATH_SHARE = 0.7;
export const MIN_SUCCESS = 0.7;
export const MIN_TRACED = 0.6;
export const SCHEDULE_TRIGGER = 'schedule';
export const NO_TOOLS = '(no tools)';

type Leaf = [path: string, value: JSONValue];

export type ArgSource =
	| { src: 'blank' | 'const' | 'generated' | 'decision' | 'input' | 'unknown' | 'untraced' }
	| { src: 'items' }
	| { src: 'step'; tool: string; path: string | null };

export type MinedRun = {
	run: RecordedRun;
	text: string;
	/** Effective calls (retries merged), parallel calls in the group's usual order. */
	calls: RecordedToolCall[];
	path: string;
	/** Per call, where each argument leaf came from. */
	traces: Array<Record<string, ArgSource>>;
};

export type GroupScore = {
	label: string;
	runs: MinedRun[];
	share: number;
	pathTable: Array<[path: string, runs: number]>;
	dominantPath: string;
	branchPath: string | null;
	covered: number;
	traced: number | null;
	success: number;
	examples: string[];
	convert: boolean;
	why: string;
};

export function requestText(run: RecordedRun): string {
	const { input } = run;
	for (const key of ['message', 'chatInput', 'query', 'text']) {
		if (typeof input[key] === 'string') return input[key];
	}
	return JSON.stringify(input);
}

/** A failed call followed by the same tool is a retry: keep only the retry. */
export function effectiveCalls(calls: RecordedToolCall[]) {
	return calls.filter((call, i) => call.ok || calls[i + 1]?.name !== call.name);
}

/** A tool called several times in a row is one step (a loop): 1 alert or 4 alerts is one path. */
export function collapseRepeats(calls: RecordedToolCall[]) {
	const out: Array<{ tool: string; n: number }> = [];
	for (const call of effectiveCalls(calls)) {
		const last = out.at(-1);
		if (last?.tool === call.name) last.n++;
		else out.push({ tool: call.name, n: 1 });
	}
	return out;
}

export const toolPath = (calls: RecordedToolCall[]) =>
	collapseRepeats(calls).map(({ tool }) => tool);

export const pathKey = (path: string[]) => path.join(' → ') || NO_TOOLS;

export function leaves(value: JSONValue | undefined, prefix = ''): Leaf[] {
	if (value === undefined) return [];
	if (value === null || typeof value !== 'object') return [[prefix, value]];
	return Object.entries(value).flatMap(([key, child]) =>
		leaves(child ?? null, prefix ? `${prefix}.${key}` : key),
	);
}

const STOP_WORDS = new Set(
	'a an the is are was were be do does did you your we our i me my it its of for to in on at by and or any anything what whats which how many much can could pls please right now rn just there this that these those with about from have has'.split(
		' ',
	),
);

/**
 * Request words the agent copied into a tool argument are parameters, not intent:
 * mask them, so "stock of rain boots" and "stock of sun hat" fall in one group.
 */
export function intentTokens(text: string, calls: RecordedToolCall[]) {
	const argValues = calls
		.flatMap((call) => leaves(call.input).map(([, value]) => String(value ?? '').toLowerCase()))
		.filter((value) => value.length >= 3 && value.length < 40);
	const isArg = (word: string) =>
		word.length >= 3 &&
		!word.startsWith('<') &&
		argValues.some((value) => value.includes(word) || (word.length > 3 && word.includes(value)));
	return new Set(
		text
			.toLowerCase()
			.replace(/sku-\d+/g, ' <sku> ')
			.replace(/<[^>]*\|[^>]*>|<https?:[^>]*>/g, ' <link> ')
			.split(/[^a-z0-9<>'-]+/)
			.map((word) => word.replace(/'s$/, ''))
			.filter((word) => word && !STOP_WORDS.has(word))
			.map((word) => (/^\d+$/.test(word) ? '<n>' : isArg(word) ? '<arg>' : word)),
	);
}

const jaccard = (a: Set<string>, b: Set<string>) => {
	const shared = [...a].filter((token) => b.has(token)).length;
	return shared / (a.size + b.size - shared || 1);
};

/**
 * Scheduled runs form one group. Other runs join the first group whose first run
 * is at least 60% similar (masked keywords). Comparing with the first run only
 * keeps groups from chaining into each other.
 */
export function groupByIntent(runs: RecordedRun[]) {
	const groups: Array<{ label: string; runs: RecordedRun[]; tokens: Set<string> }> = [];
	for (const run of runs) {
		if (run.trigger === SCHEDULE_TRIGGER) {
			const group = groups.find((g) => g.label === 'scheduled check');
			if (group) group.runs.push(run);
			else groups.push({ label: 'scheduled check', runs: [run], tokens: new Set() });
			continue;
		}
		const tokens = intentTokens(requestText(run), run.toolCalls);
		const group = groups.find(
			(g) => g.label !== 'scheduled check' && jaccard(g.tokens, tokens) >= 0.6,
		);
		if (group) group.runs.push(run);
		else groups.push({ label: run.trigger, runs: [run], tokens });
	}
	for (const group of groups.filter((g) => g.label !== 'scheduled check')) {
		const counts = new Map<string, number>();
		for (const run of group.runs) {
			for (const token of intentTokens(requestText(run), run.toolCalls)) {
				counts.set(token, (counts.get(token) ?? 0) + 1);
			}
		}
		const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 3);
		group.label = `${group.label}: ${top.map(([token]) => token).join(' ')}`;
	}
	return groups.map(({ label, runs: members }) => ({ label, runs: members }));
}

const isFreeText = (value: JSONValue) =>
	typeof value === 'string' && value.length > 40 && value.includes(' ');

export function inJson(haystack: JSONValue | undefined, value: JSONValue) {
	const text = JSON.stringify(haystack ?? '');
	return typeof value === 'number'
		? new RegExp(`[^0-9.]${value}[^0-9.]`).test(text)
		: text.includes(String(value));
}

/** The path of the first leaf equal to `value`, with `[*]` for array indexes. */
export function findPath(
	value: JSONValue | undefined,
	target: JSONValue,
	prefix = '',
): string | null {
	if (value === undefined) return null;
	if (value === null || typeof value !== 'object') {
		return value === target || String(value) === String(target) ? prefix : null;
	}
	for (const [key, child] of Object.entries(value)) {
		const next = Array.isArray(value) ? `${prefix}[*]` : prefix ? `${prefix}.${key}` : key;
		const hit = findPath(child ?? null, target, next);
		if (hit !== null) return hit;
	}
	return null;
}

/**
 * Where an argument value came from: the same in most runs (const), the request
 * (input), an earlier result (step), items picked from earlier results (items),
 * free text the model wrote (generated), a flag or small number the model worked
 * out (decision), or nowhere we can see (unknown when results were not kept).
 */
export function traceArg(
	key: string,
	value: JSONValue,
	text: string,
	calls: RecordedToolCall[],
	index: number,
	constants: Map<string, string>,
): ArgSource {
	if (value === '' || value === null) return { src: 'blank' };
	if (constants.get(key) === JSON.stringify(value)) return { src: 'const' };
	if (isFreeText(value)) return { src: 'generated' };
	if (typeof value === 'boolean') return { src: 'decision' };
	const parts: JSONValue[] =
		typeof value === 'string' && value.includes(',')
			? value.split(',').map((part) => part.trim())
			: [value];
	const lower = text.toLowerCase();
	if (
		parts.every((part) => String(part).length >= 2 && lower.includes(String(part).toLowerCase()))
	) {
		return { src: 'input' };
	}
	const earlier = calls.slice(0, index);
	if (
		parts.length > 1 &&
		parts.every((part) => earlier.some((call) => inJson(call.output, part)))
	) {
		return { src: 'items' };
	}
	for (let j = index - 1; j >= 0; j--) {
		if (parts.every((part) => inJson(earlier[j].output, part))) {
			return { src: 'step', tool: earlier[j].name, path: findPath(earlier[j].output, parts[0]) };
		}
	}
	if (earlier.some((call) => call.output === undefined) || calls[index].input === undefined) {
		return { src: 'unknown' };
	}
	if (typeof value === 'number' && Math.abs(value) <= 100) return { src: 'decision' };
	if (typeof value === 'string' && value.includes(' ')) return { src: 'generated' };
	return { src: 'untraced' };
}

/**
 * Calls of one model step have no real order. Put them in the order the group
 * uses when the same tools run in separate steps, so "post and append at once"
 * and "post, then append" are one path.
 */
export function orderParallel(runs: RecordedRun[]): Map<string, RecordedToolCall[]> {
	const before = new Map<string, number>();
	for (const run of runs) {
		const calls = run.toolCalls;
		for (let i = 0; i < calls.length; i++) {
			for (let j = i + 1; j < calls.length; j++) {
				const [a, b] = [calls[i], calls[j]];
				if (a.step !== undefined && b.step !== undefined && a.step < b.step && a.name !== b.name) {
					const key = `${a.name}|${b.name}`;
					before.set(key, (before.get(key) ?? 0) + 1);
				}
			}
		}
	}
	const usual = (a: RecordedToolCall, b: RecordedToolCall) =>
		(before.get(`${b.name}|${a.name}`) ?? 0) - (before.get(`${a.name}|${b.name}`) ?? 0);
	return new Map(
		runs.map((run) => {
			const indexed = run.toolCalls.map((call, index) => ({ call, index }));
			indexed.sort(
				(x, y) =>
					(x.call.step ?? 0) - (y.call.step ?? 0) ||
					(x.call.step === y.call.step && x.call.name !== y.call.name
						? usual(x.call, y.call)
						: 0) ||
					x.index - y.index,
			);
			return [run.id, indexed.map(({ call }) => call)];
		}),
	);
}

/** Paths worth a branch: the dominant one, and the next one if it is common and not a prefix. */
export function branchPaths(pathTable: Array<[string, number]>, groupSize: number) {
	const [first, second] = pathTable;
	const a = first[0] === NO_TOOLS ? [] : first[0].split(' → ');
	const b = second && second[0] !== NO_TOOLS ? second[0].split(' → ') : null;
	if (
		!b ||
		second[1] < Math.max(3, groupSize * 0.2) ||
		a.length === 0 ||
		a.join().startsWith(b.join())
	) {
		return { paths: [a], prefix: a.length, keys: [first[0]] };
	}
	let prefix = 0;
	while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
	return { paths: [a, b], prefix, keys: [first[0], second[0]] };
}

const pct = (share: number) => `${Math.round(share * 100)}%`;

/** Scores one intent group and decides whether it is worth converting. */
export function scoreGroup(label: string, runs: RecordedRun[], totalRuns: number): GroupScore {
	const ordered = orderParallel(runs);
	const mined: MinedRun[] = runs.map((run) => {
		const calls = effectiveCalls(ordered.get(run.id) ?? run.toolCalls);
		return { run, text: requestText(run), calls, path: pathKey(toolPath(calls)), traces: [] };
	});

	const pathCounts = new Map<string, number>();
	for (const { path } of mined) pathCounts.set(path, (pathCounts.get(path) ?? 0) + 1);
	const pathTable = [...pathCounts].sort((a, b) => b[1] - a[1]);
	const branch = branchPaths(pathTable, runs.length);
	const branchPath = branch.keys[1] ?? null;

	// Constant args: the same value in at least 90% of the (3 or more) calls that pass it.
	const seen = new Map<string, Map<string, number>>();
	for (const { calls } of mined) {
		for (const call of calls) {
			for (const [key, value] of leaves(call.input)) {
				const id = `${call.name}.${key}`;
				const counts = seen.get(id) ?? new Map<string, number>();
				counts.set(JSON.stringify(value), (counts.get(JSON.stringify(value)) ?? 0) + 1);
				seen.set(id, counts);
			}
		}
	}
	const constants = new Map<string, string>();
	for (const [id, counts] of seen) {
		const [[value, n]] = [...counts].sort((a, b) => b[1] - a[1]);
		const all = [...counts.values()].reduce((sum, count) => sum + count, 0);
		if (all >= 3 && n / all >= 0.9 && value !== '""') constants.set(id, value);
	}

	const sources = new Map<string, number>();
	for (const minedRun of mined) {
		minedRun.traces = minedRun.calls.map((call, index) =>
			Object.fromEntries(
				leaves(call.input).map(([key, value]) => {
					const source = traceArg(
						`${call.name}.${key}`,
						value,
						minedRun.text,
						minedRun.calls,
						index,
						constants,
					);
					sources.set(source.src, (sources.get(source.src) ?? 0) + 1);
					return [key, source];
				}),
			),
		);
	}
	const count = (src: string) => sources.get(src) ?? 0;
	const traced = count('const') + count('blank') + count('input') + count('step') + count('items');
	// Decisions and free text are not traced: rules and small AI steps make them.
	const checkable = traced + count('untraced') + count('unknown');
	const notKept = mined.some(({ calls }) => calls.some((call) => call.input === undefined));
	const tracedShare = checkable ? traced / checkable : notKept ? null : 1;

	const covered =
		((pathCounts.get(pathTable[0][0]) ?? 0) +
			(branchPath ? (pathCounts.get(branchPath) ?? 0) : 0)) /
		runs.length;
	const success = runs.filter((run) => run.succeeded).length / runs.length;

	const why: string[] = [];
	if (runs.length < MIN_GROUP_RUNS) why.push(`only ${runs.length} runs`);
	if (covered < MIN_PATH_SHARE) {
		why.push(`${branchPath ? 'two main paths cover' : 'dominant path'} only ${pct(covered)}`);
	}
	if (success < MIN_SUCCESS) why.push(`success ${pct(success)}`);
	if (tracedShare === null) why.push('no args recorded');
	else if (tracedShare < MIN_TRACED) why.push(`only ${pct(tracedShare)} of args traceable`);
	const convert = why.length === 0;
	if (convert) {
		why.push(
			`${pct(covered)} on ${branchPath ? 'two paths' : 'one path'}, ${pct(success)} succeed, ${tracedShare === null ? '?' : pct(tracedShare)} of args traced`,
		);
	}

	return {
		label,
		runs: mined,
		share: runs.length / totalRuns,
		pathTable,
		dominantPath: pathTable[0][0],
		branchPath,
		covered,
		traced: tracedShare,
		success,
		examples: [...new Set(mined.map(({ text }) => text))].slice(0, 3),
		convert,
		why: why.join('; '),
	};
}

export type ItemRule = {
	/** Tool whose results hold the items. */
	from: string;
	/** Path of the key value in that tool's result, e.g. `products[*].variants[*].sku`. */
	path: string | null;
	key: string;
	field: string;
	threshold: number;
	recall: number;
	precision: number;
};

function objectsIn(value: JSONValue | undefined, out: JSONObject[] = []): JSONObject[] {
	if (Array.isArray(value)) for (const child of value) objectsIn(child, out);
	else if (value && typeof value === 'object') {
		out.push(value);
		for (const child of Object.values(value)) objectsIn(child, out);
	}
	return out;
}

/**
 * One-split decision stump for "which items did the agent act on": items are
 * objects in earlier results; chosen ones are those whose key value shows up in
 * the arguments of `tool`. Thresholds are ranked by F1, since few items are chosen.
 */
export function learnItemRule(runs: MinedRun[], tool: string): ItemRule | null {
	const rows: Array<{ chosen: boolean; item: JSONObject }> = [];
	let key: string | undefined;
	let origin: { from: string; path: string | null } | undefined;
	for (const { calls } of runs) {
		const acted = JSON.stringify(
			calls.filter((call) => call.name === tool).map((call) => call.input),
		);
		const sources = calls.filter((call) => call.name !== tool && call.output !== undefined);
		const items = sources.flatMap((call) => objectsIn(call.output));
		key ??= items
			.filter((item) =>
				Object.entries(item).some(([field, v]) => typeof v === 'number' && !/id$/i.test(field)),
			)
			.flatMap((item) =>
				Object.entries(item)
					.filter(([, v]) => typeof v === 'string' && v.length >= 5 && acted.includes(v))
					.map(([field]) => field),
			)[0];
		if (!key) continue;
		const pickedKey = key;
		if (!origin) {
			const hit = items.find((item) => {
				const v = item[pickedKey];
				return typeof v === 'string' && acted.includes(v);
			});
			const value = hit?.[pickedKey];
			const from =
				value !== undefined ? sources.find((call) => inJson(call.output, value)) : undefined;
			if (from && value !== undefined)
				origin = { from: from.name, path: findPath(from.output, value) };
		}
		for (const item of items) {
			const v = item[pickedKey];
			if (typeof v === 'string') rows.push({ chosen: acted.includes(v), item });
		}
	}
	const chosen = rows.filter((row) => row.chosen).length;
	if (!key || !origin || chosen === 0) return null;

	let best: ItemRule | null = null;
	let bestF1 = -1;
	const fields = Object.keys(rows[0].item).filter(
		(field) => typeof rows[0].item[field] === 'number' && !/id$/i.test(field),
	);
	for (const field of fields) {
		for (const threshold of new Set(rows.map((row) => row.item[field]))) {
			if (typeof threshold !== 'number') continue;
			const picked = rows.filter((row) => Number(row.item[field]) <= threshold);
			const truePositives = picked.filter((row) => row.chosen).length;
			const precision = truePositives / (picked.length || 1);
			const recall = truePositives / chosen;
			const f1 = (2 * precision * recall) / (precision + recall || 1);
			if (f1 > bestF1) {
				bestF1 = f1;
				best = { ...origin, key, field, threshold, recall, precision };
			}
		}
	}
	return best;
}
