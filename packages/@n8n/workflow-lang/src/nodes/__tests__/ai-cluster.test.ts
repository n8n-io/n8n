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
import { ChatMemoryStore } from '../../services/chat-memory.ts';
import { runModule } from '../../testing/vm.ts';
import {
	ENGINE_CASES,
	AI_HOST_CASES,
	BINARY_HOST_CASES,
	TOOL_PENDING_CASES,
	TOOL_PROBE_CASES,
} from './ai-cases.ts';
import { ERROR_ITEM_CASES } from './equivalence-cases.ts';
import type { EquivalenceCase, NormalRequest, Recording } from './equivalence.ts';
import {
	applyCredential,
	errorDetailOfResult,
	networkErrorText,
	normalizeRequest,
} from './equivalence.ts';

const here = dirname(fileURLToPath(import.meta.url));
// A recording that is made after `v1-requests.json` got its largest size is in the second file.
const recordings: Record<string, Recording> = {
	...JSON.parse(readFileSync(join(here, 'v1-requests.json'), 'utf8')),
	...JSON.parse(readFileSync(join(here, 'v1-requests-added.json'), 'utf8')),
};
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
				// A tool node of these cases has no credential.
				...(sub.connection === 'ai_tool' ? {} : credentials),
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
	const result = convertWorkflow(workflowOf(c), { trace: 'all', chatMemory: true });
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

/**
 * The answers of the service `chatMemory` to the calls, from the store that n8n uses
 * (`ChatMemoryStore`). `before` has the calls of earlier executions of the workflow.
 */
function memoryAnswers(
	calls: Array<Record<string, unknown>>,
	before: Array<Record<string, unknown>> = [],
	maxBytes = 1_000_000,
): unknown[] {
	const store = new ChatMemoryStore({ maxBytes, now: () => 0 });
	return [...before, ...calls]
		.map((call) => {
			const answer = store.run(
				{
					service: 'chatMemory',
					op: String(call.op),
					args: isRecord(call.args) ? call.args : {},
				},
				'wf1',
			);
			if (!answer.ok) throw new Error(answer.error.message);
			return answer.result;
		})
		.slice(before.length);
}

/** The service calls of the node in a run, in their order. */
function serviceCalls(out: Awaited<ReturnType<typeof runReference>>) {
	return out.effects
		.filter((e) => e.step === NODE && e.kind === 'service')
		.map((e) => (isRecord(e.args) ? e.args : {}));
}

/**
 * The fixture of a case with a memory or with tools. The case has one list of answers, in
 * the order in which v1 asks for them. The answers of the memory service go between the
 * answers of the model, and each tool step gets the answers of its own requests. Each run
 * shows the place of one more call.
 */
async function withMemory(
	source: string,
	fixture: Fixture,
	before: Array<Record<string, unknown>> = [],
	maxBytes?: number,
	tools: string[] = [],
): Promise<Fixture> {
	const http = fixture.effects[NODE];
	const steps = [NODE, ...tools];
	for (let round = 0; round < 64; round++) {
		const out = await runReference(source, fixture);
		const effects = out.effects.filter((e) => steps.includes(e.step) && e.kind !== 'wait');
		const answers = memoryAnswers(serviceCalls(out), before, maxBytes);
		const lists: Record<string, unknown[]> = { [NODE]: [] };
		let model = 0;
		let service = 0;
		for (const effect of effects) {
			const list = lists[effect.step] ?? [];
			lists[effect.step] = list;
			if (effect.kind === 'service') list.push(answers[service++]);
			else list.push(http[model++ % http.length]);
		}
		for (let k = model; k < http.length; k++) lists[NODE].push(http[k]);
		const now = Object.fromEntries(steps.map((step) => [step, fixture.effects[step] ?? []]));
		const next = Object.fromEntries(steps.map((step) => [step, lists[step] ?? []]));
		if (JSON.stringify(next) === JSON.stringify(now)) return fixture;
		fixture = { ...fixture, effects: { ...fixture.effects, ...next } };
	}
	throw new Error('The order of the calls does not settle');
}

