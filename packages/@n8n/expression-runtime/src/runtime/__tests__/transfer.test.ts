import { describe, it, expect, vi } from 'vitest';

import { __prepareForTransfer } from '../serialize';
import type { SentinelDecoder, TransferSentinel } from '../transfer';
import {
	isEscapedTransferValue,
	isOpaqueTransferValue,
	isPlainObject,
	isStructuredCloneBuiltin,
	isTransferSentinel,
	transferTypeOf,
	TRANSFER_ESCAPED_KEY,
	TRANSFER_FRAMING_KEYS,
	TRANSFER_OPAQUE_KEY,
	TRANSFER_TYPE_KEY,
	unwrapTransferSentinels,
} from '../transfer';

/** Rebuilds a marker into the string the test can recognise. */
const decodeToTag: SentinelDecoder = (sentinel) => `decoded:${sentinel[TRANSFER_TYPE_KEY]}`;

/** Gives every marker back as it is, which is what an unknown type gets. */
const decodeToSelf: SentinelDecoder = (sentinel) => sentinel;

function unwrap(value: unknown, decode: SentinelDecoder = decodeToTag): unknown {
	return unwrapTransferSentinels(value, decode);
}

describe('transfer framing', () => {
	describe('the type of a marker', () => {
		it('should read the type a marker names', () => {
			expect(transferTypeOf({ [TRANSFER_TYPE_KEY]: 'DateTime' })).toBe('DateTime');
			expect(isTransferSentinel({ [TRANSFER_TYPE_KEY]: 'DateTime' })).toBe(true);
		});

		it('should not read a type that is not a string', () => {
			expect(transferTypeOf({ [TRANSFER_TYPE_KEY]: true })).toBeUndefined();
			expect(transferTypeOf({ [TRANSFER_TYPE_KEY]: 7 })).toBeUndefined();
			expect(transferTypeOf({ [TRANSFER_TYPE_KEY]: null })).toBeUndefined();
		});

		it('should not read a type off a value that holds none', () => {
			expect(transferTypeOf(null)).toBeUndefined();
			expect(transferTypeOf(undefined)).toBeUndefined();
			expect(transferTypeOf('text')).toBeUndefined();
			expect(transferTypeOf({})).toBeUndefined();
		});

		it('should read an empty type name, which no encoder writes', () => {
			// The walk hands any named type to the decoder, so an empty name reaches
			// it as well. The decoder decides, and nothing here can silently pass.
			expect(transferTypeOf({ [TRANSFER_TYPE_KEY]: '' })).toBe('');
		});
	});

	describe('the escape wrapper', () => {
		it('should accept only the literal flag', () => {
			expect(isEscapedTransferValue({ [TRANSFER_ESCAPED_KEY]: true })).toBe(true);
			expect(isEscapedTransferValue({ [TRANSFER_ESCAPED_KEY]: 'true' })).toBe(false);
			expect(isEscapedTransferValue({ [TRANSFER_ESCAPED_KEY]: 1 })).toBe(false);
			expect(isOpaqueTransferValue({ [TRANSFER_OPAQUE_KEY]: 'yes' })).toBe(false);
		});

		it('should name every key that makes an object look like framing', () => {
			expect([...TRANSFER_FRAMING_KEYS].sort()).toEqual(
				[TRANSFER_TYPE_KEY, TRANSFER_ESCAPED_KEY, TRANSFER_OPAQUE_KEY].sort(),
			);
		});
	});

	describe('the shape tests', () => {
		it('should call an object with a null prototype plain', () => {
			expect(isPlainObject(Object.create(null) as object)).toBe(true);
			expect(isPlainObject({})).toBe(true);
		});

		it('should not call a class instance or an array plain', () => {
			class Row {}
			expect(isPlainObject(new Row())).toBe(false);
			expect(isPlainObject([])).toBe(false);
		});

		it('should name the types structured clone copies with the prototype', () => {
			expect(isStructuredCloneBuiltin(new Date())).toBe(true);
			expect(isStructuredCloneBuiltin(/x/)).toBe(true);
			expect(isStructuredCloneBuiltin(new Map())).toBe(true);
			expect(isStructuredCloneBuiltin(new Set())).toBe(true);
			expect(isStructuredCloneBuiltin(new Error('x'))).toBe(true);
			expect(isStructuredCloneBuiltin(new ArrayBuffer(1))).toBe(true);
			expect(isStructuredCloneBuiltin(new Uint8Array(1))).toBe(true);
		});
	});

	describe('the walk', () => {
		it('should give a primitive back as it is', () => {
			expect(unwrap(null)).toBeNull();
			expect(unwrap(undefined)).toBeUndefined();
			expect(unwrap(1)).toBe(1);
			expect(unwrap('text')).toBe('text');
		});

		it('should give back the same value when nothing in it is a marker', () => {
			const value = { list: [{ n: 1 }], deep: { text: 'x' } };

			// The walk copies every object it enters, so a result with no marker in
			// it would be allocated twice for nothing.
			expect(unwrap(value)).toBe(value);
		});

		it('should copy only when it has a marker to rebuild', () => {
			const value = { when: { [TRANSFER_TYPE_KEY]: 'DateTime' }, keep: { n: 1 } };

			const result = unwrap(value) as Record<string, unknown>;

			expect(result).not.toBe(value);
			expect(result.when).toBe('decoded:DateTime');
			expect(result.keep).toEqual({ n: 1 });
		});

		it('should give back a value that refers to itself and holds no marker', () => {
			const value: Record<string, unknown> = { n: 1 };
			value.self = value;

			expect(unwrap(value)).toBe(value);
		});

		it('should hand every marker to the decoder, wherever it sits', () => {
			const decode = vi.fn(decodeToTag);
			const marker = { [TRANSFER_TYPE_KEY]: 'DateTime' };

			const result = unwrap({ top: marker, deep: { list: [marker] } }, decode) as Record<
				string,
				unknown
			>;

			expect(result.top).toBe('decoded:DateTime');
			expect((result.deep as { list: unknown[] }).list[0]).toBe('decoded:DateTime');
			// The walk records the objects it rebuilds, but not the markers it
			// decodes. The guest builds a marker for each place a value appears, so
			// the same marker object twice is a shape the guest never sends.
			expect(decode).toHaveBeenCalledTimes(2);
			expect(decode).toHaveBeenCalledWith(marker);
		});

		it('should give back what the decoder returns for a type it does not own', () => {
			const marker = { [TRANSFER_TYPE_KEY]: 'Unknown', keep: 1 };

			expect(unwrap(marker, decodeToSelf)).toEqual(marker);
		});

		it('should read a marker before an escape flag when an object holds both', () => {
			const value = { [TRANSFER_TYPE_KEY]: 'DateTime', [TRANSFER_ESCAPED_KEY]: true };

			expect(unwrap(value)).toBe('decoded:DateTime');
		});

		it('should keep the order of an array of markers', () => {
			const value = [
				{ [TRANSFER_TYPE_KEY]: 'DateTime' },
				{ [TRANSFER_TYPE_KEY]: 'Duration' },
				{ [TRANSFER_TYPE_KEY]: 'Interval' },
			];

			expect(unwrap(value)).toEqual(['decoded:DateTime', 'decoded:Duration', 'decoded:Interval']);
		});

		it('should walk an array that refers to itself once', () => {
			const value: unknown[] = [1];
			value.push(value);

			const result = unwrap(value) as unknown[];

			expect(result[0]).toBe(1);
			expect(result[1]).toBe(result);
		});

		it('should give the same object back for every place it appears', () => {
			const shared = { n: 1 };

			const result = unwrap({ a: shared, b: shared }) as Record<string, unknown>;

			expect(result.a).toBe(result.b);
			expect(result.a).toEqual({ n: 1 });
		});

		it('should walk an object with a null prototype', () => {
			const value = Object.create(null) as Record<string, unknown>;
			value.when = { [TRANSFER_TYPE_KEY]: 'DateTime' };

			expect(unwrap(value)).toEqual({ when: 'decoded:DateTime' });
		});

		it('should give a class instance back untouched, contents and all', () => {
			class Row {
				when = { [TRANSFER_TYPE_KEY]: 'DateTime' };
			}
			const value = new Row();

			const result = unwrap({ row: value }) as Record<string, unknown>;

			// The host cannot rebuild the class, so the walk does not enter it. The
			// marker inside is left as the plain object it is.
			expect(result.row).toBe(value);
			expect(value.when).toEqual({ [TRANSFER_TYPE_KEY]: 'DateTime' });
		});

		it('should give a structured-clone builtin back untouched', () => {
			const date = new Date('2024-01-15T00:00:00.000Z');
			const map = new Map([['k', 1]]);

			const result = unwrap({ date, map }) as Record<string, unknown>;

			expect(result.date).toBe(date);
			expect(result.map).toBe(map);
		});
	});

	describe('the walk over an escaped payload', () => {
		it('should walk an array payload for markers deeper in', () => {
			const value = {
				[TRANSFER_ESCAPED_KEY]: true,
				__value: [{ [TRANSFER_TYPE_KEY]: 'DateTime' }],
			};

			expect(unwrap(value)).toEqual(['decoded:DateTime']);
		});

		it('should give an opaque array payload back as data', () => {
			const marker = { [TRANSFER_TYPE_KEY]: 'DateTime' };
			const value = {
				[TRANSFER_ESCAPED_KEY]: true,
				[TRANSFER_OPAQUE_KEY]: true,
				__value: [marker],
			};

			expect(unwrap(value)).toEqual([marker]);
		});

		it('should read a payload the wrapper does not carry as nothing', () => {
			expect(unwrap({ [TRANSFER_ESCAPED_KEY]: true })).toBeUndefined();
		});
	});
});

