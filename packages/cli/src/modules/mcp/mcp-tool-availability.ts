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
 * All three conditions are checked before registration rather than inside the
 * handler: an unregistered tool is neither listed nor callable, so the agent is
 * never told about a capability that could only refuse. Verified packages must
 * be enabled because only vetted packages are installable, so with the catalog
 * off there is nothing the tool could ever install.
 */
export function isCommunityNodeInstallAvailable(
	moduleRegistry: ModuleRegistry,
	config: Pick<CommunityPackagesConfig, 'enabled' | 'verifiedEnabled'>,
	user: User,
): boolean {
	return (
		moduleRegistry.isActive('community-packages') &&
		config.enabled &&
		config.verifiedEnabled &&
		hasGlobalScope(user, 'communityPackage:install')
	);
}
