import { readFile } from 'node:fs/promises';
import * as path from 'node:path';

import type { WorkflowData } from '../types';
import type { ErrorSentinel } from '../runtime/lazy-proxy';
import { bridgeMessageSchema } from './bridge-messages';

// ============================================================================
// Host-side functions shared by the expression bridges.
//
// Both IsolatedVmBridge and QuickJsBridge expose the same three host
// callbacks to the guest — getValueAtPath, getArrayElement, callHost — plus
// the error-sentinel helpers and bundle loader around them. The logic is
// engine-agnostic: each bridge wraps these pure functions in its own
// callback mechanism (ivm.Callback / vm.newFunction) and marshals the
// plain, JSON-shaped return values across its own boundary.
// ============================================================================

const BUNDLE_RELATIVE_PATH = path.join('dist', 'bundle', 'runtime.iife.js');

/** Check if a value is an error sentinel returned by serializeError. */
export function isErrorSentinel(value: unknown): value is ErrorSentinel {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<string, unknown>).__isError === true
	);
}

/**
 * Serialize an error into a transferable metadata object.
 *
 * Host-side callbacks (getValueAtPath, etc.) catch errors and return this
 * sentinel instead of letting the error cross the boundary (which strips
 * custom class identity and properties). The guest-side proxy detects
 * __isError and throws the sentinel; the host reconstructs a real Error
 * after it round-trips back (see reconstructError).
 */
export function serializeError(err: unknown): ErrorSentinel {
	if (err instanceof Error) {
		const extra = Object.fromEntries(
			Object.entries(err).filter(([key]) => key !== 'name' && key !== 'message' && key !== 'stack'),
		);
		return {
			__isError: true,
			name: err.name,
			message: err.message,
			stack: err.stack,
			extra,
		};
	}
	return { __isError: true, name: 'Error', message: String(err), extra: {} };
}

/**
 * Reconstruct an error from a serialized error sentinel.
 *
 * Restores the name, stack, and custom properties that would otherwise be
 * lost crossing the guest boundary.
 */
export function reconstructError(data: ErrorSentinel): Error {
	const error = new Error(data.message);
	error.name = data.name || 'Error';
	if (data.stack) {
		error.stack = data.stack;
	}

	// Restore custom properties transferred across the boundary
	if (data.extra) {
		Object.assign(error, data.extra);
	}

	return error;
}

/**
 * Read the runtime IIFE bundle by walking up from `__dirname` until
 * `dist/bundle/runtime.iife.js` is found. Walking up (rather than a fixed
 * relative path) works regardless of where the compiled output lives:
 *   - `src/bridge/`               (vitest running against source)
 *   - `dist/cjs/bridge/`          (CJS build)
 *   - `dist/esm/bridge/`          (ESM build)
 */
export async function readRuntimeBundle(): Promise<string> {
	let dir = __dirname;
	while (dir !== path.dirname(dir)) {
		try {
			return await readFile(path.join(dir, BUNDLE_RELATIVE_PATH), 'utf-8');
		} catch {}
		dir = path.dirname(dir);
	}
	throw new Error(
		`Could not find runtime bundle (${BUNDLE_RELATIVE_PATH}) in any parent of ${__dirname}`,
	);
}

/**
 * Navigate the data object by path and return metadata or a primitive value.
 *
 * Used by createDeepLazyProxy when accessing properties. Returns metadata
 * markers for arrays and objects, or the primitive value directly.
 *
 * Special-case: paths starting with ['$item', index] call data.$item(index)
 * to get the sub-proxy for that item, then continue navigating the rest;
 * likewise ['$', nodeName] calls data.$(nodeName).
 *
 * Function-typed values are returned as `undefined` — every callable on
 * the host data surface (`$('Foo').first()`, `$items()`, `$fromAI()`,
 * `$evaluateExpression()`, `$getPairedItem()`) is wired guest-side via
 * the typed-RPC dispatcher (`callHost`). No expression form should
 * reach a function through this path (invariant:
 * __tests__/host-fn-shadowing.test.ts).
 */
export function getValueAtPath(data: WorkflowData, pathArr: string[]): unknown {
	let value: unknown = data;
	let startIndex = 0;
	const itemFn = (data as Record<string, unknown>).$item;
	if (pathArr.length >= 2 && pathArr[0] === '$item' && typeof itemFn === 'function') {
		const itemIndex = parseInt(pathArr[1], 10);
		if (!isNaN(itemIndex)) {
			value = (itemFn as (i: number) => unknown)(itemIndex);
			startIndex = 2;
		}
	} else {
		const dollarFn = (data as Record<string, unknown>).$;
		if (pathArr.length >= 2 && pathArr[0] === '$' && typeof dollarFn === 'function') {
			value = (dollarFn as (name: string) => unknown)(pathArr[1]);
			startIndex = 2;
		}
	}
	for (let i = startIndex; i < pathArr.length; i++) {
		value = (value as Record<string, unknown>)?.[pathArr[i]];
		if (value === undefined || value === null) {
			return value;
		}
	}

	// Functions are not reachable via the lazy-proxy data path —
	// every callable on the host data surface routes through the
	// typed-RPC dispatcher. Return undefined so any residual
	// access surfaces as missing rather than as a stale metadata
	// marker the runtime no longer knows how to interpret.
	if (typeof value === 'function') {
		return undefined;
	}

	// Handle arrays - always lazy, only transfer length
	if (Array.isArray(value)) {
		return {
			__isArray: true,
			__length: value.length,
			__data: null,
		};
	}

	// Dates have no enumerable own keys; pass through instead of
	// marshaling as an empty object.
	if (value instanceof Date) {
		return value;
	}

	// Handle objects - return metadata with keys
	if (value !== null && typeof value === 'object') {
		return {
			__isObject: true,
			__keys: Object.keys(value),
		};
	}

	// Primitive value
	return value;
}

