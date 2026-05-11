import { DateTime, Duration, Interval } from 'luxon';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ExpressionEvaluator } from '../evaluator/expression-evaluator';
import { IsolatedVmBridge } from '../bridge/isolated-vm-bridge';
import { TimeoutError, MemoryLimitError } from '../types';

describe('Integration: ExpressionEvaluator + IsolatedVmBridge', () => {
	let evaluator: ExpressionEvaluator;

	beforeAll(async () => {
		const bridge = new IsolatedVmBridge({ timeout: 5000 });
		evaluator = new ExpressionEvaluator({ bridge, maxCodeCacheSize: 1024 });
		await evaluator.initialize();
	});

	afterAll(async () => {
		await evaluator.dispose();
	});

	it('should evaluate simple property access', async () => {
		const data = {
			$json: { email: 'test@example.com' },
		};

		const result = evaluator.evaluate('{{ $json.email }}', data);

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

		const result = evaluator.evaluate('{{ $json.user.profile.name }}', data);

		expect(result).toBe('John Doe');
	});

	it('should evaluate array access', async () => {
		const data = {
			$json: {
				items: [{ id: 1 }, { id: 2 }, { id: 3 }],
			},
		};

		const result = evaluator.evaluate('{{ $json.items[1].id }}', data);

		expect(result).toBe(2);
	});

	it('should evaluate math operations', async () => {
		const data = {
			$json: {
				price: 100,
				quantity: 3,
			},
		};

		const result = evaluator.evaluate('{{ $json.price * $json.quantity }}', data);

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
			{},
		);

		expect(result).toBe('January 15, 2024');
	});

	it('should invoke functions from workflow data', async () => {
		const data = {
			$items: function () {
				return 'items-result';
			},
		};

		const result = evaluator.evaluate('{{ $items() }}', data);

		expect(result).toBe('items-result');
	});

	it('should evaluate zero values', async () => {
		const data = {
			$json: { zero: 0 },
		};

		const result = evaluator.evaluate('{{ $json.zero }}', data);

		expect(result).toBe(0);
	});

	it('should evaluate empty string values', async () => {
		const data = {
			$json: { empty: '' },
		};

		const result = evaluator.evaluate('{{ $json.empty }}', data);

		expect(result).toBe('');
	});

	it('should evaluate array index 0 (falsy index)', async () => {
		const data = {
			$json: { items: ['first', 'second'] },
		};

		const result = evaluator.evaluate('{{ $json.items[0] }}', data);

		expect(result).toBe('first');
	});

	it('should evaluate primitive array elements', async () => {
		const data = {
			$json: { numbers: [42, 99] },
		};

		const result = evaluator.evaluate('{{ $json.numbers[0] }}', data);

		expect(result).toBe(42);
	});

	it('should evaluate array .length', async () => {
		const data = {
			$json: { items: [1, 2, 3] },
		};

		const result = evaluator.evaluate('{{ $json.items.length }}', data);

		expect(result).toBe(3);
	});

	it('should evaluate null values', async () => {
		const data = {
			$json: { field: null },
		};

		const result = evaluator.evaluate('{{ $json.field }}', data);

		expect(result).toBeNull();
	});

	it('should evaluate boolean values', async () => {
		const data = {
			$json: { active: true },
		};

		const result = evaluator.evaluate('{{ $json.active }}', data);

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
		const result = evaluator.evaluate('{{ $json.items[150].id }}', data);

		expect(result).toBe(150);
	});

	it('should use provided timezone for DateTime operations', async () => {
		const data = {
			$json: { ts: 1704067200000 }, // 2024-01-01T00:00:00Z
		};

		const result = evaluator.evaluate(
			'{{ DateTime.fromMillis($json.ts).toFormat("HH:mm ZZ") }}',
			data,
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
			{ timezone: 'Asia/Tokyo' },
		);

		// Midnight UTC = 9am in Tokyo (JST = UTC+9)
		expect(result).toBe('09:00 +09:00');
	});

	describe('Luxon type serialization at boundary', () => {
		it('should return DateTime as ISO string', () => {
			const data = { $json: {} };
			const result = evaluator.evaluate('{{ DateTime.now() }}', data);
			expect(typeof result).toBe('string');
			const dt = DateTime.fromISO(result as string);
			expect(dt.isValid).toBe(true);
		});

		it('should return Duration as ISO string', () => {
			const data = { $json: {} };
			const result = evaluator.evaluate('{{ Duration.fromMillis(3600000) }}', data);
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
			) as Record<string, unknown>;
			expect(typeof result.date).toBe('string');
			const dt = DateTime.fromISO(result.date as string);
			expect(dt.isValid).toBe(true);
			expect(dt.toISODate()).toBe('2024-01-15');
		});

		it('should not affect primitive return values', () => {
			const data = { $json: { count: 42 } };
			expect(evaluator.evaluate('{{ $json.count }}', data)).toBe(42);
			expect(evaluator.evaluate('{{ $json.count > 10 }}', data)).toBe(true);
			expect(evaluator.evaluate('{{ "hello" }}', data)).toBe('hello');
		});

		it('should return null for invalid DateTime', () => {
			const data = { $json: {} };
			const result = evaluator.evaluate('{{ DateTime.invalid("test") }}', data);
			expect(result).toBeNull();
		});

		it('should preserve Date objects (structured-cloneable)', () => {
			const data = { $json: {} };
			const result = evaluator.evaluate('{{ new Date(2024, 0, 15) }}', data);
			expect(result).toBeInstanceOf(Date);
			expect((result as Date).getFullYear()).toBe(2024);
			expect((result as Date).getMonth()).toBe(0);
			expect((result as Date).getDate()).toBe(15);
		});
	});

	it('should throw on invalid timezone', async () => {
		const data = { $json: { x: 1 } };

		expect(() => evaluator.evaluate('{{ $json.x }}', data, { timezone: 'Not/A/Timezone' })).toThrow(
			'Invalid timezone: "Not/A/Timezone"',
		);
	});

	it('should create $now with the provided timezone', async () => {
		const data = { $json: {} };

		const zone = evaluator.evaluate('{{ $now.zoneName }}', data, {
			timezone: 'America/New_York',
		});

		expect(zone).toBe('America/New_York');
	});

	it('should create $today with the provided timezone', async () => {
		const data = { $json: {} };

		const zone = evaluator.evaluate('{{ $today.zoneName }}', data, {
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
		);

		// Evaluate with explicit timezone (changes Settings.defaultZone)
		evaluator.evaluate('{{ DateTime.fromMillis($json.ts).toFormat("HH:mm ZZ") }}', data, {
			timezone: 'Asia/Tokyo',
		});

		// Evaluate WITHOUT timezone — should reset to system default, not keep Tokyo
		const result = evaluator.evaluate('{{ DateTime.fromMillis($json.ts).toFormat("ZZ") }}', data);

		expect(result).toBe(systemOffset);
	});

	it('should support Object.keys() on root proxy data', () => {
		const data = {
			$json: { name: 'Alice', age: 30, city: 'Berlin' },
		};

		const result = evaluator.evaluate('{{ Object.keys($json).join(",") }}', data);

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

		expect(() => evaluator.evaluate(expression, data)).toThrow(
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
		let error: Error | undefined;
		try {
			evaluator.evaluate('{{ (() => { throw null })() }}', data);
		} catch (e) {
			error = e as Error;
		}
		expect(error).toBeDefined();
		expect(error?.message).not.toContain('Cannot read properties');
	});

	it('should handle throw undefined without crashing', () => {
		const data = { $json: {} };
		let error: Error | undefined;
		try {
			evaluator.evaluate('{{ (() => { throw undefined })() }}', data);
		} catch (e) {
			error = e as Error;
		}
		expect(error).toBeDefined();
		expect(error?.message).not.toContain('Cannot read properties');
	});

	it('should handle throw of null-prototype object with properties without crashing', () => {
		const data = { $json: {} };
		let error: Error | undefined;
		try {
			evaluator.evaluate(
				'{{ (() => { var e = Object.create(null); e.foo = "bar"; throw e; })() }}',
				data,
			);
		} catch (e) {
			error = e as Error;
		}
		expect(error).toBeDefined();
		expect(error?.message).not.toContain('hasOwnProperty is not a function');
	});

	it('should handle throw of object with hasOwnProperty shadowed by null without crashing', () => {
		const data = { $json: {} };
		let error: Error | undefined;
		try {
			evaluator.evaluate('{{ (() => { throw { hasOwnProperty: null, foo: "bar" }; })() }}', data);
		} catch (e) {
			error = e as Error;
		}
		expect(error).toBeDefined();
		expect(error?.message).not.toContain('hasOwnProperty is not a function');
	});

	it('should swallow TypeError and return undefined', () => {
		const data = { $json: {} };

		// E() inside the isolate swallows TypeErrors (failed attack attempts).
		// The expression should return undefined, not throw.
		const result = evaluator.evaluate('{{ (() => { throw new TypeError("test") })() }}', data);

		expect(result).toBeUndefined();
	});

	it('should propagate errors thrown when reading a property across the isolate boundary', () => {
		const json = {
			get brokenProp() {
				throw new Error('property access failed');
			},
		};

		expect(() => evaluator.evaluate('{{ $json.brokenProp }}', { $json: json })).toThrow(
			'property access failed',
		);
	});

	it('should propagate errors thrown by functions accessed via the lazy proxy', () => {
		const data = {
			$json: {
				myFn() {
					throw new Error('function threw');
				},
			},
		};

		expect(() => evaluator.evaluate('{{ $json.myFn() }}', data)).toThrow('function threw');
	});

	it('should propagate errors from $items() when result properties are accessed', () => {
		const data = {
			$items() {
				throw new Error('items failed');
			},
		};

		// Without throwIfErrorSentinel in the $items wrapper, the sentinel is
		// returned as a value and .length reads undefined on it — silently swallowed
		expect(() => evaluator.evaluate('{{ $items().length }}', data)).toThrow('items failed');
	});

	it('should propagate errors thrown during array element access across the isolate boundary', () => {
		const items = [1, 2, 3];
		Object.defineProperty(items, '0', {
			get() {
				throw new Error('element access failed');
			},
			configurable: true,
			enumerable: true,
		});

		const data = { $json: { items } };

		expect(() => evaluator.evaluate('{{ $json.items[0] }}', data)).toThrow('element access failed');
	});

	it('should propagate errors thrown during an "in" operator check across the isolate boundary', () => {
		const json = {
			get brokenProp() {
				throw new Error('in-check access failed');
			},
		};

		// The 'in' operator triggers the has trap on $json proxy.
		// The bridge calls __getValueAtPath(['$json', 'brokenProp']) which throws.
		// Without throwIfErrorSentinel in the has trap, the sentinel is returned
		// as a non-undefined value so 'brokenProp' in $json incorrectly returns true.
		expect(() => evaluator.evaluate('{{ "brokenProp" in $json }}', { $json: json })).toThrow(
			'in-check access failed',
		);
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
