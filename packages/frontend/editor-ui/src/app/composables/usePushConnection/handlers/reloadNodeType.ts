import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { ReloadNodeType } from '@n8n/api-types/push/hot-reload';
import { isCommunityPackageName } from 'n8n-workflow';

/**
 * Handles the 'reloadNodeType' event from the push connection, which indicates
 * that a node type needs to be reloaded.
 */
export function useReloadNodeType() {
	const nodeTypesStore = useNodeTypesStore();

	async function reloadNodeType({ data }: ReloadNodeType) {
		await nodeTypesStore.getNodeTypes();
		const isCommunityNode = isCommunityPackageName(data.name);
		await nodeTypesStore.getFullNodesProperties([data], !isCommunityNode);
	}

	return { reloadNodeType };
}