/**
 * Get an array element at an index, navigating to the array by path first
 * (same `$`/`$item` special-casing as getValueAtPath).
 *
 * Used by the array proxy when accessing numeric indices.
 */
export function getArrayElement(data: WorkflowData, pathArr: string[], index: number): unknown {
	let arr: unknown = data;
	let startIndex = 0;
	const itemFn = (data as Record<string, unknown>).$item;
	if (pathArr.length >= 2 && pathArr[0] === '$item' && typeof itemFn === 'function') {
		const itemIndex = parseInt(pathArr[1], 10);
		if (!isNaN(itemIndex)) {
			arr = (itemFn as (i: number) => unknown)(itemIndex);
			startIndex = 2;
		}
	} else {
		const dollarFn = (data as Record<string, unknown>).$;
		if (pathArr.length >= 2 && pathArr[0] === '$' && typeof dollarFn === 'function') {
			arr = (dollarFn as (name: string) => unknown)(pathArr[1]);
			startIndex = 2;
		}
	}
	for (let i = startIndex; i < pathArr.length; i++) {
		arr = (arr as Record<string, unknown>)?.[pathArr[i]];
		if (arr === undefined || arr === null) {
			return undefined;
		}
	}

	if (!Array.isArray(arr)) {
		return undefined;
	}

	// Only genuine array indices are reachable; anything else (e.g.
	// 'constructor', '__lookupGetter__') would read off the prototype
	// chain and could leak a host function reference across the boundary.
	if (!Number.isInteger(index) || index < 0) {
		return undefined;
	}

	const element = arr[index];

	// Functions are never reachable through the data surface — mirror the
	// guard in getValueAtPath so a host callable can't cross the boundary
	// (invariant: __tests__/host-fn-shadowing.test.ts).
	if (typeof element === 'function') {
		return undefined;
	}

	// Dates have no enumerable own keys; pass through instead of
	// marshaling as an empty object.
	if (element instanceof Date) {
		return element;
	}

	// If element is object/array, return metadata
	if (element !== null && typeof element === 'object') {
		if (Array.isArray(element)) {
			return {
				__isArray: true,
				__length: element.length,
				__data: null,
			};
		}
		return {
			__isObject: true,
			__keys: Object.keys(element),
		};
	}

	// Primitive element
	return element;
}

/**
 * Host-side dispatcher for the typed-RPC `callHost` channel.
 *
 * The guest sends one envelope per typed RPC invocation:
 *   `callHost({ type: 'getNodeFirst', nodeName, branchIndex?, runIndex? })`
 *
 * Inputs cross a trust boundary, so the dispatcher parses every envelope
 * with the host-side zod schema (`bridgeMessageSchema`) before any
 * dispatch happens. Anything that deviates from the declared shape —
 * unknown `type`, missing required fields, extra unexpected fields,
 * wrong field types — fails the parse and throws; the calling bridge
 * catches and returns an error sentinel to the guest.
 *
 * After parsing, `switch (msg.type)` dispatches with a fully narrowed
 * message type. The operation set is exactly the cases in this switch;
 * the `type` field selects a static branch in source, not a property
 * lookup on a runtime object. Each case reads a fixed literal property
 * name off the host-side data proxy — the guest cannot influence which
 * property is dereferenced.
 *
 * Return-value note: cases must return plain, structured-clone-able,
 * JSON-shaped data. Each bridge marshals the result across its own
 * boundary (structured clone for isolated-vm, sentinel-wrapped JSON
 * round-trip for QuickJS), so engine objects or other non-cloneable
 * values must not be returned.
 */
