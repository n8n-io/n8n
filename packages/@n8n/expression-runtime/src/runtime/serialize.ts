import { encodeLuxonValue } from './luxon-transfer';
import type { SentinelEncoder } from './transfer';
import {
	isPlainObject,
	isStructuredCloneBuiltin,
	TRANSFER_ESCAPED_KEY,
	TRANSFER_FRAMING_KEYS,
	TRANSFER_OPAQUE_KEY,
	TRANSFER_VALUE_KEY,
} from './transfer';

/**
 * The types that go across as a marker. Each encoder claims the values it owns
 * and passes on every other, so a new type is one entry here.
 */
const ENCODERS: SentinelEncoder[] = [encodeLuxonValue];

function encode(value: object): object | undefined {
	for (const encoder of ENCODERS) {
		const sentinel = encoder(value);
		if (sentinel !== undefined) return sentinel;
	}
	return undefined;
}

/**
 * Prepare a value for transfer across the V8 isolate boundary.
 *
 * isolated-vm's `copy: true` uses structured clone, which strips prototypes
 * from non-standard types. A class instance such as a luxon DateTime loses its
 * class identity and arrives on the host as a plain object.
 *
 * This function recursively walks a value and converts each such type into a
 * structured-cloneable marker object. The host rebuilds a real instance from
 * the marker. It runs inside the isolate before the result is transferred.
 *
 * Note: JS Date objects survive structured clone with prototype intact
 * (Date is a standard structured-cloneable type) and are not converted.
 *
 * This walk does not record the objects it has seen, because expression results
 * are not expected to refer to themselves. The host walk does record them.
 */
export function __prepareForTransfer(value: unknown): unknown {
	if (value === null || value === undefined) return value;
	if (typeof value !== 'object') return value;

	const sentinel = encode(value);
	if (sentinel !== undefined) return sentinel;

	if (Array.isArray(value)) return value.map(__prepareForTransfer);

	if (!isPlainObject(value)) {
		if (isStructuredCloneBuiltin(value)) return value;
		// A class instance the host cannot rebuild. Structured clone flattens its
		// prototype away, so a marker key on it would read as one of ours. Mark it
		// opaque, and the host gives the contents back as data.
		return {
			[TRANSFER_ESCAPED_KEY]: true,
			[TRANSFER_OPAQUE_KEY]: true,
			[TRANSFER_VALUE_KEY]: value,
		};
	}

	const result: Record<string, unknown> = {};
	let collides = false;
	for (const key of Object.keys(value)) {
		if (TRANSFER_FRAMING_KEYS.includes(key)) collides = true;
		result[key] = __prepareForTransfer(value[key]);
	}
	// User data can hold the same keys as our framing. Escape such an object, so
	// the host reads the object itself as data but still walks what is inside it.
	return collides ? { [TRANSFER_ESCAPED_KEY]: true, [TRANSFER_VALUE_KEY]: result } : result;
}
