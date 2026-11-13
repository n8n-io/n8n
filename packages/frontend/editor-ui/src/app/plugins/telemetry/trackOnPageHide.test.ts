import { getBrowserId } from '@n8n/constants';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { trackOnPageHide } from './trackOnPageHide';

describe('trackOnPageHide', () => {
	const context = { baseUrl: 'http://localhost:5678/rest' } as IRestApiContext;
	const event = TELEMETRY_EVENT.INSTANCE_AI.USER_LEFT_N8N_WITH_ACTIVE_AI_ASSISTANT_RUN;
	const fetchMock = vi.fn();

	beforeEach(() => {
		fetchMock.mockReset().mockResolvedValue({ ok: true });
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => vi.unstubAllGlobals());

	it('sends an authenticated request that survives the page closing', () => {
		trackOnPageHide(context, event, { thread_id: 'thread-1', is_awaiting_user: false });

		expect(fetchMock).toHaveBeenCalledWith('http://localhost:5678/rest/telemetry/page-hide', {
			method: 'POST',
			keepalive: true,
			credentials: 'include',
			headers: { 'browser-id': getBrowserId(), 'Content-Type': 'application/json' },
			body: JSON.stringify({
				event: event.name,
				properties: { thread_id: 'thread-1', is_awaiting_user: false },
			}),
		});
	});

	it('does not throw when the request fails', async () => {
		fetchMock.mockRejectedValue(new Error('network down'));

		expect(() =>
			trackOnPageHide(context, event, { thread_id: 'thread-1', is_awaiting_user: false }),
		).not.toThrow();
		await Promise.resolve();
	});
});
