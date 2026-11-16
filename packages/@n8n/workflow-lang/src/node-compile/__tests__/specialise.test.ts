import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { getNodeParameters } from '../../convert/node-parameters.ts';
import { withDerivedValues } from '../../credentials/derived.ts';
import { deriveInject } from '../../credentials/inject.ts';
import { DEFAULT_NODE_PACKAGES, loadCredentialTypes, registryOf } from '../../credentials/types.ts';
import {
	NODE_DESCRIPTIONS,
	NODE_DESCRIPTION_VERSIONS,
} from '../../generated/node-descriptions.generated.ts';
import { EQUIVALENCE_CASES } from '../../nodes/__tests__/equivalence-cases.ts';
import type { EquivalenceCase, Recording } from '../../nodes/__tests__/equivalence.ts';
import { applyCredential, normalizeRequest } from '../../nodes/__tests__/equivalence.ts';
import { runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';
import { specialiseNode } from '../specialise.ts';

const here = dirname(fileURLToPath(import.meta.url));
const nodesBase = join(here, '../../../../../nodes-base');
const recordings: Record<string, Recording> = JSON.parse(
	readFileSync(join(here, '../../nodes/__tests__/v1-requests.json'), 'utf8'),
);
const typesBuilt = existsSync(join(DEFAULT_NODE_PACKAGES[0], 'dist/known/credentials.json'));

const ENTRIES: Record<string, string> = {
	'n8n-nodes-base.telegram': 'nodes/Telegram/Telegram.node.ts',
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function specialise(c: EquivalenceCase) {
	const description = NODE_DESCRIPTIONS[NODE_DESCRIPTION_VERSIONS[`${c.type}@${c.typeVersion}`]];

	const parameters = getNodeParameters(
		description.properties,
		c.parameters,
		true,
		false,
		c.typeVersion,
		description,
	);
	return specialiseNode({
		type: c.type,
		version: c.typeVersion,
		entry: join(nodesBase, ENTRIES[c.type]),
		readFile: (path) => (existsSync(path) ? readFileSync(path, 'utf8') : undefined),
		parameters: isRecord(parameters) ? parameters : {},
		aliases: { '@utils/': `${join(nodesBase, 'utils')}/` },

		instanceId: null,
	});
}

function workflowSource(c: EquivalenceCase): string {
	return `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'equivalence' })],
	credentials: { c: { type: ${JSON.stringify(c.credential?.type)} } },
	async run(ctx) {
		return await ctx.node({
			name: 'Node',
			type: ${JSON.stringify(c.type)},
			typeVersion: ${c.typeVersion},
			parameters: ${JSON.stringify(c.parameters)},
			${c.items ? `items: ${JSON.stringify(c.items)},` : ''}
			credential: 'c',
		});
	},
});
`;
}

const cases = EQUIVALENCE_CASES.filter((c) => c.type in ENTRIES && c.expectedError === undefined);

describe.runIf(typesBuilt)('node compiler: n8n node source against v1', () => {
	const registry = registryOf(loadCredentialTypes().types);

	it('has cases', () => {
		expect(cases.length).toBeGreaterThan(0);
	});

	describe.each(cases.map((c) => ({ ...c, label: c.name })))('$label', (c) => {
		const result = specialise(c);
		const nodes = { 'nodes/compiled-node.ts': result.source ?? '' };
		const fixture = {
			trigger: { body: {}, headers: {}, query: {} },
			now: 0,
			seed: 1,
			effects: { Node: c.responses.map((r) => ({ status: 200, headers: {}, ...r })) },
		};

		it('compiles the node source without errors', () => {
			expect(result.errors).toEqual([]);
			expect(compile(workflowSource(c), { nodes }).diagnostics).toEqual([]);
		});

		it('keeps only the code of the operation in use', () => {
			expect(result.linked.length).toBeLessThan(10);
			expect(result.source).not.toContain('this.');
		});

		it('sends the requests of v1 and gives its output', async () => {
			const out = await runReference(workflowSource(c), fixture, { nodes });
			expect(out.status).toBe('ok');
			const data = withDerivedValues(c.credential?.type ?? '', {
				...(registry.get(c.credential?.type ?? '')?.defaults ?? {}),
				...c.credential?.data,
			});
			const inject = deriveInject(registry, c.credential?.type ?? '', data).inject;
			const requests = out.effects.map((effect) => {
				const args = isRecord(effect.args) ? effect.args : {};
				const { qsFormat: _, ...request } = normalizeRequest(
					applyCredential(
						{
							method: String(args.method),
							url: String(args.url),
							headers: args.headers,
							qs: args.qs,
							body: args.body,
						},
						inject,
						data,
					),
				);
				return request;
			});
			const recording = recordings[c.name];
			expect(requests).toEqual(recording.requests.map(({ qsFormat: _, ...r }) => r));
			expect(out.result).toEqual(recording.output);
		});

		it('gives the same result from the bytecode as from the reference runner', async () => {
			const compiled = compile(workflowSource(c), { nodes });
			const reference = await runReference(workflowSource(c), fixture, { nodes });
			const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
			expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
		});
	});
});

describe('node compiler: helper classes', () => {
	const api = `
export class Api {
	context;
	base;
	constructor(base, context) {
		this.context = context;
		this.base = base;
	}
	async get(path) {
		return await this.context.helpers.request({ method: 'GET', uri: this.join(path) });
	}
	join(path) {
		return this.base + path;
	}
	unused() {
		return missingName();
	}
}`;
	const node = (body: string) => `
import { Api } from './Api';
export class Sample {
	async execute() {
		const api = new Api('https://api.example.test', this);
		${body}
	}
}`;
	const run = (body: string) => {
		const files: Record<string, string> = { '/n/Sample.node.js': node(body), '/n/Api.js': api };
		return specialiseNode({
			type: 'n8n-nodes-base.sample',
			version: 1,
			entry: '/n/Sample.node.js',
			readFile: (path) => files[path],
			parameters: {},
			instanceId: null,
		});
	};

	it('compiles the methods in use to functions that take the object', () => {
		const result = run("return [this.helpers.returnJsonArray(await api.get('/a'))];");
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('__request');
		expect(result.source).not.toContain('missingName');
		expect(result.source).toContain("await Api_get(api, '/a')");
		expect(result.source).toContain('Api_join(__self, ');
		expect(result.source).not.toContain('__self.context');
	});

	it('refuses an object that the code uses as a whole value', () => {
		const result = run('return [[{ json: { ...api } }]];');
		expect(result.errors.join('\n')).toContain(
			"an object of the class 'Api' is used as a whole value",
		);
	});

	it('refuses a read of the context field from outside the class', () => {
		const result = run('return [[{ json: { id: api.context.getInstanceId() } }]];');
		expect(result.errors.join('\n')).toContain('the field holds the n8n context');
	});

	it('refuses a method that the code uses as a value', () => {
		const result = run('const get = api.get; return [[{ json: await get("/a") }]];');
		expect(result.errors.join('\n')).toContain(
			"the method 'get' of the class 'Api' is used as a value",
		);
	});
});

describe('node compiler: handler tables, static methods and module aliases', () => {
	const run = (files: Record<string, string>, parameters: Record<string, unknown> = {}) =>
		specialiseNode({
			type: 'n8n-nodes-base.sample',
			version: 1,
			entry: '/n/Sample.node.js',
			readFile: (path) => files[path],
			parameters,
			instanceId: null,
		});
	const handlers = `
export class GetHandler {
	async handle(ctx, id) {
		return await ctx.helpers.request({ method: 'GET', uri: 'https://api.example.test/' + id });
	}
}
export class DeleteHandler {
	async handle(ctx, id) {
		return missingName(ctx, id);
	}
}
export class Service {
	handlers = { get: new GetHandler(), delete: new DeleteHandler() };
	async run(ctx, operation, id) {
		return await this.handlers[operation].handle(ctx, id);
	}
	keys() {
		return Object.keys(this.handlers);
	}
}`;
	const serviceNode = (body: string) => `
import { Service } from './Service';
export class Sample {
	async execute() {
		const service = new Service();
		const operation = this.getNodeParameter('operation', 0);
		${body}
	}
}`;
	const viaService =
		"return [this.helpers.returnJsonArray(await service.run(this, operation, 'a'))];";

	it('calls the method of the object that a constant key picks from a table', () => {
		const result = run(
			{ '/n/Sample.node.js': serviceNode(viaService), '/n/Service.js': handlers },
			{ operation: 'get' },
		);
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('GetHandler_handle(');
		expect(result.source).not.toContain('missingName');
		expect(result.source).not.toContain('__NODISPATCH');
	});

	it('refuses a table key that is not a constant', () => {
		const result = run({
			'/n/Sample.node.js': serviceNode(
				"return [this.helpers.returnJsonArray(await service.run(this, this.getInputData()[0].json.op, 'a'))];",
			),
			'/n/Service.js': handlers.replace('return missingName(ctx, id);', 'return id;'),
		});
		expect(result.errors.join('\n')).toContain('by a key that is not a constant');
	});

	it('refuses a key that the table does not hold', () => {
		const result = run(
			{ '/n/Sample.node.js': serviceNode(viaService), '/n/Service.js': handlers },
			{ operation: 'toString' },
		);
		expect(result.errors.join('\n')).toContain('by a key that is not a constant');
	});

	it('refuses a table of objects that the code uses as a value', () => {
		const result = run(
			{
				'/n/Sample.node.js': serviceNode('return [[{ json: { keys: service.keys() } }]];'),
				'/n/Service.js': handlers,
			},
			{ operation: 'get' },
		);
		expect(result.errors.join('\n')).toContain(
			"the field 'handlers' of the class 'Service' holds an object of a class and is used as a value",
		);
	});

	const inner = `
export class Inner {
	value() {
		return 1;
	}
}`;

	it('refuses a second store to a field that holds an object', () => {
		const result = run({
			'/n/Sample.node.js': serviceNode('service.reset(); return [[]];'),
			'/n/Service.js': `${inner}
export class Service {
	inner = new Inner();
	reset() {
		this.inner = undefined;
	}
}`,
		});
		expect(result.errors.join('\n')).toContain(
			"the field 'inner' of the class 'Service' holds an object of a class and is used as a value",
		);
	});

	it('calls a method of an object that a field holds', () => {
		const result = run({
			'/n/Sample.node.js': serviceNode('return [[{ json: { value: service.read() } }]];'),
			'/n/Service.js': `${inner}
export class Service {
	inner;
	constructor() {
		this.inner = new Inner();
	}
	read() {
		return this.inner.value();
	}
}`,
		});
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('Inner_value(__self.inner)');
	});

	it('refuses a constructor that uses the object before it stores the objects of its fields', () => {
		const result = run({
			'/n/Sample.node.js': serviceNode('return [[{ json: { value: service.first } }]];'),
			'/n/Service.js': `${inner}
export class Service {
	constructor() {
		this.first = this.read();
		this.inner = new Inner();
	}
	read() {
		return this.inner.value();
	}
}`,
		});
		expect(result.errors.join('\n')).toContain(
			'the constructor uses the object before it stores the objects of its fields',
		);
	});

	const statics = `
export class Methods {
	static async fetch(id) {
		return await this.helpers.request({ method: 'GET', uri: Methods.join(id) });
	}
	static join(id) {
		return 'https://api.example.test/' + id;
	}
	static self() {
		return this.join('a');
	}
}`;
	const staticNode = (body: string) => `
import { Methods as Api } from './Methods';
export class Sample {
	async execute() {
		const resource = this.getNodeParameter('resource', 0);
		const operations = { item: Api.fetch };
		${body}
	}
}`;

	it('compiles a static method that a constant key picks from a local table', () => {
		const result = run(
			{
				'/n/Sample.node.js': staticNode(
					"return [this.helpers.returnJsonArray(await operations[resource].call(this, 'a'))];",
				),
				'/n/Methods.js': statics,
			},
			{ resource: 'item' },
		);
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('__request');
		expect(result.source).not.toContain('operations');
	});

	it('keeps the error for a local table that the code uses as a value', () => {
		const result = run(
			{
				'/n/Sample.node.js': staticNode(
					"return [[{ json: { keys: Object.keys(operations), data: await operations[resource].call(this, 'a') } }]];",
				),
				'/n/Methods.js': statics,
			},
			{ resource: 'item' },
		);
		expect(result.errors.join('\n')).toContain("the class 'Api' is used as a value");
	});

	it('refuses a static method that uses `this` in a call without the n8n context', () => {
		const result = run(
			{
				'/n/Sample.node.js': staticNode('return [[{ json: { url: Api.self() } }]];'),
				'/n/Methods.js': statics,
			},
			{ resource: 'item' },
		);
		expect(result.errors.join('\n')).toContain('a call does not give the n8n context');
	});

	it('compiles a method that a call gives the n8n context in place of the object', () => {
		const result = run({
			'/n/Sample.node.js': `
import { Mapper } from './Mapper';
export class Sample {
	async execute() {
		const mapper = new Mapper();
		const fields = await mapper.load.call(this, 'a');
		return [this.helpers.returnJsonArray(mapper.keep(fields))];
	}
}`,
			'/n/Mapper.js': `
export class Mapper {
	async load(id) {
		return await this.helpers.request({ method: 'GET', uri: 'https://api.example.test/' + id });
	}
	keep(fields) {
		return fields;
	}
}`,
		});
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('__request');
		expect(result.source).not.toContain('Mapper_load(mapper');
	});

	const moduleFiles = (body: string) => ({
		'/n/Sample.node.js': `
import * as item from './item';
export class Sample {
	async execute() {
		const operation = this.getNodeParameter('operation', 0);
		let resourceModule;
		resourceModule = item;
		const operationModule = resourceModule[operation];
		if (!operationModule) {
			throw new Error('not known');
		}
		${body}
	}
}`,
		'/n/item.js': "import * as get from './get';\nexport { get };",
		'/n/get.js': `
export async function execute(id) {
	return await this.helpers.request({ method: 'GET', uri: 'https://api.example.test/' + id });
}`,
	});

	it('calls a function of a module that a variable holds', () => {
		const result = run(
			moduleFiles(
				"return [this.helpers.returnJsonArray(await operationModule.execute.call(this, 'a'))];",
			),
			{ operation: 'get' },
		);
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('__request');
		expect(result.source).not.toContain('resourceModule');
	});

	it('keeps the error for a module that the code uses as a value', () => {
		const result = run(
			moduleFiles(
				"return [[{ json: { keys: Object.keys(operationModule), data: await operationModule.execute.call(this, 'a') } }]];",
			),
			{ operation: 'get' },
		);
		expect(result.errors.join('\n')).toContain('target that is not known at compile time');
	});
});

describe('node compiler: folds that keep the result of v1', () => {
	const run = (body: string, helpers = '', parameters: Record<string, unknown> = {}) =>
		specialiseNode({
			type: 'n8n-nodes-base.sample',
			version: 1,
			entry: '/n/Sample.node.js',
			readFile: (path) =>
				path === '/n/Sample.node.js'
					? `${helpers}\nexport class Sample {\n\tasync execute() {\n${body}\n\t}\n}`
					: undefined,
			parameters,
			instanceId: null,
		});

	it('keeps the name that v1 shows when a loop source folds to a value that is not there', () => {
		const result = run(
			`const media = this.getNodeParameter('media', 0);
			const out = [];
			for (const item of media.list) out.push({ json: item });
			return [out];`,
			'',
			{ media: {} },
		);
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('"media.list is not iterable"');
		expect(result.source).not.toContain('__iterable');
	});

	it('folds all the branches on an empty collection in one compile', () => {
		const branches = Array.from(
			{ length: 60 },
			(_, k) => `if (fields.f${k}) body.push({ name: 'f${k}', value: fields.f${k} });`,
		).join('\n');
		const result = run(
			`const fields = this.getNodeParameter('fields', 0);
			const body = [];
			${branches}
			return [[{ json: { body } }]];`,
			'',
			{ fields: {} },
		);
		expect(result.errors).toEqual([]);
		expect(result.source).not.toContain('f59');
	});

	it('gives the error of v1 for the spread of a value that is not a list', () => {
		const result = run(
			`const out = [];
			const data = await this.helpers.request({ method: 'GET', uri: 'https://api.example.test/a' });
			out.push(...data.rows);
			return [this.helpers.returnJsonArray(out)];`,
		);
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('__spreadList(data.rows, "data.rows")');
	});

	it('keeps a parameter that the function writes through a pattern', () => {
		const result = run(
			`const data = await this.helpers.request({ method: 'GET', uri: 'https://api.example.test/a' });
			return [[{ json: { range: split(undefined, data.range) } }]];`,
			`function split(sheet, range) {
				if (range.includes('!')) [sheet, range] = range.split('!');
				return [sheet, range];
			}`,
		);
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('[sheet, range] = range.split');
	});

	it('takes more arguments than a function declares when an argument can have an effect', () => {
		const result = run(
			`const data = await this.helpers.request({ method: 'GET', uri: 'https://api.example.test/a' });
			return [[{ json: { id: first(data.id, data.rows[0]) } }]];`,
			`function first(id) {
				return String(id) + '!';
			}`,
		);
		expect(result.errors).toEqual([]);
		expect(result.source).toMatch(/function first\(id[^)]*, __unused0/);
	});

	it('refuses a read of an input other than the first', () => {
		const result = run('return [[...this.getInputData(0), ...this.getInputData(1)]];');
		expect(result.errors.join('\n')).toContain("'this.getInputData' has no compiled form");
	});

	it('keeps an item that has a json key when it makes the list of items', () => {
		const result = run(
			`const data = await this.helpers.request({ method: 'GET', uri: 'https://api.example.test/a' });
			return [this.helpers.returnJsonArray(this.helpers.returnJsonArray(data))];`,
		);
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('json.json');
	});

	it('folds an optional chain on a value that is not there', () => {
		const result = run(
			`const uri = undefined;
			const page = uri?.includes('page_info') ? 1 : 2;
			return [[{ json: { page } }]];`,
			'',
			{ uri: undefined },
		);
		expect(result.errors).toEqual([]);
		expect(result.source).not.toContain('includes');
	});
});
