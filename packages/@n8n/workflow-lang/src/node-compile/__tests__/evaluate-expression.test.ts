import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';
import type { NodeSources } from '../convert.ts';
import {
	compileNodeInstance,
	evaluatedCondition,
	evaluatedParameterNames,
	unverifiedConditions,
} from '../convert.ts';
import { specialiseNode } from '../specialise.ts';
import { FAILING_VALUE, itemFailureExpression, itemParameterEntries } from './verify.ts';

const ENTRY = '/acme/Acme.node.ts';
const TYPE = 'n8n-nodes-acme.acme';

const RESOLVABLES = `
export function getResolvables(expression: string) {
	if (!expression) return [];

	const resolvables = [];
	const resolvableRegex = /({{[\\s\\S]*?}})/g;

	let match;

	while ((match = resolvableRegex.exec(expression)) !== null) {
		if (match[1]) {
			resolvables.push(match[1]);
		}
	}

	return resolvables;
}`;

const node = (body: string, helpers = RESOLVABLES) => `${helpers}
export class Acme {
	async execute(this: any) {
		const items = this.getInputData();
		const returnData: any[] = [];
		for (let i = 0; i < items.length; i++) {
			${body}
		}
		return [returnData];
	}
}`;

const compileWith = (
	body: string,
	parameters: Record<string, unknown>,
	options: { helpers?: string; deferred?: string[] } = {},
) => {
	const source = node(body, options.helpers);
	return specialiseNode({
		type: TYPE,
		version: 1,
		entry: ENTRY,
		readFile: (path) => (path === ENTRY ? source : undefined),
		parameters,
		instanceId: null,
		deferredParameters: options.deferred,
	});
};

const REPLACE = `let query = this.getNodeParameter('query', i) as string;
			for (const resolvable of getResolvables(query)) {
				query = query.replace(resolvable, this.evaluateExpression(resolvable, i) as string);
			}
			returnData.push({ json: { query } });`;

const NO_FORM = "'this.evaluateExpression' has no compiled form";

describe('this.evaluateExpression in the node compiler', () => {
	it('reads the value of each expression in the text of a parameter from the list of the caller', () => {
		const result = compileWith(REPLACE, { query: 'SELECT {{ $json.a }}, {{ $json.b }}' });
		expect(result.errors).toEqual([]);
		expect(result.source).toContain(
			'(resolvable === "{{ $json.a }}" ? __deepCopy(__perItem[i]["@evaluateText={{ $json.a }}"]) : __deepCopy(__perItem[i]["@evaluateText={{ $json.b }}"]))',
		);
		expect(result.evaluated).toEqual([
			{
				path: '@evaluateText={{ $json.a }}',
				expression: '={{ $json.a }}',
				text: true,
				parameter: 'query',
			},
			{
				path: '@evaluateText={{ $json.b }}',
				expression: '={{ $json.b }}',
				text: true,
				parameter: 'query',
			},
		]);
	});

	it('has one entry for an expression that the text has two times', () => {
		const result = compileWith(REPLACE, { query: '{{ $json.a }} {{ $json.a }}' });
		expect(result.errors).toEqual([]);
		expect(result.evaluated?.map((entry) => entry.path)).toEqual(['@evaluateText={{ $json.a }}']);
	});

	it('compiles a text without an expression and reads nothing from the caller', () => {
		const result = compileWith(REPLACE, { query: 'SELECT 1' });
		expect(result.errors).toEqual([]);
		expect(result.evaluated).toEqual([]);
		expect(result.source).not.toContain('__perItem');
	});

	it('throws the error of a failed expression where the node evaluates it', () => {
		const path = '@evaluateText={{ $json.a }}';
		const result = compileWith(REPLACE, { query: 'SELECT {{ $json.a }}' }, { deferred: [path] });
		expect(result.errors).toEqual([]);
		expect(result.source).toContain(`__deepCopy(__parameterValue(__perItem[i]["${path}"]))`);
	});

	it('reads the value of a constant text, with the item index 0 when the call gives none', () => {
		const result = compileWith(
			"returnData.push({ json: { a: this.evaluateExpression('{{ $json.a }}', i), b: this.evaluateExpression('{{ $json.b }}') } });",
			{},
		);
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('__deepCopy(__perItem[i]["@evaluate={{ $json.a }}"])');
		expect(result.source).toContain('__deepCopy(__perItem[0]["@evaluate={{ $json.b }}"])');
		expect(result.evaluated).toEqual([
			{ path: '@evaluate={{ $json.a }}', expression: '={{ $json.a }}', text: false },
			{ path: '@evaluate={{ $json.b }}', expression: '={{ $json.b }}', text: false },
		]);
	});

	it('refuses a text that comes from a parameter with an expression', () => {
		const result = compileWith(REPLACE, { query: '={{ $json.query }}' });
		expect(result.errors.join('\n')).toContain(
			`${NO_FORM}: the parameter 'query' has an expression, and v1 evaluates the expressions in its result`,
		);
	});

	it('refuses a text that is not a constant and not a part of a parameter', () => {
		const result = compileWith(
			'returnData.push({ json: { a: this.evaluateExpression(items[i].json.text, i) } });',
			{},
		);
		expect(result.errors.join('\n')).toContain(
			`${NO_FORM}: the text is not a constant and not the value of a loop over \`getResolvables\``,
		);
	});

	it('refuses a text variable that the node changes before the loop', () => {
		const result = compileWith(
			`let query = this.getNodeParameter('query', i) as string;
			query = query + items[i].json.more;
			for (const resolvable of getResolvables(query)) {
				query = query.replace(resolvable, this.evaluateExpression(resolvable, i) as string);
			}
			returnData.push({ json: { query } });`,
			{ query: 'SELECT {{ $json.a }}' },
		);
		expect(result.errors.join('\n')).toContain(
			`${NO_FORM}: the compiler cannot prove that 'query' holds the text of a parameter when the loop starts`,
		);
	});

	it('refuses a text variable that is declared outside the loop over the items', () => {
		const source = `${RESOLVABLES}
export class Acme {
	async execute(this: any) {
		const items = this.getInputData();
		const returnData: any[] = [];
		let query = this.getNodeParameter('query', 0) as string;
		for (let i = 0; i < items.length; i++) {
			for (const resolvable of getResolvables(query)) {
				query = query.replace(resolvable, this.evaluateExpression(resolvable, i) as string);
			}
			returnData.push({ json: { query } });
		}
		return [returnData];
	}
}`;
		const result = specialiseNode({
			type: TYPE,
			version: 1,
			entry: ENTRY,
			readFile: (path) => (path === ENTRY ? source : undefined),
			parameters: { query: 'SELECT {{ $json.a }}' },
			instanceId: null,
		});
		expect(result.errors.join('\n')).toContain(`${NO_FORM}: the compiler cannot prove`);
	});

	it('refuses another function with the name getResolvables', () => {
		const result = compileWith(
			REPLACE,
			{ query: 'SELECT {{ $json.a }}' },
			{
				helpers:
					'export function getResolvables(expression: string) { return expression.split(" "); }',
			},
		);
		expect(result.errors.join('\n')).toContain(
			`${NO_FORM}: \`getResolvables\` is not the function of n8n that the compiler knows`,
		);
	});
});

