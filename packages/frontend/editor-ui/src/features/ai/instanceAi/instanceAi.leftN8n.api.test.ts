import { getBrowserId } from '@n8n/constants';
import type { IRestApiContext } from '@n8n/rest-api-client';

import { postLeftN8nWhileRunning } from './instanceAi.api';

describe('postLeftN8nWhileRunning', () => {
	const context = { baseUrl: 'http://localhost:5678/rest' } as IRestApiContext;
	const fetchMock = vi.fn();

	beforeEach(() => {
		fetchMock.mockReset().mockResolvedValue({ ok: true });
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => vi.unstubAllGlobals());

	it('sends an authenticated request that survives the tab closing', () => {
		postLeftN8nWhileRunning(context, 'thread-1');

		expect(fetchMock).toHaveBeenCalledWith(
			'http://localhost:5678/rest/assistant/telemetry/left-n8n',
			{
				method: 'POST',
				keepalive: true,
				credentials: 'include',
				headers: { 'browser-id': getBrowserId(), 'Content-Type': 'application/json' },
				body: JSON.stringify({ threadId: 'thread-1' }),
			},
		);
	});

	it('does not throw when the request fails', async () => {
		fetchMock.mockRejectedValue(new Error('network down'));

		expect(() => postLeftN8nWhileRunning(context, 'thread-1')).not.toThrow();
		await Promise.resolve();
	});
});
