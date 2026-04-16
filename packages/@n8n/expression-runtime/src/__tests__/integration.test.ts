import { DateTime, Duration, Interval } from 'luxon';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ExpressionEvaluator } from '../evaluator/expression-evaluator';
import { IsolatedVmBridge } from '../bridge/isolated-vm-bridge';
import { TimeoutError, MemoryLimitError } from '../types';

describe('Integration: ExpressionEvaluator + IsolatedVmBridge', () => {
	let evaluator: ExpressionEvaluator;
	const caller = {};

	beforeAll(async () => {
		evaluator = new ExpressionEvaluator({
			createBridge: () => new IsolatedVmBridge({ timeout: 5000 }),
			maxCodeCacheSize: 1024,
		});
		await evaluator.initialize();
		await evaluator.acquire(caller);
	});

	afterAll(async () => {
		await evaluator.release(caller);
		await evaluator.dispose();
	});

	it('should evaluate simple property access', async () => {
		const data = {
			$json: { email: 'test@example.com' },
		};

		const result = evaluator.evaluate('{{ $json.email }}', data, caller);

		expect(result).toBe('test@example.com');
	});

	it('should evaluate nested property access', async () => {
		const data = {
			$json: {
				user: {
					profile: {
						name: 'John Doe',
					},
				},
			},
		};

		const result = evaluator.evaluate('{{ $json.user.profile.name }}', data, caller);

		expect(result).toBe('John Doe');
	});

	it('should evaluate array access', async () => {
		const data = {
			$json: {
				items: [{ id: 1 }, { id: 2 }, { id: 3 }],
			},
		};

		const result = evaluator.evaluate('{{ $json.items[1].id }}', data, caller);

		expect(result).toBe(2);
	});

	it('should evaluate math operations', async () => {
		const data = {
			$json: {
				price: 100,
				quantity: 3,
			},
		};

		const result = evaluator.evaluate('{{ $json.price * $json.quantity }}', data, caller);

		expect(result).toBe(300);
	});

	it('should use luxon DateTime', async () => {
		const data = {
			$json: {
				date: '2024-01-15',
			},
		};

		const result = evaluator.evaluate(
			'{{ DateTime.fromISO($json.date).toFormat("MMMM dd, yyyy") }}',
			data,
			caller,
		);

		expect(result).toBe('January 15, 2024');
	});

	it('should invoke functions from workflow data', async () => {
		const data = {
			$items: function () {
				return 'items-result';
			},
		};

		const result = evaluator.evaluate('{{ $items() }}', data, caller);

		expect(result).toBe('items-result');
	});

	it('should evaluate zero values', async () => {
		const data = {
			$json: { zero: 0 },
		};

		const result = evaluator.evaluate('{{ $json.zero }}', data, caller);

		expect(result).toBe(0);
	});

	it('should evaluate empty string values', async () => {
		const data = {
			$json: { empty: '' },
		};

		const result = evaluator.evaluate('{{ $json.empty }}', data, caller);

		expect(result).toBe('');
	});

	it('should evaluate array index 0 (falsy index)', async () => {
		const data = {
			$json: { items: ['first', 'second'] },
		};

		const result = evaluator.evaluate('{{ $json.items[0] }}', data, caller);

		expect(result).toBe('first');
	});

	it('should evaluate primitive array elements', async () => {
		const data = {
			$json: { numbers: [42, 99] },
		};

		const result = evaluator.evaluate('{{ $json.numbers[0] }}', data, caller);

		expect(result).toBe(42);
	});

	it('should evaluate array .length', async () => {
		const data = {
			$json: { items: [1, 2, 3] },
		};

		const result = evaluator.evaluate('{{ $json.items.length }}', data, caller);

		expect(result).toBe(3);
	});

	it('should evaluate null values', async () => {
		const data = {
			$json: { field: null },
		};

		const result = evaluator.evaluate('{{ $json.field }}', data, caller);

		expect(result).toBeNull();
	});

	it('should evaluate boolean values', async () => {
		const data = {
			$json: { active: true },
		};

		const result = evaluator.evaluate('{{ $json.active }}', data, caller);

		expect(result).toBe(true);
	});

	it('should handle large arrays with lazy loading', async () => {
		const data = {
			$json: {
				// Create array with 200 items to exercise lazy loading
				items: Array.from({ length: 200 }, (_, i) => ({ id: i })),
			},
		};

		// Access element deep in the array via lazy proxy
		const result = evaluator.evaluate('{{ $json.items[150].id }}', data, caller);

		expect(result).toBe(150);
	});

	it('should use provided timezone for DateTime operations', async () => {
		const data = {
			$json: { ts: 1704067200000 }, // 2024-01-01T00:00:00Z
		};

		const result = evaluator.evaluate(
			'{{ DateTime.fromMillis($json.ts).toFormat("HH:mm ZZ") }}',
			data,
			caller,
			{ timezone: 'America/New_York' },
		);

		// Midnight UTC = 7pm previous day in New York (EST = UTC-5)
		expect(result).toBe('19:00 -05:00');
	});

	it('should use different timezone when specified', async () => {
		const data = {
			$json: { ts: 1704067200000 }, // 2024-01-01T00:00:00Z
		};

		const result = evaluator.evaluate(
			'{{ DateTime.fromMillis($json.ts).toFormat("HH:mm ZZ") }}',
			data,
			caller,
			{ timezone: 'Asia/Tokyo' },
		);

		// Midnight UTC = 9am in Tokyo (JST = UTC+9)
		expect(result).toBe('09:00 +09:00');
	});

	describe('Luxon type serialization at boundary', () => {
		it('should return DateTime as ISO string', () => {
			const data = { $json: {} };
			const result = evaluator.evaluate('{{ DateTime.now() }}', data, caller);
			expect(typeof result).toBe('string');
			const dt = DateTime.fromISO(result as string);
			expect(dt.isValid).toBe(true);
		});

		it('should return Duration as ISO string', () => {
			const data = { $json: {} };
			const result = evaluator.evaluate('{{ Duration.fromMillis(3600000) }}', data, caller);
			expect(typeof result).toBe('string');
			const duration = Duration.fromISO(result as string);
			expect(duration.isValid).toBe(true);
			expect(duration.toMillis()).toBe(3600000);
		});

		it('should return Interval as ISO string', () => {
			const data = { $json: {} };
			const result = evaluator.evaluate(
				'{{ Interval.after(DateTime.fromISO("2024-01-01"), 86400000) }}',
				data,
				caller,
			);
			expect(typeof result).toBe('string');
			const interval = Interval.fromISO(result as string);
			expect(interval.isValid).toBe(true);
			expect(interval.length('milliseconds')).toBe(86400000);
		});

		it('should serialize nested DateTime in objects', () => {
			const data = { $json: {} };
			const result = evaluator.evaluate(
				'{{ ({ date: DateTime.fromISO("2024-01-15") }) }}',
				data,
				caller,
			) as Record<string, unknown>;
			expect(typeof result.date).toBe('string');
			const dt = DateTime.fromISO(result.date as string);
			expect(dt.isValid).toBe(true);
			expect(dt.toISODate()).toBe('2024-01-15');
		});

		it('should not affect primitive return values', () => {
			const data = { $json: { count: 42 } };
			expect(evaluator.evaluate('{{ $json.count }}', data, caller)).toBe(42);
			expect(evaluator.evaluate('{{ $json.count > 10 }}', data, caller)).toBe(true);
			expect(evaluator.evaluate('{{ "hello" }}', data, caller)).toBe('hello');
		});

		it('should return null for invalid DateTime', () => {
			const data = { $json: {} };
			const result = evaluator.evaluate('{{ DateTime.invalid("test") }}', data, caller);
			expect(result).toBeNull();
		});

		it('should preserve Date objects (structured-cloneable)', () => {
			const data = { $json: {} };
			const result = evaluator.evaluate('{{ new Date(2024, 0, 15) }}', data, caller);
			expect(result).toBeInstanceOf(Date);
			expect((result as Date).getFullYear()).toBe(2024);
			expect((result as Date).getMonth()).toBe(0);
			expect((result as Date).getDate()).toBe(15);
		});
	});

	it('should throw on invalid timezone', async () => {
		const data = { $json: { x: 1 } };

		expect(() =>
			evaluator.evaluate('{{ $json.x }}', data, caller, { timezone: 'Not/A/Timezone' }),
		).toThrow('Invalid timezone: "Not/A/Timezone"');
	});

	it('should create $now with the provided timezone', async () => {
		const data = { $json: {} };

		const zone = evaluator.evaluate('{{ $now.zoneName }}', data, caller, {
			timezone: 'America/New_York',
		});

		expect(zone).toBe('America/New_York');
	});

	it('should create $today with the provided timezone', async () => {
		const data = { $json: {} };

		const zone = evaluator.evaluate('{{ $today.zoneName }}', data, caller, {
			timezone: 'Asia/Tokyo',
		});

		expect(zone).toBe('Asia/Tokyo');
	});

	it('should reset to system timezone when no timezone is provided after one was set', async () => {
		const data = {
			$json: { ts: 1704067200000 }, // 2024-01-01T00:00:00Z
		};

		// Capture the system default offset before any timezone is set
		const systemOffset = evaluator.evaluate(
			'{{ DateTime.fromMillis($json.ts).toFormat("ZZ") }}',
			data,
			caller,
		);

		// Evaluate with explicit timezone (changes Settings.defaultZone)
		evaluator.evaluate('{{ DateTime.fromMillis($json.ts).toFormat("HH:mm ZZ") }}', data, caller, {
			timezone: 'Asia/Tokyo',
		});

		// Evaluate WITHOUT timezone — should reset to system default, not keep Tokyo
		const result = evaluator.evaluate(
			'{{ DateTime.fromMillis($json.ts).toFormat("ZZ") }}',
			data,
			caller,
		);

		expect(result).toBe(systemOffset);
	});

	it('should support Object.keys() on root proxy data', () => {
		const data = {
			$json: { name: 'Alice', age: 30, city: 'Berlin' },
		};

		const result = evaluator.evaluate('{{ Object.keys($json).join(",") }}', data, caller);

		expect(result).toBe('name,age,city');
	});

	it('should preserve error name, message, and custom properties across isolate boundary', () => {
		const data = { $json: {} };

		// Throw a plain Error with a name the bridge recognizes and custom
		// properties. The bridge serializes via __reportError, reconstructs
		// on the host, and re-throws — name, message, and extra properties
		// should survive the round-trip.
		const expression =
			'{{ (() => {' +
			'  const e = new Error("test error");' +
			'  e.name = "ExpressionExtensionError";' +
			'  e.customProp = "hello";' +
			'  e.context = { foo: "bar" };' +
			'  throw e;' +
			'})() }}';

		expect(() => evaluator.evaluate(expression, data, caller)).toThrow(
			expect.objectContaining({
				name: 'ExpressionExtensionError',
				message: 'test error',
				customProp: 'hello',
				context: { foo: 'bar' },
			}),
		);
	});

	it('should handle throw null without crashing', () => {
		const data = { $json: {} };
		expect(evaluator.evaluate('{{ (() => { throw null })() }}', data, caller)).toBeUndefined();
	});

	it('should handle throw undefined without crashing', () => {
		const data = { $json: {} };
		expect(evaluator.evaluate('{{ (() => { throw undefined })() }}', data, caller)).toBeUndefined();
	});

	it('should handle throw of null-prototype object with properties without crashing', () => {
		const data = { $json: {} };
		expect(
			evaluator.evaluate(
				'{{ (() => { var e = Object.create(null); e.foo = "bar"; throw e; })() }}',
				data,
				caller,
			),
		).toBeUndefined();
	});

	it('should handle throw of object with hasOwnProperty shadowed by null without crashing', () => {
		const data = { $json: {} };
		expect(
			evaluator.evaluate(
				'{{ (() => { throw { hasOwnProperty: null, foo: "bar" }; })() }}',
				data,
				caller,
			),
		).toBeUndefined();
	});

	it('should swallow TypeError and return undefined', () => {
		const data = { $json: {} };

		// E() inside the isolate swallows TypeErrors (failed attack attempts).
		// The expression should return undefined, not throw.
		const result = evaluator.evaluate(
			'{{ (() => { throw new TypeError("test") })() }}',
			data,
			caller,
		);

		expect(result).toBeUndefined();
	});

	it('should re-throw ExpressionError from host-side callbacks', () => {
		const json = {
			get brokenProp() {
				const err = new Error('paired item failed');
				err.name = 'ExpressionError';
				throw err;
			},
		};

		expect(() => evaluator.evaluate('{{ $json.brokenProp }}', { $json: json }, caller)).toThrow(
			expect.objectContaining({ name: 'ExpressionError', message: 'paired item failed' }),
		);
	});

	it('should re-throw ExpressionExtensionError from host-side callbacks', () => {
		const json = {
			get brokenProp() {
				const err = new Error('extension failed');
				err.name = 'ExpressionExtensionError';
				throw err;
			},
		};

		expect(() => evaluator.evaluate('{{ $json.brokenProp }}', { $json: json }, caller)).toThrow(
			expect.objectContaining({
				name: 'ExpressionExtensionError',
				message: 'extension failed',
			}),
		);
	});

	it('should swallow generic errors thrown when reading a property across the isolate boundary', () => {
		const json = {
			get brokenProp() {
				throw new Error('property access failed');
			},
		};

		expect(evaluator.evaluate('{{ $json.brokenProp }}', { $json: json }, caller)).toBeUndefined();
	});

	it('should swallow generic errors thrown by functions accessed via the lazy proxy', () => {
		const data = {
			$json: {
				myFn() {
					throw new Error('function threw');
				},
			},
		};

		expect(evaluator.evaluate('{{ $json.myFn() }}', data, caller)).toBeUndefined();
	});

	it('should swallow generic errors from $items() when result properties are accessed', () => {
		const data = {
			$items() {
				throw new Error('items failed');
			},
		};

		expect(evaluator.evaluate('{{ $items().length }}', data, caller)).toBeUndefined();
	});

	it('should swallow generic errors thrown during array element access across the isolate boundary', () => {
		const items = [1, 2, 3];
		Object.defineProperty(items, '0', {
			get() {
				throw new Error('element access failed');
			},
			configurable: true,
			enumerable: true,
		});

		const data = { $json: { items } };

		expect(evaluator.evaluate('{{ $json.items[0] }}', data, caller)).toBeUndefined();
	});

	it('should swallow generic errors thrown during an "in" operator check across the isolate boundary', () => {
		const json = {
			get brokenProp() {
				throw new Error('in-check access failed');
			},
		};

		// The 'in' operator triggers the has trap on $json proxy.
		// The bridge calls __getValueAtPath(['$json', 'brokenProp']) which throws.
		expect(
			evaluator.evaluate('{{ "brokenProp" in $json }}', { $json: json }, caller),
		).toBeUndefined();
	});

	it('should handle re-entrant execute() calls via closure-scoped contexts', () => {
		const data = {
			$json: {
				get nested() {
					// Trigger a nested evaluate() through the same bridge.
					// With closure-scoped contexts, this should succeed —
					// each evaluation gets its own closure with independent callbacks.
					return evaluator.evaluate('{{ "inner" }}', { $json: { val: 1 } }, caller);
				},
			},
		};

		expect(evaluator.evaluate('{{ $json.nested }}', data, caller)).toBe('inner');
	});
});