const fixture = {
	trigger: { body: {}, headers: {}, query: {} },
	now: 0,
	seed: 1,
	effects: { Node: [{ status: 200, headers: {}, body: { ok: true } }] },
};

async function run(source: string | undefined, inputs: unknown[], parameters: unknown) {
	const nodes = { 'nodes/compiled-node.ts': source ?? '' };
	const workflow = `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'probe' })],
	async run(ctx) {
		return await ctx.node({
			name: 'Node',
			type: ${JSON.stringify(TYPE)},
			typeVersion: 1,
			parameters: ${JSON.stringify(parameters)},
			items: ${JSON.stringify(inputs)},
		});
	},
});
`;
	const compiled = compile(workflow, { nodes });
	expect(compiled.diagnostics).toEqual([]);
	const reference = await runReference(workflow, fixture, { nodes });
	const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
	expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
	return reference;
}

describe('a compiled node that evaluates the expressions in a text', () => {
	const A = '@evaluateText={{ $json.a }}';
	const B = '@evaluateText={{ $json.b }}';
	const text = 'SELECT {{ $json.a }} AS a, {{ $json.b }} AS b, {{ $json.a }} AS again';

	it('puts the value of each item in the text as JavaScript does', async () => {
		const result = compileWith(REPLACE, { query: text });
		const values: Array<[unknown, unknown]> = [
			['one', 7],
			['a$&b', true],
			[['p', 'q'], { k: 1 }],
			[null, undefined],
			[1.5, ''],
		];
		const out = await run(
			result.source,
			values.map(() => ({})),
			{ each: values.map(([a, b]) => ({ [A]: a, ...(b === undefined ? {} : { [B]: b }) })) },
		);
		const expected = values.map(([a, b]) => {
			let query = text;
			for (const [resolvable, value] of [
				['{{ $json.a }}', a],
				['{{ $json.b }}', b],
				['{{ $json.a }}', a],
			] as Array<[string, unknown]>)
				query = query.replace(resolvable, value as string);
			return { query };
		});
		expect(out).toMatchObject({ status: 'ok', result: expected });
	});

	it('throws the error of a failed expression at the place of the call', async () => {
		const result = compileWith(REPLACE, { query: text }, { deferred: [A] });
		const out = await run(result.source, [{}, {}], {
			each: [
				{ [A]: { value: 'x' }, [B]: 'y' },
				{ [A]: { error: { message: 'The expression failed', description: 'why' } }, [B]: 'y' },
			],
		});
		expect(out.status).toBe('error');
		expect(out.result).toMatchObject({ message: 'The expression failed' });
	});
});

