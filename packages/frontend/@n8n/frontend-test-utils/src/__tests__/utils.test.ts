import { retry } from '../utils';

describe('retry', () => {
	it('retries an async assertion that rejects before it passes', async () => {
		let attempts = 0;
		const assertion = async () => {
			attempts += 1;
			// A rejected promise is not a synchronous throw. Without an await inside the retry loop,
			// the first attempt would settle the whole call.
			if (attempts < 3) await Promise.reject(new Error('not yet'));
		};

		await retry(assertion, { interval: 1, timeout: 1000 });

		expect(attempts).toBe(3);
	});

	it('rejects with the last error once an async assertion runs out of time', async () => {
		await expect(
			retry(async () => await Promise.reject(new Error('never passes')), {
				interval: 1,
				timeout: 20,
			}),
		).rejects.toThrow('never passes');
	});

	it('still retries a synchronous assertion', async () => {
		let attempts = 0;

		await retry(
			() => {
				attempts += 1;
				if (attempts < 2) throw new Error('not yet');
			},
			{ interval: 1, timeout: 1000 },
		);

		expect(attempts).toBe(2);
	});
});
