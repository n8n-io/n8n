import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../../compiler/index.ts';
import { convertWorkflow } from '../../convert/index.ts';
import type { EquivalenceCase, NodeSettings } from '../../nodes/__tests__/equivalence.ts';
import { disposeRecorder, recordV1, recorderAvailable } from '../../nodes/__tests__/v1-recorder.ts';
import { runReference } from '../../reference/runner.ts';
import type { NodeSources } from '../convert.ts';
import { nodeDescriptionOf } from '../convert.ts';
import { Probe } from './probe.node.ts';
import { errorPairingOfV1 } from './verify.ts';

const TYPE = 'n8n-nodes-base.probe';
const ENTRY = join(dirname(fileURLToPath(import.meta.url)), 'probe.node.ts');
const SOURCE = readFileSync(ENTRY, 'utf8');
const probe = new Probe();

const REGULAR = '@onError=continueRegularOutput';
const ERROR_OUTPUT = '@onError=continueErrorOutput';
const BY_POSITION = '@errorItems=position';

function sources(pairErrors: boolean, once: boolean): NodeSources {
	return {
		entry: (type) => (type === TYPE ? ENTRY : undefined),
		readFile: (path) => (path === ENTRY ? SOURCE : undefined),
		description: (type) => (type === TYPE ? nodeDescriptionOf(probe.description) : undefined),
		verified: {
			[`${TYPE}@1:.`]: [
				'id',
				'strict',
				'pairErrors',
				'twice',
				'whole',
				'@each=id',
				'@each=id@continueRegularOutput',
				'@each=id@continueErrorOutput',
				REGULAR,
				ERROR_OUTPUT,
				...(once ? ['@oneCall=continueRegularOutput', '@oneCall=continueErrorOutput'] : []),
				...(pairErrors ? [] : [BY_POSITION]),
			],
		},
	};
}

type Answer = EquivalenceCase['responses'][number];
const OK: Answer = { body: { name: 'thing' } };
const BAD: Answer = { status: 400, body: { message: 'The thing is not there' } };
const DOWN: Answer = { status: 503, body: 'down' };
const MAX_ANSWERS = 64;

interface Scenario {
	label: string;
	settings: NodeSettings;
	answers: Answer[];
	ids?: string[];
	parameters?: Record<string, unknown>;
	onlyOnce?: boolean;
}

const RETRY = { retryOnFail: true, maxTries: 2, waitBetweenTries: 1 };
const SCENARIOS: Scenario[] = [
	{ label: 'all items work', settings: {}, answers: [OK] },
	{ label: 'all items fail', settings: {}, answers: [BAD] },
	{ label: 'the first item fails', settings: {}, answers: [BAD, OK] },
	{ label: 'the second item fails', settings: {}, answers: [OK, BAD, OK] },
	{ label: 'the last items fail', settings: {}, answers: [OK, DOWN] },
	{ label: 'one item fails', settings: {}, answers: [BAD], ids: ['a'] },
	{ label: 'no items', settings: {}, answers: [OK], ids: [] },
	{ label: 'the node throws', settings: {}, answers: [OK], parameters: { strict: true } },
	{
		label: 'the node throws for one item',
		settings: {},
		answers: [OK],
		ids: ['a'],
		parameters: { strict: true },
	},
	{ label: 'retry: fails once, then works', settings: RETRY, answers: [BAD, OK] },
	{ label: 'retry: fails always', settings: RETRY, answers: [BAD] },
	{ label: 'retry: the second item fails', settings: RETRY, answers: [OK, BAD, OK] },
	{ label: 'retry: the node throws', settings: RETRY, answers: [OK], parameters: { strict: true } },
	{
		label: 'retry: three tries',
		settings: { ...RETRY, maxTries: 3 },
		answers: [BAD, BAD, OK, BAD, BAD, OK],
	},
	{
		label: 'unpaired: all items fail',
		settings: {},
		answers: [BAD],
		parameters: { pairErrors: false },
	},
	{
		label: 'unpaired: the second item fails',
		settings: {},
		answers: [OK, BAD, OK],
		parameters: { pairErrors: false },
	},
	{
		label: 'unpaired: one item fails',
		settings: {},
		answers: [BAD],
		ids: ['a'],
		parameters: { pairErrors: false },
	},
	{
		label: 'unpaired: the counts of the items differ',
		settings: {},
		answers: [OK, BAD, OK],
		parameters: { pairErrors: false, twice: true },
	},
	{
		label: 'unpaired: one error item for two input items',
		settings: {},
		answers: [BAD],
		ids: ['a', 'b'],
		parameters: { pairErrors: false },
	},
	{
		label: 'unpaired: retry',
		settings: RETRY,
		answers: [BAD, OK, BAD],
		parameters: { pairErrors: false },
	},
	{
		label: 'paired: the counts of the items differ',
		settings: {},
		answers: [OK, BAD, OK],
		parameters: { twice: true },
	},
	{
		label: 'whole node: one error item for all items',
		settings: {},
		answers: [OK, BAD, OK],
		parameters: { whole: true },
		onlyOnce: true,
	},
	{
		label: 'whole node: one error item for one item',
		settings: {},
		answers: [BAD],
		ids: ['a'],
		parameters: { whole: true },
		onlyOnce: true,
	},
	{
		label: 'whole node: retry',
		settings: RETRY,
		answers: [BAD, OK],
		parameters: { whole: true },
		onlyOnce: true,
	},
	{
		label: 'always output data: all items fail',
		settings: { alwaysOutputData: true },
		answers: [BAD],
	},
	{
		label: 'always output data: the node throws',
		settings: { alwaysOutputData: true },
		answers: [OK],
		parameters: { strict: true },
	},
	{
		label: 'execute once: the first item fails',
		settings: { executeOnce: true },
		answers: [BAD, OK],
	},
	{
		label: 'execute once: retry',
		settings: { executeOnce: true, ...RETRY },
		answers: [BAD, OK],
	},
];

