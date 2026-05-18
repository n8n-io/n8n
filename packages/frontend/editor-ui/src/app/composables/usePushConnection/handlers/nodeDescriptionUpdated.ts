import type { NodeDescriptionUpdated } from '@n8n/api-types/push/hot-reload';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';

/**
 * Handles the 'nodeDescriptionUpdated' event from the push connection, which indicates
 * that a node description has been updated.
 */
export function useNodeDescriptionUpdated() {
	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async function nodeDescriptionUpdated(_event: NodeDescriptionUpdated) {
		await nodeTypesStore.getNodeTypes();
		await credentialsStore.fetchCredentialTypes(true);
	}

	return { nodeDescriptionUpdated };
}
