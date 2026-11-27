import { runInNewContext } from 'node:vm';
import { describe, it, expect, vi } from 'vitest';

import { errorToSentinel, rebuildErrorValue } from '../error-transfer';
import { __prepareForTransfer } from '../serialize';
import type { SentinelDecoder, TransferSentinel } from '../transfer';
import {
	isBoxedPrimitive,
	isEscapedTransferValue,
	isOpaqueTransferValue,
	isPlainObject,
	isStructuredCloneBuiltin,
	isTransferSentinel,
	transferTypeOf,
	unboxPrimitive,
	ERROR_SENTINEL_KEY,
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
				[TRANSFER_TYPE_KEY, TRANSFER_ESCAPED_KEY, TRANSFER_OPAQUE_KEY, ERROR_SENTINEL_KEY].sort(),
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
			expect(isStructuredCloneBuiltin(Object('ab') as object)).toBe(true);
			expect(isStructuredCloneBuiltin(Object(5) as object)).toBe(true);
			expect(isStructuredCloneBuiltin(Object(true) as object)).toBe(true);
			expect(isStructuredCloneBuiltin(Object(1n) as object)).toBe(true);
		});

		it('should unbox real boxed primitives including subclasses and cross-realm values', () => {
			class SubString extends String {}
			class SubNumber extends Number {}
			class SubBoolean extends Boolean {}

			const mutated = Object.assign(Object('ab') as object, {
				valueOf: () => 'fake',
				[Symbol.toStringTag]: 'Fake',
			});

			expect(unboxPrimitive(Object('ab') as object)).toBe('ab');
			expect(unboxPrimitive(Object('') as object)).toBe('');
			expect(unboxPrimitive(Object(5) as object)).toBe(5);
			expect(Object.is(unboxPrimitive(Object(-0) as object), -0)).toBe(true);
			expect(Number.isNaN(unboxPrimitive(Object(NaN) as object))).toBe(true);
			expect(unboxPrimitive(Object(Infinity) as object)).toBe(Infinity);
			expect(unboxPrimitive(Object(-Infinity) as object)).toBe(-Infinity);
			expect(unboxPrimitive(Object(true) as object)).toBe(true);
			expect(unboxPrimitive(Object(false) as object)).toBe(false);
			expect(unboxPrimitive(Object(1n) as object)).toBe(1n);
			expect(unboxPrimitive(Object(0n) as object)).toBe(0n);
			expect(unboxPrimitive(new SubString('sub'))).toBe('sub');
			expect(unboxPrimitive(new SubNumber(7))).toBe(7);
			expect(unboxPrimitive(new SubBoolean(false))).toBe(false);
			expect(unboxPrimitive(mutated)).toBe('ab');
			expect(unboxPrimitive(runInNewContext('new String("xr")') as object)).toBe('xr');
			expect(unboxPrimitive(runInNewContext('new Number(9)') as object)).toBe(9);
			expect(unboxPrimitive(runInNewContext('new Boolean(false)') as object)).toBe(false);
			expect(unboxPrimitive(runInNewContext('Object(2n)') as object)).toBe(2n);
		});

		it('should reject objects that mimic a boxed primitive without its internal slot', () => {
			for (const candidate of [
				{},
				Object.create(null) as object,
				Object.create(String.prototype) as object,
				Object.create(Number.prototype) as object,
				Object.create(Boolean.prototype) as object,
				Object.create(BigInt.prototype) as object,
				{ [Symbol.toStringTag]: 'String' },
				{ [Symbol.toStringTag]: 'Number' },
				{ [Symbol.toStringTag]: 'Boolean' },
				{ [Symbol.toStringTag]: 'BigInt' },
				new Proxy(Object('ab') as object, {}),
			]) {
				expect(isBoxedPrimitive(candidate)).toBe(false);
				expect(unboxPrimitive(candidate)).toBeUndefined();
				expect(isStructuredCloneBuiltin(candidate)).toBe(false);
			}

			const { proxy: revoked, revoke } = Proxy.revocable({}, {});
			revoke();
			expect(isBoxedPrimitive(revoked)).toBe(false);
			expect(unboxPrimitive(revoked)).toBeUndefined();
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

		it('should decode a shared marker once, wherever it sits', () => {
			const decode = vi.fn(decodeToTag);
			const marker = { [TRANSFER_TYPE_KEY]: 'DateTime' };

			const result = unwrap({ top: marker, deep: { list: [marker] } }, decode) as Record<
				string,
				unknown
			>;

			expect(result.top).toBe('decoded:DateTime');
			expect((result.deep as { list: unknown[] }).list[0]).toBe('decoded:DateTime');
			expect(decode).toHaveBeenCalledTimes(1);
		});

		it('should reuse a decoded marker even when its result is undefined', () => {
			const marker = { [TRANSFER_TYPE_KEY]: 'Empty' };
			const decode = vi.fn(() => undefined);

			expect(unwrap([marker, marker], decode)).toEqual([undefined, undefined]);
			expect(decode).toHaveBeenCalledTimes(1);
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

		it('should keep a __proto__ key as an own key', () => {
			const body = JSON.parse('{"__proto__":{"a":1}}') as Record<string, unknown>;

			const result = unwrap({ marker: { [TRANSFER_TYPE_KEY]: 'tag' }, body }) as {
				body: Record<string, unknown>;
			};

			expect(Object.keys(result.body)).toEqual(['__proto__']);
			expect(result.body.a).toBeUndefined();
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

	it('should copy an array that holds its own map key', () => {
		const withFunction: unknown[] = [1, 2];
		Object.assign(withFunction, { map: () => [99] });
		const withNumber: unknown[] = [1, 2];
		Object.assign(withNumber, { map: 17 });

		expect(roundTrip(withFunction)).toEqual([1, 2]);
		expect(roundTrip(withNumber)).toEqual([1, 2]);
	});

	it('should copy an array that holds its own constructor key', () => {
		const value: unknown[] = [1, 2];
		Object.assign(value, { constructor: 17 });

		expect(roundTrip(value)).toEqual([1, 2]);
	});

	it('should copy an array of a subclass as a plain array', () => {
		class Rows extends Array<number> {}
		Object.defineProperty(Rows, Symbol.species, { value: Object });
		const value = new Rows();
		value.push(1, 2);

		const result = roundTrip(value);

		expect(Array.isArray(result)).toBe(true);
		expect(result).toEqual([1, 2]);
	});

	it('should not read the map key of an array', () => {
		const value: unknown[] = [1, 2];
		const readMap = vi.fn(() => Array.prototype.map);
		Object.defineProperty(value, 'map', { get: readMap });

		expect(roundTrip(value)).toEqual([1, 2]);
		expect(readMap).not.toHaveBeenCalled();
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

describe('__prepareForTransfer', () => {
	it('rejects plain object and array cycles before the native stack is exhausted', () => {
		// An unguarded walk fails with the same error, but only after thousands of reads.
		let reads = 0;
		const object = {
			get self() {
				reads++;
				return object;
			},
		};
		const array: unknown[] = [];
		array.push({
			get list() {
				reads++;
				return array;
			},
		});

		expect(() => __prepareForTransfer(object)).toThrow('Maximum call stack size exceeded');
		expect(() => __prepareForTransfer(array)).toThrow('Maximum call stack size exceeded');
		expect(reads).toBeLessThan(100);
		expect(__prepareForTransfer({ value: 42 })).toStrictEqual({ value: 42 });
	});

	it('preserves deep acyclic results and repeated children on the guarded path', () => {
		const child = { value: 1 };
		let value: unknown = { left: child, right: child };
		for (let depth = 0; depth < 100; depth++) {
			value = { next: [value] };
		}

		expect(__prepareForTransfer(value)).toStrictEqual(value);
	});

	it('prepares a shared object once', () => {
		const shared = { a: 1 };

		const prepared = __prepareForTransfer(
			Object.assign(new Error('x'), { left: shared, right: shared }),
		) as { __props: { left: unknown; right: unknown } };

		expect(prepared.__props.left).toBe(prepared.__props.right);
	});

	it('does not record the objects of a result without an Error', () => {
		const shared = { a: 1 };

		const prepared = __prepareForTransfer({ left: shared, right: shared }) as {
			left: unknown;
			right: unknown;
		};

		expect(prepared.left).not.toBe(prepared.right);
	});

	it('gives undefined for a reference back to an Error the walk is inside', () => {
		const error = new Error('loop') as Error & { self?: unknown };
		error.self = error;

		const prepared = __prepareForTransfer(error) as { __props: unknown };

		expect(prepared.__props).toStrictEqual({ self: undefined });
	});

	it('reports each encoded Error and its sentinel when onEncodeError is given', () => {
		const inner = new Error('inner');
		const outer = new Error('outer', { cause: inner });
		const recorded = new Map<Error, object>();

		const prepared = __prepareForTransfer(outer, {
			onEncodeError: (error, sentinel) => {
				recorded.set(error, sentinel);
			},
		}) as { __cause: object };

		expect(recorded.get(outer)).toBe(prepared);
		expect(recorded.get(inner)).toBe(prepared.__cause);
	});

	it('skips reporting nested Error markers truncated by an enclosing open object', () => {
		const a = new Error('a') as Error & { child?: Error };
		const b = new Error('b') as Error & { parent?: Error };
		a.child = b;
		b.parent = a;
		const recorded: Array<[Error, object]> = [];

		const prepared = __prepareForTransfer([a, b], {
			onEncodeError: (error, sentinel) => {
				recorded.push([error, sentinel]);
			},
		}) as [object, object];

		expect(recorded).toStrictEqual([
			[a, prepared[0]],
			[b, prepared[1]],
		]);
	});

	it('skips reporting a sibling Error that reuses a truncated cached object', () => {
		const a = new Error('a') as Error & { first?: unknown; second?: unknown };
		const b = new Error('b') as Error & { d?: unknown };
		const c = new Error('c') as Error & { d?: unknown };
		const d = new Error('d') as Error & { back?: unknown };
		b.d = d;
		d.back = b;
		c.d = d;
		a.first = { b };
		a.second = c;
		const recorded: Error[] = [];

		__prepareForTransfer([a, c], {
			onEncodeError: (error) => {
				recorded.push(error);
			},
		});

		expect(recorded).toStrictEqual([b, a, d, c]);
	});

	it('rejects a plain cycle when the options give no onPlainCycle', () => {
		let reads = 0;
		const object = {
			get self() {
				reads++;
				return object;
			},
		};

		expect(() => __prepareForTransfer(object, { onEncodeError: () => {} })).toThrow(RangeError);
		expect(reads).toBeLessThan(100);
	});

	it('calls onPlainCycle when a plain object or array refers to itself outside an Error', () => {
		const obj: Record<string, unknown> = { a: 1 };
		obj.self = obj;
		const arr: unknown[] = [1];
		arr.push(arr);
		const onPlainCycle = (): never => {
			throw new Error('plain cycle');
		};

		expect(() => __prepareForTransfer(obj, { onPlainCycle })).toThrow('plain cycle');
		expect(() => __prepareForTransfer(arr, { onPlainCycle })).toThrow('plain cycle');

		// Shared acyclic plain objects are still allowed and not treated as cycles.
		const shared = { x: 1 };
		expect(__prepareForTransfer({ left: shared, right: shared }, { onPlainCycle })).toStrictEqual({
			left: { x: 1 },
			right: { x: 1 },
		});
	});

	it('invokes onCreate in rebuildErrorValue before decoding children', () => {
		const sentinel = errorToSentinel(
			Object.assign(new Error('loop'), { marker: 'self' }),
			(v) => v,
		);
		let created: Error | undefined;

		const rebuilt = rebuildErrorValue(
			sentinel,
			(child) => {
				if (child && typeof child === 'object' && 'marker' in child) {
					return { self: created };
				}
				return child;
			},
			(error) => {
				created = error;
			},
		) as Error & { self?: unknown };

		expect(created).toBe(rebuilt);
		expect(rebuilt.self).toBe(rebuilt);
	});
});
