import { Expression, type IWorkflowDataProxyData } from 'n8n-workflow';

import { compileLambda, type LambdaRoot } from '../lambda';

interface Item {
	id: string;
	email: string;
	name: string;
	note?: string;
	n: number;
	total: number;
	owner: string;
	base: string;
	twice: number;
	error?: string;
	metrics?: { employees: number };
	headers: Record<string, string>;
	body: { items: Array<{ id: number }>; next?: string; data: Array<{ id: string }> };
	statusCode: number;
	property_owners: string[];
	tags: string[];
	list: number[];
	obj: Record<string, unknown>;
	when: string;
	flag: boolean;
	maybe?: string | number;
	binary: { data: { fileName: string } };
}

const items: Item[] = [
	{
		id: 'a1',
		email: 'Ada@Example.com',
		name: 'Ada Lovelace',
		note: 'first',
		n: 3,
		total: 3,
		owner: 'ada',
		base: 'https://api.example.com',
		twice: 2,
		metrics: { employees: 120 },
		headers: { 'content-type': 'application/json' },
		body: { items: [{ id: 7 }], next: 'cursor-2', data: [{ id: 'p1' }, { id: 'p2' }] },
		statusCode: 200,
		property_owners: ['ada', 'bob'],
		tags: ['x', 'skip'],
		list: [1, 2, 3],
		obj: { k: 1, nested: { deep: [true, null] } },
		when: '2026-10-05T08:30:00.000Z',
		flag: true,
		maybe: 'text',
		binary: { data: { fileName: 'cv.pdf' } },
	},
	{
		id: 'b2',
		email: 'BOB@example.com',
		name: 'Bob',
		n: -1.5,
		total: 0,
		owner: '',
		base: 'http://localhost:5678',
		twice: 0,
		error: 'Request failed',
		headers: {},
		body: { items: [{ id: 0 }, { id: 1 }], data: [] },
		statusCode: 404,
		property_owners: [],
		tags: [],
		list: [],
		obj: {},
		when: '2020-02-29T23:59:59.000Z',
		flag: false,
		maybe: 4,
		binary: { data: { fileName: 'a b.txt' } },
	},
];

type Node = Pick<Item, 'id' | 'owner'>;
const nodes: Record<string, Node> = { Tasks: { id: 't-9', owner: 'carol' } };
const builtins = {
	now: { year: 2026, toISO: () => '2026-10-05T10:00:00.000+02:00' },
	today: { toISODate: () => '2026-10-05' },
};
type Dollar = ((name: 'Tasks') => Node) & typeof builtins;
const dollar: Dollar = Object.assign((name: 'Tasks') => nodes[name], builtins);

type Outcome = { value: unknown } | { threw: true };

const outcomeOf = (run: () => unknown): Outcome => {
	try {
		return { value: run() };
	} catch {
		return { threw: true };
	}
};

const engine = new Expression('UTC');

/** A compiled expression, run on `item` by the n8n expression pipeline that resolves parameters. */
function engineOutcome(expression: string, item: Item, root: LambdaRoot): Outcome {
	const data = {
		[root]: item,
		$binary: item.binary,
		$: (name: string) => ({ item: { json: nodes[name] } }),
		$now: builtins.now,
		$today: builtins.today,
	};
	return outcomeOf(() =>
		engine.resolveSimpleParameterValue(expression, data as unknown as IWorkflowDataProxyData),
	);
}

