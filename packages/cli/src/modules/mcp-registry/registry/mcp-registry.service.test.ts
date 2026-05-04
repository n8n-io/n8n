import { McpRegistryService } from './mcp-registry.service';
import { notionMockServer } from './notion-mock-server';

describe('McpRegistryService', () => {
	let service: McpRegistryService;

	beforeEach(() => {
		service = new McpRegistryService();
	});

	describe('getAll', () => {
		it('returns every configured server', () => {
			expect(service.getAll()).toEqual([notionMockServer]);
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