describe('a label without a jump', () => {
	it('compiles the statement of a label that no break or continue names', () => {
		const result = compileWith(
			`let rounds = 0;
			outer: while (rounds < 2) {
				rounds++;
			}
			returnData.push({ json: { rounds } });`,
			{},
		);
		expect(result.errors).toEqual([]);
		expect(result.source).not.toContain('outer:');
	});
});

describe('the entries of a list in a loop', () => {
	it('compiles a loop over the entries of a list that is not the input', () => {
		const result = compileWith(
			`const out: any[] = [];
			for (const [index, value] of items[i].json.list.entries()) out.push({ index, value });
			returnData.push({ json: { out } });`,
			{},
		);
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('__entries(');
	});

	it('gives the pairs of an array, a Map and a Set as JavaScript does', async () => {
		const result = compileWith(
			`const out: any[] = [];
			for (const [index, value] of items[i].json.list.entries()) out.push([index, value]);
			const map = new Map();
			map.set('a', 1);
			map.set('b', 2);
			for (const [key, value] of map.entries()) out.push([key, value]);
			const set = new Set(['x']);
			for (const [key, value] of set.entries()) out.push([key, value]);
			returnData.push({ json: { out } });`,
			{},
		);
		expect(result.errors).toEqual([]);
		const out = await run(result.source, [{ list: ['p', 'q'] }], {});
		expect(out).toMatchObject({
			status: 'ok',
			result: [
				{
					out: [
						[0, 'p'],
						[1, 'q'],
						['a', 1],
						['b', 2],
						['x', 'x'],
					],
				},
			],
		});
	});

	it('stops with a limit error for the entries of another value', async () => {
		const result = compileWith(
			`const out: any[] = [];
			for (const [index, value] of items[i].json.list.entries()) out.push([index, value]);
			returnData.push({ json: { out } });`,
			{},
		);
		const out = await run(result.source, [{ list: { entries: 1 } }], {});
		expect(out.status).toBe('error');
		expect(out.result).toMatchObject({
			message:
				'the list of the entries of a value that is not an array, a Map or a Set has no compiled form',
		});
	});
});

describe('the check of an expression that the node evaluates', () => {
	const description = {
		name: 'acme',
		properties: [{ displayName: 'Query', name: 'query', type: 'string', default: '' }],
	};
	const sources = (verified: string[]): NodeSources => ({
		entry: () => ENTRY,
		readFile: (path) => (path === ENTRY ? node(REPLACE) : undefined),
		description: () => description,
		verified: { [`${TYPE}@1:.`]: verified },
	});
	const compiledWith = (query: string, deferred: string[] = []) => {
		const compiled = compileNodeInstance(
			sources([]),
			{ type: TYPE, version: 1, parameters: { query } },
			null,
			{},
			undefined,
			undefined,
			'stopWorkflow',
			deferred,
		);
		if ('errors' in compiled) throw new Error(compiled.errors.join('; '));
		return compiled;
	};

	it('keeps the expressions apart from the parameters with an expression', () => {
		const compiled = compiledWith('SELECT {{ $json.a }}');
		expect(compiled.itemParameters).toEqual([]);
		expect(compiled.evaluated.map((entry) => entry.path)).toEqual(['@evaluateText={{ $json.a }}']);
		expect(evaluatedParameterNames(compiled)).toEqual(['query']);
	});

	it('needs the check of the parameter with expressions in its text', () => {
		const compiled = compiledWith('SELECT {{ $json.a }}');
		expect(unverifiedConditions(sources(['query']), TYPE, 1, compiled)).toEqual([
			evaluatedCondition('query'),
		]);
		expect(
			unverifiedConditions(sources(['query', evaluatedCondition('query')]), TYPE, 1, compiled),
		).toEqual([]);
	});

	it('lists a deferred expression, so the caller asks for the check of a failed expression', () => {
		const path = '@evaluateText={{ $json.a }}';
		expect(compiledWith('SELECT {{ $json.a }}', [path]).deferred).toEqual([path]);
	});

	it('gives the check the value of each expression for each item', () => {
		const failing = itemFailureExpression('a');
		const path = `@evaluateText=${failing.slice(1)}`;
		const entries = itemParameterEntries(
			{},
			[path],
			[{ a: 'x' }, { a: FAILING_VALUE }],
			[],
			[path],
			[{ path, expression: failing, text: true, parameter: 'query' }],
		);
		expect(entries[0]).toEqual({ [path]: { value: 'x' } });
		expect(entries[1][path]).toEqual({ error: { message: "Referenced node doesn't exist" } });
	});
});
