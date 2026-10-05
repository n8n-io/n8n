import type { ModuleRegistry } from '@n8n/backend-common';
import { MODULE_GATED_NODE_TYPES } from '@n8n/constants';

/** Tells the AI builder why a gated node is unavailable, so it can tell the user. */
const MODULE_DISABLED_NOTICES: Readonly<Record<string, string>> = {
	agents:
		'Agents are disabled on this instance, so this node cannot run. Do not build with it. Tell the user that an instance admin must enable agents first.',
	'data-table':
		'Data tables are disabled on this instance, so this node cannot run. Do not build with it. Tell the user that an instance admin must enable data tables first.',
};

function isModuleEnabled(moduleRegistry: ModuleRegistry, moduleName: string): boolean {
	if (!moduleRegistry.getActiveModules().includes(moduleName)) return false;
	// An admin can turn agents off in Settings > Agents. The module then reports `enabled: false`.
	return moduleRegistry.settings.get(moduleName)?.enabled !== false;
}

/** Module-gated node types whose module is off. Node discovery must not offer them. */
export function getModuleDisabledNodeTypes(moduleRegistry: ModuleRegistry): string[] {
	return Object.entries(MODULE_GATED_NODE_TYPES)
		.filter(([, moduleName]) => !isModuleEnabled(moduleRegistry, moduleName))
		.map(([nodeType]) => nodeType);
}

/** Why `nodeType` is unavailable, or `undefined` when its module is on or it has no module. */
export function getModuleDisabledNotice(
	moduleRegistry: ModuleRegistry,
	nodeType: string,
): string | undefined {
	const moduleName = MODULE_GATED_NODE_TYPES[nodeType];
	if (!moduleName || isModuleEnabled(moduleRegistry, moduleName)) return undefined;
	return MODULE_DISABLED_NOTICES[moduleName];
}
