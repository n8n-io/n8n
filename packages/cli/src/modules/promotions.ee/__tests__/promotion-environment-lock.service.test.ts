import { LockAcquisitionTimeoutError, LockNamespace, LockService } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { LockedError, ServiceUnavailableError } from '@n8n/errors';

import {
	PromotionEnvironmentLockService,
	PromotionLockLostError,
	promotionEnvironmentLockKey,
	throwIfLockLost,
} from '../promotion-environment-lock.service';

const ENVIRONMENT_ID = 'env-1';

/** Resolves once the holder runs, and keeps the lock until `release` is called. */
function holdLock(service: PromotionEnvironmentLockService, environmentId = ENVIRONMENT_ID) {
	let release!: () => void;
	let acquired!: () => void;
	const held = new Promise<void>((resolve) => (acquired = resolve));
	const done = service.run(environmentId, async () => {
		acquired();
		await new Promise<void>((resolve) => (release = resolve));
	});
	return { held, release: () => release(), done };
}

describe('PromotionEnvironmentLockService', () => {
	const service = new PromotionEnvironmentLockService(Container.get(LockService));

	it('builds the key from the environment ID', () => {
		expect(promotionEnvironmentLockKey(ENVIRONMENT_ID)).toBe('promotion-environment:env-1');
	});

	it('runs the operation with a signal and returns its result', async () => {
		const fn = vi.fn(async (signal: AbortSignal) => {
			expect(signal.aborted).toBe(false);
			return 'result';
		});

		await expect(service.run(ENVIRONMENT_ID, fn)).resolves.toBe('result');
		expect(fn).toHaveBeenCalledOnce();
	});

	it('fails at once with 423 and does not run the operation when the lock is held', async () => {
		const holder = holdLock(service);
		await holder.held;
		const fn = vi.fn(async () => 'second');

		const attempt = service.run(ENVIRONMENT_ID, fn);

		await expect(attempt).rejects.toThrow(LockedError);
		await expect(attempt).rejects.toThrow(
			'Another promotion operation is running for this environment. Try again when it finishes.',
		);
		expect(fn).not.toHaveBeenCalled();
		holder.release();
		await holder.done;
	});

	it('runs operations on other environments while one environment is locked', async () => {
		const holder = holdLock(service);
		await holder.held;

		await expect(service.run('env-2', async () => 'other')).resolves.toBe('other');
		holder.release();
		await holder.done;
	});

	it('runs again after the holder finishes', async () => {
		const holder = holdLock(service);
		await holder.held;
		holder.release();
		await holder.done;

		await expect(service.run(ENVIRONMENT_ID, async () => 'next')).resolves.toBe('next');
	});

	it('releases the lock when the operation throws', async () => {
		await expect(
			service.run(ENVIRONMENT_ID, async () => {
				throw new Error('failed');
			}),
		).rejects.toThrow('failed');

		await expect(service.run(ENVIRONMENT_ID, async () => 'next')).resolves.toBe('next');
	});

	it('takes the lease in the known-locks namespace without waiting', async () => {
		const lockService = mock<LockService>();
		lockService.withLease.mockImplementation(
			async (_ns, _key, fn) => await fn(new AbortController().signal),
		);

		await new PromotionEnvironmentLockService(lockService).run(ENVIRONMENT_ID, async () => 'ok');

		expect(lockService.withLease).toHaveBeenCalledWith(
			LockNamespace.KNOWN_LOCKS,
			promotionEnvironmentLockKey(ENVIRONMENT_ID),
			expect.any(Function),
			{ waitTimeoutMs: 0 },
		);
	});

	it('passes through an acquisition timeout that the operation itself throws', async () => {
		const inner = new LockAcquisitionTimeoutError('inner lock');

		await expect(
			service.run(ENVIRONMENT_ID, async () => {
				throw inner;
			}),
		).rejects.toBe(inner);
	});
});

describe('throwIfLockLost', () => {
	it('does nothing while the signal is not aborted', () => {
		expect(() => throwIfLockLost(new AbortController().signal)).not.toThrow();
	});

	it('throws a 503 lost-lock error when the signal is aborted', () => {
		const controller = new AbortController();
		controller.abort();

		let thrown: unknown;
		try {
			throwIfLockLost(controller.signal);
		} catch (error) {
			thrown = error;
		}

		expect(thrown).toBeInstanceOf(PromotionLockLostError);
		expect(thrown).toBeInstanceOf(ServiceUnavailableError);
		expect(thrown).toMatchObject({
			httpStatusCode: 503,
			message:
				'The promotion operation stopped because n8n lost its lock on this environment. Try again.',
		});
	});
});
