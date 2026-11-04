import { pairAiGatewayServers } from '../mcp-registry-ai-gateway';
import { toEntity, type McpRegistryServer } from '../mcp-registry.types';
import { firecrawlAiGatewayMockServer, firecrawlMockServer } from '../mock-servers';

const canLoad = () => true;

describe('pairAiGatewayServers', () => {
	it('pairs an active AI Gateway row with its active twin', () => {
		const [twin, aiGatewayRow] = pairAiGatewayServers(
			[firecrawlMockServer, firecrawlAiGatewayMockServer],
			canLoad,
		);

		expect(twin.aiGateway).toEqual({
			slug: 'n8n-connect-firecrawl',
			endpoint: {
				url: 'https://gateway.n8n.test/v1/gateway/mcp/firecrawl',
				hostname: 'gateway.n8n.test',
				transport: 'httpStreamable',
			},
		});
		expect(aiGatewayRow.pairedSlug).toBe('firecrawl');
		// The pair fields are derived when the server is read, so storage drops them.
		expect(toEntity(twin).data).not.toHaveProperty('aiGateway');
		expect(toEntity(aiGatewayRow).data).not.toHaveProperty('pairedSlug');
	});

	it.each<{ case: string; servers: McpRegistryServer[]; canLoadTwin: boolean }>([
		{
			case: 'the twin is deprecated',
			servers: [{ ...firecrawlMockServer, status: 'deprecated' }, firecrawlAiGatewayMockServer],
			canLoadTwin: true,
		},
		{
			case: 'the AI Gateway row is deprecated',
			servers: [firecrawlMockServer, { ...firecrawlAiGatewayMockServer, status: 'deprecated' }],
			canLoadTwin: true,
		},
		{
			case: 'the twin cannot load',
			servers: [firecrawlMockServer, firecrawlAiGatewayMockServer],
			canLoadTwin: false,
		},
		{
			case: 'the AI Gateway row has no usable remote',
			servers: [firecrawlMockServer, { ...firecrawlAiGatewayMockServer, remotes: [] }],
			canLoadTwin: true,
		},
		{
			case: 'the AI Gateway row has a templated remote',
			servers: [
				firecrawlMockServer,
				{
					...firecrawlAiGatewayMockServer,
					remotes: [{ type: 'streamable-http-templated', url: '={{$self["host"]}}/mcp' }],
				},
			],
			canLoadTwin: true,
		},
		{
			case: 'the twin is itself an AI Gateway row',
			servers: [
				{ ...firecrawlAiGatewayMockServer, slug: 'firecrawl' },
				firecrawlAiGatewayMockServer,
			],
			canLoadTwin: true,
		},
	])('does not pair when $case', ({ servers, canLoadTwin }) => {
		expect(pairAiGatewayServers(servers, () => canLoadTwin)).toEqual(servers);
	});
});
