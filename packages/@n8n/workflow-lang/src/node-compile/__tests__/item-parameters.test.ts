import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';
import type { NodeSources } from '../convert.ts';
import {
	compileNodeInstance,
	deferredVerified,
	isVerified,
	unverifiedConditions,
	itemParameterNames,
	valueAtPath,
} from '../convert.ts';
import { specialiseNode } from '../specialise.ts';
import { FAILING_VALUE, itemFailureExpression, itemParameterEntries } from './verify.ts';

const ENTRY = '/acme/Acme.node.ts';
const TYPE = 'n8n-nodes-acme.acme';

const node = (body: string, helpers = '') => `${helpers}
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

const READ_ID = "returnData.push({ json: { id: this.getNodeParameter('id', i) } });";
const BY_ITEM = { id: '={{ $json.id }}' };
const NO_PROOF = 'the compiler cannot prove that the item index';

describe('a parameter with an expression in the node compiler', () => {
	it('reads the value of the item from the list of the caller', () => {
		const result = compileWith(READ_ID, BY_ITEM);
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('const __perItem: Json = parameters.each;');
		expect(result.source).toContain('__deepCopy(__perItem[i]["id"])');
		expect(result.itemParameters).toEqual(['id']);
	});

	it('keeps the module of a node without an expression as it was', () => {
		const result = compileWith(READ_ID, { id: 'fixed' });
		expect(result.errors).toEqual([]);
		expect(result.source).not.toContain('__perItem');
		expect(result.source).toContain('id: "fixed"');
		expect(result.itemParameters).toEqual([]);
	});

	it('reads the value of the first item for the index 0', () => {
		const result = compileWith(
			"returnData.push({ json: { id: this.getNodeParameter('id', 0) } });",
			BY_ITEM,
		);
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('__perItem[0]["id"]');
	});

	it('follows the index into a function and through a constant', () => {
		const helpers =
			'function idOf(this: any, index: number) { const at = index; return this.getNodeParameter("id", at) as string; }';
		const result = compileWith('returnData.push({ json: { id: idOf.call(this, i) } });', BY_ITEM, {
			helpers,
		});
		expect(result.errors).toEqual([]);
		expect(result.itemParameters).toEqual(['id']);
	});

	it('proves the index of a loop over a constant with the count of the items', () => {
		const source = `
