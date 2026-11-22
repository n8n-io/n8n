import type { NodeDescriptionUpdated } from '@n8n/api-types/push/hot-reload';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { CUSTOM_NODES_MODULE_ID, useCustomNodesStore } from '@n8n/frontend-module-custom-nodes';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';

/**
 * Handles the 'nodeDescriptionUpdated' event from the push connection, which indicates
 * that a node description has been updated.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function nodeDescriptionUpdated(_event: NodeDescriptionUpdated) {
	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();

	await nodeTypesStore.getNodeTypes();
	await credentialsStore.fetchCredentialTypes(true);

	// A saved custom action changes the node descriptions. Its pin values must follow.
	if (useSettingsStore().isModuleActive(CUSTOM_NODES_MODULE_ID)) {
		await useCustomNodesStore().refresh();
	}
}
