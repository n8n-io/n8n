import type { XYPosition } from '@/Interface';
import { NOT_DUPLICATABE_NODE_TYPES, PIN_DATA_NODE_TYPES_DENYLIST } from '@/constants';
import { useNodeTypesStore, useSourceControlStore, useUIStore, useWorkflowsStore } from '@/stores';
import type { IActionDropdownItem } from 'n8n-design-system/src/components/N8nActionDropdown/ActionDropdown.vue';
import type { INode, INodeTypeDescription } from 'n8n-workflow';
import { computed, ref } from 'vue';
import { getMousePosition } from '../utils/nodeViewUtils';
import { useI18n } from './useI18n';

export type ContextMenuTarget =
	| { source: 'canvas' }
	| { source: 'node-right-click'; node: INode }
	| { source: 'node-button'; node: INode };
export type ContextMenuAction =
	| 'open'
	| 'copy'
	| 'toggle_activation'
	| 'duplicate'
	| 'execute'
	| 'rename'
	| 'toggle_pin'
	| 'delete';

const position = ref<XYPosition>([0, 0]);
const isOpen = ref(false);
const target = ref<ContextMenuTarget>({ source: 'canvas' });
const actions = ref<IActionDropdownItem[]>([]);

export const useContextMenu = () => {
	const uiStore = useUIStore();
	const nodeTypesStore = useNodeTypesStore();
	const workflowsStore = useWorkflowsStore();
	const sourceControlStore = useSourceControlStore();

	const i18n = useI18n();
	const isReadOnly = computed(
		() => sourceControlStore.preferences.branchReadOnly || uiStore.isReadOnlyView,
	);

	const canAddNodeOfType = (nodeType: INodeTypeDescription) => {
		const sameTypeNodes = workflowsStore.allNodes.filter((n) => n.type === nodeType.name);
		return nodeType.maxNodes === undefined || sameTypeNodes.length < nodeType.maxNodes;
	};

	const canDuplicateNode = (node: INode): boolean => {
		const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
		if (!nodeType) return false;
		if (NOT_DUPLICATABE_NODE_TYPES.includes(nodeType.name)) return false;

		return canAddNodeOfType(nodeType);
	};

	const canPinNode = (node: INode): boolean => {
		const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
		const dataToPin = workflowsStore.getWorkflowResultDataByNodeName(node.name);
		if (!nodeType || !dataToPin) return false;
		return nodeType.outputs.length === 1 && !PIN_DATA_NODE_TYPES_DENYLIST.includes(node.type);
	};

	const hasPinData = (node: INode): boolean => {
		return !!workflowsStore.pinDataByNodeName(node.name);
	};
	const close = () => {
		target.value = { source: 'canvas' };
		isOpen.value = false;
		actions.value = [];
	};

	const getTargetNodes = (menuTarget: ContextMenuTarget): INode[] => {
		const selectedNodes = uiStore.selectedNodes;
		if (menuTarget.source === 'canvas') {
			return selectedNodes;
		} else if (menuTarget.source === 'node-right-click') {
			const isNodeInSelection = selectedNodes.some((node) => node.name === menuTarget.node.name);
			return isNodeInSelection ? selectedNodes : [menuTarget.node];
		}

		return [menuTarget.node];
	};

	return {
		isOpen,
		position,
		target,
		actions,
		open: (event: MouseEvent, menuTarget: ContextMenuTarget = { source: 'canvas' }) => {
			if (isOpen.value && menuTarget.source === target.value.source) {
				// Close context menu, let browser open native context menu
				close();
				return;
			}

			event.preventDefault();
			event.stopPropagation();

			target.value = menuTarget;
			position.value = getMousePosition(event);
			console.log(event, position.value);
			isOpen.value = true;

			const nodes = getTargetNodes(menuTarget);

			if (nodes.length === 0) {
				actions.value = [
					{
						id: 'select_all',
						label: i18n.baseText('contextMenu.selectAll'),
						shortcut: { metaKey: true, keys: ['A'] },
						disabled: nodes.length === workflowsStore.allNodes.length,
					},
					{
						id: 'deselect_all',
						label: i18n.baseText('contextMenu.deselectAll'),
						disabled: nodes.length === 0,
					},
					{
						id: 'add_node',
						shortcut: { keys: ['Tab'] },
						label: i18n.baseText('contextMenu.addNode'),
						disabled: isReadOnly.value,
					},
				];
			} else {
				const menuActions: IActionDropdownItem[] = [
					{
						id: 'copy',
						label: i18n.baseText('contextMenu.copy', { adjustToNumber: nodes.length }),
						shortcut: { metaKey: true, keys: ['C'] },
					},
					{
						id: 'toggle_activation',
						label: nodes.every((node) => node.disabled)
							? i18n.baseText('contextMenu.activate', { adjustToNumber: nodes.length })
							: i18n.baseText('contextMenu.deactivate', { adjustToNumber: nodes.length }),
						shortcut: { keys: ['D'] },
						disabled: isReadOnly.value,
					},
					{
						id: 'duplicate',
						label: i18n.baseText('contextMenu.duplicate', { adjustToNumber: nodes.length }),
						shortcut: { metaKey: true, keys: ['D'] },
						disabled: isReadOnly.value || !nodes.every(canDuplicateNode),
					},
					{
						id: 'pin',
						label: nodes.some((node) => hasPinData(node))
							? i18n.baseText('contextMenu.unpin', { adjustToNumber: nodes.length })
							: i18n.baseText('contextMenu.pin', { adjustToNumber: nodes.length }),
						shortcut: { keys: ['p'] },
						disabled: isReadOnly.value || !nodes.every(canPinNode),
					},
					{
						id: 'delete',
						divided: true,
						label: i18n.baseText('contextMenu.delete', { adjustToNumber: nodes.length }),
						shortcut: { keys: ['Del'] },
						disabled: isReadOnly.value,
					},
				];

				if (nodes.length === 1) {
					// Add actions only available for a single node
					menuActions.splice(0, 0, {
						id: 'open',
						label: i18n.baseText('contextMenu.open'),
						shortcut: { keys: ['↵'] },
					});

					menuActions.splice(0, 4, {
						id: 'execute',
						label: i18n.baseText('contextMenu.execute'),
					});

					menuActions.splice(0, 5, {
						id: 'rename',
						label: i18n.baseText('contextMenu.rename'),
						shortcut: { keys: ['F2'] },
						disabled: isReadOnly.value,
					});
				}

				actions.value = menuActions;
			}
		},
		close,
	};
};
