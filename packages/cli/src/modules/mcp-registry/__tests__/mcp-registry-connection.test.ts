import type {
	ICredentialsHelper,
	ICredentialTypes,
	McpOAuth2CredentialType,
	McpRegistryConnection,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import {
	isSupportedMcpRegistryCredentialType,
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
const credentialsHelper = mock<ICredentialsHelper>();

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

describe('isSupportedMcpRegistryCredentialType', () => {
	it('supports declarative header and query authentication', () => {
		const credentialTypes = mock<ICredentialTypes>();
		credentialTypes.recognizes.mockReturnValue(true);
		credentialTypes.getByName.mockReturnValue({
			name: 'exampleApi',
			displayName: 'Example API',
			properties: [],
			authenticate: {
				type: 'generic',
				properties: {
					headers: { Authorization: '=Bearer {{$credentials.apiKey}}' },
					qs: { api_key: '={{$credentials.apiKey}}' },
				},
			},
		});

		expect(isSupportedMcpRegistryCredentialType(credentialTypes, 'exampleApi')).toBe(true);
	});

	it('rejects pre-authentication and unsupported request sections', () => {
		const credentialTypes = mock<ICredentialTypes>();
		credentialTypes.recognizes.mockReturnValue(true);
		credentialTypes.getByName.mockReturnValue({
			name: 'exampleApi',
			displayName: 'Example API',
			properties: [],
			preAuthentication: async () => ({}),
			authenticate: {
				type: 'generic',
				properties: { body: { api_key: '={{$credentials.apiKey}}' } },
			},
		});

		expect(isSupportedMcpRegistryCredentialType(credentialTypes, 'exampleApi')).toBe(false);
	});
});

describe('prepareMcpRegistryConnection', () => {
	it('rejects an empty access token', async () => {
		const result = await prepareMcpRegistryConnection(
			{
				connection,
				credentialType,
				credentialData: { oauthTokenData: { access_token: '' } },
			},
			credentialsHelper,
		);

		expect(result).toEqual({
			ok: false,
			error: {
				code: 'missing_access_token',
				message: 'Credential type "exampleMcpOAuth2Api" does not contain an OAuth2 access token',
			},
		});
	});

	it('rejects a credential type the server does not bind', async () => {
		const result = await prepareMcpRegistryConnection(
			{
				connection,
				credentialType: 'otherMcpOAuth2Api',
				credentialData: { oauthTokenData: { access_token: 'token' } },
			},
			credentialsHelper,
		);

		expect(result).toEqual({
			ok: false,
			error: {
				code: 'unsupported_credential',
				message: 'Credential type "otherMcpOAuth2Api" is not supported by this MCP registry server',
			},
		});
	});

	it('uses already refreshed headers instead of stale credential data', async () => {
		const result = await prepareMcpRegistryConnection(
			{
				connection,
				credentialType,
				credentialData: { oauthTokenData: { access_token: 'stale-token' } },
				headers: { Authorization: 'Bearer refreshed-token' },
			},
			credentialsHelper,
		);

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

	it('returns declarative headers and query parameters', async () => {
		const declarativeConnection: McpRegistryConnection = {
			...connection,
			credentialBindings: [{ credentialType: 'exampleApi', selector: 'apiKey' }],
		};
		credentialsHelper.authenticate.mockResolvedValue({
			url: connection.endpointUrl,
			headers: { Authorization: 'Bearer secret', 'X-Source': 'n8n' },
			qs: { api_key: 'secret' },
		});

		const result = await prepareMcpRegistryConnection(
			{
				connection: declarativeConnection,
				credentialType: 'exampleApi',
				credentialData: { apiKey: 'secret' },
			},
			credentialsHelper,
		);

		expect(result).toEqual({
			ok: true,
			value: {
				...declarativeConnection,
				credentialType: 'exampleApi',
				headers: { Authorization: 'Bearer secret', 'X-Source': 'n8n' },
				query: { api_key: 'secret' },
				allowedDomains: 'example.com',
			},
		});
	});
});
