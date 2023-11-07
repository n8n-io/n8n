import { useNodeTypesStore, useSourceControlStore, useUIStore, useWorkflowsStore } from '@/stores';
import type { INode, INodeTypeDescription } from 'n8n-workflow';
import { NOT_DUPLICATABE_NODE_TYPES, PIN_DATA_NODE_TYPES_DENYLIST } from '../constants';

type NodeAction =
	| 'duplicate'
	| 'delete'
	| 'execute'
	| 'activate'
	| 'deactivate'
	| 'copy'
	| 'rename'
	| 'pin'
	| 'unpin'
	| 'open';

export const useNodeActions = () => {
	const uiStore = useUIStore();
	const nodeTypesStore = useNodeTypesStore();
	const workflowsStore = useWorkflowsStore();
	const sourceControlStore = useSourceControlStore();
	const isReadOnly = sourceControlStore.preferences.branchReadOnly || uiStore.isReadOnlyView;
	const workflow = useWorkflowsStore().getCurrentWorkflow();

	const nodeActionAllowed = (
		nodes: INode[],
		action: NodeAction,
	): { success: true } | { success: false; error: string } => {
		switch (action) {
			case 'duplicate': {
				const notDuplicatableNodes = nodes.filter((node) => !canDuplicateNode(node));
				return !isReadOnly && nodes.every(canDuplicateNode);
			}
			case 'execute':
				return (
					!isReadOnly &&
					nodes.length === 1 &&
					!nodeTypesStore.isConfigNode(workflow, nodes[0], nodes[0].type)
				);
			case 'pin':
				return !isReadOnly && nodes.every(canPinNode) && !nodes.every(hasPinData);
			case 'unpin':
				return !isReadOnly && nodes.some(hasPinData);
			case 'activate':
				return !isReadOnly && nodes.some((node) => node.disabled);
			case 'deactivate':
				return !isReadOnly && nodes.some((node) => !node.disabled);
			case 'delete':
			case 'copy':
			case 'rename':
				return !isReadOnly;
			case 'open':
				return true;
			default:
				return false;
		}
	};

	return {
		nodeActionAllowed,
		nodeAction: (
			nodes: INode[],
			action: NodeAction,
			options: { notify?: boolean },
		): { success: true } | { success: false; error: string } => {
			const allowed = nodeActionAllowed(nodes, action);

			if (!allowed.success) {
				return { success: false, error: allowed.error };
			}

			switch (action) {
				case 'duplicate':
					return { success: true };
				case 'execute':
					return { success: true };
				case 'pin':
					return { success: true };
				case 'activate':
				case 'deactivate':
				case 'delete':
				case 'copy':
				case 'rename':
					return { success: true };
				case 'open':
					return { success: true };
				default:
					return { success: true };
			}
		},
	};
};
