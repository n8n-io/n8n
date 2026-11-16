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
			`const uri = this.getNodeParameter('uri', 0);
			const page = uri?.includes('page_info') ? 1 : 2;
			return [[{ json: { page } }]];`,
			'',
			{ uri: undefined },
		);
		expect(result.errors).toEqual([]);
		expect(result.source).not.toContain('includes');
	});
});
