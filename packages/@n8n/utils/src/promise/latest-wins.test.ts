import { createDeferredPromise } from './deferred-promise';
import { latestWins } from './latest-wins';

describe('latestWins', () => {
	it('shares one run between calls that arrive before it starts', async () => {
		const fn = vi.fn(async () => {});
		const run = latestWins(fn);

		await Promise.all([run(), run()]);

		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('waits for the running run, then shares one next run between the calls made during it', async () => {
		const firstRun = createDeferredPromise();
		const fn = vi.fn().mockReturnValueOnce(firstRun.promise).mockResolvedValue(undefined);
		const run = latestWins(fn);

		const first = run();
		await new Promise((resolve) => setImmediate(resolve));
		const second = run();
		const third = run();
		await new Promise((resolve) => setImmediate(resolve));

		expect(fn).toHaveBeenCalledTimes(1);

		firstRun.resolve();
		await Promise.all([first, second, third]);

		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('rejects the callers of a failed run and keeps running later calls', async () => {
		const fn = vi
			.fn<() => Promise<void>>()
			.mockRejectedValueOnce(new Error('failed'))
			.mockResolvedValueOnce(undefined);
		const run = latestWins(fn);

		await expect(run()).rejects.toThrow('failed');
		await expect(run()).resolves.toBeUndefined();
		expect(fn).toHaveBeenCalledTimes(2);
	});
});
