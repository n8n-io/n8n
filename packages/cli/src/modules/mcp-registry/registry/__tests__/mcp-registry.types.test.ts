import { AI_GATEWAY_MANAGED_AUTH_TYPE, parseMcpRegistryServer } from '../mcp-registry.types';
import { notionMockServer } from '../mock-servers';

describe('parseMcpRegistryServer', () => {
	it('accepts and keeps a Gateway credits row', () => {
		const row = {
			...notionMockServer,
			slug: 'n8n-connect-notion',
			authType: AI_GATEWAY_MANAGED_AUTH_TYPE,
		};

		expect(parseMcpRegistryServer(row)).toMatchObject({
			slug: 'n8n-connect-notion',
			authType: '__aiGatewayManaged',
		});
	});

	it('rejects an unknown auth type', () => {
		expect(parseMcpRegistryServer({ ...notionMockServer, authType: 'unknown' })).toBeNull();
	});
});
