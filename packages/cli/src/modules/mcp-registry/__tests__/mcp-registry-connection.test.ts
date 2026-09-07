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
	isTemplated: false,
};

const templatedConnection: McpRegistryConnection = {
	nodeTypeName: '@n8n/mcp-registry.example',
	urlTemplate: '={{$self["host"]}}/api/2.0/mcp/genie',
	transport: 'httpStreamable',
	credentialBindings: [{ credentialType, selector: 'oAuth2' }],
	isTemplated: true,
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

	it('resolves a templated remote without parsing it as a URL', () => {
		const result = resolveMcpRegistryConnection({
			...notionMockServer,
			remotes: [{ type: 'streamable-http-templated', url: '={{$self["host"]}}/api/2.0/mcp/genie' }],
		});

		expect(result).toEqual({
			nodeTypeName: '@n8n/mcp-registry.notion',
			urlTemplate: '={{$self["host"]}}/api/2.0/mcp/genie',
			transport: 'httpStreamable',
			credentialBindings: [
				{ credentialType: 'notionMcpOAuth2Api', selector: 'oAuth2' },
			],
			isTemplated: true,
		});
	});

	it('prefers a templated streamable-http remote over sse', () => {
		const result = resolveMcpRegistryConnection({
			...notionMockServer,
			remotes: [
				{ type: 'sse', url: 'https://mcp.notion.com/sse' },
				{ type: 'streamable-http-templated', url: '={{$self["host"]}}/mcp' },
			],
		});

		expect(result).toMatchObject({ isTemplated: true, urlTemplate: '={{$self["host"]}}/mcp' });
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
				nodeTypeName: connection.nodeTypeName,
				credentialType,
				transport: connection.transport,
				endpointUrl: 'https://example.com/mcp',
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
				nodeTypeName: declarativeConnection.nodeTypeName,
				credentialType: 'exampleApi',
				transport: declarativeConnection.transport,
				endpointUrl: 'https://example.com/mcp',
				headers: { Authorization: 'Bearer secret', 'X-Source': 'n8n' },
				query: { api_key: 'secret' },
				allowedDomains: 'example.com',
			},
		});
	});

	it('resolves a templated connection and pins the domain to the resolved host', async () => {
		const result = await prepareMcpRegistryConnection(
			{
				connection: templatedConnection,
				credentialType,
				credentialData: {
					oauthTokenData: { access_token: 'token' },
					serverUrl: 'https://acme.cloud.databricks.com/api/2.0/mcp/genie',
					// Deliberately disagrees with serverUrl: the pin follows the URL
					// actually called, never a separate field that can drift from it.
					allowedDomains: 'attacker.test',
				},
			},
			credentialsHelper,
		);

		expect(result).toEqual({
			ok: true,
			value: {
				nodeTypeName: templatedConnection.nodeTypeName,
				credentialType,
				transport: templatedConnection.transport,
				headers: { Authorization: 'Bearer token' },
				endpointUrl: 'https://acme.cloud.databricks.com/api/2.0/mcp/genie',
				allowedDomains: 'acme.cloud.databricks.com',
			},
		});
	});

	it.each([
		['an unresolved template', '={{$self["host"]}}/api/2.0/mcp/genie'],
		['a non-URL string', 'not-a-url'],
		['a non-HTTP scheme', 'file:///etc/passwd'],
	])('rejects a templated connection whose serverUrl is %s', async (_label, serverUrl) => {
		const result = await prepareMcpRegistryConnection(
			{
				connection: templatedConnection,
				credentialType,
				credentialData: { oauthTokenData: { access_token: 'token' }, serverUrl },
			},
			credentialsHelper,
		);

		expect(result).toEqual({
			ok: false,
			error: {
				code: 'unresolved_server_url',
				message: 'Credential type "exampleMcpOAuth2Api" did not resolve a server URL',
			},
		});
	});

	it('rejects a templated connection when the credential has no resolved serverUrl', async () => {
		const result = await prepareMcpRegistryConnection(
			{
				connection: templatedConnection,
				credentialType,
				credentialData: { oauthTokenData: { access_token: 'token' } },
			},
			credentialsHelper,
		);

		expect(result).toEqual({
			ok: false,
			error: {
				code: 'unresolved_server_url',
				message: 'Credential type "exampleMcpOAuth2Api" did not resolve a server URL',
			},
		});
	});
});
