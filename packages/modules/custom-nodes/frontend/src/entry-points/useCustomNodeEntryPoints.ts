import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';

import {
	CUSTOM_NODE_CREATE_SCOPE,
	CUSTOM_NODE_LIST_SCOPE,
	CUSTOM_NODE_UPDATE_SCOPE,
	CUSTOM_NODES_MODULE_ID,
} from '../custom-nodes.constants';
import { useCustomNodesStore } from '../custom-nodes.store';
import type { CustomActionWizardData } from '../wizard/wizard.types';

/**
 * Decides which entry points to the wizard the editor shows, and with which wizard data.
 * Every function is safe in a computed or a render: the loads start after it.
 */
export function useCustomNodeEntryPoints() {
	const settingsStore = useSettingsStore();
	const rbacStore = useRBACStore();
	const store = useCustomNodesStore();

	/** True when the user can create custom nodes and custom actions. */
	function canCreate(): boolean {
		return (
			settingsStore.isModuleActive(CUSTOM_NODES_MODULE_ID) &&
			rbacStore.hasScope(CUSTOM_NODE_CREATE_SCOPE)
		);
	}

	/**
	 * The wizard data that adds an action to this node type, or `undefined` when the node type
	 * cannot get custom actions or the user cannot add one. A custom node gets its own action
	 * (`customNode:update`), a node of the parent list (`GET /custom-nodes/parents`) gets a custom
	 * action (`customNode:create`). Starts the loads that it needs.
	 */
	function addActionDataFor(nodeTypeName: string): CustomActionWizardData | undefined {
		if (!settingsStore.isModuleActive(CUSTOM_NODES_MODULE_ID)) return undefined;
		if (!rbacStore.hasScope(CUSTOM_NODE_LIST_SCOPE)) return undefined;
		const canAddToCustomNode = rbacStore.hasScope(CUSTOM_NODE_UPDATE_SCOPE);
		const canAddToParent = rbacStore.hasScope(CUSTOM_NODE_CREATE_SCOPE);
		if (!canAddToCustomNode && !canAddToParent) return undefined;

		store.ensureLoaded();
		if (canAddToParent) store.ensureParentsLoaded();

		const customNode = store.nodes.find((node) => node.nodeType === nodeTypeName);
		if (customNode) {
			return canAddToCustomNode ? { mode: 'create', customNodeId: customNode.id } : undefined;
		}
		if (canAddToParent && store.parents.some((parent) => parent.nodeType === nodeTypeName)) {
			return { mode: 'create', parentNodeType: nodeTypeName };
		}
		return undefined;
	}

	return { canCreate, addActionDataFor };
}
