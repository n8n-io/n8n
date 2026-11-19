/**
 * The oracle of the Code node tests: n8n's real Code node with its real task runner
 * (`../../__tests__/behaviour/task-runner.ts` says exactly what runs).
 *
 * `runnerCode` runs code in a small workflow in n8n's engine. Test data nodes give the
 * input items and the items of the nodes that the code reads. An item with a `$binary`
 * member gets it as its binary data, through a Code node that the same runner runs.
 */
import { runOracle } from '../../__tests__/behaviour/oracle-engine.ts';
import { startTaskRunner, taskRunnerAvailable } from '../../__tests__/behaviour/task-runner.ts';
import { runModule } from '../../../testing/vm.ts';
import { checkTranslation } from '../check.ts';
import type { CodeMode, CodeNativeInput } from '../translate.ts';
import { translateCode } from '../translate.ts';

export { taskRunnerAvailable };

/** Starts the task runner; a suite calls it before its first case. */
export async function startRunner(): Promise<void> {
	await startTaskRunner();
}

export type RunnerOutcome = { ok: true; value: unknown[] } | { ok: false; error: string };

export interface RunnerOptions {
	/** The items of other nodes that ran before, by node name, in the order in which they ran. */
	nodes?: Record<string, unknown[]>;
	/**
	 * The items of another output of a node that ran before, by `<node>@<output>`. The other
	 * outputs use `nodes` (output 0).
	 */
	outputs?: Record<string, unknown[]>;
	/** The output of the code's own node that the check reads. The default is 0. */
	output?: number;
	/** The error of the node, or the items of its output. */
	onError?: 'continueRegularOutput' | 'continueErrorOutput';
	/** Other settings of the Code node, for example `retryOnFail`. */
	settings?: Record<string, unknown>;
	/**
	 * The paired item of each item of a node that ran before, by node name. The default is the
	 * position of the item, as v1 pairs the items of a Code node that gives none.
	 */
	paired?: Record<string, number[]>;
	/**
	 * A node that gives a fixed list, whatever its input is, with a fixed paired item for each
	 * item: the shape of a node that drops some of its input items (a Filter).
	 */
	fixed?: Record<string, { items: unknown[]; paired: number[] }>;
}

const LIFT =
	'return items.map((i) => { const { $binary, ...json } = i.json; return $binary ? { json, binary: $binary } : { json }; });';

/** The body of a Code node that gives a fixed list with a fixed paired item for each item. */
const fixedWith = (items: unknown[], paired: number[]) =>
	`return ${JSON.stringify(items)}.map((json, k) => ({ json, pairedItem: { item: ${JSON.stringify(paired)}[k] } }));`;

/** The body of a Code node that lifts the items and gives each one its own paired item. */
const liftWith = (paired: number[]) =>
	`return items.map((i, k) => { const { $binary, ...json } = i.json; const out = $binary ? { json, binary: $binary } : { json }; out.pairedItem = { item: ${JSON.stringify(paired)}[k] }; return out; });`;

const node = (name: string, type: string, parameters: Record<string, unknown>) => ({
	name,
	type,
	typeVersion: type.endsWith('.code') ? 2 : 1,
	position: [0, 0],
	parameters,
});

/** Runs `code` as a Code node with the name "Code" on `items`, in n8n's engine and task runner. */
export async function runnerCode(
	code: string,
	mode: CodeMode,
	items: unknown[],
	options: RunnerOptions = {},
): Promise<RunnerOutcome> {
	const runner = await startTaskRunner();
	const sources = [...Object.entries(options.nodes ?? {}), ['Input', items] as const];
	const nodes: Array<Record<string, unknown>> = [];
	const chain: string[] = [];
	for (const [name, list] of sources) {
		const fixed = options.fixed?.[name];
		if (!fixed) {
			nodes.push(
				node(`${name} data`, 'n8n-nodes-testing.testData', { data: JSON.stringify(list) }),
			);
			chain.push(`${name} data`);
		}
		nodes.push(
			node(name, 'n8n-nodes-base.code', {
				jsCode: fixed
					? fixedWith(fixed.items, fixed.paired)
					: options.paired?.[name]
						? liftWith(options.paired[name])
						: LIFT,
			}),
		);
		chain.push(name);
	}
	nodes.push({
		...node('Code', 'n8n-nodes-base.code', {
			jsCode: code,
			...(mode === 'each' ? { mode: 'runOnceForEachItem' } : {}),
		}),
		...(options.onError ? { onError: options.onError } : {}),
		...options.settings,
	});
	chain.push('Code');
	const connections = Object.fromEntries(
		chain
			.slice(0, -1)
			.map((name, k) => [name, { main: [[{ node: chain[k + 1], type: 'main', index: 0 }]] }]),
	);
	const result = await runOracle(
		{ name: 'Code oracle', nodes: nodes as never, connections },
		{
			start: chain[0],
			item: {},
			mode: 'trigger',
			withBinary: true,
			timeoutMs: 30_000,
			additionalData: { startRunnerTask: runner.startRunnerTask },
		},
	);
	if (result.error !== null) return { ok: false, error: result.error };
	return { ok: true, value: result.nodes.Code?.[options.output ?? 0] ?? [] };
}

/**
 * Runs `code` as native code in the bytecode VM on the same items: the result list, or the
 * message of the error of the node. It throws when the code has no native form.
 */
export function nativeCode(
	code: string,
	mode: CodeMode,
	items: unknown[],
	options: Pick<RunnerOptions, 'nodes' | 'outputs'> & {
		effects?: Record<string, unknown[]>;
		/** What the converter knows of the workflow, for example `pairsByPosition`. */
		known?: Partial<CodeNativeInput>;
		/** The values of the workflow variables of a paired index code (`trigger.body.pairs`). */
		pairValues?: unknown[];
	} = {},
): RunnerOutcome {
	const names = Object.keys(options.nodes ?? {});
	const input = {
		code,
		mode,
		kind: 'code' as const,
		hasNode: (name: string) => names.includes(name),
		timezone: 'system',
		itemsOfFirstOnly: false,
		dateValues: true,
		...options.known,
	};
	const t = translateCode(input);
	if (!t.ok) throw new Error(`blocked: ${t.blockers.map((b) => b.feature).join(', ')}`);
	const traced = translateCode({ ...input, traced: true });
	if (!traced.ok) {
		throw new Error(`traced form blocked: ${traced.blockers.map((b) => b.feature).join(', ')}`);
	}
	const c = checkTranslation(t.translation, mode, false, traced.translation);
	if (!c.ok) throw new Error(`does not compile: ${c.blockers.map((b) => b.message).join('; ')}`);
	if (!c.compiled.data) throw new Error('no module');
	const out = runModule(c.compiled.data, {
		trigger: {
			body: {
				input: items,
				pairs: options.pairValues ?? [],
				nodes: t.translation.nodes.map(
					(n) => options.outputs?.[`${n.name}@${n.output}`] ?? options.nodes?.[n.name],
				),
			},
		},
		now: 1_700_000_000_000,
		seed: 1,
		effects: options.effects ?? {},
	});
	if (out.status === 'ok') return { ok: true, value: out.result as unknown[] };
	const r: unknown = out.result;
	const message =
		typeof r === 'object' && r !== null ? String(Reflect.get(r, 'message')) : String(r);
	return { ok: false, error: message };
}
