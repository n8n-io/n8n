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
	isTemplated: false,
};

const templatedConnection: McpRegistryConnection = {
	nodeTypeName: '@n8n/mcp-registry.example',
	credentialBindings: [{ credentialType, selector: 'oAuth2' }],
	urlTemplate: '={{$self["host"]}}/api/2.0/mcp/genie',
	transport: 'httpStreamable',
	isTemplated: true,
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

	it('resolves a templated remote without parsing it as a URL', () => {
		const result = resolveMcpRegistryConnection({
			...notionMockServer,
			remotes: [{ type: 'streamable-http-templated', url: '={{$self["host"]}}/api/2.0/mcp/genie' }],
		});

		expect(result).toEqual({
			nodeTypeName: '@n8n/mcp-registry.notion',
			credentialBindings: [
				{
					credentialType: 'notionMcpOAuth2Api',
					selector: 'oAuth2',
				},
			],
			urlTemplate: '={{$self["host"]}}/api/2.0/mcp/genie',
			transport: 'httpStreamable',
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
				nodeTypeName: connection.nodeTypeName,
				credentialType,
				transport: connection.transport,
				endpointUrl: 'https://example.com/mcp',
				headers: { Authorization: 'Bearer refreshed-token' },
				allowedDomains: 'example.com',
			},
		});
	});

	it('resolves a templated connection and pins the domain to the resolved host', () => {
		const result = prepareMcpRegistryConnection({
			connection: templatedConnection,
			credentialType,
			credentialData: {
				oauthTokenData: { access_token: 'token' },
				serverUrl: 'https://acme.cloud.databricks.com/api/2.0/mcp/genie',
				// Deliberately disagrees with serverUrl: the pin follows the URL
				// actually called, never a separate field that can drift from it.
				allowedDomains: 'attacker.test',
			},
		});

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
	])('rejects a templated connection whose serverUrl is %s', (_label, serverUrl) => {
		const result = prepareMcpRegistryConnection({
			connection: templatedConnection,
			credentialType,
			credentialData: { oauthTokenData: { access_token: 'token' }, serverUrl },
		});

		expect(result).toEqual({
			ok: false,
			error: {
				code: 'unresolved_server_url',
				message: 'Credential type "exampleMcpOAuth2Api" did not resolve a server URL',
			},
		});
	});

	it('rejects a templated connection when the credential has no resolved serverUrl', () => {
		const result = prepareMcpRegistryConnection({
			connection: templatedConnection,
			credentialType,
			credentialData: { oauthTokenData: { access_token: 'token' } },
		});

		expect(result).toEqual({
			ok: false,
			error: {
				code: 'unresolved_server_url',
				message: 'Credential type "exampleMcpOAuth2Api" did not resolve a server URL',
			},
		});
	});
});