describe('the round trip through both walks', () => {
	function roundTrip(value: unknown, decode: SentinelDecoder = decodeToTag): unknown {
		return unwrapTransferSentinels(__prepareForTransfer(value), decode);
	}

	it('should escape an object whose own key copies a framing key', () => {
		for (const key of TRANSFER_FRAMING_KEYS) {
			const value = { [key]: 'user data', keep: 1 };

			expect(roundTrip(value)).toEqual(value);
		}
	});

	it('should escape only the object that copies a framing key', () => {
		const value = { outer: 1, inner: { [TRANSFER_TYPE_KEY]: 'user data' } };

		expect(roundTrip(value)).toEqual(value);
	});

	it('should give the contents of a class instance back as data', () => {
		class Row {
			n = 1;
		}

		const result = roundTrip({ row: new Row() }) as Record<string, unknown>;

		expect(result.row).toEqual({ n: 1 });
	});

	it('should keep the holes of a sparse array across both walks', () => {
		const value = new Array<unknown>(3);
		value[0] = 1;
		value[2] = 3;

		const result = roundTrip(value) as unknown[];

		expect(result).toHaveLength(3);
		expect(1 in result).toBe(false);
		expect(result[0]).toBe(1);
		expect(result[2]).toBe(3);
	});

	it('should carry a structured-clone builtin across untouched', () => {
		const date = new Date('2024-01-15T00:00:00.000Z');

		expect((roundTrip({ date }) as Record<string, unknown>).date).toBe(date);
	});

	it('should carry a marker a user wrote by hand across as data', () => {
		// A user object that names a type is not one of ours, because only the
		// guest walk writes the key. The escape wrapper keeps the two apart.
		const value: TransferSentinel = { [TRANSFER_TYPE_KEY]: 'DateTime' };

		expect(roundTrip(value, decodeToSelf)).toEqual(value);
	});
});
