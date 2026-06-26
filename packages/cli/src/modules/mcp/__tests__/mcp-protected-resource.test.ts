import { mock } from 'vitest-mock-extended';

import type { McpSettingsService } from '../mcp.settings.service';
import type { UrlService } from '@/services/url.service';

import { McpProtectedResource } from '../mcp-protected-resource';

describe('McpProtectedResource', () => {
	const urlService = mock<UrlService>();
	const mcpSettingsService = mock<McpSettingsService>();
	const resource = new McpProtectedResource(urlService, mcpSettingsService);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getResourceUrl', () => {
		it('should append the MCP resource path to the instance base URL', () => {
			urlService.getInstanceBaseUrl.mockReturnValue('https://n8n.example.com');
			expect(resource.getResourceUrl()).toBe('https://n8n.example.com/mcp-server/http');
		});

		it('should preserve a subpath in the base URL', () => {
			urlService.getInstanceBaseUrl.mockReturnValue('https://example.com/n8n');
			expect(resource.getResourceUrl()).toBe('https://example.com/n8n/mcp-server/http');
		});

		it('should strip a trailing slash from the base URL', () => {
			urlService.getInstanceBaseUrl.mockReturnValue('https://example.com/n8n/');
			expect(resource.getResourceUrl()).toBe('https://example.com/n8n/mcp-server/http');
		});
	});

	describe('getAudiences', () => {
		it('should accept the canonical resource URL and the legacy audience', () => {
			urlService.getInstanceBaseUrl.mockReturnValue('https://n8n.example.com');
			expect(resource.getAudiences()).toEqual([
				'https://n8n.example.com/mcp-server/http',
				'mcp-server-api',
			]);
		});
	});

	describe('getAllowedRedirectUris', () => {
		it('should delegate to the MCP settings service', async () => {
			mcpSettingsService.getAllowedRedirectUris.mockResolvedValue(['https://example.com/callback']);
			await expect(resource.getAllowedRedirectUris()).resolves.toEqual([
				'https://example.com/callback',
			]);
		});
	});

	it('should be the default audience for resource-less token requests', () => {
		expect(resource.isDefault).toBe(true);
	});
});
