import { CONTEXT_PREFERENCES_ENABLED_VARIANT, CONTEXT_PREFERENCES_FLAG } from '@n8n/api-types';
import type { ModuleRegistry } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { hasGlobalScope, type AuthPrincipal } from '@n8n/permissions';
import type { FeatureFlags } from 'n8n-workflow';

import type { CommunityPackagesConfig } from '@/modules/community-packages/community-packages.config';

import type { McpConfig } from './mcp.config';

/**
 * Whether the preference tools should be registered for a caller with these
 * flags. Multivariate experiment: only the `variant` arm enables them.
 *
 * Consent uses this same predicate: a control user must not see the
 * `aiPreference:*` scopes on the consent screen, or the arm that is meant to
 * be unaware of the feature has been shown it.
 */
export function arePreferenceToolsEnabled(flags: FeatureFlags): boolean {
	return flags[CONTEXT_PREFERENCES_FLAG] === CONTEXT_PREFERENCES_ENABLED_VARIANT;
}

export function areAgentToolsAvailable(
	globalConfig: GlobalConfig,
	moduleRegistry: ModuleRegistry,
): boolean {
	return (
		globalConfig.endpoints.mcpBuilderEnabled &&
		moduleRegistry.isActive('agents') &&
		moduleRegistry.settings.get('agents')?.enabled !== false
	);
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
	user: AuthPrincipal,
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