export class Acme {
	async execute(this: any) {
		const items = this.getInputData();
		const length = items.length;
		const returnData: any[] = [];
		for (let i = 0; i < length; i++) returnData.push({ json: { id: this.getNodeParameter('id', i) } });
		for (let i = 0; i < items.length; i++) returnData.push({ json: { id: this.getNodeParameter('id', i) } });
		return [returnData];
	}
}`;
		const result = specialiseNode({
			type: TYPE,
			version: 1,
			entry: ENTRY,
			readFile: (path) => (path === ENTRY ? source : undefined),
			parameters: BY_ITEM,
			instanceId: null,
		});
		expect(result.errors).toEqual([]);
	});

	it.each([
		["this.getNodeParameter('id', i + 1)", 'an index that is computed'],
		["this.getNodeParameter('id', items.length - 1)", 'the last index'],
		["this.getNodeParameter('id', 1)", 'a constant index after the first item'],
		["this.getNodeParameter('id')", 'no index'],
	])('refuses %s (%s)', (read) => {
		const result = compileWith(`returnData.push({ json: { id: ${read} } });`, BY_ITEM);
		expect(result.errors.join('\n')).toContain(NO_PROOF);
		expect(result.source).toBeUndefined();
	});

	const LIMITED = (limit: string) =>
		`${limit} for (let k = 0; k < count; k++) returnData.push({ json: { id: this.getNodeParameter('id', k) } });`;

	it.each([
		['one or zero', 'const count = items.length ? 1 : 0;'],
		[
			'a variable that the code sets again to the count',
			'let count = items.length ? 1 : 0; count = items.length;',
		],
		[
			'a variable that a branch sets to the count',
			'let count = 0; if (items.length > 2) { count = items.length; }',
		],
	])('takes the index of a loop with a limit of at most the count of the items: %s', (_, limit) => {
		const result = compileWith(LIMITED(limit), BY_ITEM);
		expect(result.errors).toEqual([]);
	});

	it.each([
		[
			'a variable with a larger value',
			'let count = items.length ? 1 : 0; count = items.length + 1;',
		],
		['a variable that the code increments', 'let count = items.length ? 1 : 0; count++;'],
		['a variable with a compound assignment', 'let count = 0; count += items.length;'],
		['two when the list has items', 'const count = items.length ? 2 : 0;'],
		[
			'a variable set from another list',
			'const other = [1, 2, 3]; let count = 0; count = other.length;',
		],
	])('refuses the index of a loop with a limit that can be more than the count: %s', (_, limit) => {
		const result = compileWith(LIMITED(limit), BY_ITEM);
		expect(result.errors.join('\n')).toContain(NO_PROOF);
	});

	it('refuses an index that the loop body changes', () => {
		const result = compileWith(`${READ_ID} if (items.length > 5) i++;`, BY_ITEM);
		expect(result.errors.join('\n')).toContain(NO_PROOF);
	});

	it('refuses the index of a loop over another list', () => {
		const result = compileWith(
			"const other = [1, 2, 3, 4]; for (let k = 0; k < other.length; k++) returnData.push({ json: { id: this.getNodeParameter('id', k) } });",
			BY_ITEM,
		);
		expect(result.errors.join('\n')).toContain(NO_PROOF);
	});

	it('refuses an index that a function gets from a call without a proof', () => {
		const helpers =
			'function idOf(this: any, index: number) { return this.getNodeParameter("id", index) as string; }';
		const result = compileWith(
			'returnData.push({ json: { id: idOf.call(this, i), next: idOf.call(this, i + 1) } });',
			BY_ITEM,
			{ helpers },
		);
		expect(result.errors.join('\n')).toContain(NO_PROOF);
	});

	it('folds the static members of a collection and reads the members with an expression', () => {
		const parameters = { options: { a: '={{ $json.a }}', b: 'fixed' } };
		const result = compileWith(
			`returnData.push({ json: {
				a: this.getNodeParameter('options.a', i),
				b: this.getNodeParameter('options.b', i),
				c: this.getNodeParameter('options.c', i, 'none'),
				all: this.getNodeParameter('options', i),
			} });`,
			parameters,
		);
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('a: __deepCopy(__perItem[i]["options.a"])');
		expect(result.source).toContain('b: "fixed"');
		expect(result.source).toContain("c: 'none'");
		expect(result.source).toContain('all: __deepCopy(__perItem[i]["options"])');
		expect(result.itemParameters).toEqual(['options', 'options.a']);
	});

	it('throws a kept error at the read of a parameter that the caller defers', () => {
		const result = compileWith(READ_ID, BY_ITEM, { deferred: ['id'] });
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('__deepCopy(__parameterValue(__perItem[i]["id"]))');
		expect(compileWith(READ_ID, BY_ITEM, { deferred: ['other'] }).source).not.toContain(
			'__parameterValue',
		);
	});
});

function workflowSource(inputs: unknown[], parameters: unknown): string {
	return `import { webhook, workflow } from '@n8n/workflow-lang';

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
}

const fixture = {
	trigger: { body: {}, headers: {}, query: {} },
	now: 0,
	seed: 1,
	effects: { Node: [{ status: 200, headers: {}, body: { ok: true } }] },
};

async function run(source: string | undefined, inputs: unknown[], parameters: unknown) {
	const nodes = { 'nodes/compiled-node.ts': source ?? '' };
	const workflow = workflowSource(inputs, parameters);
	const compiled = compile(workflow, { nodes });
	expect(compiled.diagnostics).toEqual([]);
	const reference = await runReference(workflow, fixture, { nodes });
	const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
	expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
	return reference;
}

const wholeNode = (body: string) => `
export class Acme {
	async execute(this: any) {
		const items = this.getInputData();
		const returnData: any[] = [];
		${body}
		return [returnData];
	}
}`;

const compileNode = (source: string, parameters: Record<string, unknown>) =>
	specialiseNode({
		type: TYPE,
		version: 1,
		entry: ENTRY,
		readFile: (path) => (path === ENTRY ? source : undefined),
		parameters,
		instanceId: null,
	});

