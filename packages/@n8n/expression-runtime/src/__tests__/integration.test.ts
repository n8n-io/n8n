import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ExpressionEvaluator } from '../evaluator/expression-evaluator';
import { IsolatedVmBridge } from '../bridge/isolated-vm-bridge';
import { TimeoutError, MemoryLimitError } from '../types';

describe('Integration: ExpressionEvaluator + IsolatedVmBridge', () => {
	let evaluator: ExpressionEvaluator;

	beforeAll(async () => {
		const bridge = new IsolatedVmBridge({ timeout: 5000 });
		evaluator = new ExpressionEvaluator({ bridge });
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
