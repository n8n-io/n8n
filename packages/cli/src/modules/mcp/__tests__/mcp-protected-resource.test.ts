import { mock } from 'vitest-mock-extended';

import type { McpConfig } from '../mcp.config.js';
import type { McpSettingsService } from '../mcp.settings.service.js';
import type { UrlService } from '@/services/url.service.js';

import { McpProtectedResource } from '../mcp-protected-resource.js';

describe('McpProtectedResource', () => {
	const urlService = mock<UrlService>();
	const mcpSettingsService = mock<McpSettingsService>();
	const mcpConfig = mock<McpConfig>();
	const resource = new McpProtectedResource(urlService, mcpSettingsService, mcpConfig);

	beforeEach(() => {
		vi.clearAllMocks();
		mcpConfig.baseUrl = '';
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

	describe('with a dedicated MCP base URL (split-hostname deployments)', () => {
		beforeEach(() => {
			urlService.getInstanceBaseUrl.mockReturnValue('https://n8n.example.com');
			mcpConfig.baseUrl = 'https://n8n-mcp.example.com';
		});

		it('should use the configured base URL as the canonical resource', () => {
			expect(resource.getResourceUrl()).toBe('https://n8n-mcp.example.com/mcp-server/http');
		});

		it('should keep serving the instance-base-URL-derived resource', () => {
			expect(resource.getResourceUrls()).toEqual([
				'https://n8n-mcp.example.com/mcp-server/http',
				'https://n8n.example.com/mcp-server/http',
			]);
		});

		it('should accept audiences for both resource URLs plus the legacy audience', () => {
			expect(resource.getAudiences()).toEqual([
				'https://n8n-mcp.example.com/mcp-server/http',
				'https://n8n.example.com/mcp-server/http',
				'mcp-server-api',
			]);
		});

		it('should collapse to a single resource URL when unset', () => {
			mcpConfig.baseUrl = '';
			expect(resource.getResourceUrls()).toEqual(['https://n8n.example.com/mcp-server/http']);
		});
	});
});
