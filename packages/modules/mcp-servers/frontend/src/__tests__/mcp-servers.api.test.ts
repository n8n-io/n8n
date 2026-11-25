import type { IRestApiContext } from '@n8n/rest-api-client';

import { getMcpServerPublicShare, getMcpServerShare } from '../mcp-servers.api';

const makeRestApiRequest = vi.hoisted(() => vi.fn());
vi.mock('@n8n/rest-api-client', async (importOriginal) => ({
	...(await importOriginal()),
	makeRestApiRequest,
}));

const context: IRestApiContext = { baseUrl: '/rest', pushRef: '' };

describe('share page requests', () => {
	it.each([
		[getMcpServerShare, '/mcp-servers/share/..%2F..%2Fsome-route'],
		[getMcpServerPublicShare, '/mcp-servers/share/..%2F..%2Fsome-route/public'],
	])('keeps the slug in one path segment', async (request, path) => {
		await request(context, '../../some-route');

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', path);
	});
});
