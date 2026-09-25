import { INSTANCE_ACTIVITY_CONTEXT_FLAG } from '@n8n/api-types';
import type { PostHogClient } from '@/posthog';
import type { LicenseState, ModuleRegistry } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { User } from '@n8n/db';
import * as permissions from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

vi.mock('@n8n/permissions', async (importOriginal) => ({
	...(await importOriginal<typeof permissions>()),
	hasGlobalScope: vi.fn(),
}));

const hasGlobalScope = vi.mocked(permissions.hasGlobalScope);

import type { McpConfig } from '../mcp.config';
import type { McpSettingsService } from '../mcp.settings.service';
import type { UrlService } from '@/services/url.service';

import { Container } from '@n8n/di';

import { CommunityPackagesConfig } from '@/modules/community-packages/community-packages.config';

import { ACTIVITY_LOG_TOOLS, INSTANCE_CONTEXT_TOOLS } from '../mcp-scopes';
import { McpProtectedResource } from '../mcp-protected-resource';

const makeGlobalConfig = ({ builderEnabled = true, managedByEnv = false } = {}) =>
	({
		endpoints: { mcpBuilderEnabled: builderEnabled },
		instanceSettingsLoader: { communityPackagesManagedByEnv: managedByEnv },
	}) as unknown as GlobalConfig;

