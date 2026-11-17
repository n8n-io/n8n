/**
 * Conditions that the converter decides itself, against v1: an operation that v1 does not
 * know (the condition is false), a comparison of two fixed texts, and a version 1 number
 * condition without its second value. Each case runs the workflow in n8n's engine and the
 * converted workflow on the reference runner, and compares which output each item takes.
 */
import { runReference } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';
import { runOracle } from './behaviour/oracle-engine.ts';

const INPUTS = [
	{ flag: true, text: 'abc', n: 5, list: [1], when: '2024-03-09T07:05:00.000Z', obj: { a: 1 } },
	{ flag: false, text: '', n: 0, list: [], when: '2020-01-01T00:00:00.000Z', obj: {} },
	{ flag: true, text: 'ABD', n: -3, list: [2, 3], when: '2030-01-01T00:00:00.000Z', obj: { b: 2 } },
];

interface Condition {
	leftValue: unknown;
	rightValue: unknown;
	operator: { type: string; operation: string; singleValue?: boolean };
}

interface Case {
	name: string;
	conditions: Condition[];
	combinator?: 'and' | 'or';
	caseSensitive?: boolean;
}

const known: Condition = {
	leftValue: '={{ $json.flag }}',
	rightValue: '',
	operator: { type: 'boolean', operation: 'true', singleValue: true },
};

const CASES: Case[] = [
	{
		name: 'boolean operation that v1 does not know',
		conditions: [
			{
				leftValue: '={{ $json.flag }}',
				rightValue: true,
				operator: { type: 'boolean', operation: 'notTrue' },
			},
		],
	},
	{
		name: 'unknown boolean operation or a known one',
		combinator: 'or',
		conditions: [
			{
				leftValue: '={{ $json.flag }}',
				rightValue: '',
				operator: { type: 'boolean', operation: 'isTrue', singleValue: true },
			},
			known,
		],
	},
	{
		name: 'unknown boolean operation and a known one',
		combinator: 'and',
		conditions: [
			known,
			{
				leftValue: '={{ $json.flag }}',
				rightValue: false,
				operator: { type: 'boolean', operation: 'equal' },
			},
		],
	},
	{
		name: 'unknown string operation',
		combinator: 'or',
		conditions: [
			{
				leftValue: '={{ $json.text }}',
				rightValue: '',
				operator: { type: 'string', operation: 'isNotEmpty', singleValue: true },
			},
			{
				leftValue: '={{ $json.text }}',
				rightValue: 'abc',
				operator: { type: 'string', operation: 'gt' },
			},
		],
	},
	{
		name: 'unknown number operation',
		conditions: [
			{
				leftValue: '={{ $json.n }}',
				rightValue: 5,
				operator: { type: 'number', operation: 'equal' },
			},
		],
	},
	{
		name: 'unknown array operation',
		conditions: [
			{
				leftValue: '={{ $json.list }}',
				rightValue: '',
				operator: { type: 'array', operation: 'isNotEmpty', singleValue: true },
			},
		],
	},
	{
		name: 'unknown dateTime operation',
		conditions: [
			{
				leftValue: '={{ $json.when }}',
				rightValue: '2024-01-01T00:00:00.000Z',
				operator: { type: 'dateTime', operation: 'isAfter' },
			},
		],
	},
	{
		name: 'unknown object operation',
		conditions: [
			{
				leftValue: '={{ $json.obj }}',
				rightValue: '',
				operator: { type: 'object', operation: 'isEmpty', singleValue: true },
			},
		],
	},
	{
		name: 'two fixed texts that are equal',
		combinator: 'and',
		conditions: [
			{ leftValue: 'abc', rightValue: 'abc', operator: { type: 'string', operation: 'equals' } },
			known,
		],
	},
	{
		name: 'two fixed texts that are not equal',
		combinator: 'or',
		conditions: [
			{ leftValue: 'abc', rightValue: 'abd', operator: { type: 'string', operation: 'equals' } },
			known,
		],
	},
	{
		name: 'two fixed texts without case',
		caseSensitive: false,
		combinator: 'and',
		conditions: [
			{ leftValue: 'ABC', rightValue: 'abc', operator: { type: 'string', operation: 'equals' } },
			{ leftValue: 'Abc', rightValue: 'BC', operator: { type: 'string', operation: 'endsWith' } },
			{ leftValue: 'Abc', rightValue: 'x', operator: { type: 'string', operation: 'notContains' } },
			known,
		],
	},
	{
		name: 'fixed text with case',
		combinator: 'or',
		conditions: [
			{ leftValue: 'ABC', rightValue: 'abc', operator: { type: 'string', operation: 'equals' } },
			{ leftValue: 'abc', rightValue: 'B', operator: { type: 'string', operation: 'contains' } },
			{ leftValue: 'abc', rightValue: 'abc', operator: { type: 'string', operation: 'notEquals' } },
			{ leftValue: '', rightValue: '', operator: { type: 'string', operation: 'notStartsWith' } },
		],
	},
];

function chain(check: { type: string; typeVersion: number; parameters: unknown }) {
	return {
		name: 'Conditions',
		nodes: [
			{
				name: 'T',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				name: 'Items',
				type: 'n8n-nodes-base.code',
				typeVersion: 2,
				position: [200, 0],
				parameters: { jsCode: `return ${JSON.stringify(INPUTS)}.map((json) => ({ json }));` },
			},
			{ name: 'Check', position: [400, 0], ...check },
		],
		connections: {
			T: { main: [[{ node: 'Items', type: 'main', index: 0 }]] },
			Items: { main: [[{ node: 'Check', type: 'main', index: 0 }]] },
		},
		settings: { executionOrder: 'v1' },
	};
}

function workflow(c: Case) {
	return chain({
		type: 'n8n-nodes-base.if',
		typeVersion: 2.2,
		parameters: {
			conditions: {
				options: {
					caseSensitive: c.caseSensitive !== false,
					leftValue: '',
					typeValidation: 'strict',
					version: 2,
				},
				conditions: c.conditions.map((x, k) => ({ id: `c${k}`, ...x })),
				combinator: c.combinator ?? 'and',
			},
			options: c.caseSensitive === false ? { ignoreCase: true } : {},
		},
	});
}

async function compare(wf: ReturnType<typeof chain>) {
	const v1 = await runOracle(wf, { start: 'T', item: {}, mode: 'trigger', timeoutMs: 10_000 });
	expect(v1.error).toBeNull();
	const converted = convertWorkflow(wf, { trace: 'all' });
	expect(converted.fallbackNodes).toEqual([]);
	const out = await runReference(converted.source, {
		trigger: { body: {} },
		now: 0,
		seed: 1,
		effects: {},
		trace: true,
	});
	expect(out.status).toBe('ok');
	const traced = (out.trace ?? []).find((t) => t.step === 'Check')?.items;
	expect(traced).toEqual(v1.nodes.Check);
}

describe('conditions that the converter decides', () => {
	it.each(CASES.map((c) => ({ ...c, label: c.name })))('$label', async (c) => {
		await compare(workflow(c));
	});

	it.each(['larger', 'largerEqual', 'smaller', 'smallerEqual'])(
		'If version 1: %s without a second value',
		async (operation) => {
			await compare(
				chain({
					type: 'n8n-nodes-base.if',
					typeVersion: 1,
					parameters: { conditions: { number: [{ value1: '={{ $json.n }}', operation }] } },
				}),
			);
		},
	);
});
