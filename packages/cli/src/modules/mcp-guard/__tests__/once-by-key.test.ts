import { describe, expect, it, vi } from 'vitest';

import { OnceByKey } from '../once-by-key';

describe('OnceByKey', () => {
	it('lets concurrent calls with one key share one job', async () => {
		const once = new OnceByKey();
		let release!: (ok: boolean) => void;
		const job = vi.fn(async () => await new Promise<boolean>((resolve) => (release = resolve)));

		const first = once.run('k', job);
		const second = once.run('k', job);
		release(true);
		await Promise.all([first, second]);

		expect(job).toHaveBeenCalledTimes(1);
	});

	it('does not run a job again after it returned true', async () => {
		const once = new OnceByKey();
		const job = vi.fn(async () => true);

		await once.run('k', job);
		await once.run('k', job);

		expect(job).toHaveBeenCalledTimes(1);
	});

	it('runs the job again after it returned false', async () => {
		const once = new OnceByKey();
		const job = vi.fn(async () => false);

		await once.run('k', job);
		await once.run('k', job);

		expect(job).toHaveBeenCalledTimes(2);
	});

	it('runs the job again after it rejected, and the caller does not see the error', async () => {
		const once = new OnceByKey();
		const job = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(true);

		await expect(once.run('k', job)).resolves.toBeUndefined();
		await once.run('k', job);

		expect(job).toHaveBeenCalledTimes(2);
	});

	it('keeps keys apart', async () => {
		const once = new OnceByKey();
		const job = vi.fn(async () => true);

		await once.run('a', job);
		await once.run('b', job);

		expect(job).toHaveBeenCalledTimes(2);
	});
});
