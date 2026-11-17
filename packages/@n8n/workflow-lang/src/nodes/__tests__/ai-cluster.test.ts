/**
 * Equivalence of the AI nodes with v1, through the converter.
 *
 * Each case is a workflow: a webhook, a Split Out node that gives the input items, and the
 * AI node with its sub-nodes and node settings. `v1-requests.json` holds what n8n's engine
 * did for the node (the requests of the LangChain clients, the outputs, the error, and the
 * runs of the sub-nodes). The test converts the workflow, runs the converted source in the
 * reference runner and as bytecode, and compares: the requests after the credential is
 * applied, the items of each output, the error, and the traced runs of the sub-nodes.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { nativeCluster } from '../../convert/ai-cluster.ts';
import { convertWorkflow } from '../../convert/index.ts';
import { withDerivedValues } from '../../credentials/derived.ts';
import { deriveInject } from '../../credentials/inject.ts';
import { DEFAULT_NODE_PACKAGES, loadCredentialTypes, registryOf } from '../../credentials/types.ts';
import { evaluateCredentialFlags, unprovenFlagNodes } from '../../node-compile/evaluate-node.ts';
import type { Fixture } from '../../reference/runner.ts';
import { runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';
import { ENGINE_CASES, AI_HOST_CASES } from './ai-cases.ts';
import type { EquivalenceCase, NormalRequest, Recording } from './equivalence.ts';
import {
	applyCredential,
	errorDetailOfResult,
	networkErrorText,
	normalizeRequest,
} from './equivalence.ts';

const here = dirname(fileURLToPath(import.meta.url));
const recordings: Record<string, Recording> = JSON.parse(
	readFileSync(join(here, 'v1-requests.json'), 'utf8'),
);
const typesBuilt = existsSync(join(DEFAULT_NODE_PACKAGES[0], 'dist/known/credentials.json'));

const NODE = 'Node';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The workflow of a case: the input items come from the body of the webhook. */
function workflowOf(c: EquivalenceCase): unknown {
	const credentials = c.credential
		? { credentials: { [c.credential.type]: { id: '1', name: 'Case credential' } } }
		: {};
	const subs = c.subNodes ?? [];
	return {
		name: 'Case',
		nodes: [
			{
				id: 'w',
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				parameters: { path: 'hook', httpMethod: 'POST' },
			},
			{
				id: 's',
				name: 'Items',
				type: 'n8n-nodes-base.splitOut',
				typeVersion: 1,
				position: [200, 0],
				parameters: { fieldToSplitOut: 'body.items', options: {} },
			},
			{
				id: 'n',
				name: NODE,
				type: c.type,
				typeVersion: c.typeVersion,
				position: [400, 0],
				parameters: c.parameters,
				...c.settings,
				...(subs.length === 0 ? credentials : {}),
			},
			...subs.map((sub, k) => ({
				id: `sub${k}`,
				name: sub.name,
				type: sub.type,
				typeVersion: sub.typeVersion,
				position: [400, 200 + 100 * k],
				parameters: sub.parameters,
				...credentials,
			})),
		],
		connections: {
			Webhook: { main: [[{ node: 'Items', type: 'main', index: 0 }]] },
			Items: { main: [[{ node: NODE, type: 'main', index: 0 }]] },
			...Object.fromEntries(
				subs.map((sub) => [
					sub.name,
					{ [sub.connection]: [[{ node: NODE, type: sub.connection, index: 0 }]] },
				]),
			),
		},
		settings: { executionOrder: 'v1' },
	};
}

function converted(c: EquivalenceCase) {
	const result = convertWorkflow(workflowOf(c), { trace: 'all' });
	expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
	return result;
}

/** The fixture of a run: the answers of the case, and the flags of its credential. */
function fixtureOf(c: EquivalenceCase, result: ReturnType<typeof convertWorkflow>): Fixture {
	const credentialFlags: Record<string, Record<string, boolean>> = {};
	for (const [slot, derivations] of Object.entries(result.credentialDerivations ?? {})) {
		credentialFlags[slot] = evaluateCredentialFlags(derivations, c.credential?.data ?? {}).flags;
	}
	return {
		trigger: { body: { items: c.items ?? [{}] }, headers: {}, query: {} },
		now: 0,
		seed: 1,
		trace: true,
		effects: {
			[NODE]: c.responses.map((r) =>
				r.networkError
					? { $error: networkErrorText(r.networkError) }
					: { status: 200, headers: {}, ...r },
			),
		},
		credentialFlags,
	};
}

interface Trace {
	step: string;
	items: unknown;
}

