import nock from 'nock';

import { getDefaultN8nOutboundUserAgent } from '../outbound-user-agent';
import { httpRequest } from '../request-helper-functions';

/** Exercises the full httpRequest → axios path for the default User-Agent. */
describe('Outbound User-Agent (httpRequest integration)', () => {
	const baseUrl = 'https://example.com';

	beforeEach(() => {
		nock.cleanAll();
	});

	afterEach(() => {
		nock.cleanAll();
	});

	it('sends RFC-style default User-Agent when none is provided', async () => {
		const scope = nock(baseUrl, {
			reqheaders: {
				'user-agent': getDefaultN8nOutboundUserAgent(),
			},
		})
			.get('/outbound-user-agent-integration')
			.reply(200, { success: true });

		await expect(
			httpRequest({ method: 'GET', url: `${baseUrl}/outbound-user-agent-integration` }),
		).resolves.toEqual({ success: true });

		scope.done();
	});
});