/** The names of the tool nodes of a case. */
function toolsOf(c: EquivalenceCase): string[] {
	return (c.subNodes ?? []).filter((sub) => sub.connection === 'ai_tool').map((sub) => sub.name);
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

	// The cases of the AI nodes, and the error items of the other library nodes.
	const cases = [...ENGINE_CASES, ...ERROR_ITEM_CASES];
	describe.each(cases.map((c) => ({ ...c, label: c.name })))('$label', (c) => {
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
			const fixture = await withMemory(
				result.source,
				fixtureOf(c, result),
				[],
				undefined,
				toolsOf(c),
			);
			const compiled = compile(result.source);
			expect(compiled.module).toBeDefined();
			const reference = await runReference(result.source, fixture);
			const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
			expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
		});

		it('sends the same requests, and gives the same outputs, error and sub-node runs', async () => {
			const result = converted(c);
			const out = await runReference(
				result.source,
				await withMemory(result.source, fixtureOf(c, result), [], undefined, toolsOf(c)),
			);
			const data = withDerivedValues(c.credential?.type ?? '', {
				...(registry.get(c.credential?.type ?? '')?.defaults ?? {}),
				...c.credential?.data,
			});
			const inject = c.credential
				? deriveInject(registry, c.credential.type, data).inject
				: undefined;
			const tools = toolsOf(c);
			const effects = out.effects.filter(
				(e) => e.step === NODE || e.step.startsWith(`${NODE} `) || tools.includes(e.step),
			);
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
							// The credential of the case is the credential of the model.
							tools.includes(effect.step) ? undefined : inject,
							data,
						),
					);
					return request;
				});
			// Before version 3 LangChain starts the tools of an answer together, so v1 sends
			// their requests in no fixed order. The compiled form sends them in the order of
			// the calls. The requests between two calls of the model compare as a set.
			const unordered = c.typeVersion < 3 && tools.length > 0;
			const settled = (list: NormalRequest[]): NormalRequest[] => {
				if (!unordered) return list;
				const out: NormalRequest[] = [];
				let group: NormalRequest[] = [];
				const flush = () => {
					group.sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y)));
					out.push(...group);
					group = [];
				};
				for (const request of list) {
					if (request.url.endsWith('/chat/completions')) {
						flush();
						out.push(request);
					} else group.push(request);
				}
				flush();
				return out;
			};
			expect(settled(requests)).toEqual(
				settled(recording.requests.map(({ qsFormat: _format, ...r }) => r)),
			);
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
			// A recording made before the recorder kept the detail has none: it is compared after it is made again.
			if (
				recording.error !== undefined &&
				detail.description !== null &&
				recording.errorDetail !== undefined
			) {
				expect(detail.description).toBe(recording.errorDetail?.description);
			}
			if (recording.error === undefined) {
				// A node that threw under a continue setting has no run data for its error output.
				const outputs = recording.outputs ?? [];
				const given =
					recording.nodeError !== undefined && node.outputs[1]?.length === 0
						? node.outputs.slice(0, 1)
						: node.outputs;
				expect(given).toEqual(outputs.length === 0 ? [[]] : outputs);
			}
			for (const sub of c.subNodes ?? []) {
				expect(traced(out.trace ?? [], sub.name).subRuns).toEqual(
					recording.subRuns?.[sub.name] ?? [],
				);
			}
		});
	});

	describe.each(TOOL_PROBE_CASES.map((c) => ({ ...c, label: c.name })))('$label', (c) => {
		const recording = recordings[c.name];

		it('has the v1 recording: the model, the tool, then the model with the result', () => {
			expect(recording.error).toBeUndefined();
			expect(recording.requests.map((r) => r.url)).toEqual([
				'https://api.openai.com/v1/chat/completions',
				'https://example.com/a',
				'https://api.openai.com/v1/chat/completions',
			]);
			const first = recording.requests[0].body;
			expect(isRecord(first) ? first.tools : undefined).toEqual([
				{
					type: 'function',
					function: {
						name: 'Fetch_page',
						description: 'Gets a page',
						parameters: {
							type: 'object',
							properties: { url: { type: 'string', description: 'The address of the page' } },
							required: ['url'],
							additionalProperties: false,
							$schema: 'http://json-schema.org/draft-07/schema#',
						},
						strict: false,
					},
				},
			]);
			expect(recording.subRuns).toEqual({
				Model: [{ error: null }, { error: null }],
				'Fetch page': [{ error: null }],
			});
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
			[
				'tool toolCode',
				[model, { ...model, name: 'Tool', type: `${LC}toolCode`, connection: 'ai_tool' }],
			],
			[
				'output parser',
				['P', 'Q'].reduce(
					(subs, name) => [
						...subs,
						{
							...model,
							name,
							type: `${LC}outputParserStructured`,
							connection: 'ai_outputParser',
						},
					],
					[model],
				),
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

		it('keeps a memory in the host when the client does not answer the service', () => {
			const c = ENGINE_CASES.find((x) => x.name === 'agent memory, version 3.1');
			const result = convertWorkflow(c ? workflowOf(c) : {}, { trace: 'all' });
			expect(result.fallbackNodes).toContain(NODE);
			const without = convertWorkflow(c ? workflowOf(c) : {}, {
				chatMemory: true,
				services: false,
			});
			expect(without.fallbackNodes).toContain(NODE);
		});

		it.each(
			TOOL_PENDING_CASES.filter((c) => c.name.includes('JSON argument')).map(
				(c) => [c.name, c] as const,
			),
		)('keeps "%s" in the host, and says why', (_name, c) => {
			const result = converted(c);
			expect(result.fallbackNodes).toContain(NODE);
			expect(result.diagnostics.map((d) => d.message)).toContain(
				'The agent with tools runs in the fallback host: tool argument in the parameter jsonBody.',
			);
		});

		it('gives the reason of a tool without a proof', () => {
			const tool = (extra: Record<string, unknown>) => ({
				name: 'Tool',
				type: 'n8n-nodes-base.httpRequestTool',
				typeVersion: 4.2,
				parameters: { toolDescription: 'Reads', url: 'https://example.com', options: {} },
				connection: 'ai_tool',
				workflowParameters: { url: 'https://example.com' },
				...extra,
			});
			const reason = (extra: Record<string, unknown>) =>
				nativeCluster(root, parameters, [model, tool(extra)]);
			expect(typeof reason({})).toBe('object');
			expect(reason({ type: 'n8n-nodes-base.slackTool' })).toBe('tool n8n-nodes-base.slackTool');
			expect(reason({ hasCredential: true })).toBe('tool with a credential');
			expect(reason({ hasSettings: true })).toBe('tool with node settings');
			expect(
				reason({
					parameters: {
						toolDescription: 'Reads',
						url: 'https://example.com',
						sendHeaders: true,
						headerParameters: { parameters: [{ name: 'x', value: "={{ $fromAI('x') }}" }] },
					},
				}),
			).toBe('tool argument in the parameter headerParameters.parameters.value');
			expect(reason({ parameters: { url: 'https://example.com', options: {} } })).toBe(
				'tool description',
			);
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

	describe('the window buffer memory with the session store of n8n', () => {
		const c = ENGINE_CASES.find((x) => x.name === 'agent memory, version 3.1');
		if (c === undefined) throw new Error('The case "agent memory, version 3.1" is missing');
		const recording = recordings[c.name];
		const items = c.items ?? [];
		const httpArgs = (out: Awaited<ReturnType<typeof runReference>>) =>
			out.effects.filter((e) => e.step === NODE && e.kind === 'http').map((e) => e.args);

		it('holds a conversation over two executions as v1 holds it over the items of one', async () => {
			const result = converted(c);
			const whole = await runReference(
				result.source,
				await withMemory(result.source, fixtureOf(c, result)),
			);
			// The first execution has the first question. The second has the others.
			const part = (from: number, to: number): Fixture => {
				const fixture = fixtureOf({ ...c, responses: c.responses.slice(from, to) }, result);
				return {
					...fixture,
					trigger: { body: { items: items.slice(from, to) }, headers: {}, query: {} },
				};
			};
			const first = await runReference(result.source, await withMemory(result.source, part(0, 1)));
			const second = await runReference(
				result.source,
				await withMemory(result.source, part(1, items.length), serviceCalls(first)),
			);
			expect(items.length).toBeGreaterThan(1);
			expect(first.status).toBe('ok');
			expect(second.status).toBe('ok');
			// Each execution opens the session once. The second finds the exchange of the first.
			expect(serviceCalls(first).map((x) => x.op)).toEqual(['open', 'load', 'save']);
			expect(serviceCalls(second).filter((x) => x.op === 'open')).toHaveLength(1);
			expect([...httpArgs(first), ...httpArgs(second)]).toEqual(httpArgs(whole));
			expect(httpArgs(whole)).toHaveLength(recording.requests.length);
			expect([
				...(traced(first.trace ?? [], NODE).outputs[0] ?? []),
				...(traced(second.trace ?? [], NODE).outputs[0] ?? []),
			]).toEqual(recording.outputs?.[0]);
		});

		it('runs the cluster in the fallback host when the store takes no new session', async () => {
			const result = converted(c);
			expect(result.fallbackNodes ?? []).not.toContain(NODE);
			expect(compile(result.source).diagnostics).toEqual([]);
			const hostStep = `${NODE} (fallback host)`;
			const answer = [{ json: { output: 'from the host' } }];
			const fixture: Fixture = {
				...fixtureOf(c, result),
				effects: {
					// A store without room: `open` answers `{ host: true }`.
					[NODE]: memoryAnswers([{ op: 'open', args: { sessionKey: 'k', window: 5 } }], [], 0),
					[hostStep]: [[{ items: answer }, { subRuns: { Memory: [{ error: null }] } }]],
				},
			};
			expect(fixture.effects[NODE]).toEqual([{ host: true }]);
			const out = await runReference(result.source, fixture);
			expect(out.status).toBe('ok');
			// The library node sends no request to the model and writes nothing to the store.
			expect(out.effects.filter((e) => e.step === NODE).map((e) => e.kind)).toEqual(['service']);
			const host = out.effects.filter((e) => e.step === hostStep);
			expect(host.map((e) => e.kind)).toEqual(['node']);
			const args = isRecord(host[0].args) ? host[0].args : {};
			expect(args.type).toBe(c.type);
			const subNodes = Array.isArray(args.subNodes) ? args.subNodes : [];
			expect(subNodes.map((sub) => (isRecord(sub) ? sub.target : undefined))).toEqual(
				subNodes.map(() => hostStep),
			);
			expect(traced(out.trace ?? [], NODE).outputs).toEqual([answer]);
			expect(traced(out.trace ?? [], 'Memory').subRuns).toEqual([{ error: null }]);
			const bytecode = runModule(
				decodeModule(compile(result.source).module ?? new Uint8Array()),
				fixture,
			);
			expect(JSON.stringify(bytecode)).toBe(JSON.stringify(out));
		});

		it('keeps every memory cluster in the host when two nodes can use one session', () => {
			const workflow = workflowOf(c);
			if (!isRecord(workflow) || !Array.isArray(workflow.nodes)) throw new Error('No workflow');
			const nodes: unknown[] = workflow.nodes;
			const memory = nodes.find((n) => isRecord(n) && n.name === 'Memory');
			if (!isRecord(memory) || !isRecord(workflow.connections)) throw new Error('No memory');
			const second = {
				...workflow,
				nodes: [...nodes, { ...memory, id: 'm2', name: 'Memory 2' }],
			};
			expect(convertWorkflow(second, { trace: 'all', chatMemory: true }).fallbackNodes).toContain(
				NODE,
			);
			const manager = {
				...workflow,
				nodes: [
					...nodes,
					{
						id: 'mm',
						name: 'Manager',
						type: '@n8n/n8n-nodes-langchain.memoryManager',
						typeVersion: 1.1,
						position: [600, 0],
						parameters: {},
					},
				],
				connections: {
					...workflow.connections,
					Memory: {
						ai_memory: [
							[
								{ node: NODE, type: 'ai_memory', index: 0 },
								{ node: 'Manager', type: 'ai_memory', index: 0 },
							],
						],
					},
				},
			};
			expect(convertWorkflow(manager, { trace: 'all', chatMemory: true }).fallbackNodes).toContain(
				NODE,
			);
		});
	});

	describe.each(BINARY_HOST_CASES.map((c) => ({ ...c, label: c.name })))('$label', (c) => {
		it('runs the agent in the fallback host, because v1 gives the model the files of the item', async () => {
			const result = converted(c);
			expect(result.fallbackNodes ?? []).not.toContain(NODE);
			const compiled = compile(result.source);
			expect(compiled.diagnostics).toEqual([]);
			const hostStep = `${NODE} (fallback host)`;
			const answer = [{ json: { output: 'from the host' } }];
			const fixture: Fixture = {
				...fixtureOf(c, result),
				effects: { [hostStep]: [[{ items: answer }, { subRuns: { Model: [{ error: null }] } }]] },
			};
			const out = await runReference(result.source, fixture);
			expect(out.status).toBe('ok');
			// The library node does not run: no request goes to the model from the module.
			expect(out.effects.filter((e) => e.step === NODE)).toEqual([]);
			const host = out.effects.filter((e) => e.step === hostStep);
			expect(host.map((e) => e.kind)).toEqual(['node']);
			const args = isRecord(host[0].args) ? host[0].args : {};
			expect(args.type).toBe(c.type);
			expect(traced(out.trace ?? [], NODE).outputs).toEqual([answer]);
			const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
			expect(JSON.stringify(bytecode)).toBe(JSON.stringify(out));
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
