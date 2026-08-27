import type { McpRegistryConnection } from 'n8n-workflow';

import {
	prepareMcpRegistryConnection,
	resolveMcpRegistryConnection,
} from '../mcp-registry-connection';
import { notionMockServer } from '../registry/mock-servers';

const connection: McpRegistryConnection = {
	nodeTypeName: '@n8n/mcp-registry.example',
	credentialType: 'exampleMcpOAuth2Api',
	endpointUrl: 'https://example.com/mcp',
	endpointHostname: 'example.com',
	transport: 'httpStreamable',
};

describe('resolveMcpRegistryConnection', () => {
	it('resolves http remotes and remotes that include userinfo', () => {
		const result = resolveMcpRegistryConnection({
			...notionMockServer,
			remotes: [{ type: 'streamable-http', url: 'http://user:pass@localhost:8080/mcp' }],
		});

		expect(result).toMatchObject({
			nodeTypeName: '@n8n/mcp-registry.notion',
			endpointUrl: 'http://user:pass@localhost:8080/mcp',
			endpointHostname: 'localhost',
			transport: 'httpStreamable',
		});
	});

	it('returns null when the remote URL is invalid', () => {
		expect(
			resolveMcpRegistryConnection({
				...notionMockServer,
				remotes: [{ type: 'streamable-http', url: 'not a url' }],
			}),
		).toBeNull();
	});
});

describe('prepareMcpRegistryConnection', () => {
	it('rejects an empty access token', () => {
		const result = prepareMcpRegistryConnection({
			connection,
			credentialData: { oauthTokenData: { access_token: '' } },
		});

		expect(result).toEqual({
			ok: false,
			error: {
				code: 'missing_access_token',
				message: 'Credential type "exampleMcpOAuth2Api" does not contain an OAuth2 access token',
			},
		});
	});

	it('uses already refreshed headers instead of stale credential data', () => {
		const result = prepareMcpRegistryConnection({
			connection,
			credentialData: { oauthTokenData: { access_token: 'stale-token' } },
			headers: { Authorization: 'Bearer refreshed-token' },
		});

		expect(result).toEqual({
			ok: true,
			value: {
				...connection,
				headers: { Authorization: 'Bearer refreshed-token' },
				allowedDomains: 'example.com',
			},
		});
	});
});
