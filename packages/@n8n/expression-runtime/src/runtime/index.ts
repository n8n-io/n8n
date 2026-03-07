import { DateTime } from 'luxon';

import { extend, extendOptional } from '../extensions/extend';

import { SafeObject, SafeError, ExpressionError } from './safe-globals';
import { createDeepLazyProxy } from './lazy-proxy';
import { resetDataProxies } from './reset';

// Augment globalThis with runtime properties
declare global {
	namespace globalThis {
		// Callbacks from bridge (ivm.Reference)
		var __getValueAtPath: any;
		var __getArrayElement: any;
		var __callFunctionAtPath: any;

		// Data container
		var __data: Record<string, unknown>;

		// Proxy creator function
		var createDeepLazyProxy: (basePath?: string[]) => any;

		// Reset function (Step 3)
		var resetDataProxies: () => void;

		// Safe wrappers
		var SafeObject: typeof Object;
		var SafeError: typeof Error;

		// Expression engine globals
		var DateTime: typeof import('luxon').DateTime;
		var extend: typeof import('../extensions/extend').extend;
		var extendOptional: typeof import('../extensions/extend').extendOptional;
	}
}

// ============================================================================
// Web API Polyfills (for V8 isolate which lacks Web APIs)
// ============================================================================

// Polyfill crypto.getRandomValues for V8 isolate (no Web APIs available).
// Math.random() is intentionally used — randomItem() is non-security-critical.
// A bridge to Node.js crypto.getRandomValues was considered but rejected: an
// attacker-controlled `length` argument could allocate unbounded memory in the
// host process, bypassing the isolate's memory limit.
if (typeof crypto === 'undefined') {
	(globalThis as any).crypto = {
		getRandomValues: <T extends ArrayBufferView>(array: T): T => {
			if (array instanceof Uint32Array) {
				for (let i = 0; i < array.length; i++) {
					array[i] = Math.floor(Math.random() * 0x100000000);
				}
			}
			return array;
		},
	};
}

// Polyfill URLSearchParams for V8 isolate.
// Only constructor(Record<string, string>) + toString() are needed —
// the sole usage is object-extensions.ts urlEncode().
// encodeURIComponent is an ECMAScript built-in, available in all V8 contexts.
if (typeof URLSearchParams === 'undefined') {
	(globalThis as any).URLSearchParams = class {
		private _params: Array<[string, string]> = [];

		constructor(init?: Record<string, string>) {
			if (init && typeof init === 'object') {
				for (const [key, value] of Object.entries(init)) {
					this._params.push([String(key), String(value)]);
				}
			}
		}

		toString(): string {
			return this._params
				.map(
					([key, value]) =>
						encodeURIComponent(key).replace(/%20/g, '+') +
						'=' +
						encodeURIComponent(value).replace(/%20/g, '+'),
				)
				.join('&');
		}
	};
}

// ============================================================================
// Library Setup
// ============================================================================

// Expose globals required by tournament-transformed expressions
globalThis.extend = extend;
globalThis.extendOptional = extendOptional;
globalThis.DateTime = DateTime;

// ============================================================================
// Expose security globals and runtime functions
// ============================================================================

globalThis.SafeObject = SafeObject;
globalThis.SafeError = SafeError;
(globalThis as any).ExpressionError = ExpressionError;

globalThis.createDeepLazyProxy = createDeepLazyProxy;
globalThis.resetDataProxies = resetDataProxies;

// Initialize empty __data object (populated by resetDataProxies before each evaluation)
globalThis.__data = {};
