import type { WorkflowData } from '../types';
import type { ErrorSentinel } from '../runtime/lazy-proxy';
import {
	isEscapedTransferValue,
	TRANSFER_ESCAPED_KEY,
	TRANSFER_VALUE_KEY,
} from '../runtime/transfer';
import { bridgeMessageSchema } from './bridge-messages';
import type { HostDataResolver } from './host-data-resolver';

// ============================================================================
// Host-side functions shared by the expression bridges.
//
// Both IsolatedVmBridge and QuickJsBridge expose the same three host
// callbacks to the guest — getValueAtPath, getArrayElement, callHost — plus
// the error-sentinel helpers and bundle loader around them. The logic is
// engine-agnostic: each bridge wraps these functions in its own
// callback mechanism (ivm.Callback / vm.newFunction) and marshals the
// plain, JSON-shaped return values across its own boundary.
// ============================================================================

/** Check if a value is an error sentinel returned by serializeError. */
export function isErrorSentinel(value: unknown): value is ErrorSentinel {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<string, unknown>).__isError === true
	);
}

/**
 * Wrap host-call data whose root looks like an error sentinel or an escape
 * wrapper, so the guest reads it as data.
 */
export function escapeHostResult(value: unknown): unknown {
	return isErrorSentinel(value) || isEscapedTransferValue(value)
		? { [TRANSFER_ESCAPED_KEY]: true, [TRANSFER_VALUE_KEY]: value }
		: value;
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

/** Read a host path and return its value or metadata for lazy access. */
export function getValueAtPath(resolver: HostDataResolver, pathArr: readonly string[]): unknown {
	return toHostMetadata(resolver.resolve(pathArr));
}

/** Read one array item and return its value or metadata for lazy access. */
export function getArrayElement(
	resolver: HostDataResolver,
	pathArr: readonly string[],
	index: number,
): unknown {
	const arr = resolver.resolve(pathArr);
	if (!Array.isArray(arr)) {
		return undefined;
	}

	// Only non-negative integer indices select array items.
	if (!Number.isInteger(index) || index < 0) {
		return undefined;
	}

	return toHostMetadata(arr[index]);
}

/** Describe objects and arrays without reading their contents. */
function toHostMetadata(value: unknown): unknown {
	// Host functions use the callHost channel, not the lazy data path.
	if (typeof value === 'function') {
		return undefined;
	}

	if (Array.isArray(value)) {
		return {
			__isArray: true,
			__length: value.length,
			__data: null,
		};
	}

	// Dates have no enumerable own keys. Transfer the value directly.
	if (value instanceof Date) {
		return value;
	}

	if (value !== null && typeof value === 'object') {
		return {
			__isObject: true,
			__keys: Object.keys(value),
		};
	}

	return value;
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
