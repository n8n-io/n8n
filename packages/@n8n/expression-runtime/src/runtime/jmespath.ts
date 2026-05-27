import * as jmespath from 'jmespath';

import { ExpressionError } from './safe-globals';

const unsafeJmespathProperties = [
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
	'arguments',
	'getBuiltinModule',
	'dlopen',
	'execve',
	'loadEnvFile',
];

const unsafeJmespathPropertyPattern = new RegExp(
	`\\b(?:${unsafeJmespathProperties.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
);

/**
 * In-isolate `$jmespath` / `$jmesPath` implementation.
 *
 * Mirrors the host-side wrapper in `packages/workflow/src/workflow-data-proxy.ts`
 * so that expressions resolve `$jmespath` from the in-isolate runtime via
 * Tournament's polyfill, instead of falling through to the bridge's
 * `callFunctionAtPath` channel. This shrinks the host-callable surface
 * exposed by the data object.
 *
 * Behavioural parity with the host wrapper:
 *   - Throws `ExpressionError` (same name) when args are wrong.
 *   - Rejects queries that contain unsafe property tokens.
 *   - Spreads non-array, non-null objects to drop proxies at the top level.
 *
 * Note on lazy proxies: when `data` is a lazy proxy (e.g. `$json`), each
 * property access during `jmespath.search` triggers a synchronous host
 * roundtrip via `getValueAtPath`. Functional but slow for deep traversals.
 * Performance optimisation (e.g. bulk pre-fetch of the queried subtree) is
 * a follow-up.
 */
export function jmesPath(data: unknown, query: string): unknown {
	if (typeof data !== 'object' || typeof query !== 'string') {
		throw new ExpressionError('expected two arguments (Object, string) for this function');
	}

	// jmespath decodes escape sequences inside quoted identifiers, so the
	// token check must run against an unescaped query. Reject any backslash
	// up front to keep the property-name match meaningful.
	if (query.includes('\\') || unsafeJmespathPropertyPattern.test(query)) {
		throw new ExpressionError(
			'Cannot access this property in a jmespath query due to security concerns',
		);
	}

	if (data !== null && !Array.isArray(data) && typeof data === 'object') {
		return jmespath.search({ ...(data as Record<string, unknown>) }, query);
	}

	// Array or null — pass through to jmespath which accepts both
	return jmespath.search(data as never, query);
}