export function dispatchHostCall(rawMsg: unknown, data: WorkflowData): unknown {
	const msg = bridgeMessageSchema.parse(rawMsg);
	switch (msg.type) {
		// The `$('Foo').{first,last,all}` typed RPCs.
		//
		// Eliminating `data.$` as a host-callable entirely would require
		// reaching the `WorkflowDataProxy` internals (e.g.
		// `getNodeExecutionOrPinnedData`) rather than the public `$()` API;
		// that's a follow-up.
		//
		// `data.$` is a host-wired function (`WorkflowDataProxy`'s `$`). If it
		// ever isn't, optional chaining short-circuits to `undefined` — the
		// same observable result the runtime's `E()` handler produces from any
		// thrown error here.
		case 'getNodeFirst':
			return data.$?.(msg.nodeName)?.first?.(msg.branchIndex, msg.runIndex);
		case 'getNodeLast':
			return data.$?.(msg.nodeName)?.last?.(msg.branchIndex, msg.runIndex);
		case 'getNodeAll':
			return data.$?.(msg.nodeName)?.all?.(msg.branchIndex, msg.runIndex);
		// The `$input.{first,last,all}` typed RPCs.
		//
		// Each reads a fixed literal property name off `data.$input` (the
		// host's `WorkflowDataProxy` input proxy). The host enforces zero
		// arguments on these methods — the schemas have no fields besides
		// `type`, so the guest cannot pass anything that would trigger the
		// "should have no arguments" error path on the host side.
		case 'getInputFirst':
			return data.$input?.first?.();
		case 'getInputLast':
			return data.$input?.last?.();
		case 'getInputAll':
			return data.$input?.all?.();
		// `$items(nodeName?, outputIndex?, runIndex?)` — the global accessor
		// for a node's execution data. Reads the literal `$items` property
		// off `data` (host-wired by `WorkflowDataProxy`) and forwards the
		// validated args verbatim. The host applies its own defaults when
		// fields are `undefined`.
		case 'getItems':
			return data.$items?.(msg.nodeName, msg.outputIndex, msg.runIndex);
		// `$fromAI(name, description?, type?, defaultValue?)` and its
		// `$fromAi` / `$fromai` aliases. Reads the literal `$fromAI` property
		// off `data` (host-wired) and forwards the args. The host validates
		// `name` (required + regex) and applies its own resolution / fallback
		// logic, so empty / invalid names surface as the host's structured
		// `ExpressionError` rather than a generic zod parse error.
		//
		// Note: `msg.valueType` maps to the host's third positional parameter
		// (`_type` in `WorkflowDataProxy.handleFromAi`). The bridge protocol
		// renames it to avoid collision with the `type` discriminator on the
		// envelope — the host parameter currently goes unused, but if it ever
		// gains a name (`type`), this mapping should stay explicit.
		case 'fromAi':
			return data.$fromAI?.(msg.name, msg.description, msg.valueType, msg.defaultValue);
		// The `$('Foo').pairedItem(itemIndex?)` / `.itemMatching(...)` /
		// `.item` cluster. Three separate typed RPCs, each reading exactly one
		// literal property off the host node proxy.
		//
		// The split is load-bearing: the host's `pairedItemMethod` closure
		// captures which property name the proxy `get` trap saw, and uses
		// that to pick the right error message (e.g. "Missing item index for
		// .itemMatching()") and to decide between method-call vs getter
		// semantics for `.item`. Reading the matching property here lets
		// those host-side branches fire exactly as they do in the legacy
		// engine; no in-guest validation needed.
		case 'getNodePairedItem':
			return data.$?.(msg.nodeName)?.pairedItem?.(msg.itemIndex);
		case 'getNodeItemMatching':
			return data.$?.(msg.nodeName)?.itemMatching?.(msg.itemIndex);
		case 'getNodeItem':
			// `.item` is a host getter — accessing it invokes the resolver and
			// returns the value immediately. Optional chaining only short-
			// circuits on null/undefined; the getter still fires on access.
			return data.$?.(msg.nodeName)?.item;
		// `$evaluateExpression(expression, itemIndex?)`. Forwards the string
		// to the host's nested-evaluation helper, which re-enters the
		// expression engine on the inner expression. Under the VM engine this
		// round-trips through the bridge again on a fresh evaluation cycle,
		// which is the same shape the legacy engine supports.
		case 'evaluateExpression':
			return data.$evaluateExpression?.(msg.expression, msg.itemIndex);
		// `$getPairedItem(destinationNodeName, incomingSourceData,
		// initialPairedItem)`. Forwards directly to the host binding, which
		// walks the paired-item ancestry chain back to the named upstream
		// node and returns the matching execution item.
		//
		// The two trailing host parameters — `usedMethodName` and
		// `nodeBeforeLast` — are deliberately not part of the wire protocol:
		// the host's default for `usedMethodName` is already `$getPairedItem`,
		// and `nodeBeforeLast` is an internal recursion argument the host sets
		// during traversal.
		case 'getPairedItem':
			return data.$getPairedItem?.(
				msg.destinationNodeName,
				msg.incomingSourceData,
				msg.initialPairedItem,
			);
		default: {
			// Unreachable at runtime — zod rejects unknown `type` values
			// before the switch. The `never` assignment is the compile-time
			// guard: a new schema added to `bridgeMessageSchema` without a
			// matching case here becomes a type error.
			const exhaustive: never = msg;
			void exhaustive;
			throw new Error('Unhandled bridge message');
		}
	}
}
