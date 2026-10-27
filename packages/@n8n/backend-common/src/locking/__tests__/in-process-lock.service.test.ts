import { OperationalError } from 'n8n-workflow';

import { InProcessLockService } from '../in-process-lock.service';
import { LockNamespace } from '../lock-service.interface';

const NS = LockNamespace.CREDENTIALS;

describe('InProcessLockService', () => {
	let service: InProcessLockService;

	beforeEach(() => {
		service = new InProcessLockService();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should serialize concurrent withLease calls for the same namespace + key', async () => {
		const executionOrder: string[] = [];
		let resolveFirst!: () => void;
		const firstBlocking = new Promise<void>((r) => {
			resolveFirst = r;
		});

		const fn1 = vi.fn(async () => {
			executionOrder.push('fn1-start');
			await firstBlocking;
			executionOrder.push('fn1-end');
			return 'first';
		});
		const fn2 = vi.fn(async () => {
			executionOrder.push('fn2-start');
			await Promise.resolve();
			return 'second';
		});

		const p1 = service.withLease(NS, 'k', fn1);
		const p2 = service.withLease(NS, 'k', fn2);

		await new Promise((r) => setImmediate(r));
		expect(fn1).toHaveBeenCalled();
		expect(fn2).not.toHaveBeenCalled();

		resolveFirst();
		const [r1, r2] = await Promise.all([p1, p2]);

		expect(r1).toBe('first');
		expect(r2).toBe('second');
		expect(executionOrder).toEqual(['fn1-start', 'fn1-end', 'fn2-start']);
	});

	it('should not block on different keys within the same namespace', async () => {
		let resolveFirst!: () => void;
		const firstBlocking = new Promise<void>((r) => {
			resolveFirst = r;
		});

		const fn1 = vi.fn(async () => {
			await firstBlocking;
			return 'first';
		});
		const fn2 = vi.fn().mockResolvedValue('second');

		const p1 = service.withLease(NS, 'k1', fn1);
		const p2 = service.withLease(NS, 'k2', fn2);

		await new Promise((r) => setImmediate(r));
		expect(fn1).toHaveBeenCalled();
		expect(fn2).toHaveBeenCalled();

		resolveFirst();
		expect(await Promise.all([p1, p2])).toEqual(['first', 'second']);
	});

	it('should not block on the same key across different namespaces', async () => {
		let resolveFirst!: () => void;
		const firstBlocking = new Promise<void>((r) => {
			resolveFirst = r;
		});

		const fn1 = vi.fn(async () => {
			await firstBlocking;
			return 'first';
		});
		const fn2 = vi.fn().mockResolvedValue('second');

		const p1 = service.withLease(LockNamespace.CREDENTIALS, 'same', fn1);
		const p2 = service.withLease(LockNamespace.KNOWN_LOCKS, 'same', fn2);

		await new Promise((r) => setImmediate(r));
		expect(fn1).toHaveBeenCalled();
		expect(fn2).toHaveBeenCalled();

		resolveFirst();
		expect(await Promise.all([p1, p2])).toEqual(['first', 'second']);
	});

	it('should reject with OperationalError when waitTimeoutMs expires', async () => {
		vi.useFakeTimers();

		let resolveFirst!: () => void;
		const firstBlocking = new Promise<void>((r) => {
			resolveFirst = r;
		});

		const fn1 = vi.fn(async () => {
			await firstBlocking;
			return 'first';
		});
		const fn2 = vi.fn().mockResolvedValue('second');

		const p1 = service.withLease(NS, 'k', fn1);
		const p2 = service.withLease(NS, 'k', fn2, { waitTimeoutMs: 100 });

		vi.advanceTimersByTime(100);

		await expect(p2).rejects.toThrow(OperationalError);
		await expect(p2).rejects.toThrow(/Timed out waiting for lock '.*' after 100ms/);
		expect(fn2).not.toHaveBeenCalled();

		resolveFirst();
		await p1;
	});

	it('should release the lock when fn throws', async () => {
		const fn1 = vi.fn().mockRejectedValue(new Error('fn1 failed'));
		const fn2 = vi.fn().mockResolvedValue('second');

		await expect(service.withLease(NS, 'k', fn1)).rejects.toThrow('fn1 failed');

		expect(await service.withLease(NS, 'k', fn2)).toBe('second');
	});

	it('should execute 3+ waiters in FIFO order', async () => {
		const executionOrder: string[] = [];
		let resolve1!: () => void;
		let resolve2!: () => void;
		const blocking1 = new Promise<void>((r) => {
			resolve1 = r;
		});
		const blocking2 = new Promise<void>((r) => {
			resolve2 = r;
		});

		const fn1 = vi.fn(async () => {
			executionOrder.push('fn1');
			await blocking1;
			return 'first';
		});
		const fn2 = vi.fn(async () => {
			executionOrder.push('fn2');
			await blocking2;
			return 'second';
		});
		const fn3 = vi.fn(async () => {
			executionOrder.push('fn3');
			await Promise.resolve();
			return 'third';
		});

		const p1 = service.withLease(NS, 'k', fn1);
		const p2 = service.withLease(NS, 'k', fn2);
		const p3 = service.withLease(NS, 'k', fn3);

		await new Promise((r) => setImmediate(r));
		expect(executionOrder).toEqual(['fn1']);

		resolve1();
		await p1;
		await new Promise((r) => setImmediate(r));
		expect(executionOrder).toEqual(['fn1', 'fn2']);

		resolve2();
		const [r2, r3] = await Promise.all([p2, p3]);

		expect(r2).toBe('second');
		expect(r3).toBe('third');
		expect(executionOrder).toEqual(['fn1', 'fn2', 'fn3']);
	});

	it('should treat double-release as a safe no-op', async () => {
		let resolveFirst!: () => void;
		const firstBlocking = new Promise<void>((r) => {
			resolveFirst = r;
		});

		const fn1 = vi.fn(async () => {
			await firstBlocking;
			return 'first';
		});
		const fn2 = vi.fn().mockResolvedValue('second');
		const fn3 = vi.fn().mockResolvedValue('third');

		const p1 = service.withLease(NS, 'k', fn1);
		const p2 = service.withLease(NS, 'k', fn2);

		await new Promise((r) => setImmediate(r));

		resolveFirst();
		await Promise.all([p1, p2]);

		// If the p1 release had corrupted state, fn3 would deadlock or fail.
		expect(await service.withLease(NS, 'k', fn3)).toBe('third');
	});

	it('should abort the signal after fn settles', async () => {
		let captured!: AbortSignal;
		await service.withLease(NS, 'k', async (signal) => {
			captured = signal;
			expect(signal.aborted).toBe(false);
			await Promise.resolve();
		});
		expect(captured.aborted).toBe(true);
	});
});
