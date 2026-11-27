import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { computed } from 'vue';

/** The shell reads the PostHog flag. No provider means that the feature is off. */
const customMcpServersEnabled = () =>
	capabilityRegistry.tryUse(capabilities.customMcpServersEnabled)?.() === true;

/** The resource of a scope, for example `mcpServer` for `mcpServer:read`. */
export const resourceOfScope = (scope: string) => scope.split(':')[0];

/** Drops the scopes of hidden resources. */
export const withoutHiddenScopes = (scopes: readonly string[], hidden: ReadonlySet<string>) =>
	scopes.filter((scope) => !hidden.has(resourceOfScope(scope)));

/**
 * The resources whose feature is off, so the role editors hide them. A new role and a preset
 * must not get their scopes either: the admin cannot see them, and they apply as soon as the
 * feature turns on. The permission counts leave them out too.
 */
export function useHiddenRoleResources() {
	const settingsStore = useSettingsStore();

	return computed(() => {
		const hidden = new Set<string>();
		if (!settingsStore.isAppsEnabled) hidden.add('app');
		// Project skills exist only while the agents module is on.
		if (!settingsStore.isModuleActive('agents')) hidden.add('projectSkill');
		if (!settingsStore.isModuleActive('mcp-servers') || !customMcpServersEnabled()) {
			hidden.add('mcpServer');
		}
		return hidden;
	});
}