describe('the index of an item in other loops over the items', () => {
	const EACH = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
	const INPUTS = [{ n: 1 }, { n: 2 }, { n: 3 }];
	const EXPECTED = [
		{ id: 'a', n: 1 },
		{ id: 'b', n: 2 },
		{ id: 'c', n: 3 },
	];

	it.each([
		[
			'the entries of the items',
			"for (const [index, item] of items.entries()) returnData.push({ json: { id: this.getNodeParameter('id', index), n: item.json.n } });",
		],
		[
			'a map callback over the items',
			"const made = items.map((item: any, index: number) => ({ json: { id: this.getNodeParameter('id', index), n: item.json.n } })); for (const one of made) returnData.push(one);",
		],
		[
			'a forEach callback over the items',
			"items.forEach((item: any, index: number) => { returnData.push({ json: { id: this.getNodeParameter('id', index), n: item.json.n } }); });",
		],
	])('proves the index of %s, and each item has its own value', async (_label, body) => {
		const result = compileNode(wholeNode(body), BY_ITEM);
		expect(result.errors).toEqual([]);
		expect(result.itemParameters).toEqual(['id']);
		expect(result.firstItemParameters).toEqual([]);
		const out = await run(result.source, INPUTS, { each: EACH });
		expect(out).toMatchObject({ status: 'ok', result: EXPECTED });
	});

	it.each([
		[
			'the entries of another list',
			"const other = [1, 2]; for (const [index] of other.entries()) returnData.push({ json: { id: this.getNodeParameter('id', index) } });",
		],
		[
			'the item of the entries, not the index',
			"for (const [, index] of items.entries()) returnData.push({ json: { id: this.getNodeParameter('id', index) } });",
		],
		[
			'a map callback over another list',
			"const other = [1, 2]; other.map((_one: number, index: number) => returnData.push({ json: { id: this.getNodeParameter('id', index) } }));",
		],
		[
			'the first parameter of a map callback',
			"items.map((index: any) => returnData.push({ json: { id: this.getNodeParameter('id', index) } }));",
		],
		[
			'the index of a reduce callback',
			"items.reduce((_sum: number, _item: any, index: number) => returnData.push({ json: { id: this.getNodeParameter('id', index) } }), 0);",
		],
		[
			'a for...of loop with a counter',
			"let index = 0; for (const item of items) { returnData.push({ json: { id: this.getNodeParameter('id', index), n: item.json.n } }); index++; }",
		],
	])('refuses %s', (_label, body) => {
		const result = compileNode(wholeNode(body), BY_ITEM);
		expect(result.errors.join('\n')).toContain(NO_PROOF);
		expect(result.source).toBeUndefined();
	});
});

describe('a parameter that the node reads for the first item only', () => {
	it('names the parameters with all reads at the index 0', () => {
		const helpers =
			'function idOf(this: any, index: number) { const at = index; return this.getNodeParameter("id", at) as string; }';
		const result = compileWith(
			"returnData.push({ json: { id: idOf.call(this, 0), mode: this.getNodeParameter('mode', 0), name: this.getNodeParameter('name', i) } });",
			{ id: '={{ $json.id }}', mode: '={{ $json.mode }}', name: '={{ $json.name }}' },
			{ helpers },
		);
		expect(result.errors).toEqual([]);
		expect(result.itemParameters).toEqual(['id', 'mode', 'name']);
		expect(result.firstItemParameters).toEqual(['id', 'mode']);
	});

	it('does not name a parameter with one read for each item', () => {
		const result = compileWith(
			"returnData.push({ json: { id: this.getNodeParameter('id', 0), own: this.getNodeParameter('id', i) } });",
			BY_ITEM,
		);
		expect(result.firstItemParameters).toEqual([]);
	});

	it('runs with a value for the first item only', async () => {
		const result = compileWith(
			"returnData.push({ json: { mode: this.getNodeParameter('mode', 0), name: this.getNodeParameter('name', i) } });",
			{ mode: '={{ $json.mode }}', name: '={{ $json.name }}' },
		);
		const out = await run(result.source, [{}, {}], {
			each: [{ mode: 'm', name: 'a' }, { name: 'b' }],
		});
		expect(out).toMatchObject({
			status: 'ok',
			result: [
				{ mode: 'm', name: 'a' },
				{ mode: 'm', name: 'b' },
			],
		});
	});
});

