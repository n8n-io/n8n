import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import type { PromotionEnvironmentLockService } from '../../promotion-environment-lock.service';

/**
 * Holds the environment lock until the returned function is called.
 * Fails at once when the lock is not available, instead of waiting for the test timeout.
 */
export async function holdEnvironmentLock(
	environmentLock: PromotionEnvironmentLockService,
	environmentId: string,
) {
	const acquired = createDeferredPromise();
	const release = createDeferredPromise();
	const done = environmentLock.run(environmentId, async () => {
		acquired.resolve();
		await release.promise;
	});
	await Promise.race([acquired.promise, done]);
	return async () => {
		release.resolve();
		await done;
	};
}