const corpus: Array<[string, (item: Item, $: Dollar) => unknown]> = [
	['a method call', (item) => item.email.toLowerCase()],
	['a nullish fallback', (item) => item.note ?? item.id],
	['arithmetic', (item) => item.n * 2 + item.total / 4 - (item.n % 2)],
	['a strict comparison', (item) => item.total === 3],
	['an inequality', (item) => item.owner !== ''],
	['a template literal', (item) => `${item.base}/customers`],
	['a template with an earlier node', (item, $) => `${item.owner}@${$('Tasks').id}`],
	['a sum with an earlier node', (item, $) => item.twice + $('Tasks').owner],
	['an in check', (item) => ('metrics' in item && item.metrics ? item.metrics.employees + 1 : 0)],
	['an error check', (item) => (item.error === undefined ? item.total : 0)],
	['an error fallback', (item) => item.error ?? ''],
	['a computed key', (item) => item.headers['content-type']],
	['a list index', (item) => (item.body.items[0]?.id ?? 0) + item.statusCode],
	['a list length', (item) => item.property_owners.length > 0],
	['a first entry or default', (item) => item.property_owners[0] ?? ''],
	['an object body', (item) => ({ id: item.id })],
	[
		'an object with built-ins',
		(item, $) => ({ name: item.name, first: $('Tasks').id, day: $.today.toISODate() }),
	],
	['destructured fields', ({ tags }) => ({ tags, csv: tags.map((tag) => tag).join(',') })],
	[
		'a block body',
		(item, $) => {
			const others = item.property_owners.filter((owner) => owner !== item.owner);
			for (const tag of item.tags) if (tag === 'skip') return [];
			return others.length === 0 ? [$.now.year] : others;
		},
	],
	['mixed text', (item) => `Hi ${item.name}`],
	['a binary file name', (item) => item.binary.data.fileName],
	['the last entry', (item) => item.body.data.at(-1)?.id],
	['optional chaining', (item) => item.metrics?.employees],
	['filter and map', (item) => item.list.filter((x) => x > 1).map((x) => x * 2)],
	['a spread list', (item) => [item.n, ...item.list]],
	['a spread object', (item) => ({ ...item.obj, id: item.id })],
	['JSON text', (item) => JSON.stringify(item.obj)],
	['Math on a list', (item) => Math.max(0, ...item.list)],
	['a date', (item) => new Date(item.when).getTime()],
	['a split', (item) => item.name.split(' ')[0]],
	['a typeof check', (item) => typeof item.maybe === 'string'],
	['a slice', (item) => item.when.slice(0, 10)],
	['object keys', (item) => Object.keys(item.obj).length],
	['a regular expression', (item) => /@example\.com$/i.test(item.email)],
	['a conditional', (item) => (item.flag ? 'yes' : 'no')],
	['a negation', (item) => !item.flag],
	['a reduce', (item) => item.list.reduce((sum, x) => sum + x, 0)],
	['includes', (item) => item.tags.includes('skip')],
	['a number format', (item) => item.n.toFixed(2)],
	['parseInt', (item) => parseInt(item.id.slice(1), 10)],
	['an encoded URI part', (item) => encodeURIComponent(item.binary.data.fileName)],
	['a read of an absent field', (item) => item.note?.length],
	['string includes', (item) => item.name.includes('Ada')],
	['a join', (item) => item.list.join(', ')],
	['a sorted copy', (item) => [...item.tags].sort().reverse().join()],
	['a number from text', (item) => Number(item.id)],
	['a string compare', (item) => item.when > '2025'],
	['Array.isArray', (item) => Array.isArray(item.body.data)],
	['object entries', (item) => Object.entries(item.obj).map(([key]) => key)],
	['an ISO date', (item) => new Date(item.when).toISOString()],
	['a replace', (item) => item.email.replace(/@.*/, '')],
	['a find', (item) => item.body.items.find((entry) => entry.id > 0)?.id],
	['some', (item) => item.tags.some((tag) => tag.startsWith('s'))],
	['trim and case', (item) => ` ${item.name} `.trim().toUpperCase()],
	['String and Boolean', (item) => `${String(item.n)}:${Boolean(item.note)}`],
	['a nested optional index', (item) => (item.obj.nested as { deep?: unknown[] })?.deep?.[0]],
	['isNaN', (item) => isNaN(Number(item.email))],
	// eslint-disable-next-line eqeqeq -- a lambda of a workflow may compare loosely
	['a loose comparison', (item) => item.maybe == 4],
	['a length of text', (item) => item.name.length],
	['a nested template', (item) => `${item.flag ? `on ${item.n}` : 'off'}`],
];

describe('compiled lambdas in the n8n expression engine', () => {
	it.each(corpus)('gives the value of the lambda for %s', (_name, fn) => {
		const compiled = compileLambda(fn, new Set(Object.keys(nodes)));
		if (!compiled.ok) throw new Error(compiled.error);
		for (const item of items) {
			const lambda = outcomeOf(() => fn(structuredClone(item), dollar));
			expect(engineOutcome(compiled.expression, structuredClone(item), '$json')).toEqual(lambda);
		}
	});

	it('gives undefined where the lambda throws a TypeError, as n8n ignores the error', () => {
		const fn = (item: Item) => item.metrics!.employees;
		const compiled = compileLambda(fn, new Set());
		if (!compiled.ok) throw new Error(compiled.error);
		const [, absent] = items;
		expect(outcomeOf(() => fn(absent))).toEqual({ threw: true });
		expect(engineOutcome(compiled.expression, absent, '$json')).toEqual({ value: undefined });
	});

	it('gives the value of a pagination lambda over the response', () => {
		const fn = (response: Item) => response.body.next;
		const compiled = compileLambda(fn, new Set(), '$response');
		if (!compiled.ok) throw new Error(compiled.error);
		for (const item of items) {
			expect(engineOutcome(compiled.expression, item, '$response')).toEqual({ value: fn(item) });
		}
	});

	it.each<[string, (item: Item, $: Dollar) => unknown, string]>([
		// @ts-expect-error the item is the JSON already
		['the item wrapper', (item) => item.json.name, 'not item.json.field'],
		// @ts-expect-error $() is the JSON already
		['the wrapper of an earlier node', (_, $) => $('Tasks').item.id, 'not $("Tasks").item'],
		['a local value', (item) => item.n > items.length, 'reads "items"'],
		// @ts-expect-error no such node
		['an unknown node', (_, $) => $('Nope').id, 'names no node'],
	])('rejects %s at compile time', (_name, fn, error) => {
		expect(compileLambda(fn, new Set(Object.keys(nodes)))).toEqual({
			ok: false,
			error: expect.stringContaining(error),
		});
	});
});