describe('a compiled node that runs once with a value for each item', () => {
	const READ_WHEN_ASKED =
		"returnData.push({ json: items[i].json.skip ? { skipped: true } : { id: this.getNodeParameter('id', i), first: this.getNodeParameter('id', 0) } });";

	it('gives each item its own value, and no value when the expression gave none', async () => {
		const result = compileWith(READ_WHEN_ASKED, BY_ITEM);
		const out = await run(result.source, [{ id: 'a' }, {}, { id: 'c' }], {
			each: [{ id: 'a' }, {}, { id: 'c' }],
		});
		expect(out).toMatchObject({
			status: 'ok',
			result: [{ id: 'a', first: 'a' }, { first: 'a' }, { id: 'c', first: 'a' }],
		});
	});

	it('gives a copy of a collection, so the node cannot change the value of another read', async () => {
		const result = compileWith(
			"const options = this.getNodeParameter('options', i); options.seen = true; returnData.push({ json: this.getNodeParameter('options', i) });",
			{ options: { a: '={{ $json.a }}' } },
		);
		const out = await run(result.source, [{}, {}], {
			each: [{ options: { a: 1 } }, { options: { a: 2 } }],
		});
		expect(out).toMatchObject({ status: 'ok', result: [{ a: 1 }, { a: 2 }] });
	});

	it('throws the kept error of an expression only when the node reads the parameter', async () => {
		const result = compileWith(READ_WHEN_ASKED, BY_ITEM, { deferred: ['id'] });
		const failed = { id: { error: { message: 'The expression failed', description: 'why' } } };
		const unread = await run(result.source, [{}, { skip: true }], {
			each: [{ id: { value: 'a' } }, failed],
		});
		expect(unread).toMatchObject({
			status: 'ok',
			result: [{ id: 'a', first: 'a' }, { skipped: true }],
		});
		const read = await run(result.source, [{}, {}], { each: [{ id: { value: 'a' } }, failed] });
		expect(read.status).toBe('error');
		expect(read.result).toMatchObject({ message: 'The expression failed' });
	});

	it('gives the kept error to the catch of the node under "continue on fail"', async () => {
		const source = node(
			"try { returnData.push({ json: { id: this.getNodeParameter('id', i) } }); } catch (error) { if (this.continueOnFail()) { returnData.push({ json: { error: error.message, description: error.description } }); continue; } throw error; }",
		);
		const result = specialiseNode({
			type: TYPE,
			version: 1,
			entry: ENTRY,
			readFile: (path) => (path === ENTRY ? source : undefined),
			parameters: BY_ITEM,
			instanceId: null,
			continueOnFail: true,
			deferredParameters: ['id'],
		});
		expect(result.errors).toEqual([]);
		const out = await run(result.source, [{}, {}], {
			each: [
				{ id: { error: { message: 'no value', description: 'why' } } },
				{ id: { value: 'b' } },
			],
		});
		expect(out).toMatchObject({
			status: 'ok',
			result: [{ error: 'no value', description: 'why' }, { id: 'b' }],
		});
	});
});

describe('a loop over the items that the caller of a function gives', () => {
	const source = (limit: string) => `
async function readAll(this: any, items: any[]) {
	const out: any[] = [];
	for (let i = 0; i < ${limit}; i++) out.push({ json: { id: this.getNodeParameter('id', i) } });
	return out;
}
export class Acme {
	async execute(this: any) {
		const items = this.getInputData();
		return [await readAll.call(this, items)];
	}
}`;
	const compileSource = (text: string, parameters: Record<string, unknown>) =>
		specialiseNode({
			type: TYPE,
			version: 1,
			entry: ENTRY,
			readFile: (path) => (path === ENTRY ? text : undefined),
			parameters,
			instanceId: null,
		});

	it('proves the index of a loop to the length of the items of the caller', () => {
		const result = compileSource(source('items.length'), BY_ITEM);
		expect(result.errors).toEqual([]);
		expect(result.itemParameters).toEqual(['id']);
	});

	it('does not prove the index of a loop to another limit', () => {
		const result = compileSource(source('items.length + 1'), BY_ITEM);
		expect(result.errors.join(' ')).toContain(NO_PROOF);
	});
});

describe('a regular expression from a parameter of the node', () => {
	const body =
		"returnData.push({ json: { r: safeRegex.exec(this.getNodeParameter('entry', i).__regex, items[i].json.text) } });";
	const helpers = "import { safeRegex } from 'n8n-workflow';";

	it('uses the matcher of the runtime for a pattern that the runtime takes', () => {
		const result = compileWith(body, { entry: { __regex: '^a(b)' } }, { helpers });
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('__regexExec(');
	});

	it('does not compile for a pattern that the runtime does not take', () => {
		const result = compileWith(body, { entry: { __regex: '(?<=a)b' } }, { helpers });
		expect(result.errors.join(' ')).toContain('safeRegex');
	});
});

