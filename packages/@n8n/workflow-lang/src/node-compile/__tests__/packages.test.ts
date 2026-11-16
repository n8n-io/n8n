import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';
import { specialiseNode } from '../specialise.ts';

const here = dirname(fileURLToPath(import.meta.url));
const nodesBase = join(here, '../../../../../nodes-base');
const changeCasePath = join(nodesBase, 'node_modules/change-case/dist/index.js');

const ENTRY = '/probe/Probe.node.ts';

function probe(imports: string, expression: string) {
	const source = `${imports}
export class Probe {
	async execute(this: any) {
		const items = this.getInputData();
		const returnData: any[] = [];
		for (let i = 0; i < items.length; i++) {
			const text = items[i].json.text;
			returnData.push({ json: { r: ${expression} } });
		}
		return [returnData];
	}
}`;
	return specialiseNode({
		type: 'n8n-nodes-base.probe',
		version: 1,
		entry: ENTRY,
		readFile: (path) => (path === ENTRY ? source : undefined),
		parameters: {},
		aliases: {},
		instanceId: null,
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

const fixture = { trigger: { body: {}, headers: {}, query: {} }, now: 0, seed: 1, effects: {} };

async function run(imports: string, expression: string, texts: unknown[]) {
	const result = probe(imports, expression);
	expect(result.errors).toEqual([]);
	const nodes = { 'nodes/compiled-node.ts': result.source ?? '' };
	const compiled = compile(workflowSource(texts), { nodes });
	expect(compiled.diagnostics).toEqual([]);
	const reference = await runReference(workflowSource(texts), fixture, { nodes });
	const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
	expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
	return reference;
}

async function values(imports: string, expression: string, texts: unknown[]): Promise<unknown[]> {
	const out = await run(imports, expression, texts);
	expect(out.status).toBe('ok');
	const rows: unknown = out.result;
	return Array.isArray(rows) ? rows.map((row: { r: unknown }) => row.r) : [];
}

const CASE_FUNCTIONS = [
	'noCase',
	'snakeCase',
	'kebabCase',
	'dotCase',
	'pathCase',
	'constantCase',
	'capitalCase',
	'trainCase',
	'pascalSnakeCase',
	'sentenceCase',
	'camelCase',
	'pascalCase',
];

const TRICKY = [
	'',
	' ',
	'A',
	'aB',
	'ID',
	'ABC',
	'ABCdef',
	'fooBar',
	'FooBar',
	'FOO_BAR',
	'foo_bar',
	'foo-bar',
	'XMLHttpRequest',
	'userID',
	'UserIDs',
	'iPhone7Plus',
	'HTML5 parser',
	'V8Engine',
	'testV2',
	'TEST_v2_A1',
	'version 1.2.10',
	'foo2bar',
	'Foo2Bar',
	'2fooBar',
	'a1B2c3',
	'123',
	'1 2 3',
	'emailAddress1',
	'__private__',
	'dot.case/path-case',
	'  leading and trailing  ',
	'tab\tnew\nline',
	'x\u0000y',
	"it's a (test)!",
	'first_name',
	'Last Modified By',
	'createdAt',
	'sys_created_on',
	'AWSRegion2Name',
	'aBcDeFgH',
	'A1A',
	'a1A1a',
	'AAa',
	'aAA',
	'AA1a',
	'$$price%',
];

function generated(): string[] {
	const alphabet = ['a', 'b', 'B', 'C', '1', '_'];
	let level = [''];
	const all: string[] = [];
	for (let length = 1; length <= 4; length++) {
		level = level.flatMap((prefix) => alphabet.map((c) => prefix + c));
		all.push(...level);
	}
	return all;
}

describe.runIf(existsSync(changeCasePath))('node compiler: change-case', () => {
	const imports = `import { ${CASE_FUNCTIONS.join(', ')} } from 'change-case';`;
	const expression = `[${CASE_FUNCTIONS.map((name) => `${name}(text)`).join(', ')}]`;

	it.each([
		{ label: 'a list of tricky texts', texts: TRICKY },
		{ label: 'all short texts of six characters', texts: generated() },
	])('gives the result of the package for $label', async ({ texts }) => {
		const real: Record<string, (input: string) => string> = await import(
			pathToFileURL(changeCasePath).href
		);
		const expected = texts.map((text) => CASE_FUNCTIONS.map((name) => real[name](text)));
		expect(await values(imports, expression, texts)).toEqual(expected);
	});

	it.each([
		{ label: 'a letter outside ASCII', text: 'café au lait' },
		{ label: 'a number', text: 12 },
		{ label: 'null', text: null },
	])('stops with an error for $label', async ({ text }) => {
		const out = await run(imports, expression, [text]);
		expect(out.status).toBe('error');
	});

	it('does not compile a call with options', () => {
		const result = probe(
			"import { snakeCase } from 'change-case';",
			"snakeCase(text, { delimiter: '.' })",
		);
		expect(result.errors.length).toBeGreaterThan(0);
	});
});

const URL_READ = `(() => {
	try {
		const url = new URL(text);
		return [url.href, url.origin, url.protocol, url.host, url.hostname, url.port, url.pathname, url.search, url.hash, url.searchParams.get('a'), new URL(text).searchParams.get('b c'), URL.canParse(text)];
	} catch (error) {
		return [error.name, error.message, URL.canParse(text)];
	}
})()`;

function urlOfNode(text: unknown): unknown {
	try {
		const url = new URL(String(text));
		return [
			url.href,
			url.origin,
			url.protocol,
			url.host,
			url.hostname,
			url.port,
			url.pathname,
			url.search,
			url.hash,
			url.searchParams.get('a'),
			url.searchParams.get('b c'),
			true,
		];
	} catch (error) {
		return error instanceof Error ? [error.name, error.message, false] : [];
	}
}

const URL_SUPPORTED = [
	'https://example.com',
	'https://example.com/',
	'HTTPS://Example.COM/Path?Query=1#Hash',
	'http://example.com:80/',
	'http://example.com:8080/a/b',
	'https://example.com:443',
	'https://example.com:0443/x',
	'http://example.com:65535',
	'http://example.com:65536',
	'http://example.com:99999999999999999999',
	'http://example.com:',
	'http://example.com:8a',
	'http://example.com:80:90',
	'http://:80/',
	'http://',
	'http:',
	'https:///?a=1',
	'http:example.com',
	'http:/example.com/a',
	'http:////example.com//a//b',
	'http:\\\\example.com\\a\\b',
	'https://docs.google.com/document/d/1AbC_d-9/edit#heading=h.abc',
	'https://drive.google.com/open?id=abc_123-X',
	'https://example.com/a/./b/../c',
	'https://example.com/a/%2e%2E/b/%2e',
	'https://example.com/..',
	'https://example.com/a/..',
	'https://example.com/a/../',
	'https://example.com/a b/"c"<d>`e`{f}^g|h',
	'https://example.com/?a=1&a=2&b+c=x%20y',
	'https://example.com/?a=%26%3D&b%20c=%E2%82%AC',
	'https://example.com/?a=\'q\' "r"<s>',
	'https://example.com/?a',
	'https://example.com/?=x&a=',
	'https://example.com/?&&a=1&&',
	'https://example.com/?',
	'https://example.com/#',
	'https://example.com?a=1#',
	'https://example.com#a b"<>`',
	'https://example.com/?a=1#frag?x=2',
	'https://sub_domain.example-site.co.uk/x',
	'https://192.168.1.10:8443/api',
	'https://0.0.0.0/',
	'https://255.255.255.255/',
	'https://1.2.3.example/',
	'https://3com.example/',
	'https://a.0xzz/',
	'  https://example.com/a  ',
	'\thttps://exa\nmple.com/a\r\n',
	'https://exa mple.com/',
	'https://exa<mple.com/',
	'https://exa|mple.com/',
	'https://exa^mple.com/',
	'https://example.com/\u0001\u001f',
	'bareId_123-x',
	'',
	' ',
	'example.com/path',
	'/relative/path',
	'//example.com/x',
	'1http://example.com',
	'ht tp://example.com',
	'http//example.com',
	'ünïcode',
	'docs.google.com/document/d/ü',
	'https://example.com/%',
	'https://example.com/%zz?a=%41',
	12,
	true,
	null,
];

const URL_OUTSIDE = [
	'ftp://example.com/x',
	'mailto:someone@example.com',
	'file:///etc/hosts',
	'data:text/plain,hello',
	'localhost:3000',
	'https://user:pass@example.com/',
	'https://[::1]/',
	'https://ex%61mple.com/',
	'https://exämple.com/',
	'https://example.com/ü',
	'https://example.com/?a=ü',
	'https://example.com/\u007f',
	'https://xn--exmple-cua.com/',
	'https://example..com/',
	'https://example.com./',
	'https://.example.com/',
	'https://1.2.3/',
	'https://0x7f.1/',
	'https://01.2.3.4/',
	'https://256.1.1.1/',
	'https://example.123/',
	'https://123/',
	'https://a.0x/',
	'https://exa!mple.com/',
	'https://exa$mple.com/',
	'https://example.com/?a=%',
	'https://example.com/?a=%C0%80',
	['https://example.com'],
];

describe('node compiler: URL', () => {
	it('gives the result of Node for each URL that it reads', async () => {
		const out = await values('', URL_READ, URL_SUPPORTED);
		expect(out).toEqual(URL_SUPPORTED.map(urlOfNode));
	});

	it.each(URL_OUTSIDE.map((text) => ({ text })))(
		'gives the result of Node or stops, and no catch block hides the stop: $text',
		async ({ text }) => {
			const out = await run('', URL_READ, [text]);
			if (out.status === 'ok') expect(out.result).toEqual([{ r: urlOfNode(text) }]);
			else expect(JSON.stringify(out.result)).toContain('has no compiled form');
		},
	);

	it('reads a URL in a variable, a pattern and an assignment', async () => {
		const expression = `(() => {
	let late;
	try {
		late = new URL(text);
	} catch {
		return 'not a URL';
	}
	const { hostname, pathname: path, searchParams } = new URL(text);
	new URL(text);
	return [late.host, hostname, path, searchParams.get('id'), new URL(text).origin === new URL('https://drive.google.com').origin];
})()`;
		const texts = [
			'https://drive.google.com:8443/open?id=abc',
			'https://drive.google.com/x',
			'abc',
		];
		expect(await values('', expression, texts)).toEqual([
			['drive.google.com:8443', 'drive.google.com', '/open', 'abc', false],
			['drive.google.com', 'drive.google.com', '/x', null, true],
			'not a URL',
		]);
	});

	it.each([
		{ label: 'the URL object as a value', expression: 'String(new URL(text))' },
		{ label: 'a method of the URL object', expression: 'new URL(text).toString()' },
		{ label: 'a base URL', expression: "new URL(text, 'https://example.com').href" },
		{
			label: 'a write to a part',
			expression: "(() => { const u = new URL(text); u.pathname = '/x'; return u.href; })()",
		},
		{
			label: 'a variable that goes to other code',
			expression: '(() => { const u = new URL(text); return [u.href, u]; })()',
		},
		{
			label: 'the parameters as a value',
			expression: '(() => { const { searchParams } = new URL(text); return [...searchParams]; })()',
		},
		{
			label: 'a method of the parameters other than get',
			expression: "new URL(text).searchParams.has('a')",
		},
	])('does not compile $label', ({ expression }) => {
		expect(probe('', expression).errors.length).toBeGreaterThan(0);
	});

	it('gives the text of URLSearchParams for an object of text', async () => {
		const texts = [
			{},
			{ a: '1', 'b c': "x y!~*'()-._", e: '€&=+%', n: 5, t: true, empty: '' },
			{ '😀': 'é', 'a+b': 'c d' },
		];
		const expected = texts.map((text) =>
			new URLSearchParams(
				Object.entries(text).map(([key, value]) => [key, String(value)]),
			).toString(),
		);
		expect(await values('', 'new URLSearchParams(text).toString()', texts)).toEqual(expected);
		const outside = await run('', 'new URLSearchParams(text).toString()', ['a=1']);
		expect(JSON.stringify(outside.result)).toContain('has no compiled form');
	});
});

describe('node compiler: Buffer for text', () => {
	const encode = `[
	Buffer.from(text).toString('base64'),
	Buffer.from(text, 'utf8').toString('hex'),
	Buffer.from(text, 'utf-8').toString('base64url'),
	Buffer.from(text).toString(),
]`;
	const decode = `[
	Buffer.from(text, 'base64').toString(),
	Buffer.from(text, 'base64').toString('utf8'),
	Buffer.from(text, 'base64').toString('hex'),
	Buffer.from(text, 'hex').toString(),
	Buffer.from(text, 'hex').toString('base64'),
]`;
	const texts = [
		'',
		'a',
		'hello world',
		'{"key":"value","n":[1,2,3]}',
		'aGVsbG8gd29ybGQ=',
		'aGVsbG8gd29ybGQ',
		'aGVs bG8g\nd29y bGQ=',
		'4pyTIMOgIGxhIG1vZGU=',
		'_-8_-w==',
		'/+8/+w==',
		'=abc',
		'ab=cd',
		'a',
		'!!!!',
		'/w==',
		'gICA',
		'68656c6c6f',
		'68656C6C6F',
		'686',
		'68zz65',
		'e282ac',
		'ff00fe',
	];

	const wide = ['héllo wörld €', '😀 emoji', '\ud83d lone', 'aGVs€bG8='];

	it('gives the result of Node for text to bytes', async () => {
		const expected = [...texts, ...wide].map((text) => [
			Buffer.from(text).toString('base64'),
			Buffer.from(text, 'utf8').toString('hex'),
			Buffer.from(text, 'utf-8').toString('base64url'),
			Buffer.from(text).toString(),
		]);
		expect(await values('', encode, [...texts, ...wide])).toEqual(expected);
	});

	it.each(wide.map((text) => ({ text })))(
		'stops for base64 or hex text outside ASCII: $text',
		async ({ text }) => {
			const out = await run('', decode, [text]);
			expect(out.status).toBe('error');
			expect(JSON.stringify(out.result)).toContain('has no compiled form');
		},
	);

	it('stops for a value that is not text', async () => {
		const out = await run('', encode, [[104, 105]]);
		expect(JSON.stringify(out.result)).toContain('has no compiled form');
	});

	it('gives the result of Node for base64 and hex text', async () => {
		const expected = texts.map((text) => [
			Buffer.from(text, 'base64').toString(),
			Buffer.from(text, 'base64').toString('utf8'),
			Buffer.from(text, 'base64').toString('hex'),
			Buffer.from(text, 'hex').toString(),
			Buffer.from(text, 'hex').toString('base64'),
		]);
		expect(await values('', decode, texts)).toEqual(expected);
	});

	it.each([
		{ label: 'a Buffer as a value', expression: 'Buffer.from(text)' },
		{ label: 'the length in bytes', expression: 'Buffer.byteLength(text)' },
		{
			label: 'an encoding other than utf8, base64 and hex',
			expression: "Buffer.from(text, 'latin1').toString()",
		},
		{
			label: 'an encoding that is not a literal',
			expression: 'Buffer.from(text, text).toString()',
		},
		{ label: 'a join of Buffers', expression: 'Buffer.concat([Buffer.from(text)]).toString()' },
	])('does not compile $label', ({ expression: code }) => {
		expect(probe('', code).errors.length).toBeGreaterThan(0);
	});
});

describe('node compiler: a stop for code that has no compiled form', () => {
	it.each([
		{
			label: 'a catch block with a name',
			code: "(() => { try { return snakeCase(text); } catch (error) { return 'hidden'; } })()",
		},
		{
			label: 'a catch block without a name',
			code: "(() => { try { return snakeCase(text); } catch { return 'hidden'; } })()",
		},
		{
			label: 'a catch block with a pattern',
			code: "(() => { try { return snakeCase(text); } catch ({ message }) { return 'hidden ' + message; } })()",
		},
		{
			label: 'a catch block in a catch block',
			code: "(() => { try { throw new Error('first'); } catch { try { return snakeCase(text); } catch { return 'hidden'; } } })()",
		},
	])('goes through $label', async ({ code }) => {
		const imports = "import { snakeCase } from 'change-case';";
		expect(await values(imports, code, ['fooBar'])).toEqual(['foo_bar']);
		const out = await run(imports, code, ['café']);
		expect(out.status).toBe('error');
		expect(JSON.stringify(out.result)).toContain('has no compiled form');
	});

	it('keeps the errors of the node code in its catch blocks', async () => {
		const code =
			"(() => { try { snakeCase(text); throw new Error('own'); } catch ({ message }) { return 'caught ' + message; } })()";
		expect(await values("import { snakeCase } from 'change-case';", code, ['a'])).toEqual([
			'caught own',
		]);
	});
});
