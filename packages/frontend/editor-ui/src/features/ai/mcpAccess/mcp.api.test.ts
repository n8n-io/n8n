import type { IRestApiContext } from '@n8n/rest-api-client';
import { getFullApiResponse } from '@n8n/rest-api-client';

import { fetchMcpAgents } from './mcp.api';

vi.mock('@n8n/rest-api-client', () => ({
	getFullApiResponse: vi.fn(),
	makeRestApiRequest: vi.fn(),
}));

describe('fetchMcpAgents', () => {
	const context = {} as IRestApiContext;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getFullApiResponse).mockResolvedValue({ count: 0, data: [] });
	});

	it('omits the filter for a whitespace-only query', async () => {
		await fetchMcpAgents(context, { take: 10, query: '   ' });

		expect(getFullApiResponse).toHaveBeenCalledWith(context, 'GET', '/mcp/agents', {
			take: 10,
		});
	});

	it('trims a non-empty query', async () => {
		await fetchMcpAgents(context, { query: ' sales ' });

		expect(getFullApiResponse).toHaveBeenCalledWith(context, 'GET', '/mcp/agents', {
			filter: JSON.stringify({ query: 'sales' }),
		});
	});

	it('serializes the MCP availability filter', async () => {
		await fetchMcpAgents(context, { availableInMCP: true });

		expect(getFullApiResponse).toHaveBeenCalledWith(context, 'GET', '/mcp/agents', {
			filter: JSON.stringify({ availableInMCP: true }),
		});
	});
});
