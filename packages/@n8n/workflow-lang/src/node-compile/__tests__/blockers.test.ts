import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { assertParamIsOfAnyTypes, jsonParse, validateNodeParameters } from 'n8n-workflow';
import type { INode } from 'n8n-workflow';

import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';
import { specialiseNode } from '../specialise.ts';

const here = dirname(fileURLToPath(import.meta.url));
const nodesBase = join(here, '../../../../../nodes-base');
const uuidPath = join(nodesBase, 'node_modules/uuid/dist/cjs/index.js');

const ENTRY = '/probe/Probe.node.ts';
const CREDENTIAL = '/probe/AcmeApi.credentials.ts';
const IMPORTS = `import { assertParamIsOfAnyTypes, jsonParse, validateNodeParameters } from 'n8n-workflow';
import { snakeCase } from 'change-case';
import { v4 as uuid, validate as uuidValidate } from 'uuid';
function makeError(message: string) {
	return new Error(message);
}`;

const CREDENTIAL_SOURCE = `
export class AcmeApi {
	name = 'acmeApi';
	async authenticate(credentials: any, requestOptions: any) {
		requestOptions.headers = { ...requestOptions.headers, 'X-Stamp': 'stamped' };
		return requestOptions;
	}
}`;

const BRANCHING = '/probe/BranchApi.credentials.ts';
const BRANCHING_SOURCE = `
export class BranchApi {
	name = 'branchApi';
	async authenticate(credentials: any, requestOptions: any) {
		requestOptions.headers = { ...requestOptions.headers, 'X-Key': credentials.apiKey };
		const stamped = Object.keys(requestOptions.headers).some((name) => name === 'X-Stamp');
		if (!stamped) requestOptions.headers = { ...requestOptions.headers, 'X-Stamp': 'stamped' };
		return requestOptions;
	}
}`;

interface Answer {
	status?: number;
	headers?: Record<string, string>;
	body?: unknown;
}

function probe(expression: string, before = '', parameters: Record<string, unknown> = {}) {
	const source = `${IMPORTS}
export class Probe {
	async execute(this: any) {
		const items = this.getInputData();
		const returnData: any[] = [];
		${before}
		for (let i = 0; i < items.length; i++) {
			const text = items[i].json.text;
			returnData.push({ json: { r: ${expression} } });
		}
		return [returnData];
	}
}`;
	const files: Record<string, string> = {
		[ENTRY]: source,
		[CREDENTIAL]: CREDENTIAL_SOURCE,
		[BRANCHING]: BRANCHING_SOURCE,
	};
	return specialiseNode({
		type: 'n8n-nodes-base.probe',
		version: 1,
		entry: ENTRY,
		readFile: (path) => files[path],
		parameters,
		aliases: {},
		instanceId: null,
		credentialEntry: (type) =>
			type === 'acmeApi' ? CREDENTIAL : type === 'branchApi' ? BRANCHING : undefined,
	});
}

function workflowSource(texts: unknown[]): string {
	return `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'probe' })],
	async run(ctx) {
		return await ctx.node({
			name: 'Node',
			type: 'n8n-nodes-base.probe',
			typeVersion: 1,
			parameters: {},
			items: ${JSON.stringify(texts.map((text) => ({ text })))},
		});
	},
});
`;
}

async function run(result: ReturnType<typeof probe>, texts: unknown[], answers: Answer[] = []) {
	expect(result.errors).toEqual([]);
	const fixture = {
		trigger: { body: {}, headers: {}, query: {} },
		now: 0,
		seed: 1,
		effects: { Node: answers.map((answer) => ({ status: 200, headers: {}, ...answer })) },
	};
	const nodes = { 'nodes/compiled-node.ts': result.source ?? '' };
	const compiled = compile(workflowSource(texts), { nodes });
	expect(compiled.diagnostics).toEqual([]);
	const reference = await runReference(workflowSource(texts), fixture, { nodes });
	const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
	expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
	return reference;
}

async function values(expression: string, texts: unknown[], answers?: Answer[]) {
	const out = await run(probe(expression), texts, answers);
	expect(out.status).toBe('ok');
	const rows: unknown = out.result;
	return Array.isArray(rows) ? rows.map((row: { r: unknown }) => row.r) : [];
}

function textOf(work: () => unknown): unknown {
	try {
		return work();
	} catch (error) {
		return error instanceof Error ? `${error.constructor.name}: ${error.message}` : String(error);
	}
}

