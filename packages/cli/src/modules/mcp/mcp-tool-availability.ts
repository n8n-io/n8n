import type { ModuleRegistry } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';

import type { CommunityPackagesConfig } from '@/modules/community-packages/community-packages.config';

import type { McpConfig } from './mcp.config';

export function areAgentToolsAvailable(
	globalConfig: GlobalConfig,
	moduleRegistry: ModuleRegistry,
): boolean {
	return globalConfig.endpoints.mcpBuilderEnabled && moduleRegistry.isActive('agents');
}

/**
 * Whether `install_community_node` should be registered for this caller.
 *
 * Every condition is checked before registration rather than inside the
 * handler: an unregistered tool is neither listed nor callable, so the agent is
 * never told about a capability that could only refuse. Verified packages must
 * be enabled because only vetted packages are installable, so with the catalog
 * off there is nothing the tool could ever install. When packages are managed
 * declaratively from the environment, `install()` rejects every call, so the
 * tool would exist only to fail.
 *
 * The builder and discovery flags belong here too, not only at the
 * registration site: `McpProtectedResource.getGrantableScopes` offers the
 * matching consent scope through this same predicate, and a scope offered
 * while the tool cannot register would be recorded as a grant that silently
 * becomes install capability the day an operator flips the flag on.
 */
export function isCommunityNodeInstallAvailable(
	moduleRegistry: ModuleRegistry,
	config: Pick<CommunityPackagesConfig, 'enabled' | 'verifiedEnabled'>,
	globalConfig: {
		endpoints: Pick<GlobalConfig['endpoints'], 'mcpBuilderEnabled'>;
		instanceSettingsLoader: Pick<
			GlobalConfig['instanceSettingsLoader'],
			'communityPackagesManagedByEnv'
		>;
	},
	mcpConfig: Pick<McpConfig, 'communityNodeDiscoveryEnabled'>,
	user: User,
): boolean {
	return (
		globalConfig.endpoints.mcpBuilderEnabled &&
		mcpConfig.communityNodeDiscoveryEnabled &&
		moduleRegistry.isActive('community-packages') &&
		config.enabled &&
		config.verifiedEnabled &&
		!globalConfig.instanceSettingsLoader.communityPackagesManagedByEnv &&
		hasGlobalScope(user, 'communityPackage:install')
	);
}