const MODES = ['continueRegularOutput', 'continueErrorOutput'] as const;

function workflowWith(parameters: Record<string, unknown>, settings: NodeSettings) {
	const errorOutput = settings.onError === 'continueErrorOutput';
	const node = (name: string, type: string, x: number, y: number, more: object = {}) => ({
		name,
		type,
		typeVersion: 1,
		position: [x, y],
		parameters: {},
		...more,
	});
	return {
		name: 'Probe',
		settings: { executionOrder: 'v1' },
		nodes: [
			node('Webhook', 'n8n-nodes-base.webhook', 0, 0, {
				typeVersion: 2,
				parameters: { path: 'p', httpMethod: 'POST' },
			}),
			node('Split', 'n8n-nodes-base.splitOut', 200, 0, {
				parameters: { fieldToSplitOut: 'body.list' },
			}),
			node('Probe', TYPE, 400, 0, { parameters, ...settings }),
			node('Good', 'n8n-nodes-base.noOp', 600, 0),
			node('Bad', 'n8n-nodes-base.noOp', 600, 200),
		],
		connections: {
			Webhook: { main: [[{ node: 'Split', type: 'main', index: 0 }]] },
			Split: { main: [[{ node: 'Probe', type: 'main', index: 0 }]] },
			Probe: {
				main: [
					[{ node: 'Good', type: 'main', index: 0 }],
					...(errorOutput ? [[{ node: 'Bad', type: 'main', index: 0 }]] : []),
				],
			},
		},
	};
}

async function converted(
	scenario: Scenario,
	settings: NodeSettings,
	items: object[],
	once: boolean,
) {
	const parameters = { id: '={{ $json.id }}', ...scenario.parameters };
	const result = convertWorkflow(workflowWith(parameters, settings), {
		nodeSources: sources(scenario.parameters?.pairErrors !== false, once),
		instance: { baseUrl: 'https://n8n.example', id: 'a'.repeat(64) },
	});
	expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
	expect(result.fallbackNodes).toEqual([]);
	expect(compile(result.source, { extraNodes: result.nodes }).diagnostics).toEqual([]);
	if (scenario.parameters?.strict !== true && scenario.parameters?.whole !== true)
		expect(/each: \[\s*\{/.test(result.source)).toBe(!once);
	const answers = Array.from({ length: MAX_ANSWERS }, (_, k) => ({
		status: 200,
		headers: {},
		...scenario.answers[Math.min(k, scenario.answers.length - 1)],
	}));
	const out = await runReference(
		result.source,
		{
			trigger: { body: { list: items }, headers: {}, query: {} },
			now: 0,
			seed: 1,
			effects: { Probe: answers },
		},
		{ extraNodes: result.nodes },
	);
	expect(out.status).toBe('ok');
	const lists: Record<string, unknown> =
		typeof out.result === 'object' && out.result !== null ? { ...out.result } : {};
	return {
		outputs: settings.onError === 'continueErrorOutput' ? [lists.Good, lists.Bad] : [lists.Good],
		requests: out.effects.filter((effect) => effect.kind === 'http').length,
	};
}

describe.skipIf(!recorderAvailable())(
	'a compiled node and the v1 engine under the error settings',
	() => {
		afterAll(async () => await disposeRecorder());

		for (const mode of MODES) {
			for (const scenario of SCENARIOS) {
				it(`${mode}: ${scenario.label}`, async () => {
					const settings = { onError: mode, ...scenario.settings };
					const items = (scenario.ids ?? ['a', 'b', 'c']).map((id) => ({ id }));
					const v1 = await recordV1(
						{
							name: `probe ${mode} ${scenario.label}`,
							type: TYPE,
							typeVersion: 1,
							parameters: { id: '={{ $json.id }}', ...scenario.parameters },
							items,
							responses: scenario.answers,
							settings,
						},
						{ [TYPE]: probe },
					);
					expect(v1.error).toBeUndefined();
					expect(v1.nodeError).toBe(
						scenario.parameters?.strict === true ? 'The strict setting stops the node' : undefined,
					);
					const theirs = v1.outputs ?? [];
					for (const once of scenario.onlyOnce ? [true] : [true, false]) {
						const mine = await converted(scenario, settings, items, once);
						expect(mine.outputs).toEqual(mine.outputs.map((_list, k) => theirs[k] ?? []));
						expect(theirs.length).toBeLessThanOrEqual(mine.outputs.length);
						expect(mine.requests).toBe(v1.requests.length);
					}
				});
			}
		}

		it('finds how the v1 node pairs its error items', async () => {
			const record = async (pairErrors: boolean) =>
				await recordV1(
					{
						name: `probe pairing ${pairErrors}`,
						type: TYPE,
						typeVersion: 1,
						parameters: { id: '={{ $json.id }}', pairErrors },
						items: [{ id: 'a' }, { id: 'b' }],
						responses: [BAD],
						settings: { onError: 'continueErrorOutput' },
					},
					{ [TYPE]: probe },
				);
			expect(errorPairingOfV1(await record(true))).toBe('item');
			expect(errorPairingOfV1(await record(false))).toBe('position');
		});
	},
);
