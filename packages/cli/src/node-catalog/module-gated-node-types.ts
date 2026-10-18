import type { ModuleRegistry } from '@n8n/backend-common';
import {
	getNodeGatingModule,
	MODULE_GATED_NODE_TYPES,
	type NodeGatingModule,
} from '@n8n/constants';

function isModuleEnabled(moduleRegistry: ModuleRegistry, moduleName: NodeGatingModule): boolean {
	return moduleRegistry.isActive(moduleName) && !isTurnedOffInSettings(moduleRegistry, moduleName);
}

// An admin can turn agents off in Settings > Agents. The module then reports `enabled: false`.
function isTurnedOffInSettings(moduleRegistry: ModuleRegistry, moduleName: NodeGatingModule) {
	return moduleRegistry.settings.get(moduleName)?.enabled === false;
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
	const moduleName = getNodeGatingModule(nodeType);
	if (!moduleName || isModuleEnabled(moduleRegistry, moduleName)) return undefined;

	const fix = moduleRegistry.isActive(moduleName)
		? `An admin turned "${moduleName}" off in the instance settings.`
		: `The "${moduleName}" module is disabled on this instance.`;

	return `This node cannot run, so do not build with it. ${fix}`;
}
