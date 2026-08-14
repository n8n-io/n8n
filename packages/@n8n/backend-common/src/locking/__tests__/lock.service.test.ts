import { mock } from 'vitest-mock-extended';

import { InProcessLockService } from '../in-process-lock.service';
import type { ILockService } from '../lock-service.interface';
import { LockNamespace } from '../lock-service.interface';
import { LockService } from '../lock.service';

const NS = LockNamespace.CREDENTIALS;

describe('LockService', () => {
	it('defaults to the in-process provider and serializes same-key calls', async () => {
		const service = new LockService(new InProcessLockService());

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
		const p2 = service.withLease(NS, 'k', fn2);

		await new Promise((r) => setImmediate(r));
		expect(fn1).toHaveBeenCalled();
		expect(fn2).not.toHaveBeenCalled();

		resolveFirst();
		expect(await Promise.all([p1, p2])).toEqual(['first', 'second']);
	});

	it('forwards withLease to the active provider after setProvider', async () => {
		const service = new LockService(new InProcessLockService());
		const provider = mock<ILockService>();
		provider.withLease.mockResolvedValue('from-provider');
		service.setProvider(provider);

		const fn = vi.fn();
		const options = { waitTimeoutMs: 10, leaseTtlMs: 20 };
		const result = await service.withLease(NS, 'k', fn, options);

		expect(result).toBe('from-provider');
		expect(provider.withLease).toHaveBeenCalledWith(NS, 'k', fn, options);
	});
});
