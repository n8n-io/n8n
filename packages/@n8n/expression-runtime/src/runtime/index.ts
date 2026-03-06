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

// Override Intl.NumberFormat for V8 isolate.
// isolated-vm V8 contexts may have Intl present but Intl.NumberFormat is a
// non-configurable native property — direct assignment silently fails in
// non-strict mode. Replacing the entire globalThis.Intl object ensures our
// toLocaleString-based implementation takes effect. toLocaleString is always
// available as an ECMAScript built-in and falls back to String() if ICU is absent.
(globalThis as any).Intl = {
	NumberFormat: class {
		private locale: string | string[];
		private options: Record<string, unknown>;

		constructor(locale?: string | string[], options?: Record<string, unknown>) {
			this.locale = locale ?? 'en-US';
			this.options = options ?? {};
		}

		format(value: number): string {
			try {
				return value.toLocaleString(
					this.locale as string,
					this.options as Intl.NumberFormatOptions,
				);
			} catch {
				return String(value);
			}
		}
	},
};

// Polyfill URL for V8 isolate.
// Only constructor + pathname are needed — the sole usage is string-extensions.ts extractUrlPath().
if (typeof URL === 'undefined') {
	(globalThis as any).URL = class {
		public pathname: string;
		public hostname: string;
		public protocol: string;
		public search: string;
		public hash: string;
		public href: string;

		constructor(input: string) {
			// Minimal URL parser sufficient for extractUrlPath() usage
			const match = /^([a-zA-Z][a-zA-Z0-9+\-.]*):\/\/([^/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/.exec(
				input,
			);
			if (!match) {
				throw new TypeError(`Invalid URL: ${input}`);
			}
			this.protocol = match[1] + ':';
			this.hostname = match[2];
			this.pathname = match[3] || '/';
			this.search = match[4] ?? '';
			this.hash = match[5] ?? '';
			this.href = input;
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
