import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import type { RemoveNodeType } from '@n8n/api-types/push/hot-reload';
import type { INodeTypeDescription, INodeTypeNameVersion } from 'n8n-workflow';
import { useCredentialsStore } from '@/stores/credentials.store';

/**
 * Handles the 'reloadNodeType' event from the push connection, which indicates
 * that a node type needs to be reloaded.
 */
export async function removeNodeType({ data }: RemoveNodeType) {
	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();

	const nodesToBeRemoved: INodeTypeNameVersion[] = [data];

	// Force reload of all credential types
	await credentialsStore.fetchCredentialTypes(false).then(() => {
		nodeTypesStore.removeNodeTypes(nodesToBeRemoved as INodeTypeDescription[]);
	});
}
