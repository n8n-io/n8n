import { DateTime, Duration, Interval } from 'luxon';
import * as lodash from 'lodash';

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

		// Libraries (already declared via lodash import, but needed for runtime)
		// Note: _ causes duplicate identifier error, will be assigned without type declaration
		var DateTime: typeof import('luxon').DateTime;
		var Duration: typeof import('luxon').Duration;
		var Interval: typeof import('luxon').Interval;
	}
}

// ============================================================================
// Library Setup
// ============================================================================

// @ts-ignore - _ is assigned to globalThis for expression runtime
globalThis._ = lodash;

// Expose extend/extendOptional globally so tournament-transformed expressions work
(globalThis as any).extend = extend;
(globalThis as any).extendOptional = extendOptional;

// Expose Luxon both as individual globals and as luxon object
globalThis.DateTime = DateTime;
globalThis.Duration = Duration;
globalThis.Interval = Interval;

// Also expose as luxon namespace (for expressions like luxon.DateTime.now())
(globalThis as any).luxon = {
	DateTime,
	Duration,
	Interval,
};

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
