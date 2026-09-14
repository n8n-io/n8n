import type { ModuleRegistry } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';

import type { CommunityPackagesConfig } from '@/modules/community-packages/community-packages.config';

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
 * Callers must keep this in sync with `McpProtectedResource.getGrantableScopes`,
 * which offers the matching consent scope.
 */
export function isCommunityNodeInstallAvailable(
	moduleRegistry: ModuleRegistry,
	config: Pick<CommunityPackagesConfig, 'enabled' | 'verifiedEnabled'>,
	instanceSettingsLoaderConfig: Pick<
		GlobalConfig['instanceSettingsLoader'],
		'communityPackagesManagedByEnv'
	>,
	user: User,
): boolean {
	return (
		moduleRegistry.isActive('community-packages') &&
		config.enabled &&
		config.verifiedEnabled &&
		!instanceSettingsLoaderConfig.communityPackagesManagedByEnv &&
		hasGlobalScope(user, 'communityPackage:install')
	);
}
