import type { McpOAuth2CredentialType, McpRegistryConnection } from 'n8n-workflow';

import {
	prepareMcpRegistryConnection,
	resolveMcpRegistryConnection,
} from '../mcp-registry-connection';
import { notionMockServer } from '../registry/mock-servers';

const credentialType: McpOAuth2CredentialType = 'exampleMcpOAuth2Api';

const connection: McpRegistryConnection = {
	nodeTypeName: '@n8n/mcp-registry.example',
	endpointUrl: 'https://example.com/mcp',
	endpointHostname: 'example.com',
	transport: 'httpStreamable',
	credentialBindings: [{ credentialType, selector: 'oAuth2' }],
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
			credentialType,
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

	it('rejects a credential type the server does not bind', () => {
		const result = prepareMcpRegistryConnection({
			connection,
			credentialType: 'otherMcpOAuth2Api',
			credentialData: { oauthTokenData: { access_token: 'token' } },
		});

		expect(result).toEqual({
			ok: false,
			error: {
				code: 'unsupported_credential',
				message: 'Credential type "otherMcpOAuth2Api" is not supported by this MCP registry server',
			},
		});
	});

	it('uses already refreshed headers instead of stale credential data', () => {
		const result = prepareMcpRegistryConnection({
			connection,
			credentialType,
			credentialData: { oauthTokenData: { access_token: 'stale-token' } },
			headers: { Authorization: 'Bearer refreshed-token' },
		});

		expect(result).toEqual({
			ok: true,
			value: {
				...connection,
				credentialType,
				headers: { Authorization: 'Bearer refreshed-token' },
				allowedDomains: 'example.com',
			},
		});
	});

	it('uses the access token selected by credential OAuth2 options', () => {
		const result = prepareMcpRegistryConnection({
			connection,
			credentialType,
			credentialData: {
				oauthTokenData: {
					access_token: 'bot-token',
					authed_user: { access_token: 'user-token' },
				},
			},
			oauth2: {
				tokenType: 'Bearer',
				property: 'authed_user.access_token',
			},
		});

		expect(result).toMatchObject({
			ok: true,
			value: {
				headers: { Authorization: 'Bearer user-token' },
			},
		});
	});

	it('includes the access token under the configured additional header', () => {
		const result = prepareMcpRegistryConnection({
			connection,
			credentialType,
			credentialData: { oauthTokenData: { access_token: 'token' } },
			oauth2: { keyToIncludeInAccessTokenHeader: 'X-Access-Token' },
		});

		expect(result).toMatchObject({
			ok: true,
			value: {
				headers: {
					Authorization: 'Bearer token',
					'X-Access-Token': 'token',
				},
			},
		});
	});
});
