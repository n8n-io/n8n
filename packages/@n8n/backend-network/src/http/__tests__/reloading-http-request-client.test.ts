import { UnexpectedError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { HttpRequestClient } from '../outbound-http';
import { ReloadingHttpRequestClient } from '../reloading-http-request-client';

describe('ReloadingHttpRequestClient', () => {
	let built: HttpRequestClient[];
	let client: ReloadingHttpRequestClient;
	const unsubscribe = vi.fn();

	beforeEach(() => {
		built = [];
		unsubscribe.mockReset();
		client = new ReloadingHttpRequestClient(
			() => {
				const next = mock<HttpRequestClient>();
				next.request.mockResolvedValue(`from client ${built.length}`);
				built.push(next);
				return next;
			},
			() => unsubscribe,
		);
	});

	it('sends requests through the newest client', async () => {
		await expect(client.request({ url: '/a' })).resolves.toBe('from client 0');

		client.reload();

		await expect(client.request({ url: '/b' })).resolves.toBe('from client 1');
		expect(built[0].request).toHaveBeenCalledExactlyOnceWith({ url: '/a' });
		expect(built[1].request).toHaveBeenCalledExactlyOnceWith({ url: '/b' });
	});

	it('closes the old client on reload when it has no running request', () => {
		client.reload();

		expect(built[0].close).toHaveBeenCalledOnce();
		expect(built[1].close).not.toHaveBeenCalled();
	});

	it('closes the old client only after its running requests finish', async () => {
		let finish!: (value: string) => void;
		vi.mocked(built[0].request).mockReturnValueOnce(
			new Promise((resolve) => {
				finish = resolve;
			}),
		);
		const running = client.request({ url: '/slow' });

		client.reload();
		expect(built[0].close).not.toHaveBeenCalled();

		finish('slow done');
		await expect(running).resolves.toBe('slow done');
		expect(built[0].close).toHaveBeenCalledOnce();
	});

	it('closes the old client after a running request fails', async () => {
		vi.mocked(built[0].request).mockRejectedValueOnce(new Error('connection reset'));
		const running = client.request({ url: '/fails' });

		client.reload();

		await expect(running).rejects.toThrow('connection reset');
		expect(built[0].close).toHaveBeenCalledOnce();
	});

	it('closes the old clients that still run requests when closed', () => {
		vi.mocked(built[0].request).mockReturnValueOnce(new Promise(() => {}));
		void client.request({ url: '/never-settles' });
		client.reload();

		client.close();

		expect(built[0].close).toHaveBeenCalledOnce();
		expect(built[1].close).toHaveBeenCalledOnce();
	});

	it('refuses legacy requests, which it cannot track', async () => {
		const asClient: HttpRequestClient = client;

		// oxlint-disable-next-line typescript/no-deprecated
		await expect(asClient.requestLegacy({ url: '/a' })).rejects.toThrow(UnexpectedError);
		// oxlint-disable-next-line typescript/no-deprecated
		expect(built[0].requestLegacy).not.toHaveBeenCalled();
	});

	it('closes the current client when closed', () => {
		client.reload();
		client.close();

		expect(built[1].close).toHaveBeenCalledOnce();
		expect(unsubscribe).toHaveBeenCalledOnce();
	});
});