/** What the traces of a run say about a node: the items of each output, the error, the sub-runs. */
function traced(traces: Trace[], name: string) {
	const outputs: unknown[][] = [];
	const subRuns: unknown[] = [];
	let error: string | undefined;
	for (const t of traces.filter((x) => x.step === name)) {
		if (isRecord(t.items) && Array.isArray(t.items.$subRuns)) {
			subRuns.push(...t.items.$subRuns);
		} else if (isRecord(t.items) && isRecord(t.items.$error)) {
			error = String(t.items.$error.message);
		} else if (Array.isArray(t.items)) {
			const lists =
				t.items.every((x) => Array.isArray(x)) && t.items.length > 0 ? t.items : [t.items];
			lists.forEach((list, k) => {
				outputs[k] = [...(outputs[k] ?? []), ...(Array.isArray(list) ? list : [])];
			});
		}
	}
	return { outputs, subRuns, error };
}

describe.runIf(typesBuilt)('AI nodes through the converter, against n8n engine recordings', () => {
	const registry = registryOf(loadCredentialTypes().types);

	describe.each(ENGINE_CASES.map((c) => ({ ...c, label: c.name })))('$label', (c) => {
		const recording = recordings[c.name];

		it('has a v1 recording of the result that the case names', () => {
			expect(recording).toBeDefined();
			expect(recording.error).toBe(c.expectedError);
		});

		it('runs as a library node, and the proof covers its credential', () => {
			const result = converted(c);
			expect(result.fallbackNodes ?? []).not.toContain(NODE);
			expect(compile(result.source).diagnostics).toEqual([]);
			for (const derivations of Object.values(result.credentialDerivations ?? {})) {
				expect(unprovenFlagNodes(derivations, c.credential?.data)).toEqual([]);
			}
		});

		it('gives the same result from the bytecode as from the reference runner', async () => {
			const result = converted(c);
			const fixture = fixtureOf(c, result);
			const compiled = compile(result.source);
			expect(compiled.module).toBeDefined();
			const reference = await runReference(result.source, fixture);
			const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
			expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
		});

		it('sends the same requests, and gives the same outputs, error and sub-node runs', async () => {
			const result = converted(c);
			const out = await runReference(result.source, fixtureOf(c, result));
			const data = withDerivedValues(c.credential?.type ?? '', {
				...(registry.get(c.credential?.type ?? '')?.defaults ?? {}),
				...c.credential?.data,
			});
			const inject = c.credential
				? deriveInject(registry, c.credential.type, data).inject
				: undefined;
			const effects = out.effects.filter((e) => e.step === NODE || e.step.startsWith(`${NODE} `));
			const requests: NormalRequest[] = effects
				.filter((e) => e.kind === 'http')
				.map((effect) => {
					const args = isRecord(effect.args) ? effect.args : {};
					const { qsFormat: _format, ...request } = normalizeRequest(
						applyCredential(
							{
								method: String(args.method),
								url: String(args.url),
								headers: args.headers,
								qs: args.qs,
								body: args.body,
								inject: args.inject,
							},
							inject,
							data,
						),
					);
					return request;
				});
			expect(requests).toEqual(recording.requests.map(({ qsFormat: _format, ...r }) => r));
			// The waits: between the tries of the engine, of LangChain's caller, and between batches.
			for (const effect of effects.filter((e) => e.kind === 'wait')) {
				const duration = isRecord(effect.args) ? Number(effect.args.duration) : Number.NaN;
				expect(duration).toBeGreaterThanOrEqual(10);
				expect(duration).toBeLessThan(64000);
			}
			const node = traced(out.trace ?? [], NODE);
			expect(node.error).toBe(recording.error);
			expect(out.status).toBe(recording.error === undefined ? 'ok' : 'error');
			// A description that the library node gives is the description of v1.
			const detail = errorDetailOfResult(out.result);
			if (recording.error !== undefined && detail.description !== null) {
				expect(detail.description).toBe(recording.errorDetail?.description);
			}
			if (recording.error === undefined) {
				const outputs = recording.outputs ?? [];
				expect(node.outputs).toEqual(outputs.length === 0 ? [[]] : outputs);
			}
			for (const sub of c.subNodes ?? []) {
				expect(traced(out.trace ?? [], sub.name).subRuns).toEqual(
					recording.subRuns?.[sub.name] ?? [],
				);
			}
		});
	});

	describe('the window buffer memory between executions', () => {
		const c = ENGINE_CASES.find((x) => x.name === 'agent memory, window of one exchange');
		const HOUR = 60 * 60 * 1000;

		/** The messages of each request of a run that starts with the static data of another run. */
		async function messagesOf(staticData: Record<string, unknown>, now: number) {
			if (c === undefined) throw new Error('The case is missing');
			const result = converted(c);
			const fixture = { ...fixtureOf(c, result), staticData, now };
			const out = await runReference(result.source, fixture);
			const compiled = compile(result.source);
			const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
			expect(JSON.stringify(bytecode)).toBe(JSON.stringify(out));
			const messages = out.effects
				.filter((e) => e.kind === 'http')
				.map((e) => (isRecord(e.args) && isRecord(e.args.body) ? e.args.body.messages : undefined));
			return { messages, staticData: out.staticData };
		}

		it('gives the next execution the window of the session', async () => {
			const first = await messagesOf({}, 1000);
			const second = await messagesOf(first.staticData ?? {}, 1000 + HOUR);
			expect(second.messages[0]).toEqual([
				{ role: 'system', content: 'Be brief' },
				{ role: 'user', content: 'three' },
				{ role: 'assistant', content: 'third' },
				{ role: 'user', content: 'one' },
			]);
		});

		it('drops a session that no agent used for more than one hour', async () => {
			const first = await messagesOf({}, 1000);
			const second = await messagesOf(first.staticData ?? {}, 1001 + HOUR);
			expect(second.messages[0]).toEqual([
				{ role: 'system', content: 'Be brief' },
				{ role: 'user', content: 'one' },
			]);
		});

		it('keeps only the window of each session', async () => {
			const first = await messagesOf({}, 1000);
			const store = Object.values(first.staticData ?? {})[0];
			const session = isRecord(store) ? store['s:key-window'] : undefined;
			expect(isRecord(session) ? session.messages : undefined).toEqual([
				{ ai: false, text: 'three' },
				{ ai: true, text: 'third' },
			]);
		});
	});

	describe('agent shapes that stay in the fallback host', () => {
		const LC = '@n8n/n8n-nodes-langchain.';
		const root = { name: NODE, type: `${LC}agent`, typeVersion: 3.1 };
		const parameters = { promptType: 'define', text: 'Hi', options: {} };
		const model = {
			name: 'Model',
			type: `${LC}lmChatOpenAi`,
			typeVersion: 1.2,
			parameters: { model: { __rl: true, mode: 'list', value: 'gpt-4o' }, options: {} },
			connection: 'ai_languageModel',
		};
		const memory = (memoryParameters: Record<string, unknown>, typeVersion = 1.3) => ({
			name: 'Memory',
			type: `${LC}memoryBufferWindow`,
			typeVersion,
			parameters: memoryParameters,
			connection: 'ai_memory',
		});
		const custom = { sessionIdType: 'customKey', sessionKey: 'k' };

		it.each([
			['tools', [model, { ...model, name: 'Tool', type: `${LC}toolCode`, connection: 'ai_tool' }]],
			[
				'output parser',
				[
					model,
					{
						...model,
						name: 'P',
						type: `${LC}outputParserStructured`,
						connection: 'ai_outputParser',
					},
				],
			],
			[
				'memory memoryPostgresChat',
				[model, { ...memory(custom), type: `${LC}memoryPostgresChat` }],
			],
			['memory session from the input', [model, memory({})]],
			['memory window', [model, memory({ ...custom, contextWindowLength: 0 })]],
			['memory window', [model, memory({ ...custom, contextWindowLength: '={{ $json.k }}' })]],
			['memory version 2', [model, memory(custom, 2)]],
		])('gives the reason "%s"', (reason, subs) => {
			expect(nativeCluster(root, parameters, subs)).toBe(reason);
		});

		it('keeps a memory with batches of more than one item in the host', () => {
			const batched = { ...parameters, options: { batching: { batchSize: 2 } } };
			expect(nativeCluster(root, batched, [model, memory(custom)])).toBe('memory with batches');
		});

		it('keeps a session key expression with an error setting in the host', () => {
			const subs = [model, memory({ ...custom, sessionKey: '={{ $json.id }}' })];
			const reason = 'memory key expression with an error setting';
			const streams = { streams: false };
			expect(nativeCluster(root, parameters, subs, streams, { retryOnFail: true })).toBe(reason);
			expect(
				nativeCluster(root, parameters, subs, streams, { onError: 'continueRegularOutput' }),
			).toBe(reason);
			expect(typeof nativeCluster(root, parameters, subs, streams, {})).toBe('object');
		});
	});

	describe.each(AI_HOST_CASES.map((c) => ({ ...c, label: c.name })))('$label', (c) => {
		it('names the node for the fallback host, because the proof does not cover its credential', () => {
			const result = converted(c);
			const unproven = Object.values(result.credentialDerivations ?? {}).flatMap((derivations) =>
				unprovenFlagNodes(derivations, c.credential?.data),
			);
			expect(unproven).toEqual([NODE]);
		});
	});
});
