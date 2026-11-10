import type { ModuleRegistry } from '@n8n/backend-common';
import {
	getNodeGatingModule,
	isHumanInteractionNodeType,
	HUMAN_INTERACTIONS_MODULE,
	MODULE_GATED_NODE_TYPES,
	type NodeGatingModule,
} from '@n8n/constants';

function isModuleEnabled(
	moduleRegistry: ModuleRegistry,
	moduleName: NodeGatingModule,
	nodeType: string,
): boolean {
	if (!moduleRegistry.isActive(moduleName) || isTurnedOffInSettings(moduleRegistry, moduleName))
		return false;
	if (!isHumanInteractionNodeType(nodeType)) return true;
	const modules = moduleRegistry.settings.get('agents')?.modules;
	return Array.isArray(modules) && modules.includes(HUMAN_INTERACTIONS_MODULE);
}

// An admin can turn agents off in Settings > Agents. The module then reports `enabled: false`.
function isTurnedOffInSettings(moduleRegistry: ModuleRegistry, moduleName: NodeGatingModule) {
	return moduleRegistry.settings.get(moduleName)?.enabled === false;
}

/** Module-gated node types whose module is off. Node discovery must not offer them. */
export function getModuleDisabledNodeTypes(moduleRegistry: ModuleRegistry): string[] {
	return Object.entries(MODULE_GATED_NODE_TYPES)
		.filter(([nodeType, moduleName]) => !isModuleEnabled(moduleRegistry, moduleName, nodeType))
		.map(([nodeType]) => nodeType);
}

/** Why `nodeType` is unavailable, or `undefined` when its module is on or it has no module. */
export function getModuleDisabledNotice(
	moduleRegistry: ModuleRegistry,
	nodeType: string,
): string | undefined {
	const moduleName = getNodeGatingModule(nodeType);
	if (!moduleName || isModuleEnabled(moduleRegistry, moduleName, nodeType)) return undefined;

	const fix =
		isHumanInteractionNodeType(nodeType) && moduleRegistry.isActive('agents')
			? 'Enable human-interactions in N8N_AGENTS_MODULES to use this node.'
			: moduleRegistry.isActive(moduleName)
				? `An admin turned "${moduleName}" off in the instance settings.`
				: `The "${moduleName}" module is disabled on this instance.`;

	return `This node cannot run, so do not build with it. ${fix}`;
}
