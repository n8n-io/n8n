import { toJsonValue } from './to-json-value';

describe('toJsonValue', () => {
	describe('primitives', () => {
		it.each([
			['null', null, null],
			['a string', 'hello', 'hello'],
			['an empty string', '', ''],
			['true', true, true],
			['false', false, false],
			['an integer', 42, 42],
			['a float', 3.14, 3.14],
			['zero', 0, 0],
			['negative zero', -0, -0],
		])('returns %s as-is', (_label, input, expected) => {
			expect(toJsonValue(input)).toBe(expected);
		});
	});

	describe('non-finite numbers', () => {
		it.each([
			['NaN', NaN],
			['Infinity', Infinity],
			['-Infinity', -Infinity],
		])('returns null for %s', (_label, input) => {
			expect(toJsonValue(input)).toBeNull();
		});
	});

	describe('non-JSON types', () => {
		it.each([
			['undefined', undefined],
			['a function', () => {}],
			['a symbol', Symbol('test')],
		])('returns null for %s', (_label, input) => {
			expect(toJsonValue(input)).toBeNull();
		});
	});

	it('converts bigint to string', () => {
		expect(toJsonValue(BigInt(9007199254740991))).toBe('9007199254740991');
	});

	describe('Buffer', () => {
		it('converts a Buffer to its string content', () => {
			expect(toJsonValue(Buffer.from('hello'))).toBe('hello');
		});

		it('converts a Buffer containing JSON to its raw string (no parse)', () => {
			const buf = Buffer.from('{"error":"Bad Request"}');
			expect(toJsonValue(buf)).toBe('{"error":"Bad Request"}');
		});

		it('converts an empty Buffer to an empty string', () => {
			expect(toJsonValue(Buffer.alloc(0))).toBe('');
		});
	});

	describe('Date', () => {
		it('converts a Date to ISO string', () => {
			const date = new Date('2024-01-15T12:00:00.000Z');
			expect(toJsonValue(date)).toBe('2024-01-15T12:00:00.000Z');
		});
	});

	describe('Error', () => {
		it('converts an Error to { name, message }', () => {
			const error = new TypeError('something broke');
			expect(toJsonValue(error)).toEqual({
				name: 'TypeError',
				message: 'something broke',
			});
		});
	});

	describe('arrays', () => {
		it('converts a simple array', () => {
			expect(toJsonValue([1, 'two', true, null])).toEqual([1, 'two', true, null]);
		});

		it('converts nested arrays', () => {
			expect(toJsonValue([[1, 2], [3]])).toEqual([[1, 2], [3]]);
		});

		it('converts non-JSON items inside arrays to null', () => {
			expect(toJsonValue([1, undefined, () => {}, 'ok'])).toEqual([1, null, null, 'ok']);
		});

		it('converts Buffers inside arrays', () => {
			expect(toJsonValue([Buffer.from('a'), Buffer.from('b')])).toEqual(['a', 'b']);
		});
	});

	describe('objects', () => {
		it('converts a plain object', () => {
			expect(toJsonValue({ a: 1, b: 'two' })).toEqual({ a: 1, b: 'two' });
		});

		it('converts nested objects', () => {
			expect(toJsonValue({ a: { b: { c: 3 } } })).toEqual({ a: { b: { c: 3 } } });
		});

		it('converts non-JSON property values to null', () => {
			expect(toJsonValue({ a: 1, fn: () => {}, b: undefined })).toEqual({
				a: 1,
				fn: null,
				b: null,
			});
		});

		it('converts Buffers inside objects', () => {
			expect(toJsonValue({ data: Buffer.from('payload') })).toEqual({ data: 'payload' });
		});

		it('preserves a reserver __proto__ key as an own property', () => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, n8n-local-rules/no-uncaught-json-parse
			const input: Record<string, unknown> = JSON.parse('{"__proto__":{"inherited":"abc"}}');
			const result = toJsonValue(input);

			if (result === null || Array.isArray(result) || typeof result !== 'object') {
				throw new Error('Expected an object');
			}

			expect(Object.hasOwn(result, '__proto__')).toBe(true);
			expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
			expect(result.__proto__).toEqual({ inherited: 'abc' });
			expect(result.inherited).toBeUndefined();
		});
	});

	describe('circular references', () => {
		it('replaces a self-referencing object with "[Circular]"', () => {
			const obj: Record<string, unknown> = { a: 1 };
			obj.self = obj;

			expect(toJsonValue(obj)).toEqual({ a: 1, self: '[Circular]' });
		});

		it('replaces deep circular references', () => {
			const a: Record<string, unknown> = {};
			const b: Record<string, unknown> = { parent: a };
			a.child = b;

			expect(toJsonValue(a)).toEqual({
				child: { parent: '[Circular]' },
			});
		});

		it('does not flag shared (non-circular) references', () => {
			const shared = { x: 1 };
			const obj = { a: shared, b: shared };

			expect(toJsonValue(obj)).toEqual({ a: { x: 1 }, b: { x: 1 } });
		});
	});

	describe('mixed structures', () => {
		it('handles a realistic HTTP error object', () => {
			const error = {
				statusCode: 400,
				error: { message: 'Bad Request' },
				response: {
					data: Buffer.from('{"detail":"invalid"}'),
					// eslint-disable-next-line @typescript-eslint/naming-convention
					headers: { 'content-type': 'application/json' },
				},
			};

			expect(toJsonValue(error)).toEqual({
				statusCode: 400,
				error: { message: 'Bad Request' },
				response: {
					data: '{"detail":"invalid"}',
					// eslint-disable-next-line @typescript-eslint/naming-convention
					headers: { 'content-type': 'application/json' },
				},
			});
		});
	});
});
