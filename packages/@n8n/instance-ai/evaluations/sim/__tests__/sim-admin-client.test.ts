import { SimAdminClient } from '../sim-admin-client';
import type { SimService } from '../sim-admin-client';

const gmail: SimService = {
	slug: 'gmail',
	hosts: ['gmail.googleapis.com'],
	kinds: [],
	kindSchemas: [],
	credentialInfo: [],
	adminPrefix: '/_sim/v1',
};

describe('SimAdminClient.events', () => {
	afterEach(() => vi.unstubAllGlobals());

	it("reads the monitor's array of events with the tenant's admin token", async () => {
		const event = {
			seq: 3,
			ts: '2026-10-29T19:01:31.799624381Z',
			kind: 'request',
			request: { method: 'GET', path: '/gmail/v1/users/me/messages', status: 200 },
		};
		const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([event])));
		vi.stubGlobal('fetch', fetchMock);

		const events = await new SimAdminClient('http://sim:9193', 'harness').events(
			gmail,
			'ev-1-gmail',
			'tenant-token',
		);

		expect(events).toEqual([event]);
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('http://sim:9193/_sim/v1/tenants/ev-1-gmail/monitor?limit=10000');
		expect(init.headers).toMatchObject({ authorization: 'Bearer tenant-token' });
	});
});

describe('SimAdminClient.applyEvents', () => {
	afterEach(() => vi.unstubAllGlobals());

	it("posts the events to the tenant, each naming the service, with the tenant's admin token", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ applied: 1, results: [{}] })));
		vi.stubGlobal('fetch', fetchMock);

		await new SimAdminClient('http://sim:9193', 'harness').applyEvents(
			gmail,
			'ev-1-gmail',
			'tenant-token',
			[{ type: 'deliver_message', params: { to: 'mia@acme.test', subject: 'Hi' } }],
		);

		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('http://sim:9193/_sim/v1/tenants/ev-1-gmail/events');
		expect(init.method).toBe('POST');
		expect(JSON.parse(init.body as string)).toEqual([
			{ service: 'gmail', type: 'deliver_message', params: { to: 'mia@acme.test', subject: 'Hi' } },
		]);
		expect(init.headers).toMatchObject({ authorization: 'Bearer tenant-token' });
	});
});
