import { mock } from 'vitest-mock-extended';

import { InProcessLockService } from '../in-process-lock.service';
import {
	LockAcquisitionTimeoutError,
	type ILockService,
	LockNamespace,
} from '../lock-service.interface';
import { LockService } from '../lock.service';
import { SingleFlightLease } from '../single-flight-lease';

describe('SingleFlightLease', () => {
	it('serializes same-key work across coordinators', async () => {
		const lockService = new LockService(new InProcessLockService());
		const firstCoordinator = new SingleFlightLease<string>();
		const secondCoordinator = new SingleFlightLease<string>();
		let finishFirst: (() => void) | undefined;
		const firstOperation = vi.fn(
			async () =>
				await new Promise<string>((resolve) => {
					finishFirst = () => resolve('first');
				}),
		);
		const secondOperation = vi.fn().mockResolvedValue('second');
		const options = { lockService, namespace: LockNamespace.CREDENTIALS };

		const first = firstCoordinator.run('credential', firstOperation, options);
		const second = secondCoordinator.run('credential', secondOperation, options);
		await new Promise((resolve) => setImmediate(resolve));

		expect(firstOperation).toHaveBeenCalledTimes(1);
		expect(secondOperation).not.toHaveBeenCalled();
		finishFirst?.();
		await expect(Promise.all([first, second])).resolves.toEqual(['first', 'second']);
	});

	it('does not run work when lease acquisition times out', async () => {
		const lockService = mock<ILockService>();
		const timeout = new LockAcquisitionTimeoutError('Timed out waiting for lock');
		lockService.withLease.mockRejectedValueOnce(timeout);
		const coordinator = new SingleFlightLease<string>();
		const operation = vi.fn().mockResolvedValue('result');

		await expect(
			coordinator.run('credential', operation, {
				lockService,
				namespace: LockNamespace.CREDENTIALS,
			}),
		).rejects.toBe(timeout);
		expect(operation).not.toHaveBeenCalled();

		lockService.withLease.mockImplementationOnce(
			async (_namespace, _key, fn) => await fn(new AbortController().signal),
		);
		await expect(
			coordinator.run('credential', operation, {
				lockService,
				namespace: LockNamespace.CREDENTIALS,
			}),
		).resolves.toBe('result');
	});
});
