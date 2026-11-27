import { DateTime, Duration, Interval } from 'luxon';

import { extend, extendOptional } from '../extensions/extend';

import { SafeObject, SafeError, ExpressionError } from './safe-globals';
import { installQuickJsTransfer } from './quickjs-transfer';
import { installLazyArrayConcat } from './lazy-array-concat';
import { createDeepLazyProxy } from './lazy-proxy';
import { buildContext, type BridgeCallbacks } from './context';
import { __prepareForTransfer, type PrepareTransferOptions } from './serialize';

// Augment globalThis with runtime properties
declare global {
	// Proxy creator function
	var createDeepLazyProxy: (basePath?: string[]) => Record<string | symbol, unknown>;

	// Context builder (closure-scoped alternative to resetDataProxies).
	// Accepts a single callbacks bundle so adding new typed RPCs doesn't
	// churn the signature; see `BridgeCallbacks` in `runtime/context.ts`.
	var buildContext: (callbacks: BridgeCallbacks, timezone?: string) => Record<string, unknown>;

	// Safe wrappers
	var SafeObject: typeof Object;
	var SafeError: typeof Error;
	var ExpressionError: typeof import('./safe-globals').ExpressionError;

	// Expression engine globals
	var DateTime: typeof import('luxon').DateTime;
	var Duration: typeof import('luxon').Duration;
	var Interval: typeof import('luxon').Interval;
	var __prepareForTransfer: (value: unknown, options?: PrepareTransferOptions) => unknown;
	var installQuickJsTransfer: () => void;
	var __unwrapFromHost: (json: string, holdsSentinel: boolean) => unknown;
	var extend: typeof import('../extensions/extend').extend;
	var extendOptional: typeof import('../extensions/extend').extendOptional;
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
globalThis.ExpressionError = ExpressionError;

globalThis.createDeepLazyProxy = createDeepLazyProxy;
globalThis.buildContext = buildContext;
globalThis.__prepareForTransfer = __prepareForTransfer;
globalThis.installQuickJsTransfer = installQuickJsTransfer;

installLazyArrayConcat();
