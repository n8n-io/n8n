import { DateTime, Duration, Interval } from 'luxon';

import { extend, extendOptional } from '../extensions/extend';

import { SafeObject, SafeError, ExpressionError } from './safe-globals';
import { createDeepLazyProxy } from './lazy-proxy';
import { resetDataProxies } from './reset';
import { __prepareForTransfer } from './serialize';

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
		var Duration: typeof import('luxon').Duration;
		var Interval: typeof import('luxon').Interval;
		var __prepareForTransfer: (value: unknown) => unknown;
		var extend: typeof import('../extensions/extend').extend;
		var extendOptional: typeof import('../extensions/extend').extendOptional;

		// Workflow data exposed for expression access
		var $json: unknown;
		var $binary: unknown;
		var $input: unknown;
		var $node: unknown;
		var $parameter: unknown;
		var $workflow: unknown;
		var $prevNode: unknown;
		var $data: unknown;
		var $env: unknown;
		var $runIndex: number | undefined;
		var $itemIndex: number | undefined;
		var $now: import('luxon').DateTime;
		var $today: import('luxon').DateTime;
		var $items: unknown;
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
globalThis.resetDataProxies = resetDataProxies;
globalThis.__prepareForTransfer = __prepareForTransfer;

// Initialize empty __data object (populated by resetDataProxies before each evaluation)
globalThis.__data = {};