const caught = (code: string) =>
	`(() => { try { ${code} } catch (error) { return error.name + ': ' + error.message; } })()`;

const NODE: INode = {
	id: '1',
	name: 'Node',
	type: 'n8n-nodes-base.probe',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

describe('node compiler: parameter checks of n8n-workflow', () => {
	it('gives the result and the error of assertParamIsOfAnyTypes', async () => {
		const inputs = ['a', 5, true, null, {}, []];
		const expected = inputs.map((input) =>
			textOf(() => {
				assertParamIsOfAnyTypes('amount', input, ['string', 'number'] as const, NODE);
				return 'ok';
			}),
		);
		expect(expected).toContain('ok');
		expect(expected.some((text) => String(text).startsWith('NodeOperationError: '))).toBe(true);
		const code = caught(
			"assertParamIsOfAnyTypes('amount', text, ['string', 'number'] as const, this.getNode()); return 'ok';",
		);
		expect(await values(code, inputs)).toEqual(expected);
	});

	it('gives the result and the errors of validateNodeParameters', async () => {
		const rules = {
			name: { type: 'string', required: true },
			count: { type: ['number', 'string[]'] },
			where: { type: 'resource-locator' },
			extra: { type: 'object' },
			flags: { type: 'boolean[]', required: true },
		} satisfies Parameters<typeof validateNodeParameters>[1];
		const inputs = [
			null,
			'x',
			5,
			[],
			{},
			{ name: 'a' },
			{ name: 'a', flags: [true] },
			{ name: 5, flags: [] },
			{ name: 'a', flags: [true, 'x'] },
			{ name: 'a', flags: [], count: ['a'] },
			{ name: 'a', flags: [], count: [1] },
			{ name: 'a', flags: [], count: 2 },
			{ name: 'a', flags: [], where: { __rl: true, mode: 'id', value: 1 } },
			{ name: 'a', flags: [], where: { mode: 'id' } },
			{ name: 'a', flags: [], where: ['__rl', 'mode', 'value'] },
			{ name: 'a', flags: [], extra: null },
			{ name: 'a', flags: [], extra: [] },
			{ name: 'a', flags: {} },
		];
		const expected = inputs.map((input) =>
			textOf(() => {
				validateNodeParameters(input, rules, NODE);
				return 'ok';
			}),
		);
		expect(new Set(expected).size).toBeGreaterThan(5);
		const code = caught(
			`validateNodeParameters(text, ${JSON.stringify(rules)}, this.getNode()); return 'ok';`,
		);
		expect(await values(code, inputs)).toEqual(expected);
	});

	it('gives the result and the errors of jsonParse', async () => {
		const inputs = ['{"a":[1]}', '5', 'x', ''];
		const plain = caught('return jsonParse(text);');
		const worded = caught("return jsonParse(text, { errorMessage: 'bad text' });");
		const backed = caught("return jsonParse(text, { fallbackValue: 'none' });");
		const got = await values(`[${plain}, ${worded}, ${backed}]`, inputs);
		const expected = inputs.map((input) => [
			textOf(() => jsonParse(input)),
			textOf(() => jsonParse(input, { errorMessage: 'bad text' })),
			textOf(() => jsonParse(input, { fallbackValue: 'none' })),
		]);
		expect(got.map((row) => (Array.isArray(row) ? row.slice(1) : row))).toEqual(
			expected.map((row) => row.slice(1)),
		);
		expect(got.map((row) => (Array.isArray(row) ? row[0] : row)).slice(0, 2)).toEqual(
			expected.map((row) => row[0]).slice(0, 2),
		);
	});

	it('stops for jsonParse with a repair of text that is not JSON', async () => {
		const out = await run(probe('jsonParse(text, { acceptJSObject: true })'), ["{ a: 'b' }"]);
		expect(out.status).toBe('error');
		expect(JSON.stringify(out.result)).toContain('has no compiled form');
	});
});

describe.runIf(existsSync(uuidPath))('node compiler: the uuid package', () => {
	it('gives the result of validate', async () => {
		const real: { validate: (value: unknown) => boolean } = await import(
			pathToFileURL(uuidPath).href
		);
		const good = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
		const inputs = [
			good,
			good.toUpperCase(),
			good.replace('-4bad', '-9bad'),
			good.replace('-4bad', '-0bad'),
			good.replace('-9bdd', '-cbdd'),
			good.replace('-9bdd', '-Bbdd'),
			good.replaceAll('-', ''),
			good.replace('9b1', '9g1'),
			`${good}0`,
			good.slice(1),
			'00000000-0000-0000-0000-000000000000',
			'ffffffff-ffff-ffff-ffff-ffffffffffff',
			'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF',
			'ffffffff-ffff-ffff-ffff-fffffffffffe',
			'',
			5,
			null,
			[good],
		];
		const expected = inputs.map((input) => real.validate(input));
		expect(expected).toContain(true);
		expect(expected).toContain(false);
		expect(await values('uuidValidate(text)', inputs)).toEqual(expected);
	});

	it('makes a version 4 identifier from the random source of the engine', async () => {
		const result = probe('uuid()');
		expect(result.randoms).toEqual([{ kind: 'uuid' }]);
		const out = await run(result, ['a', 'b']);
		const rows: unknown = out.result;
		const made = Array.isArray(rows) ? rows.map((row: { r: unknown }) => String(row.r)) : [];
		expect(made).toHaveLength(2);
		expect(made[0]).not.toBe(made[1]);
		for (const text of made)
			expect(text).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
	});
});

describe('node compiler: values that fold', () => {
	it('uses a change-case function as a value', async () => {
		expect(
			await values(
				"(() => { const toKey = text.length > 100 ? (v: string) => v : snakeCase; return [toKey(text), ['fooBar'].map(snakeCase)]; })()",
				['someText'],
			),
		).toEqual([['some_text', ['foo_bar']]]);
	});

	it('takes the clause of a switch on a constant, with the clauses that it falls into', async () => {
		const code =
			"(() => { const kind: string = 'user'; switch (kind) { case 'drive': return 'd' + text; case 'user': case 'group': default: return 'u' + text; } })()";
		const result = probe(code);
		expect(result.source).not.toContain('switch');
		expect(await values(code, ['a'])).toEqual(['ua']);
	});

	it('keeps a switch whose clause breaks out of the middle', async () => {
		const code =
			"(() => { const kind: string = 'user'; let out = 'none'; switch (kind) { case 'user': if (text === 'a') break; out = 'late'; default: out = out + '!'; } return out; })()";
		expect(await values(code, ['a', 'b'])).toEqual(['none', 'late!']);
	});

	it('folds the type of a constant and a variable that the code never writes', async () => {
		const code =
			"(() => { const raw = ''; let wide = false; const id = typeof raw === 'string' ? raw : String((raw as any)?.value ?? ''); return wide ? (raw as any).value.map(String) : id + text; })()";
		const source = probe(code).source ?? '';
		const body = source.slice(source.indexOf('const __items'));
		expect(body).not.toContain('typeof');
		expect(body).not.toContain('wide');
		expect(await values(code, ['a'])).toEqual(['a']);
	});

	it('keeps a variable that the code writes', async () => {
		const code =
			"(() => { let wide = false; let count = 0; if (text === 'a') wide = true; count++; return [wide, count]; })()";
		expect(await values(code, ['a', 'b'])).toEqual([
			[true, 1],
			[false, 1],
		]);
	});

	it('joins the nested fields of a credential into one template', () => {
		const result = probe(
			"await this.helpers.request({ method: 'GET', uri: 'https://a.test/' + companyId })",
			"const { oauthTokenData } = await this.getCredentials('acmeApi'); const companyId = oauthTokenData.callbackQueryString.realmId;",
		);
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('{{$credentials.oauthTokenData.callbackQueryString.realmId}}');
	});
});

describe('node compiler: instanceof', () => {
	it('tests a caught value against Error', async () => {
		const code =
			"(() => { try { if (text === 'a') throw new Error('own'); return JSON.parse(text); } catch (error) { return error instanceof Error ? 'error ' + typeof error.message : 'other'; } })()";
		expect(await values(code, ['a', '{', '5'])).toEqual(['error string', 'error string', 5]);
	});

	it('follows an error through a variable and a function that makes it', async () => {
		const code =
			"(() => { let last; try { try { JSON.parse(text); } catch (error) { last = error; } throw last || makeError('none'); } catch (error) { return error instanceof Error ? error.message : 'other'; } })()";
		expect(await values(code, ['5'])).toEqual(['none']);
	});

	it.each([
		{ label: 'an object', thrown: '{ message: text }' },
		{ label: 'text', thrown: 'text' },
		{ label: 'a value of the response', thrown: 'JSON.parse(text)' },
	])('does not compile the test when the code throws $label', ({ thrown }) => {
		const result = probe(
			`(() => { try { throw ${thrown}; } catch (error) { return error instanceof Error; } })()`,
		);
		expect(result.errors.join(' ')).toContain('not known to be an error');
	});

	it('does not compile the test of a value that is not caught', async () => {
		const result = probe('text instanceof Error');
		const nodes = { 'nodes/compiled-node.ts': result.source ?? '' };
		const problems = [...result.errors, ...compile(workflowSource([]), { nodes }).diagnostics];
		expect(problems.length).toBeGreaterThan(0);
	});

	it('tests a value against Array', async () => {
		expect(await values('text instanceof Array', ['a', [1], { a: 1 }, null])).toEqual([
			false,
			true,
			false,
			false,
		]);
	});
});

describe('node compiler: request options', () => {
	const answer = { headers: { location: '/next' }, body: { id: 7 } };

	it('gives the body, the headers and the status code of a full response', async () => {
		const full = await values(
			"await this.helpers.request({ method: 'GET', uri: 'https://a.test/x', json: true, resolveWithFullResponse: true })",
			['a'],
			[answer],
		);
		expect(full).toEqual([{ body: { id: 7 }, headers: { location: '/next' }, statusCode: 200 }]);
		const modern = await values(
			"await this.helpers.httpRequest({ method: 'GET', url: 'https://a.test/x', returnFullResponse: true })",
			['a'],
			[answer],
		);
		expect(modern).toEqual(full);
		const body = await values(
			"await this.helpers.request({ method: 'GET', uri: 'https://a.test/x', json: true })",
			['a'],
			[answer],
		);
		expect(body).toEqual([{ id: 7 }]);
	});

	it('gives the answer of a failed request that the node asks for', async () => {
		const failed = { status: 404, body: { message: 'gone' } };
		const legacy = await values(
			"await this.helpers.request({ method: 'GET', uri: 'https://a.test/x', json: true, simple: false, resolveWithFullResponse: true })",
			['a'],
			[failed],
		);
		expect(legacy).toEqual([{ body: { message: 'gone' }, headers: {}, statusCode: 404 }]);
		const modern = await values(
			"await this.helpers.httpRequest({ method: 'GET', url: 'https://a.test/x', ignoreHttpStatusErrors: true })",
			['a'],
			[failed],
		);
		expect(modern).toEqual([{ message: 'gone' }]);
		const strict = await run(
			probe("await this.helpers.request({ method: 'GET', uri: 'https://a.test/x', json: true })"),
			['a'],
			[failed],
		);
		expect(strict.status).toBe('error');
	});

	it.each(['statusMessage', 'request'])(
		'does not compile a read of %s of a full response',
		(field) => {
			const result = probe(
				`(await this.helpers.request({ method: 'GET', uri: 'https://a.test/x', resolveWithFullResponse: true })).${field}`,
			);
			expect(result.errors.join(' ')).toContain('a full response has only');
		},
	);

	it('applies the authenticate method of a credential type that folds to a constant', async () => {
		const before =
			"let type = 'otherApi'; if (this.getNodeParameter('auth', 0) === 'key') { type = 'acmeApi'; } else { type = 'thirdApi'; } const got = await this.helpers.requestWithAuthentication.call(this, type, { method: 'GET', uri: 'https://a.test/x', json: true });";
		const stamped = probe('got', before, { auth: 'key' });
		const out = await run(stamped, ['a'], [answer]);
		expect(out.effects.map((effect) => effect.args)).toEqual([
			expect.objectContaining({ headers: { 'X-Stamp': 'stamped' } }),
		]);
		const plain = await run(probe('got', before, { auth: 'other' }), ['a'], [answer]);
		expect(plain.effects.map((effect) => effect.args)).toEqual([
			expect.objectContaining({ headers: {} }),
		]);
	});

	it('leaves out an authenticate method that has no compiled form when the type folds late', async () => {
		const request = "{ method: 'GET', uri: 'https://a.test/x', json: true }";
		const late = probe(
			'got',
			`let type = 'otherApi'; if (this.getNodeParameter('auth', 0) === 'key') { type = 'branchApi'; } else { type = 'thirdApi'; } const got = await this.helpers.requestWithAuthentication.call(this, type, ${request});`,
			{ auth: 'key' },
		);
		const out = await run(late, ['a'], [answer]);
		expect(out.effects.map((effect) => effect.args)).toEqual([
			expect.objectContaining({ headers: {}, inject: true }),
		]);
		const direct = probe(
			`await this.helpers.requestWithAuthentication.call(this, 'branchApi', ${request})`,
		);
		expect(direct.errors.join(' ')).toContain('credential');
	});
});
