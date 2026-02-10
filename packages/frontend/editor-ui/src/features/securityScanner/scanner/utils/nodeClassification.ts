import type { INodeUi } from '@/Interface';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

/**
 * Determines if a node is an input trigger by checking its node type metadata.
 * Uses `group: ['trigger']` from INodeTypeDescription instead of a hardcoded list.
 */
export function isInputTrigger(node: INodeUi): boolean {
	const nodeTypesStore = useNodeTypesStore();
	const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
	if (!nodeType) return false;
	return nodeType.group?.includes('trigger') ?? false;
}

/**
 * Determines if a node sends data to an external service.
 * A node is considered external if it has credential definitions
 * (meaning it authenticates to a third-party service) or is an HTTP Request node.
 */
export function isExternalService(node: INodeUi): boolean {
	if (node.type === 'n8n-nodes-base.httpRequest') return true;
	const nodeTypesStore = useNodeTypesStore();
	const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
	if (!nodeType) return false;
	return (nodeType.credentials?.length ?? 0) > 0;
}
