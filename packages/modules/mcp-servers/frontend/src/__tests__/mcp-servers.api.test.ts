import type { IRestApiContext } from '@n8n/rest-api-client';

import {
	draftTool,
	getMcpServerPublicShare,
	getMcpServerShare,
	getToolDetail,
} from '../mcp-servers.api';

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

describe('tool detail request', () => {
	it('requests GET /projects/:projectId/mcp-servers/:serverId/tools/:toolId', async () => {
		await getToolDetail(context, 'project-1', 'server-1', 'tool-1');

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'GET',
			'/projects/project-1/mcp-servers/server-1/tools/tool-1',
		);
	});
});

describe('tool draft request', () => {
	it('sends persist: false when requesting a modal preview draft', async () => {
		await draftTool(context, 'project-1', 'server-1', 'tool-1', 'toolName', { persist: false });

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'POST',
			'/projects/project-1/mcp-servers/server-1/tools/tool-1/draft',
			{ field: 'toolName', persist: false },
		);
	});
});
