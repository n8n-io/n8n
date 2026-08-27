import {
	prepareMcpRegistryConnection,
	resolveMcpRegistryConnection,
} from '../mcp-registry-connection';
import { notionMockServer } from '../registry/mock-servers';

describe('MCP registry connection', () => {
	it('normalizes the preferred remote and generated identities', () => {
		expect(resolveMcpRegistryConnection(notionMockServer)).toEqual({
			nodeTypeName: '@n8n/mcp-registry.notion',
			credentialType: 'notionMcpOAuth2Api',
			endpointUrl: 'https://mcp.notion.com/mcp',
			endpointHostname: 'mcp.notion.com',
			transport: 'httpStreamable',
		});
	});

	it.each(['http://mcp.notion.com/mcp', 'https://user:password@mcp.notion.com/mcp', 'not a URL'])(
		'rejects unsafe authenticated endpoint %s',
		(url) => {
			expect(
				resolveMcpRegistryConnection({
					...notionMockServer,
					remotes: [{ type: 'streamable-http', url }],
				}),
			).toBeNull();
		},
	);

	it('prepares the canonical endpoint and hostname regardless of credential domain settings', () => {
		const connection = resolveMcpRegistryConnection(notionMockServer);
		expect(connection).not.toBeNull();
		if (!connection) return;

		expect(
			prepareMcpRegistryConnection({
				connection,
				credentialData: {
					oauthTokenData: { access_token: 'secret' },
					allowedHttpRequestDomains: 'all',
					allowedDomains: 'other.example',
				},
			}),
		).toEqual({
			ok: true,
			value: {
				...connection,
				headers: { authorization: 'Bearer secret' },
				allowedDomains: 'mcp.notion.com',
			},
		});
	});

	it('rejects credentials without an access token', () => {
		const connection = resolveMcpRegistryConnection(notionMockServer);
		expect(connection).not.toBeNull();
		if (!connection) return;

		expect(prepareMcpRegistryConnection({ connection, credentialData: {} })).toMatchObject({
			ok: false,
			error: { code: 'missing_access_token' },
		});
	});
});
