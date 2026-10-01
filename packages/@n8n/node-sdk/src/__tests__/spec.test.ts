import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { RunContextV1 } from '../action-api-v1';
import type {
	BatchContext,
	Emit,
	HttpError,
	HttpMethod,
	HttpRequest,
	LogLevel,
	RunContext,
	RunLimits,
} from '../define';
import type { BinaryMeta } from '../schema';
import { ACTION_API_VERSION, apiSemverOf, compareSemver } from '../version';

/** The keys of `T`. A missing key fails `tsc`. */
const keysOf =
	<T>() =>
	<const K extends ReadonlyArray<keyof T>>(
		keys: K,
		..._missing: [Exclude<keyof T, K[number]>] extends [never] ? [] : [never]
	) =>
		keys;

/** The members of a string union. A missing member fails `tsc`. */
const membersOf =
	<T extends string>() =>
	<const V extends readonly T[]>(
		values: V,
		..._missing: [Exclude<T, V[number]>] extends [never] ? [] : [never]
	) =>
		values;

const camel = (name: string) => name.replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase());

/** Records, enums, and world imports of a WIT file. An import newer than `implemented` stays out. */
function witShape(file: string, implemented: string) {
	const text = readFileSync(path.resolve(__dirname, '../../spec', file), 'utf8').replace(
		/\/\/.*$/gm,
		'',
	);
	const blocks = (kind: string) =>
		Object.fromEntries(
			[...text.matchAll(new RegExp(`${kind} ([\\w-]+) \\{([^}]*)\\}`, 'g'))].map(
				([, name = '', body = '']) => [name, body],
			),
		);
	const records = Object.fromEntries(
		Object.entries(blocks('record')).map(([name, body]) => [
			name,
			[...body.matchAll(/([\w-]+)\s*:/g)].map(([, field = '']) => camel(field)),
		]),
	);
	const enums = Object.fromEntries(
		Object.entries(blocks('enum')).map(([name, body]) => [
			name,
			body.split(',').map((entry) => entry.trim()),
		]),
	);
	const variants = Object.fromEntries(
		Object.entries(blocks('variant')).map(([name, body]) => [
			name,
			body
				// A payload type can hold a comma, e.g. `made(tuple<json, list<u32>>)`.
				.replace(/\([^)]*\)/g, '')
				.split(',')
				.map((entry) => entry.trim())
				.filter(Boolean),
		]),
	);
	const world = /world [\w-]+ \{([\s\S]*?)\n\}/.exec(text)?.[1] ?? '';
	const imports = [
		...world.matchAll(/(?:@since\(version = ([\d.]+)\)\s*)?import ([\w-]+)/g),
	].flatMap(([, since, name = '']) =>
		since && compareSemver(since, implemented) > 0 ? [] : [camel(name)],
	);
	// TS spreads the `target` variant into its `url` and `path` keys.
	const fieldsOf = (record: string) =>
		(records[record] ?? []).flatMap((field) =>
			field === 'target' ? (variants['http-target'] ?? []) : [field],
		);
	return { text, records, enums, variants, imports, fieldsOf };
}

const sorted = (values: readonly string[]) => [...values].sort();

// The JS shim keeps `fullResponse`: the WIT response always has status, headers, and body.
// It maps `response: 'binary'` to `binary.fetch`.
const httpRequestKeys = keysOf<HttpRequest>()([
	'method',
	'url',
	'path',
	'query',
	'headers',
	'body',
	'timeoutMs',
	'retry',
	'fullResponse',
	'response',
]).filter((key) => key !== 'fullResponse' && key !== 'response');

const httpErrorKeys = keysOf<Pick<HttpError, Exclude<keyof HttpError, keyof Error> | 'message'>>()([
	'message',
	'status',
	'headers',
	'body',
]);

const methods = membersOf<HttpMethod>()(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']);

describe('spec/n8n-action@2.wit', () => {
	const wit = witShape('n8n-action@2.wit', apiSemverOf(ACTION_API_VERSION));

	it('has one run context field per host import, plus input and the items of the run', () => {
		const context = keysOf<RunContext<unknown>>()([
			'input',
			'item',
			'http',
			'log',
			'limits',
			'binary',
		]);
		const batch = keysOf<BatchContext<unknown>>()([
			'input',
			'items',
			'http',
			'log',
			'limits',
			'binary',
		]);
		expect(sorted(['input', 'item', ...wit.imports])).toEqual(sorted(context));
		expect(sorted(['input', 'items', ...wit.imports])).toEqual(sorted(batch));
		expect(wit.text).toContain('constructor(input: json, items: list<json>);');
	});

	it('has one output case per form of a routed emit', () => {
		type Routed = Emit<'batch', { id: string }, readonly ['a']>;
		const fields = keysOf<{ to: unknown; output: unknown }>()(['to', 'output']);
		expect(sorted(wit.records['routed-output'] ?? [])).toEqual(sorted(fields));
		expect(wit.variants.output).toEqual(['item', 'passed', 'made']);
		expectTypeOf<Routed['to']>().toEqualTypeOf<'a'>();
	});

	it('has the fields of the TS types', () => {
		expect(sorted(wit.fieldsOf('http-request'))).toEqual(sorted(httpRequestKeys));
		expect(sorted(wit.records['http-error'] ?? [])).toEqual(sorted(httpErrorKeys));
		expect(sorted(wit.records['run-limits'] ?? [])).toEqual(
			sorted(keysOf<RunLimits>()(['maxRequests', 'maxItems'])),
		);
		expect(wit.enums['http-method']).toEqual(methods);
		expect(wit.enums.level).toEqual(membersOf<LogLevel>()(['debug', 'info', 'warn', 'error']));
	});

	it('imports binary from 2.2.0 only', () => {
		expect(wit.imports).toContain('binary');
		expect(witShape('n8n-action@2.wit', '2.1.0').imports).not.toContain('binary');
	});

	it('has the binary types of the TS types', () => {
		expect(sorted(wit.fieldsOf('binary-request'))).toEqual(
			sorted(httpRequestKeys.filter((key) => key !== 'body')),
		);
		expect(sorted(wit.records['binary-meta'] ?? [])).toEqual(
			sorted(keysOf<BinaryMeta>()(['mimeType', 'fileName', 'bytes'])),
		);
	});
});

describe('spec/n8n-action@1.wit', () => {
	const wit = witShape('n8n-action@1.wit', '1.0.0');

	it('has one adapter context field per host import, plus input', () => {
		const context = keysOf<RunContextV1>()(['input', 'http', 'emit']);
		expect(sorted(['input', ...wit.imports])).toEqual(sorted(context));
	});

	it('has the HTTP types of @2', () => {
		expect(sorted(wit.fieldsOf('http-request'))).toEqual(sorted(httpRequestKeys));
		expect(sorted(wit.records['http-error'] ?? [])).toEqual(sorted(httpErrorKeys));
		expect(wit.enums['http-method']).toEqual(methods);
	});
});