describe('Integration: IsolatedVmBridge error handling', () => {
	it('should throw TimeoutError when expression exceeds timeout', async () => {
		const bridge = new IsolatedVmBridge({ timeout: 100 });
		await bridge.initialize();
		try {
			expect(() => bridge.execute('while(true){}', {})).toThrow(TimeoutError);
		} finally {
			await bridge.dispose();
		}
	});

	it('should throw MemoryLimitError when expression exceeds memory limit', async () => {
		const bridge = new IsolatedVmBridge({ memoryLimit: 8 });
		await bridge.initialize();
		try {
			expect(() =>
				bridge.execute('let a=[]; while(true){a.push(new Array(1000000).fill(1))}', {}),
			).toThrow(MemoryLimitError);
		} finally {
			await bridge.dispose();
		}
	});
});

describe('Integration: Concurrent execution pooling', () => {
	let evaluator: ExpressionEvaluator;

	beforeAll(async () => {
		evaluator = new ExpressionEvaluator({
			createBridge: () => new IsolatedVmBridge({ timeout: 5000 }),
			maxCodeCacheSize: 1024,
			poolSize: 2,
		});
		await evaluator.initialize();
	});

	afterAll(async () => {
		await evaluator.dispose();
	});

	beforeEach(async () => {
		await evaluator.waitForReplenishment();
	});

	it('should hold separate bridges for separate callers', async () => {
		const caller1 = {};
		const caller2 = {};
		await evaluator.acquire(caller1);
		await evaluator.acquire(caller2);

		const data1 = { $json: { value: 'from-ctx-1' } };
		const data2 = { $json: { value: 'from-ctx-2' } };

		const result1 = evaluator.evaluate('{{ $json.value }}', data1, caller1);
		const result2 = evaluator.evaluate('{{ $json.value }}', data2, caller2);

		expect(result1).toBe('from-ctx-1');
		expect(result2).toBe('from-ctx-2');

		await evaluator.release(caller1);
		await evaluator.release(caller2);
	});

	it('should reuse the same bridge for the same caller', async () => {
		const caller = {};
		await evaluator.acquire(caller);

		const result1 = evaluator.evaluate('{{ $json.a }}', { $json: { a: 'first' } }, caller);
		const result2 = evaluator.evaluate('{{ $json.b }}', { $json: { b: 'second' } }, caller);

		expect(result1).toBe('first');
		expect(result2).toBe('second');

		await evaluator.release(caller);
	});

	it('should replenish after acquire', async () => {
		const caller1 = {};
		await evaluator.acquire(caller1);

		await evaluator.waitForReplenishment();

		// Pool should have a fresh bridge available for a second caller
		const caller2 = {};
		await evaluator.acquire(caller2);
		const result = evaluator.evaluate('{{ $json.y }}', { $json: { y: 'replenished' } }, caller2);
		expect(result).toBe('replenished');

		await evaluator.release(caller1);
		await evaluator.release(caller2);
	});

	it('should replenish after release', async () => {
		const caller1 = {};
		await evaluator.acquire(caller1);
		await evaluator.release(caller1);

		await evaluator.waitForReplenishment();

		// Pool should have a fresh bridge available
		const caller2 = {};
		await evaluator.acquire(caller2);
		const result = evaluator.evaluate('{{ $json.y }}', { $json: { y: 'replenished' } }, caller2);
		expect(result).toBe('replenished');

		await evaluator.release(caller2);
	});
});