describe('the value of a resource mapper', () => {
	const read = (options: string) =>
		`returnData.push({ json: this.getNodeParameter('columns.value', i, {}${options}) });`;
	const columns = (schema: unknown[]) => ({
		columns: { mappingMode: 'defineBelow', value: { count: '5' }, schema },
	});
	const typed = columns([{ id: 'count', type: 'number' }]);

	it('compiles when the schema has no type for the fields of the value', () => {
		expect(compileWith(read(''), columns([])).errors).toEqual([]);
		expect(compileWith(read(''), columns([{ id: 'other', type: 'number' }])).errors).toEqual([]);
	});

	it('does not compile when v1 changes the type of a field', () => {
		expect(compileWith(read(''), typed).errors.join(' ')).toContain('resource mapper');
	});

	it('compiles when the node code turns the validation off', () => {
		expect(compileWith(read(', { skipValidation: true }'), typed).errors).toEqual([]);
		const fromConstant = `const checks = this.getNodeParameter('options', i, {}).typecast ? { skipValidation: true } : undefined;
			returnData.push({ json: this.getNodeParameter('columns.value', i, {}, checks) });`;
		expect(compileWith(fromConstant, { ...typed, options: { typecast: true } }).errors).toEqual([]);
		expect(compileWith(fromConstant, typed).errors.join(' ')).toContain('resource mapper');
	});
});

