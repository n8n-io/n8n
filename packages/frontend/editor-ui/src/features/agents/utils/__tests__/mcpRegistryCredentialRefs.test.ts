import { AI_GATEWAY_MANAGED_TAG, type McpRegistryServerResponse } from '@n8n/api-types';

import { toMcpRegistryCredentialRefs } from '../mcpRegistryCredentialRefs';

const oauth = { credentialType: 'firecrawlMcpOAuth2Api', name: 'OAuth2', value: 'oAuth2' };
const aiGateway = {
	credentialType: 'n8nConnectFirecrawlMcpAiGatewayApi',
	name: 'Gateway credits',
	value: 'aiGateway',
};
const nodeTypeName = '@n8n/mcp-registry.firecrawl';

function server(credentials: Array<typeof oauth>): McpRegistryServerResponse {
	return { slug: 'firecrawl', nodeTypeName, credentials } as McpRegistryServerResponse;
}

describe('toMcpRegistryCredentialRefs', () => {
	it.each([
		{
			case: 'puts Gateway credits first, with nothing selected',
			credentials: [oauth, aiGateway],
			selected: undefined,
			expected: [
				{ authType: aiGateway.credentialType, credentialId: undefined, aiGateway: true },
				{ authType: oauth.credentialType, credentialId: undefined },
			],
		},
		{
			case: 'selects Gateway credits for a registry entry with the Gateway credits marker',
			credentials: [oauth, aiGateway],
			selected: {
				authentication: 'none',
				credential: AI_GATEWAY_MANAGED_TAG,
				metadata: { nodeTypeName },
			},
			expected: [
				{
					authType: aiGateway.credentialType,
					credentialId: AI_GATEWAY_MANAGED_TAG,
					aiGateway: true,
				},
				{ authType: oauth.credentialType, credentialId: undefined },
			],
		},
		{
			case: 'selects the own credential of an OAuth2 entry',
			credentials: [oauth, aiGateway],
			selected: {
				authentication: oauth.credentialType,
				credential: 'credential-1',
				metadata: { nodeTypeName },
			},
			expected: [
				{ authType: aiGateway.credentialType, credentialId: undefined, aiGateway: true },
				{ authType: oauth.credentialType, credentialId: 'credential-1' },
			],
		},
		{
			case: 'adds no Gateway credits reference when the server does not offer them',
			credentials: [oauth],
			selected: undefined,
			expected: [{ authType: oauth.credentialType, credentialId: undefined }],
		},
	])('$case', ({ credentials, selected, expected }) => {
		const refs = toMcpRegistryCredentialRefs(
			server(credentials),
			selected as Parameters<typeof toMcpRegistryCredentialRefs>[1],
		);

		expect(refs).toEqual(expected.map((ref) => expect.objectContaining(ref)));
	});

	it('offers only Gateway credits for a gateway-only row', () => {
		expect(toMcpRegistryCredentialRefs(server([aiGateway]))).toEqual([
			{
				authType: aiGateway.credentialType,
				displayName: 'Gateway credits',
				credentialId: undefined,
				required: true,
				aiGateway: true,
			},
		]);
	});
});