describe('McpProtectedResource', () => {
	const urlService = mock<UrlService>();
	const mcpSettingsService = mock<McpSettingsService>();
	const mcpConfig = mock<McpConfig>();
	const moduleRegistry = mock<ModuleRegistry>();
	const licenseState = mock<LicenseState>();
	const postHogClient = mock<PostHogClient>();
	const resource = new McpProtectedResource(
		urlService,
		mcpSettingsService,
		mcpConfig,
		makeGlobalConfig(),
		moduleRegistry,
		licenseState,
		postHogClient,
	);

	beforeEach(() => {
		vi.clearAllMocks();
		postHogClient.getFeatureFlagForInstance.mockResolvedValue(true);
		mcpConfig.baseUrl = '';
		moduleRegistry.isActive.mockReturnValue(true);
		licenseState.isFoldersLicensed.mockReturnValue(true);
		Container.set(
			CommunityPackagesConfig,
			mock<CommunityPackagesConfig>({ enabled: true, verifiedEnabled: true }),
		);
	});

	describe('getScopeTools', () => {
		it('should expose the full tool mapping when all features are enabled', async () => {
			const scopeTools = await resource.getScopeTools();

			expect(resource.scopes).toContain('agent:read');
			expect(resource.scopes).toContain('agent:write');
			expect(scopeTools['workflow:read']).toContain('search_workflows');
			expect(scopeTools['workflow:read']).toContain('search_nodes');
			expect(scopeTools['agent:read']).toContain('search_agents');
			expect(scopeTools['tag:read']).toContain('list_workflow_tags');
		});

		/** Consent must not advertise a tool that `tools/list` will not carry. */
		it('advertises the instance-context tools while the module is active', async () => {
			moduleRegistry.isActive.mockReturnValue(true);

			const scopeTools = await resource.getScopeTools();

			for (const tool of INSTANCE_CONTEXT_TOOLS) {
				expect(scopeTools['workflow:read']).toContain(tool);
			}
		});

		it('keeps only node usage in consent when the module is inactive', async () => {
			moduleRegistry.isActive.mockImplementation((name) => name !== 'instance-ai');

			const scopeTools = await resource.getScopeTools();

			for (const tool of ACTIVITY_LOG_TOOLS) {
				expect(scopeTools['workflow:read']).not.toContain(tool);
			}
			expect(scopeTools['workflow:read']).toContain('get_node_usage');
			// Unrelated entries under the same scope are untouched.
			expect(scopeTools['workflow:read']).toContain('search_workflows');
		});

		it('withholds all context tools from consent when the instance flag is off', async () => {
			moduleRegistry.isActive.mockReturnValue(true);
			postHogClient.getFeatureFlagForInstance.mockResolvedValue(false);

			const scopeTools = await resource.getScopeTools();

			for (const tool of INSTANCE_CONTEXT_TOOLS) {
				expect(scopeTools['workflow:read']).not.toContain(tool);
			}
		});

		it('withholds all context tools when the instance flag cannot be read', async () => {
			postHogClient.getFeatureFlagForInstance.mockRejectedValue(new Error('Flag unavailable'));

			const scopeTools = await resource.getScopeTools();

			for (const tool of INSTANCE_CONTEXT_TOOLS) {
				expect(scopeTools['workflow:read']).not.toContain(tool);
			}
		});

		it('checks the activity flag without a user argument', async () => {
			await resource.getScopeTools();

			expect(postHogClient.getFeatureFlagForInstance).toHaveBeenCalledExactlyOnceWith(
				INSTANCE_ACTIVITY_CONTEXT_FLAG,
			);
		});

		it('should drop tools this instance does not expose', async () => {
			const limitedResource = new McpProtectedResource(
				urlService,
				mcpSettingsService,
				mcpConfig,
				makeGlobalConfig({ builderEnabled: false }),
				moduleRegistry,
				licenseState,
				postHogClient,
			);

			const scopeTools = await limitedResource.getScopeTools();

			expect(limitedResource.scopes).not.toContain('agent:read');
			expect(limitedResource.scopes).not.toContain('agent:write');
			expect(scopeTools['workflow:read']).toContain('search_workflows');
			// builder-only tools are hidden when the builder is off
			expect(scopeTools['workflow:read']).not.toContain('search_nodes');
			expect(scopeTools['workflow:write']).not.toContain('create_workflow_from_code');
			expect(scopeTools['project:read']).toEqual([]);
			expect(scopeTools['agent:read']).toBeUndefined();
			expect(scopeTools['agent:write']).toBeUndefined();
		});

		it('should drop folder tools when folders are not licensed', async () => {
			licenseState.isFoldersLicensed.mockReturnValue(false);

			const scopeTools = await resource.getScopeTools();

			expect(scopeTools['project:write']).not.toContain('create_folder');
			expect(scopeTools['project:write']).not.toContain('update_folder');
			expect(scopeTools['workflow:write']).not.toContain('move_workflows_to_folder');
			expect(scopeTools['project:write']).not.toContain('search_folders');
			expect(scopeTools['project:read']).not.toContain('search_folders');
			expect(scopeTools['project:read']).toContain('search_projects');
		});

		it('advertises the preferences scope with its one tool', async () => {
			expect(resource.scopes).toContain('aiPreference:read');
			expect((await resource.getScopeTools())['aiPreference:read']).toEqual([
				'get_user_preferences',
			]);
		});

		it('advertises the preferences write scope with its three tools', async () => {
			expect(resource.scopes).toContain('aiPreference:write');
			expect((await resource.getScopeTools())['aiPreference:write']).toEqual([
				'save_user_preference',
				'update_user_preference',
				'undo_user_preference',
			]);
		});

		// The flag is per-user PostHog and unreachable from the descriptor, so the scope is
		// offered to everyone; granting it yields no tool until the flag is on.
		it('keeps advertising the preferences scope regardless of the builder', async () => {
			const withoutBuilder = new McpProtectedResource(
				urlService,
				mcpSettingsService,
				mcpConfig,
				makeGlobalConfig({ builderEnabled: false }),
				moduleRegistry,
				licenseState,
				postHogClient,
			);

			expect((await withoutBuilder.getScopeTools())['aiPreference:read']).toEqual([
				'get_user_preferences',
			]);
		});

		it('should drop agent scopes and tools when the agents module is inactive', async () => {
			moduleRegistry.isActive.mockReturnValue(false);

			expect(resource.scopes).not.toContain('agent:read');
			expect(resource.scopes).not.toContain('agent:write');
			expect(await resource.getScopeTools()).not.toHaveProperty('agent:read');
			expect(await resource.getScopeTools()).not.toHaveProperty('agent:write');
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

	describe('getGrantableScopes', () => {
		const user = Object.assign(new User(), { id: 'user-1' });

		it('offers the install scope to a user whose role allows installing', async () => {
			hasGlobalScope.mockReturnValue(true);

			expect(await resource.getGrantableScopes(user)).toContain('communityPackage:install');
		});

		it('withholds the install scope from a user whose role does not allow installing', async () => {
			// Otherwise a member could tick a box that records a grant which can
			// never do anything, because install_community_node is never registered
			// for them.
			hasGlobalScope.mockReturnValue(false);

			const scopes = await resource.getGrantableScopes(user);

			expect(scopes).not.toContain('communityPackage:install');
			expect(scopes.length).toBe(resource.scopes.length - 1);
		});

		it('keys off the global scope, not a role name, so custom roles work', async () => {
			hasGlobalScope.mockReturnValue(false);

			await resource.getGrantableScopes(user);

			expect(hasGlobalScope).toHaveBeenCalledWith(user, 'communityPackage:install');
		});

		it('narrows only the install scope, leaving every other scope grantable', async () => {
			hasGlobalScope.mockReturnValue(false);

			const scopes = await resource.getGrantableScopes(user);

			expect(scopes).toEqual(resource.scopes.filter((s) => s !== 'communityPackage:install'));
		});

		it('withholds the install scope when verified packages are off, whatever the role', async () => {
			// The screen pre-checks every offered scope on first consent, so
			// offering one the tool cannot honour records a dead grant. This tracks
			// full tool availability, not just the caller's role.
			hasGlobalScope.mockReturnValue(true);
			Container.set(
				CommunityPackagesConfig,
				mock<CommunityPackagesConfig>({ enabled: true, verifiedEnabled: false }),
			);

			expect(await resource.getGrantableScopes(user)).not.toContain('communityPackage:install');
		});

		it('withholds the install scope when packages are managed from the environment', async () => {
			hasGlobalScope.mockReturnValue(true);
			const envManaged = new McpProtectedResource(
				urlService,
				mcpSettingsService,
				mcpConfig,
				makeGlobalConfig({ managedByEnv: true }),
				moduleRegistry,
				licenseState,
				postHogClient,
			);

			expect(await envManaged.getGrantableScopes(user)).not.toContain('communityPackage:install');
		});

		it('still advertises the install scope in discovery, which is unauthenticated', () => {
			hasGlobalScope.mockReturnValue(false);

			// `scopes` describes what the resource supports; only the consent
			// screen narrows to the caller.
			expect(resource.scopes).toContain('communityPackage:install');
		});
	});
});
