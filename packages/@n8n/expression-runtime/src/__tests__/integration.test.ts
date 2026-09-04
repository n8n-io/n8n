import { readFile } from 'node:fs/promises';
import * as path from 'node:path';

import { DateTime, Duration, Interval } from 'luxon';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ExpressionEvaluator } from '../evaluator/expression-evaluator';
import { IsolatedVmBridge } from '../bridge/isolated-vm-bridge';
import { QuickJsBridge } from '../bridge/quickjs-bridge';
import type { WorkflowData } from '../types';
import { TimeoutError, MemoryLimitError } from '../types';
import { createBridge, engineName, isQuickJS, newBridge } from './test-bridge';

describe(`Integration: ExpressionEvaluator (${engineName})`, () => {
	let evaluator: ExpressionEvaluator;
	const caller = {};

	beforeAll(async () => {
		evaluator = new ExpressionEvaluator({
			createBridge,
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

	it('should marshal falsy and primitive values', () => {
		const data = {
			$json: {
				zero: 0,
				empty: '',
				field: null,
				active: true,
				items: ['first', 'second'],
				numbers: [42, 99],
			},
		};

		expect(evaluator.evaluate('{{ $json.zero }}', data, caller)).toBe(0);
		expect(evaluator.evaluate('{{ $json.empty }}', data, caller)).toBe('');
		expect(evaluator.evaluate('{{ $json.field }}', data, caller)).toBeNull();
		expect(evaluator.evaluate('{{ $json.active }}', data, caller)).toBe(true);
		// getArrayElement: falsy index 0 and primitive element
		expect(evaluator.evaluate('{{ $json.items[0] }}', data, caller)).toBe('first');
		expect(evaluator.evaluate('{{ $json.numbers[0] }}', data, caller)).toBe(42);
	});

	it('should evaluate array .length', () => {
		const data = {
			$json: { items: [1, 2, 3] },
		};

		expect(evaluator.evaluate('{{ $json.items.length }}', data, caller)).toBe(3);
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

	it('should render the timezone independent of the global JSON.stringify', async () => {
		const data = { $json: { x: 'ok' } };
		const original = JSON.stringify;
		let result: unknown;
		try {
			JSON.stringify = (() => 'REPLACED_STRINGIFY_OUTPUT') as unknown as typeof JSON.stringify;
			result = evaluator.evaluate('{{ $json.x }}', data, caller, {
				timezone: 'America/New_York',
			});
		} finally {
			JSON.stringify = original;
		}

		expect(result).toBe('ok');
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

	describe('Date marshaling from workflow data', () => {
		it('should read a top-level or nested Date in $json as a Date, not {}', () => {
			const iso = '2026-06-30T20:34:04.498Z';
			const data = { $json: { d: new Date(iso), row: { createdAt: new Date(iso) } } };

			const top = evaluator.evaluate('{{ $json.d }}', data, caller);
			expect(top).not.toEqual({});
			expect(top).toBeInstanceOf(Date);
			expect((top as Date).toISOString()).toBe(iso);

			// nested (e.g. Data Table createdAt) travels the same getValueAtPath branch
			expect(evaluator.evaluate('{{ $json.row.createdAt }}', data, caller)).toBeInstanceOf(Date);
		});

		it('should read a Date array element in $json', () => {
			const data = { $json: { dates: [new Date('2026-06-30T20:34:04.498Z')] } };

			const result = evaluator.evaluate('{{ $json.dates[0] }}', data, caller);

			expect(result).toBeInstanceOf(Date);
		});
	});

	it('should enumerate keys that look like internal sentinel markers', () => {
		const data = { $json: { __NaN__: 'a', other: 'b' } };

		expect(evaluator.evaluate('{{ Object.keys($json).sort().join(",") }}', data, caller)).toBe(
			'__NaN__,other',
		);
	});

	it('should resolve a function array element as undefined', () => {
		const data = { $json: { items: [1, () => 2, 3] } };

		expect(evaluator.evaluate('{{ typeof $json.items[1] }}', data, caller)).toBe('undefined');
		expect(evaluator.evaluate('{{ $json.items[2] }}', data, caller)).toBe(3);
	});

	it('should round-trip Map, Set and NaN return values', () => {
		const data = { $json: {} };

		expect(evaluator.evaluate('{{ new Map([["a", 1]]) }}', data, caller)).toBeInstanceOf(Map);
		expect(evaluator.evaluate('{{ new Set([1, 2]) }}', data, caller)).toBeInstanceOf(Set);
		expect(evaluator.evaluate('{{ 0/0 }}', data, caller)).toBeNaN();
	});

	it('should honor locale and options in toLocaleString/toLocaleTimeString', () => {
		const data = { $json: { n: 1234.5, iso: '2024-01-15T10:30:00.000Z' } };

		expect(
			evaluator.evaluate(
				'{{ $json.n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}',
				data,
				caller,
			),
		).toBe('1,234.50');
		expect(
			evaluator.evaluate(
				'{{ new Date($json.iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" }) }}',
				data,
				caller,
			),
		).toBe('10:30 AM');
	});

	it('should throw when the result cannot be cloned (function or Promise)', () => {
		const data = { $json: {} };

		expect(() => evaluator.evaluate('{{ async () => 1 }}', data, caller)).toThrow(
			'could not be cloned',
		);
		expect(() => evaluator.evaluate('{{ (async () => 1)() }}', data, caller)).toThrow(
			'could not be cloned',
		);
		expect(() => evaluator.evaluate('{{ ({ fn: () => 1 }) }}', data, caller)).toThrow(
			'could not be cloned',
		);
	});

	it('should reject the opposite style option in toLocaleDateString/toLocaleTimeString', () => {
		const data = { $json: {} };

		// The in-sandbox TypeError is swallowed by the E() handler, so the
		// expression yields undefined — same as the vm engine.
		expect(
			evaluator.evaluate(
				'{{ new Date(0).toLocaleDateString("en-US", { timeStyle: "short" }) }}',
				data,
				caller,
			),
		).toBeUndefined();
		expect(
			evaluator.evaluate(
				'{{ new Date(0).toLocaleTimeString("en-US", { dateStyle: "short" }) }}',
				data,
				caller,
			),
		).toBeUndefined();
		expect(
			evaluator.evaluate(
				'{{ new Date(0).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short", timeZone: "UTC" }) }}',
				data,
				caller,
			),
		).toBe('1/1/70, 12:00 AM');
	});

	it('should round-trip an invalid Date return value', () => {
		const data = { $json: {} };

		const result = evaluator.evaluate('{{ new Date("not-a-date") }}', data, caller);
		expect(result).toBeInstanceOf(Date);
		expect(Number.isNaN((result as Date).getTime())).toBe(true);
	});

	it('should return user objects whose keys collide with transfer markers unchanged', () => {
		const data = { $json: {} };

		expect(
			evaluator.evaluate('{{ ({ __isDate: true, __isoString: "x" }) }}', data, caller),
		).toEqual({ __isDate: true, __isoString: 'x' });
		expect(evaluator.evaluate('{{ ({ __isMap: true, __entries: [] }) }}', data, caller)).toEqual({
			__isMap: true,
			__entries: [],
		});
		expect(evaluator.evaluate('{{ ({ __isNaN: true }) }}', data, caller)).toEqual({
			__isNaN: true,
		});
		expect(
			evaluator.evaluate('{{ ({ nested: { __isSet: true, __values: [1] } }) }}', data, caller),
		).toEqual({ nested: { __isSet: true, __values: [1] } });
		expect(evaluator.evaluate('{{ ({ __isEscaped: true, __value: 1 }) }}', data, caller)).toEqual({
			__isEscaped: true,
			__value: 1,
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

	it('should not leak host references through non-index array access', () => {
		// Reading a non-index key like $json.a.constructor must return undefined,
		// so a guest can't walk from an array to the host Object prototype.
		const data = { $json: { a: [1337] } };
		const expression = `{{
  (function() {
    const hostLookupParams = (() => eval)()(\`(args, res) => {
      const _copy = {copy: true};
      const _reference = {reference: true};
      const params = {};
      params.arguments = args === 'copy' ? _copy : _reference;
      params.result = res === 'copy' ? _copy : _reference;
      return params;
    }\`);
    const refs = (() => eval)()(\`
(function () { return arguments.callee.caller.caller.caller.arguments })()
\`);
    const getArrayElement = refs[1];

    var log = [];

    function t(label, fn) {
      try {
        const result = fn();
        log.push(label + '=' + result);
        return result;
      } catch (e) {
        log.push(label + ':ERR ' + String(e && e.message ? e.message : e));
      }
    }

    const hostArrayPath = ['$json', 'a'];
    const HostArray = t('host array', function() {
      return getArrayElement.applySync(null, [hostArrayPath, 'constructor'], hostLookupParams('copy', 'reference'));
    });
    const HostLookupGetter = t('host lookup getter', function() {
      return getArrayElement.applySync(null, [hostArrayPath, '__lookupGetter__'], hostLookupParams('copy', 'reference'));
    });
    const hostArrayInstance = t('host array instance', function() {
      return HostArray.applySync(null, [1], hostLookupParams('copy', 'reference'));
    });
    const HostProtoGetter = t('host __proto__ getter', function() {
      return HostLookupGetter.applySync(hostArrayInstance.derefInto(), ['__proto__'], hostLookupParams('copy', 'reference'));
    });
    const arrProto = t('host Array prototype', function() {
      return HostProtoGetter.applySync(hostArrayInstance.derefInto(), [], hostLookupParams('copy', 'reference'));
    });
    const objProto = t('host Object prototype', function() {
      return HostProtoGetter.applySync(arrProto.derefInto(), [], hostLookupParams('copy', 'reference'));
    });

    objProto.setSync('win', 1337);
    return log;
  })();
}}`;

		try {
			// The bridge swallows the TypeError; what matters is the host Object
			// prototype was never mutated.
			evaluator.evaluate(expression, data, caller);
			expect((Object.prototype as Record<string, unknown>).win).toBeUndefined();
		} finally {
			delete (Object.prototype as Record<string, unknown>).win;
		}
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

	it('should preserve the outer data bindings after a re-entrant execute() call', () => {
		const data = {
			$json: {
				get nested() {
					// Re-enters execute() on the same bridge with different data.
					// The outer evaluation must keep resolving against its own data
					// after the nested call returns.
					return evaluator.evaluate('{{ "inner" }}', { $json: { val: 1 } }, caller);
				},
				other: 'OUTER_VALUE',
			},
		};

		expect(evaluator.evaluate('{{ $json.nested + "|" + $json.other }}', data, caller)).toBe(
			'inner|OUTER_VALUE',
		);
	});
});

describe(`Integration: ${engineName} error handling`, () => {
	it('should throw TimeoutError when expression exceeds timeout', async () => {
		const bridge = newBridge({ timeout: 100 });
		await bridge.initialize();
		try {
			expect(() => bridge.execute('while(true){}', {})).toThrow(TimeoutError);
			// A spent budget must be rejected before entering the isolate, which
			// reads a non-positive timeout as no timeout at all.
			expect(() => bridge.execute('return 1;', {}, { elapsedMs: 100 })).toThrow(TimeoutError);
		} finally {
			await bridge.dispose();
		}
	});

	// QuickJS-only: its interrupt deadline is wall-clock and was previously reset
	// on every nested execute(), so a loop re-entering faster than the timeout
	// never interrupted. isolated-vm uses a CPU-time budget per call and is not
	// affected. The outer loop below burns CPU in the vm (so the interrupt fires
	// in the outer context) while periodically re-entering via $evaluateExpression.
	it.runIf(isQuickJS)(
		'should enforce the timeout even when the expression re-enters execute()',
		async () => {
			const bridge = newBridge({ timeout: 150 });
			await bridge.initialize();
			try {
				const data: Record<string, unknown> = {
					$evaluateExpression: () => bridge.execute('1', data),
				};
				const code = `
					var end = Date.now() + 5000;
					var i = 0;
					while (Date.now() < end) {
						i++;
						if (i % 100000 === 0) { this.$evaluateExpression("1"); }
					}
					return i;
				`;
				expect(() => bridge.execute(code, data)).toThrow(TimeoutError);
			} finally {
				await bridge.dispose();
			}
		},
	);

	it('should not reinitialize or execute after dispose', async () => {
		const bridge = newBridge({ timeout: 1000 });
		await bridge.initialize();
		await bridge.dispose();

		expect(bridge.isDisposed()).toBe(true);
		await expect(bridge.initialize()).rejects.toThrow();
		expect(bridge.isDisposed()).toBe(true);
		expect(() => bridge.execute('1', {})).toThrow();
	});

	it('should throw MemoryLimitError when expression exceeds memory limit', async () => {
		const bridge = newBridge({ memoryLimit: 8 });
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

describe(`Integration: nested evaluation time budget (${engineName})`, () => {
	const TIMEOUT_MS = 400;
	const BURN_MS = 150;
	const DEPTH = 8;

	let evaluator: ExpressionEvaluator;
	const caller = {};

	beforeAll(async () => {
		evaluator = new ExpressionEvaluator({
			createBridge: () => newBridge({ timeout: TIMEOUT_MS }),
			maxCodeCacheSize: 1024,
		});
		await evaluator.initialize();
		await evaluator.acquire(caller);
	});

	afterAll(async () => {
		await evaluator.release(caller);
		await evaluator.dispose();
	});

	/**
	 * Spends `BURN_MS` inside the isolate, then hands the next depth down to
	 * `$evaluateExpression`; depth 0 spins forever. The remaining depth travels
	 * as the expression argument (a nested `{{ }}` literal would terminate the
	 * enclosing template), and the host callback turns it back into a template.
	 */
	const frame = (depth: number): string =>
		depth === 0
			? '{{ (function() { while (true) {} })() }}'
			: `{{ (function() { var s = Date.now(); while (Date.now() - s < ${BURN_MS}) {} return $evaluateExpression("${depth - 1}"); })() }}`;

	it('bounds a chain of nested evaluations to a single time budget', () => {
		let framesEvaluated = 0;
		const data: WorkflowData = {
			$evaluateExpression: (depth: string) => {
				framesEvaluated++;
				return evaluator.evaluate(frame(Number(depth)), data, caller);
			},
		};

		const start = Date.now();
		expect(() => evaluator.evaluate(frame(DEPTH), data, caller)).toThrow(
			`Nested expressions timed out after sharing the ${TIMEOUT_MS}ms limit`,
		);
		const elapsed = Date.now() - start;

		// Frame count is the load-independent signal: at BURN_MS per frame the
		// budget affords exactly two before it runs out. A frame that restarted
		// the budget would buy at least one more, whatever the host overhead.
		expect(framesEvaluated).toBe(2);
		expect(elapsed).toBeLessThan(TIMEOUT_MS * 1.5);
	});

	it('shares the budget across sequential nested evaluations', () => {
		const burn = `{{ (function() { var s = Date.now(); while (Date.now() - s < ${BURN_MS}) {} return 1; })() }}`;
		const data: WorkflowData = {
			$evaluateExpression: () => evaluator.evaluate(burn, {}, caller),
		};

		// Siblings draw on the same budget, so the later ones run out; each
		// getting a fresh one would let the pair complete.
		expect(() =>
			evaluator.evaluate(
				'{{ $evaluateExpression("a") + $evaluateExpression("a") + $evaluateExpression("a") }}',
				data,
				caller,
			),
		).toThrow(/timed out/);
	});

	it('gives a single evaluation the full budget', () => {
		const start = Date.now();
		expect(() => evaluator.evaluate(frame(0), {}, caller)).toThrow(
			`Expression timed out after ${TIMEOUT_MS}ms`,
		);
		const elapsed = Date.now() - start;

		expect(elapsed).toBeGreaterThanOrEqual(TIMEOUT_MS * 0.8);
		expect(elapsed).toBeLessThan(TIMEOUT_MS * 2);
	});
});

describe('QuickJsBridge runtimeBundle injection', () => {
	it('should initialize and evaluate when runtimeBundle is provided as a string', async () => {
		let dir = __dirname;
		let bundle: string | undefined;
		while (dir !== path.dirname(dir)) {
			try {
				bundle = await readFile(path.join(dir, 'dist', 'bundle', 'runtime.iife.js'), 'utf-8');
				break;
			} catch {}
			dir = path.dirname(dir);
		}
		if (!bundle) throw new Error('runtime bundle not found for test setup');

		const capturedBundle = bundle;
		const evaluator = new ExpressionEvaluator({
			createBridge: () => new QuickJsBridge({ timeout: 5000, runtimeBundle: capturedBundle }),
			maxCodeCacheSize: 1024,
		});
		await evaluator.initialize();
		const caller = {};
		await evaluator.acquire(caller);
		try {
			const result = evaluator.evaluate(
				'{{ $json.name }}',
				{ $json: { name: 'injected' } },
				caller,
			);
			expect(result).toBe('injected');
		} finally {
			await evaluator.release(caller);
			await evaluator.dispose();
		}
	});
});
