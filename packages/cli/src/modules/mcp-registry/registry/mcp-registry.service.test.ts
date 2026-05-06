import { McpRegistryService } from './mcp-registry.service';
import type { McpRegistryServer } from './mcp-registry.types';
import { linearMockServer, notionMockServer } from './mock-servers';

describe('McpRegistryService', () => {
	let service: McpRegistryService;

	beforeEach(() => {
		service = new McpRegistryService();
	});

	function seedDeprecated(slug: string): McpRegistryServer {
		const deprecated: McpRegistryServer = { ...notionMockServer, slug, status: 'deprecated' };
		(service as unknown as { servers: Map<string, McpRegistryServer> }).servers.set(
			slug,
			deprecated,
		);
		return deprecated;
	}

	describe('getAll', () => {
		it('returns active servers by default', () => {
			expect(service.getAll()).toEqual([notionMockServer, linearMockServer]);
		});

		it('omits deprecated servers by default', () => {
			seedDeprecated('old');

			expect(service.getAll()).toEqual([notionMockServer, linearMockServer]);
		});

		it('returns deprecated servers when includeDeprecated is true', () => {
			const deprecated = seedDeprecated('old');

			expect(service.getAll({ includeDeprecated: true })).toEqual([
				notionMockServer,
				linearMockServer,
				deprecated,
			]);
		});
	});

	describe('get', () => {
		it('returns the matching server by slug', () => {
			expect(service.get('notion')).toEqual(notionMockServer);
		});

		it('returns undefined when the slug is not registered', () => {
			expect(service.get('does-not-exist')).toBeUndefined();
		});
	});
});
