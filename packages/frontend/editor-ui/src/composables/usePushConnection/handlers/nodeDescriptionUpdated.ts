import type { NodeDescriptionUpdated } from '@n8n/api-types/push/hot-reload';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useCredentialsStore } from '@/stores/credentials.store';

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
}
