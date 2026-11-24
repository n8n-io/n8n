import { runWithRequestContext, withRequestSignal } from '../request-context';

describe('withRequestSignal', () => {
	it('aborts a request when the signal of the current request aborts', async () => {
		const base = vi.fn(
			async (_input: unknown, init?: RequestInit) =>
				await new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
				}),
		);
		const controller = new AbortController();

		const call = runWithRequestContext(
			{ origin: 'https://a.test', signal: controller.signal },
			() => withRequestSignal(base)('https://a.test/x'),
		);
		controller.abort();

		await expect(call).rejects.toThrow('aborted');
	});

	it('keeps the signal of the caller when the request has none', async () => {
		const base = vi.fn(async (_input: unknown, _init?: RequestInit) => new Response('ok'));
		const own = new AbortController().signal;

		await runWithRequestContext({ origin: 'https://a.test' }, () =>
			withRequestSignal(base)('https://a.test/x', { signal: own }),
		);

		expect(base.mock.calls[0][1]?.signal).toBe(own);
	});
});
