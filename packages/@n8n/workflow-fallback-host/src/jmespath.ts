/**
 * `$jmespath(data, query)` of n8n's Code node and expressions, for code steps of
 * the host. It has the checks of n8n-workflow's `jmespathWrapper`
 * (`workflow-data-proxy.ts`) and searches with the same `jmespath` package. Data
 * and result cross the context boundary as JSON text.
 */
import { createRequire } from 'node:module';

/** `unsafeObjectProperties` of n8n-workflow (`utils.ts`). */
const UNSAFE = [
	'__proto__',
	'prototype',
	'constructor',
	'getPrototypeOf',
	'setPrototypeOf',
	'getOwnPropertyDescriptor',
	'getOwnPropertyDescriptors',
	'defineProperty',
	'defineProperties',
	'mainModule',
	'binding',
	'_linkedBinding',
	'_load',
	'prepareStackTrace',
	'__lookupGetter__',
	'__lookupSetter__',
	'__defineGetter__',
	'__defineSetter__',
	'caller',
	'callee',
	'arguments',
	'getBuiltinModule',
	'dlopen',
	'execve',
	'loadEnvFile',
];

const UNSAFE_TOKEN = new RegExp(
	`\\b(?:${UNSAFE.map((p) => p.replace(/\$/g, '\\$')).join('|')})\\b`,
);

interface Jmespath {
	search(data: unknown, query: string): unknown;
}

function isJmespath(value: unknown): value is Jmespath {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof Reflect.get(value, 'search') === 'function'
	);
}

let library: Jmespath | undefined;

function jmespath(): Jmespath {
	if (library) return library;
	const workflowRequire = createRequire(createRequire(__filename).resolve('n8n-workflow'));
	const loaded: unknown = workflowRequire('jmespath');
	if (!isJmespath(loaded)) throw new Error('jmespath did not load');
	library = loaded;
	return loaded;
}

/** The result of `$jmespath` as JSON text. `dataText` is the data as JSON text. */
export function jmespathText(dataText: string, query: unknown): string {
	const data: unknown = JSON.parse(dataText);
	if (typeof data !== 'object' || typeof query !== 'string') {
		throw new Error('expected two arguments (Object, string) for this function');
	}
	if (query.includes('\\') || UNSAFE_TOKEN.test(query)) {
		throw new Error('Cannot access this property in a jmespath query due to security concerns');
	}
	const result = jmespath().search(data, query);
	return JSON.stringify(result === undefined ? null : result);
}
