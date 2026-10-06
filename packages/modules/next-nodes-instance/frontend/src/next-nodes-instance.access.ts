import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';

const MODULE_ID = 'next-nodes-instance';

/** The backend module is always active, so its settings say whether next nodes are on. */
export function isNextNodesEnabled() {
	const settings = useSettingsStore();
	return settings.isModuleActive(MODULE_ID) && settings.moduleSettings[MODULE_ID]?.enabled === true;
}

/** Whether the user can open the Nodes settings page. */
export const canOpenNodesSettings = () =>
	isNextNodesEnabled() && useRBACStore().hasScope('nodeDefinition:list');

/** Whether the user can open the HTTP action form, e.g. from the HTTP Request node. */
export const canMakeHttpActions = () =>
	isNextNodesEnabled() && useRBACStore().hasScope('nodeDefinition:create');
