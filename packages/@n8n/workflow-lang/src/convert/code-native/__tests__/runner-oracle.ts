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
	/** The error setting of the Code node. */
	onError?: 'continueRegularOutput' | 'continueErrorOutput';
	/** The output to read. The default is 0. */
	output?: number;
	/** Other settings of the Code node, for example `retryOnFail`. */
	settings?: Record<string, unknown>;
}

const LIFT =
	'return items.map((i) => { const { $binary, ...json } = i.json; return $binary ? { json, binary: $binary } : { json }; });';

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
		nodes.push(
			node(`${name} data`, 'n8n-nodes-testing.testData', { data: JSON.stringify(list) }),
			node(name, 'n8n-nodes-base.code', { jsCode: LIFT }),
		);
		chain.push(`${name} data`, name);
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
	options: Pick<RunnerOptions, 'nodes'> & {
		effects?: Record<string, unknown[]>;
		/** What the converter knows of the workflow, for example `pairsByPosition`. */
		known?: Partial<CodeNativeInput>;
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
		trigger: { body: { input: items, nodes: t.translation.nodes.map((n) => options.nodes?.[n]) } },
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
