import { DateTime, Duration, Interval } from 'luxon';

import { extend, extendOptional } from '../extensions/extend';

import { SafeObject, SafeError, ExpressionError } from './safe-globals';
import { createDeepLazyProxy } from './lazy-proxy';
import { buildContext } from './context';
import { __prepareForTransfer } from './serialize';

// Augment globalThis with runtime properties
declare global {
	namespace globalThis {
		// Proxy creator function
		var createDeepLazyProxy: (basePath?: string[]) => any;

		// Context builder (closure-scoped alternative to resetDataProxies)
		var buildContext: (
			getValueAtPath: any,
			getArrayElement: any,
			callFunctionAtPath: any,
			timezone?: string,
		) => Record<string, unknown>;

		// Safe wrappers
		var SafeObject: typeof Object;
		var SafeError: typeof Error;

		// Expression engine globals
		var DateTime: typeof import('luxon').DateTime;
		var Duration: typeof import('luxon').Duration;
		var Interval: typeof import('luxon').Interval;
		var __prepareForTransfer: (value: unknown) => unknown;
		var extend: typeof import('../extensions/extend').extend;
		var extendOptional: typeof import('../extensions/extend').extendOptional;
	}
}

// ============================================================================
// Library Setup
// ============================================================================

// Expose globals required by tournament-transformed expressions
globalThis.extend = extend;
globalThis.extendOptional = extendOptional;
globalThis.DateTime = DateTime;
globalThis.Duration = Duration;
globalThis.Interval = Interval;

// ============================================================================
// Expose security globals and runtime functions
// ============================================================================

globalThis.SafeObject = SafeObject;
globalThis.SafeError = SafeError;
(globalThis as any).ExpressionError = ExpressionError;

globalThis.createDeepLazyProxy = createDeepLazyProxy;
globalThis.buildContext = buildContext;
globalThis.__prepareForTransfer = __prepareForTransfer;
