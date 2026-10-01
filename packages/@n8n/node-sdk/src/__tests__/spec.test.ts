import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { RunContextV1 } from '../action-api-v1';
import type {
	HttpError,
	HttpMethod,
	HttpRequest,
	LogLevel,
	RunContext,
	RunLimits,
} from '../define';
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
				.split(',')
				.map((entry) => entry.trim().replace(/\(.*$/, ''))
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
	return { records, enums, variants, imports, fieldsOf };
}

const sorted = (values: readonly string[]) => [...values].sort();

// The JS shim keeps `fullResponse`: the WIT response always has status, headers, and body.
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
]).filter((key) => key !== 'fullResponse');

const httpErrorKeys = keysOf<Pick<HttpError, Exclude<keyof HttpError, keyof Error> | 'message'>>()([
	'message',
	'status',
	'headers',
	'body',
]);

const methods = membersOf<HttpMethod>()(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']);

describe('spec/n8n-action@2.wit', () => {
	const wit = witShape('n8n-action@2.wit', apiSemverOf(ACTION_API_VERSION));

	it('has one RunContext field per host import, plus input', () => {
		const context = keysOf<RunContext<unknown>>()(['input', 'http', 'log', 'limits']);
		expect(sorted(['input', ...wit.imports])).toEqual(sorted(context));
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

	it('keeps binary for 2.1.0, which this host does not implement yet', () => {
		expect(witShape('n8n-action@2.wit', '2.1.0').imports).toContain('binary');
		expect(wit.imports).not.toContain('binary');
	});

	it('sends a binary with an http-request that has no body', () => {
		expect(sorted(wit.fieldsOf('binary-request'))).toEqual(
			sorted(httpRequestKeys.filter((key) => key !== 'body')),
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
