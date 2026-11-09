/**
 * Carry Error instances across the runtime boundary, in both directions.
 *
 * isolated-vm cannot clone a host Error into the isolate, and structured clone
 * drops the name and the own keys of an Error. An Error goes across as a marker
 * in the framing `transfer.ts` defines, and the other side rebuilds a real Error
 * with the same name, message, stack, own keys and JSON form.
 */

import type { TransferSentinel } from './transfer';
import { defineOwnValue, isPlainObject, transferTypeOf, TRANSFER_TYPE_KEY } from './transfer';

export const ERROR_TYPE = 'Error';

/** Error classes rebuilt as themselves. Any other name rebuilds as an Error. */
const STANDARD_ERRORS = new Map<string, ErrorConstructor>(
	[EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError].map((ErrorClass) => [
		ErrorClass.name,
		ErrorClass,
	]),
);

export interface ErrorValueSentinel extends TransferSentinel {
	[TRANSFER_TYPE_KEY]: typeof ERROR_TYPE;
	__name: string;
	__message: string;
	__stack?: string;
	__props: unknown;
	__nonEnumerableKeys?: string[];
	__cause?: unknown;
	__json?: unknown;
	__jsonKeys?: string[];
}

type Encode = (value: unknown) => unknown;

const BUILT_IN_ERROR_KEYS = new Set(['name', 'message', 'stack', 'cause']);

export function isErrorTransferSentinel(value: unknown): value is ErrorValueSentinel {
	return transferTypeOf(value) === ERROR_TYPE;
}

/** Keep custom fields and their visibility. Hidden built-in fields use separate markers. */
function dataPropsOf(
	error: Error,
	encodeChild: Encode,
): Pick<ErrorValueSentinel, '__props' | '__nonEnumerableKeys'> {
	const props: Record<string, unknown> = {};
	const nonEnumerableKeys: string[] = [];
	for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(error))) {
		if (descriptor.enumerable || !BUILT_IN_ERROR_KEYS.has(key)) {
			try {
				const value: unknown = Reflect.get(error, key);
				if (typeof value !== 'function') {
					defineOwnValue(props, key, value);
					if (!descriptor.enumerable) {
						nonEnumerableKeys.push(key);
					}
				}
			} catch {
				// A custom getter must not replace the original Error.
			}
		}
	}
	return { __props: encodeChild(props), __nonEnumerableKeys: nonEnumerableKeys };
}

/** The `cause` an Error got from its constructor options. That key is not enumerable. */
function hiddenCauseOf(error: Error, encodeChild: Encode): Pick<ErrorValueSentinel, '__cause'> {
	const descriptor = Object.getOwnPropertyDescriptor(error, 'cause');
	if (descriptor !== undefined && !descriptor.enumerable) {
		return { __cause: encodeChild(Reflect.get(error, 'cause')) };
	}
	return {};
}

/** The `toJSON` result of an Error, or nothing when it has none or it throws. */
function jsonFormOf(
	error: Error,
	encodeChild: Encode,
): Pick<ErrorValueSentinel, '__json' | '__jsonKeys'> {
	try {
		const toJSON: unknown = Reflect.get(error, 'toJSON');
		if (typeof toJSON === 'function') {
			const json: unknown = toJSON.call(error);
			// Find direct fields before transfer, while object identity is intact.
			const keys =
				typeof json === 'object' && json !== null && isPlainObject(json)
					? Object.keys(json).filter(
							(key) => Object.hasOwn(error, key) && Object.is(json[key], Reflect.get(error, key)),
						)
					: [];
			return { __json: encodeChild(json), __jsonKeys: keys };
		}
	} catch {
		// JSON.stringify then falls back to the own keys, as for any Error.
	}
	return {};
}

/**
 * Turn an Error into a marker. `encodeChild` encodes the own keys and the
 * `toJSON` result, which can hold more values that need a marker.
 */
export function errorToSentinel(error: Error, encodeChild: Encode): ErrorValueSentinel {
	return {
		[TRANSFER_TYPE_KEY]: ERROR_TYPE,
		__name: String(error.name),
		__message: String(error.message),
		...dataPropsOf(error, encodeChild),
		...(typeof error.stack === 'string' ? { __stack: error.stack } : {}),
		...hiddenCauseOf(error, encodeChild),
		...jsonFormOf(error, encodeChild),
	};
}

/** Rebuild an Error from a marker. `decodeChild` rebuilds the values inside it. */
export function rebuildErrorValue(sentinel: ErrorValueSentinel, decodeChild: Encode): Error {
	const ErrorClass = STANDARD_ERRORS.get(sentinel.__name) ?? Error;
	const error = new ErrorClass(typeof sentinel.__message === 'string' ? sentinel.__message : '');
	const decoded = decodeChild(sentinel.__props);
	const props = typeof decoded === 'object' && decoded !== null ? decoded : {};

	// An own key keeps its place in the key order, so it is not defined twice.
	Object.entries({ name: sentinel.__name, stack: sentinel.__stack })
		.filter(([key, value]) => typeof value === 'string' && !Object.hasOwn(props, key))
		.filter(([key, value]) => value !== Reflect.get(error, key))
		.forEach(([key, value]) => defineOwnValue(error, key, value, false));
	const nonEnumerableKeys = new Set(sentinel.__nonEnumerableKeys);
	Object.entries(props).forEach(([key, value]) =>
		defineOwnValue(error, key, value, !nonEnumerableKeys.has(key)),
	);

	if ('__cause' in sentinel) {
		defineOwnValue(error, 'cause', decodeChild(sentinel.__cause), false);
	}
	if ('__json' in sentinel) {
		const json = decodeChild(sentinel.__json);
		const keys = (sentinel.__jsonKeys ?? []).filter((key) => Object.hasOwn(error, key));
		defineOwnValue(
			error,
			'toJSON',
			function (this: Error) {
				if (keys.length === 0 || typeof json !== 'object' || json === null) return json;
				// Refresh direct fields. Keep omitted fields out and calculated values as captured.
				const result = { ...json };
				for (const key of keys) {
					defineOwnValue(result, key, Reflect.get(this, key));
				}
				return result;
			},
			false,
		);
	}

	return error;
}
