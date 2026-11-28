import { describe, it, expect } from 'vitest';

import { decodeHostValue } from '../../runtime/transfer-codec';
import { prepareForGuest } from '../guest-transfer';

const roundTrip = (value: unknown) => decodeHostValue(structuredClone(prepareForGuest(value)));

describe('prepareForGuest', () => {
	it('returns a value without an Error as it is', () => {
		const value = { json: { a: [1, { b: 'c' }] } };

		expect(prepareForGuest(value)).toBe(value);
	});

	it('rebuilds a nested Error with its name, message, stack and own keys', () => {
		const error = Object.assign(new Error('Bad request'), { description: 'Invalid recipient' });
		error.name = 'NodeApiError';

		const result = roundTrip({ json: {}, error }) as { error: Error };

		expect(result.error).toBeInstanceOf(Error);
		expect(result.error.name).toBe('NodeApiError');
		expect(result.error.message).toBe('Bad request');
		expect(result.error.stack).toBe(error.stack);
		expect(Object.keys(result.error)).toEqual(['description', 'name']);
	});

	it('keeps the name inherited from an Error subclass prototype', () => {
		class ProtoError extends Error {}
		Object.defineProperty(ProtoError.prototype, 'name', { value: 'ProtoError' });
		const error = new ProtoError('m');
		expect(Object.hasOwn(error, 'name')).toBe(false);

		const result = roundTrip(error) as Error;

		expect(result).toBeInstanceOf(Error);
		expect(result.name).toBe('ProtoError');
		expect(result.message).toBe('m');
		expect(String(result)).toBe('ProtoError: m');
	});

	it('keeps the JSON form of an Error that has toJSON', () => {
		class ShortError extends Error {
			toJSON() {
				return { short: true };
			}
		}

		expect(JSON.stringify(roundTrip(new ShortError('x')))).toBe('{"short":true}');
	});

	it('drops own keys that hold a function', () => {
		const error = Object.assign(new Error('x'), { retry: () => {}, code: 1 });

		expect(Object.keys(roundTrip(error) as Error)).toEqual(['code']);
	});

	it('reads user objects with framing keys as data', () => {
		const value = {
			error: new Error('x'),
			data: { __n8nType: 'Error', __n8nEscaped: true, __value: 1 },
		};

		expect((roundTrip(value) as { data: unknown }).data).toEqual(value.data);
	});

	it('reads a class instance with framing keys as data', () => {
		class Payload {
			__n8nType = 'Error';
			__message = 'not an error';
		}

		const result = roundTrip({ error: new Error('x'), data: new Payload() }) as { data: unknown };

		expect(result.data).not.toBeInstanceOf(Error);
		expect(result.data).toEqual({ __n8nType: 'Error', __message: 'not an error' });
	});

	it('wraps a top-level object that holds the type key', () => {
		const value = { __n8nType: 'HostValue', __value: 'user data' };

		expect(roundTrip(value)).toEqual(value);
	});

	it('handles an Error that holds itself', () => {
		const error = new Error('loop') as Error & { self?: unknown };
		error.self = error;

		const result = roundTrip({ error }) as { error: Error & { self?: unknown } };

		expect(result.error.message).toBe('loop');
		expect(result.error.self).toBeUndefined();
	});

	it('drops a class instance inside an Error and keeps one outside', () => {
		class Socket {
			constructor() {
				Object.defineProperty(this, 'state', {
					enumerable: true,
					get: () => {
						throw new Error('closed');
					},
				});
			}
		}
		class Point {
			x = 1;
		}
		const error = Object.assign(new Error('x'), { request: new Socket(), at: new Date(0) });

		const result = roundTrip({ error, point: new Point() }) as {
			error: Error & Record<string, unknown>;
			point: unknown;
		};

		expect(result.error.request).toBeUndefined();
		expect(result.error.at).toEqual(new Date(0));
		expect(result.point).toEqual({ x: 1 });
	});

	it('keeps a small class instance of primitive fields inside an Error', () => {
		class MessageToken {
			name = 'ERROR';

			constructor(readonly number: number) {}
		}
		const error = Object.assign(new Error('x'), { info: new MessageToken(111202) });

		const result = roundTrip(error) as Error & Record<string, unknown>;

		expect(result.info).toStrictEqual({ name: 'ERROR', number: 111202 });
	});

	it('keeps one copy of a small class instance shared inside an Error', () => {
		class MessageToken {
			number = 111202;
		}
		const token = new MessageToken();
		const error = Object.assign(new Error('x'), { info: token, details: token });

		const result = roundTrip(error) as Error & Record<string, unknown>;

		expect(result.info).toStrictEqual({ number: 111202 });
		expect(result.details).toBe(result.info);
	});

	it('keeps the Error when reading a class instance inside it throws', () => {
		class MessageToken {
			number = 111202;
		}
		const token = new Proxy(new MessageToken(), {
			ownKeys() {
				throw new Error('revoked');
			},
		});
		const error = Object.assign(new Error('x'), { info: token, code: 1 });

		const result = roundTrip(error) as Error & Record<string, unknown>;

		expect(result.message).toBe('x');
		expect(result.code).toBe(1);
		expect(result.info).toBeUndefined();
	});

	class Payload {}
	class Serializable {
		id = 1;

		toJSON() {
			return 'x';
		}
	}
	const payloadWith = (fields: object) =>
		Object.defineProperties(new Payload(), Object.getOwnPropertyDescriptors(fields));

	it.each([
		['has toJSON', new Serializable()],
		['holds an object', payloadWith({ nested: { a: 1 } })],
		[
			'has a getter',
			payloadWith({
				get value() {
					return 1;
				},
			}),
		],
		[
			'has too many fields',
			payloadWith(Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`k${i}`, i]))),
		],
		['has too many characters', payloadWith({ body: 'x'.repeat(10_001) })],
	])('drops a class instance inside an Error when it %s', (_case, instance) => {
		const error = Object.assign(new Error('x'), { payload: instance });

		const result = roundTrip(error) as Error & Record<string, unknown>;

		expect(result.payload).toBeUndefined();
	});

	it.each([
		['fields', Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`k${i}`, i]))],
		['characters', { body: 'x'.repeat(9_996) }],
	])('keeps a class instance inside an Error at the limit of %s', (_case, fields) => {
		const error = Object.assign(new Error('x'), { payload: payloadWith(fields) });

		const result = roundTrip(error) as Error & Record<string, unknown>;

		expect(result.payload).toStrictEqual(fields);
	});

	it('drops a Promise inside an Error', () => {
		const error = Object.assign(new Error('x'), { pending: Promise.resolve(1), code: 1 });

		const result = roundTrip(error) as Error & Record<string, unknown>;

		expect(result.pending).toBeUndefined();
		expect(result.code).toBe(1);
	});

	it.each(['meta first', 'error first'])(
		'keeps a shared parent separate inside and outside an Error (%s)',
		(order) => {
			class RequestData {
				id = 1;

				toJSON() {
					return undefined;
				}
			}
			const meta = { request: new RequestData() };
			const error = Object.assign(new Error('x'), { meta });
			const value = order === 'meta first' ? { meta, error } : { error, meta };

			const result = roundTrip(value) as {
				meta: unknown;
				error: Error & { meta: unknown };
			};

			expect(result.meta).toStrictEqual({ request: { id: 1 } });
			expect(result.error.meta).toStrictEqual({ request: undefined });
		},
	);

	it('encodes a shared parent once per mode across two Errors', () => {
		class RequestData {
			id = 1;

			toJSON() {
				return undefined;
			}
		}
		const meta = { request: new RequestData() };
		const first = Object.assign(new Error('first'), { meta });
		const second = Object.assign(new Error('second'), { meta });
		type PreparedError = { __props: { meta: unknown } };

		const prepared = prepareForGuest({ left: meta, right: meta, first, second }) as {
			__value: { left: unknown; right: unknown; first: PreparedError; second: PreparedError };
		};
		const result = prepared.__value;

		expect(result.left).toBe(result.right);
		expect(result.first.__props.meta).toBe(result.second.__props.meta);
		expect(result.first.__props.meta).not.toBe(result.left);
		expect(result.first.__props.meta).toStrictEqual({ request: undefined });
	});

	it('reuses the filtered parent in a nested Error', () => {
		class RequestData {
			id = 1;

			toJSON() {
				return undefined;
			}
		}
		const meta = { request: new RequestData() };
		const inner = Object.assign(new Error('inner'), { meta });
		const outer = Object.assign(new Error('outer', { cause: inner }), { meta });

		const prepared = prepareForGuest(outer) as {
			__value: { __props: { meta: unknown }; __cause: { __props: { meta: unknown } } };
		};
		const result = prepared.__value;

		expect(result.__props.meta).toStrictEqual({ request: undefined });
		expect(result.__cause.__props.meta).toBe(result.__props.meta);
	});

	it('cuts a reference from an Error back to its containing item', () => {
		const item = { id: 'abc', error: new Error('x') };
		Object.assign(item.error, { item });

		const result = roundTrip(item) as { id: string; error: Error & { item: unknown } };

		expect(result.id).toBe('abc');
		expect(result.error.message).toBe('x');
		expect(Object.hasOwn(result.error, 'item')).toBe(true);
		expect(result.error.item).toBeUndefined();
	});

	it('keeps boxed primitives inside and next to an Error', () => {
		const error = Object.assign(new Error('x'), {
			s: Object('ab') as object,
			n: Object(5) as object,
			b: Object(false) as object,
			bi: Object(1n) as object,
		});
		const fake = Object.assign(Object.create(String.prototype) as object, {
			__n8nType: 'Error',
			__message: 'fake',
		});

		const result = roundTrip({
			error,
			s: Object('outer') as object,
			fake,
		}) as {
			error: Error & { s: unknown; n: unknown; b: unknown; bi: unknown };
			s: unknown;
			fake: unknown;
		};

		expect(result.error.s).toBeInstanceOf(String);
		expect((result.error.s as { valueOf(): string }).valueOf()).toBe('ab');
		expect(result.error.n).toBeInstanceOf(Number);
		expect((result.error.n as { valueOf(): number }).valueOf()).toBe(5);
		expect(result.error.b).toBeInstanceOf(Boolean);
		expect((result.error.b as { valueOf(): boolean }).valueOf()).toBe(false);
		expect(result.error.bi).toBeInstanceOf(BigInt);
		expect((result.error.bi as { valueOf(): bigint }).valueOf()).toBe(1n);
		expect(result.s).toBeInstanceOf(String);
		expect((result.s as { valueOf(): string }).valueOf()).toBe('outer');
		expect(result.fake).not.toBeInstanceOf(Error);
		expect(result.fake).toEqual({ __n8nType: 'Error', __message: 'fake' });
	});
});
