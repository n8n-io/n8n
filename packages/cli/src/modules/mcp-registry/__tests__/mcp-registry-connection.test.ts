import type { McpOAuth2CredentialType, McpRegistryConnection } from 'n8n-workflow';

import {
	mergeMcpRegistryConnections,
	prepareMcpRegistryConnection,
	resolveMcpRegistryConnection,
} from '../mcp-registry-connection';
import { databricksGenieTemplatedMockServer, notionMockServer } from '../registry/mock-servers';

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

	it('carries the row attribution onto the resolved connection', () => {
		expect(resolveMcpRegistryConnection(databricksGenieTemplatedMockServer)).toMatchObject({
			isTemplated: true,
			attribution: 'Powered by Genie',
		});
	});

	it('leaves attribution unset for a row that declares none', () => {
		expect(resolveMcpRegistryConnection(notionMockServer)?.attribution).toBeUndefined();
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

	it('routes to the selected binding own endpoint, not the connection default', () => {
		const mergedConnection: McpRegistryConnection = {
			...connection,
			credentialBindings: [
				{ credentialType, selector: 'oAuth2' },
				{
					credentialType: 'exampleMcpGatewayApi',
					selector: 'gateway',
					endpointUrl: 'https://gateway.n8n.io/v1/gateway/mcp/example',
					endpointHostname: 'gateway.n8n.io',
					transport: 'httpStreamable',
					headers: { 'User-Agent': 'gateway' },
				},
			],
		};

		const result = prepareMcpRegistryConnection({
			connection: mergedConnection,
			credentialType: 'exampleMcpGatewayApi',
			credentialData: { token: 'gateway-token' },
			headers: { Authorization: 'Bearer gateway-token' },
		});

		expect(result).toMatchObject({
			ok: true,
			value: {
				endpointUrl: 'https://gateway.n8n.io/v1/gateway/mcp/example',
				allowedDomains: 'gateway.n8n.io',
				headers: { 'User-Agent': 'gateway', Authorization: 'Bearer gateway-token' },
			},
		});
	});
});

describe('mergeMcpRegistryConnections', () => {
	it('concatenates bindings and pins each to its own endpoint', () => {
		const other: McpRegistryConnection = {
			nodeTypeName: '@n8n/mcp-registry.example',
			endpointUrl: 'https://gateway.n8n.io/v1/gateway/mcp/example',
			endpointHostname: 'gateway.n8n.io',
			transport: 'httpStreamable',
			credentialBindings: [{ credentialType: 'exampleMcpGatewayApi', selector: 'gateway' }],
			isTemplated: false,
		};

		const merged = mergeMcpRegistryConnections([connection, other]);

		expect(merged?.credentialBindings).toEqual([
			{
				credentialType,
				selector: 'oAuth2',
				endpointUrl: 'https://example.com/mcp',
				endpointHostname: 'example.com',
				transport: 'httpStreamable',
			},
			{
				credentialType: 'exampleMcpGatewayApi',
				selector: 'gateway',
				endpointUrl: 'https://gateway.n8n.io/v1/gateway/mcp/example',
				endpointHostname: 'gateway.n8n.io',
				transport: 'httpStreamable',
			},
		]);
	});

	it('returns null when a row is templated or fewer than two resolve', () => {
		expect(mergeMcpRegistryConnections([connection])).toBeNull();
		expect(mergeMcpRegistryConnections([connection, templatedConnection])).toBeNull();
	});

	it('carries each row own headers and attribution onto its binding', () => {
		const official: McpRegistryConnection = {
			...connection,
			headers: { 'User-Agent': 'official' },
			attribution: 'Official credit',
		};
		const gateway: McpRegistryConnection = {
			nodeTypeName: '@n8n/mcp-registry.example',
			endpointUrl: 'https://gateway.n8n.io/v1/gateway/mcp/example',
			endpointHostname: 'gateway.n8n.io',
			transport: 'httpStreamable',
			credentialBindings: [{ credentialType: 'exampleMcpGatewayApi', selector: 'gateway' }],
			isTemplated: false,
			headers: { 'User-Agent': 'gateway' },
			attribution: 'Gateway credit',
		};

		const merged = mergeMcpRegistryConnections([official, gateway]);

		expect(merged?.credentialBindings).toEqual([
			expect.objectContaining({
				credentialType,
				headers: { 'User-Agent': 'official' },
				attribution: 'Official credit',
			}),
			expect.objectContaining({
				credentialType: 'exampleMcpGatewayApi',
				headers: { 'User-Agent': 'gateway' },
				attribution: 'Gateway credit',
			}),
		]);
	});

	it('does not leak the first row headers or attribution onto a row that has none', () => {
		const official: McpRegistryConnection = {
			...connection,
			headers: { 'User-Agent': 'official' },
			attribution: 'Official credit',
		};
		const gateway: McpRegistryConnection = {
			nodeTypeName: '@n8n/mcp-registry.example',
			endpointUrl: 'https://gateway.n8n.io/v1/gateway/mcp/example',
			endpointHostname: 'gateway.n8n.io',
			transport: 'httpStreamable',
			credentialBindings: [{ credentialType: 'exampleMcpGatewayApi', selector: 'gateway' }],
			isTemplated: false,
		};

		const merged = mergeMcpRegistryConnections([official, gateway]);

		// Dropped at the connection level: no fallback source for a bare binding.
		expect(merged?.headers).toBeUndefined();
		expect(merged?.attribution).toBeUndefined();
		const gatewayBinding = merged?.credentialBindings.find(
			(binding) => binding.credentialType === 'exampleMcpGatewayApi',
		);
		expect(gatewayBinding?.headers).toBeUndefined();
		expect(gatewayBinding?.attribution).toBeUndefined();

		// Selecting the bare binding yields only the credential headers, exactly.
		const prepared = prepareMcpRegistryConnection({
			connection: merged as McpRegistryConnection,
			credentialType: 'exampleMcpGatewayApi',
			credentialData: { token: 'gateway-token' },
			headers: { Authorization: 'Bearer gateway-token' },
		});
		expect(prepared).toEqual({
			ok: true,
			value: {
				nodeTypeName: '@n8n/mcp-registry.example',
				credentialType: 'exampleMcpGatewayApi',
				transport: 'httpStreamable',
				endpointUrl: 'https://gateway.n8n.io/v1/gateway/mcp/example',
				headers: { Authorization: 'Bearer gateway-token' },
				allowedDomains: 'gateway.n8n.io',
			},
		});
	});
});
