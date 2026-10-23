import { createDeferredPromise } from './deferred-promise';
import { singleFlight } from './single-flight';

describe('singleFlight', () => {
	it('shares one call between concurrent callers', async () => {
		const deferred = createDeferredPromise<string>();
		const fn = vi.fn(async () => await deferred.promise);
		const shared = singleFlight(fn);

		const first = shared();
		const second = shared();
		deferred.resolve('value');

		await expect(Promise.all([first, second])).resolves.toEqual(['value', 'value']);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('calls again once the shared call has settled', async () => {
		const fn = vi.fn(async () => 'value');
		const shared = singleFlight(fn);

		await shared();
		await shared();

		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('rejects every concurrent caller, then calls again', async () => {
		const fn = vi
			.fn<() => Promise<string>>()
			.mockRejectedValueOnce(new Error('failed'))
			.mockResolvedValueOnce('value');
		const shared = singleFlight(fn);

		const results = await Promise.allSettled([shared(), shared()]);

		expect(results.map(({ status }) => status)).toEqual(['rejected', 'rejected']);
		await expect(shared()).resolves.toBe('value');
		expect(fn).toHaveBeenCalledTimes(2);
	});
});