describe('the check of a parameter with an expression against v1', () => {
	const description = {
		name: 'acme',
		properties: [{ displayName: 'Id', name: 'id', type: 'string', default: '' }],
	};
	const source = node(READ_ID);
	const sources = (conditions: string[]): NodeSources => ({
		entry: (type) => (type === TYPE ? ENTRY : undefined),
		readFile: (path) => (path === ENTRY ? source : undefined),
		description: (type) => (type === TYPE ? description : undefined),
		verified: { [`${TYPE}@1:.`]: conditions },
	});
	const compiledWith = (parameters: Record<string, unknown>) => {
		const compiled = compileNodeInstance(sources([]), { type: TYPE, version: 1, parameters }, null);
		if ('errors' in compiled) throw new Error(compiled.errors.join('; '));
		return compiled;
	};

	it('needs the condition of each parameter that the module reads for an item', () => {
		const byItem = compiledWith(BY_ITEM);
		expect(itemParameterNames(byItem)).toEqual(['id']);
		expect(isVerified(sources(['id']), TYPE, 1, byItem)).toBe(false);
		expect(isVerified(sources(['id', '@each=other']), TYPE, 1, byItem)).toBe(false);
		expect(isVerified(sources(['id', '@each=id']), TYPE, 1, byItem)).toBe(true);
		expect(isVerified(sources(['id']), TYPE, 1, compiledWith({ id: 'fixed' }))).toBe(true);
	});

	it('takes a collection only for the members that agree with v1 one by one', () => {
		const withMembers = {
			...compiledWith({ id: 'fixed' }),
			changed: ['options'],
			resolved: { options: { first: 'a', second: '={{ $json.b }}' } },
		};
		const collection = { displayName: 'Options', name: 'options', type: 'collection', default: {} };
		const listed = (conditions: string[]): NodeSources => ({
			...sources(conditions),
			description: () => ({ name: 'acme', properties: [...description.properties, collection] }),
		});
		const members = ['options.first', 'options.second'];
		expect(isVerified(listed(['options']), TYPE, 1, withMembers)).toBe(false);
		expect(isVerified(listed(['options.first']), TYPE, 1, withMembers)).toBe(false);
		expect(isVerified(listed(members), TYPE, 1, withMembers)).toBe(true);
		expect(unverifiedConditions(listed(['options.first']), TYPE, 1, withMembers)).toEqual([
			'options.second',
		]);
		const byItem = { ...withMembers, itemParameters: ['options.second'] };
		expect(isVerified(listed(members), TYPE, 1, byItem)).toBe(false);
		expect(isVerified(listed([...members, '@each=options.first']), TYPE, 1, byItem)).toBe(false);
		expect(isVerified(listed([...members, '@each=options.second']), TYPE, 1, byItem)).toBe(true);
		expect(isVerified(listed([...members, '@each=options']), TYPE, 1, byItem)).toBe(false);
	});

	it('takes another authentication only for the conditions that agree with v1 under it', () => {
		const other = {
			...compiledWith({ id: 'fixed' }),
			changed: ['authentication', 'id'],
			resolved: { authentication: 'oAuth2', id: 'fixed' },
		};
		expect(isVerified(sources(['authentication', 'id']), TYPE, 1, other)).toBe(true);
		expect(isVerified(sources(['id', '@auth=oAuth2:authentication']), TYPE, 1, other)).toBe(false);
		expect(
			isVerified(sources(['@auth=oAuth2:authentication', '@auth=oAuth2:id']), TYPE, 1, other),
		).toBe(true);
		expect(
			isVerified(sources(['id', '@auth=other:authentication', '@auth=other:id']), TYPE, 1, other),
		).toBe(false);
	});

	it('needs the condition of the parameter for the error setting of the instance', () => {
		const regular = compileNodeInstance(
			sources([]),
			{ type: TYPE, version: 1, parameters: BY_ITEM },
			null,
			{},
			undefined,
			undefined,
			'continueRegularOutput',
		);
		if ('errors' in regular) throw new Error(regular.errors.join('; '));
		const mode = '@onError=continueRegularOutput';
		expect(isVerified(sources(['id', mode, '@each=id']), TYPE, 1, regular)).toBe(false);
		expect(
			isVerified(sources(['id', mode, '@each=id@continueErrorOutput']), TYPE, 1, regular),
		).toBe(false);
		expect(
			isVerified(sources(['id', mode, '@each=id@continueRegularOutput']), TYPE, 1, regular),
		).toBe(true);
	});

	it('needs the check of a failed expression when the module defers the error of a parameter', () => {
		const deferred = compileNodeInstance(
			sources([]),
			{ type: TYPE, version: 1, parameters: BY_ITEM },
			null,
			{},
			undefined,
			undefined,
			'stopWorkflow',
			['id'],
		);
		if ('errors' in deferred) throw new Error(deferred.errors.join('; '));
		expect(deferred.deferred).toEqual(['id']);
		expect(deferredVerified(sources(['id', '@each=id']), TYPE, 1, deferred)).toBe(false);
		expect(deferredVerified(sources(['id', '@each=id', '@eachError']), TYPE, 1, deferred)).toBe(
			true,
		);
		expect(deferredVerified(sources(['id', '@each=id']), TYPE, 1, compiledWith(BY_ITEM))).toBe(
			true,
		);
	});

	it('gives the entry of a failed expression as the error of the expression', () => {
		const parameters = { id: itemFailureExpression('id'), name: '={{ $json.name }}' };
		const entries = itemParameterEntries(
			parameters,
			['id', 'name'],
			[
				{ id: 'a', name: 'x' },
				{ id: FAILING_VALUE, name: 'y' },
			],
			['name'],
			['id'],
		);
		expect(entries).toEqual([
			{ id: { value: 'a' }, name: 'x' },
			{ id: { error: { message: "Referenced node doesn't exist" } } },
		]);
	});

	it('makes the entries of the items as v1 resolves the expressions', () => {
		const parameters = {
			id: '={{ $json.id }}',
			options: { a: '={{ $json.a }}', b: 2 },
			place: { __rl: true, mode: 'id', value: '={{ $json.place }}' },
		};
		expect(valueAtPath(parameters, 'options.a')).toBe('={{ $json.a }}');
		expect(valueAtPath(parameters, 'id.none')).toBeUndefined();
		expect(
			itemParameterEntries(
				parameters,
				['id', 'options', 'options.a', 'place'],
				[{ id: 'x', a: 1, place: 'p1' }, {}],
			),
		).toEqual([
			{
				id: 'x',
				options: { a: 1, b: 2 },
				'options.a': 1,
				place: { __rl: true, mode: 'id', value: 'p1' },
			},
			{
				id: undefined,
				options: { a: undefined, b: 2 },
				'options.a': undefined,
				place: { __rl: true, mode: 'id', value: undefined },
			},
		]);
		expect(() => itemParameterEntries({ id: '={{ $now }}' }, ['id'], [{}])).toThrow(
			'the check has no value for the expression',
		);
	});
});
