import type { LicenseState, ModuleRegistry } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { McpConfig } from '../mcp.config';
import type { McpSettingsService } from '../mcp.settings.service';
import type { UrlService } from '@/services/url.service';

import { McpProtectedResource } from '../mcp-protected-resource';

const makeGlobalConfig = ({ builderEnabled = true, tagsDisabled = false } = {}) =>
	({
		endpoints: { mcpBuilderEnabled: builderEnabled },
		tags: { disabled: tagsDisabled },
	}) as unknown as GlobalConfig;

describe('McpProtectedResource', () => {
	const urlService = mock<UrlService>();
	const mcpSettingsService = mock<McpSettingsService>();
	const mcpConfig = mock<McpConfig>();
	const moduleRegistry = mock<ModuleRegistry>();
	const licenseState = mock<LicenseState>();
	const resource = new McpProtectedResource(
		urlService,
		mcpSettingsService,
		mcpConfig,
		makeGlobalConfig(),
		moduleRegistry,
		licenseState,
	);

	beforeEach(() => {
		vi.clearAllMocks();
		mcpConfig.baseUrl = '';
		moduleRegistry.isActive.mockReturnValue(true);
		licenseState.isFoldersLicensed.mockReturnValue(true);
	});

	describe('getScopeTools', () => {
		it('should expose the full tool mapping when all features are enabled', () => {
			const scopeTools = resource.getScopeTools();

			expect(resource.scopes).toContain('agent:read');
			expect(resource.scopes).toContain('agent:write');
			expect(scopeTools['workflow:read']).toContain('search_workflows');
			expect(scopeTools['workflow:read']).toContain('search_nodes');
			expect(scopeTools['agent:read']).toContain('search_agents');
			expect(scopeTools['tag:read']).toContain('list_workflow_tags');
		});

		it('should drop tools this instance does not expose', () => {
			const limitedResource = new McpProtectedResource(
				urlService,
				mcpSettingsService,
				mcpConfig,
				makeGlobalConfig({ builderEnabled: false, tagsDisabled: true }),
				moduleRegistry,
				licenseState,
			);

			const scopeTools = limitedResource.getScopeTools();

			expect(limitedResource.scopes).not.toContain('agent:read');
			expect(limitedResource.scopes).not.toContain('agent:write');
			expect(scopeTools['workflow:read']).toContain('search_workflows');
			// builder-only tools are hidden when the builder is off
			expect(scopeTools['workflow:read']).not.toContain('search_nodes');
			expect(scopeTools['workflow:write']).not.toContain('create_workflow_from_code');
			expect(scopeTools['project:read']).toEqual([]);
			expect(scopeTools['agent:read']).toBeUndefined();
			expect(scopeTools['agent:write']).toBeUndefined();
			// list_workflow_tags is hidden when tags are disabled
			expect(scopeTools['tag:read']).toEqual([]);
		});

		it('should drop folder tools when folders are not licensed', () => {
			licenseState.isFoldersLicensed.mockReturnValue(false);

			const scopeTools = resource.getScopeTools();

			expect(scopeTools['project:write']).not.toContain('create_folder');
			expect(scopeTools['project:write']).not.toContain('update_folder');
			expect(scopeTools['workflow:write']).not.toContain('move_workflows_to_folder');
			expect(scopeTools['project:write']).not.toContain('search_folders');
			expect(scopeTools['project:read']).not.toContain('search_folders');
			expect(scopeTools['project:read']).toContain('search_projects');
		});

		it('should drop agent scopes and tools when the agents module is inactive', () => {
			moduleRegistry.isActive.mockReturnValue(false);

			expect(resource.scopes).not.toContain('agent:read');
			expect(resource.scopes).not.toContain('agent:write');
			expect(resource.getScopeTools()).not.toHaveProperty('agent:read');
			expect(resource.getScopeTools()).not.toHaveProperty('agent:write');
		});
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

	describe('getProtectedResourceMetadataUrl', () => {
		it('should insert the well-known prefix before the resource path (RFC 9728)', () => {
			urlService.getInstanceBaseUrl.mockReturnValue('https://n8n.example.com');
			expect(resource.getProtectedResourceMetadataUrl()).toBe(
				'https://n8n.example.com/.well-known/oauth-protected-resource/mcp-server/http',
			);
		});

		it('should preserve a subpath in the base URL', () => {
			urlService.getInstanceBaseUrl.mockReturnValue('https://example.com/n8n');
			expect(resource.getProtectedResourceMetadataUrl()).toBe(
				'https://example.com/.well-known/oauth-protected-resource/n8n/mcp-server/http',
			);
		});

		it('should derive from the configured MCP base URL when set', () => {
			urlService.getInstanceBaseUrl.mockReturnValue('https://n8n.example.com');
			mcpConfig.baseUrl = 'https://n8n-mcp.example.com';
			expect(resource.getProtectedResourceMetadataUrl()).toBe(
				'https://n8n-mcp.example.com/.well-known/oauth-protected-resource/mcp-server/http',
			);
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

	describe('isAvailable', () => {
		it.each([true, false])(
			'should follow the instance MCP access setting (%s)',
			async (enabled) => {
				mcpSettingsService.getEnabled.mockResolvedValue(enabled);

				await expect(resource.isAvailable()).resolves.toBe(enabled);
				await expect(resource.authorize(mock())).resolves.toBe(enabled);
			},
		);
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
