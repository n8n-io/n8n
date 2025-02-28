import type { ActionDropdownItem, XYPosition } from '@/Interface';
import { NOT_DUPLICATABLE_NODE_TYPES, STICKY_NODE_TYPE } from '@/constants';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { INode, INodeTypeDescription } from 'n8n-workflow';
import { computed, ref, watch } from 'vue';
import { getMousePosition } from '../utils/nodeViewUtils';
import { useI18n } from './useI18n';
import { usePinnedData } from './usePinnedData';
import { isPresent } from '../utils/typesUtils';
import { getResourcePermissions } from '@/permissions';

export type ContextMenuTarget =
	| { source: 'canvas'; nodeIds: string[] }
	| { source: 'node-right-click'; nodeId: string }
	| { source: 'node-button'; nodeId: string };
export type ContextMenuActionCallback = (action: ContextMenuAction, nodeIds: string[]) => void;

export type ContextMenuAction =
	| 'open'
	| 'copy'
	| 'toggle_activation'
	| 'duplicate'
	| 'execute'
	| 'rename'
	| 'toggle_pin'
	| 'delete'
	| 'select_all'
	| 'deselect_all'
	| 'add_node'
	| 'add_sticky'
	| 'change_color';

const position = ref<XYPosition>([0, 0]);
const isOpen = ref(false);
const target = ref<ContextMenuTarget>();
const actions = ref<ActionDropdownItem[]>([]);
const actionCallback = ref<ContextMenuActionCallback>(() => {});

export const useContextMenu = (onAction: ContextMenuActionCallback = () => {}) => {
	const uiStore = useUIStore();
	const nodeTypesStore = useNodeTypesStore();
	const workflowsStore = useWorkflowsStore();
	const sourceControlStore = useSourceControlStore();

	const i18n = useI18n();

	const workflowPermissions = computed(
		() => getResourcePermissions(workflowsStore.workflow.scopes).workflow,
	);

	const isReadOnly = computed(
		() =>
			sourceControlStore.preferences.branchReadOnly ||
			uiStore.isReadOnlyView ||
			!workflowPermissions.value.update,
	);

	const targetNodeIds = computed(() => {
		if (!isOpen.value || !target.value) return [];

		const currentTarget = target.value;
		return currentTarget.source === 'canvas' ? currentTarget.nodeIds : [currentTarget.nodeId];
	});

	const targetNodes = computed(() =>
		targetNodeIds.value.map((nodeId) => workflowsStore.getNodeById(nodeId)).filter(isPresent),
	);

	const canAddNodeOfType = (nodeType: INodeTypeDescription) => {
		const sameTypeNodes = workflowsStore.allNodes.filter((n) => n.type === nodeType.name);
		return nodeType.maxNodes === undefined || sameTypeNodes.length < nodeType.maxNodes;
	};

	const canDuplicateNode = (node: INode): boolean => {
		const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
		if (!nodeType) return false;
		if (NOT_DUPLICATABLE_NODE_TYPES.includes(nodeType.name)) return false;

		return canAddNodeOfType(nodeType);
	};

	const hasPinData = (node: INode): boolean => {
		return !!workflowsStore.pinDataByNodeName(node.name);
	};

	const close = () => {
		target.value = undefined;
		isOpen.value = false;
		actions.value = [];
		position.value = [0, 0];
	};

	const open = (event: MouseEvent, menuTarget: ContextMenuTarget) => {
		event.stopPropagation();

		if (isOpen.value && menuTarget.source === target.value?.source) {
			// Close context menu, let browser open native context menu
			close();
			return;
		}

		event.preventDefault();

		actionCallback.value = onAction;
		target.value = menuTarget;
		position.value = getMousePosition(event);
		isOpen.value = true;

		const nodes = targetNodes.value;
		const onlyStickies = nodes.every((node) => node.type === STICKY_NODE_TYPE);
		const i18nOptions = {
			adjustToNumber: nodes.length,
			interpolate: {
				subject: onlyStickies
					? i18n.baseText('contextMenu.sticky', { adjustToNumber: nodes.length })
					: i18n.baseText('contextMenu.node', { adjustToNumber: nodes.length }),
			},
		};

		const selectionActions = [
			{
				id: 'select_all',
				divided: true,
				label: i18n.baseText('contextMenu.selectAll'),
				shortcut: { metaKey: true, keys: ['A'] },
				disabled: nodes.length === workflowsStore.allNodes.length,
			},
			{
				id: 'deselect_all',
				label: i18n.baseText('contextMenu.deselectAll'),
				disabled: nodes.length === 0,
			},
		];

		if (nodes.length === 0) {
			actions.value = [
				{
					id: 'add_node',
					shortcut: { keys: ['Tab'] },
					label: i18n.baseText('contextMenu.addNode'),
					disabled: isReadOnly.value,
				},
				{
					id: 'add_sticky',
					shortcut: { shiftKey: true, keys: ['s'] },
					label: i18n.baseText('contextMenu.addSticky'),
					disabled: isReadOnly.value,
				},
				...selectionActions,
			];
		} else {
			const menuActions: ActionDropdownItem[] = [
				!onlyStickies && {
					id: 'toggle_activation',
					label: nodes.every((node) => node.disabled)
						? i18n.baseText('contextMenu.activate', i18nOptions)
						: i18n.baseText('contextMenu.deactivate', i18nOptions),
					shortcut: { keys: ['D'] },
					disabled: isReadOnly.value,
				},
				!onlyStickies && {
					id: 'toggle_pin',
					label: nodes.every((node) => hasPinData(node))
						? i18n.baseText('contextMenu.unpin', i18nOptions)
						: i18n.baseText('contextMenu.pin', i18nOptions),
					shortcut: { keys: ['p'] },
					disabled: isReadOnly.value || !nodes.every((n) => usePinnedData(n).canPinNode(true)),
				},
				{
					id: 'copy',
					label: i18n.baseText('contextMenu.copy', i18nOptions),
					shortcut: { metaKey: true, keys: ['C'] },
				},
				{
					id: 'duplicate',
					label: i18n.baseText('contextMenu.duplicate', i18nOptions),
					shortcut: { metaKey: true, keys: ['D'] },
					disabled: isReadOnly.value || !nodes.every(canDuplicateNode),
				},
				...selectionActions,
				{
					id: 'delete',
					divided: true,
					label: i18n.baseText('contextMenu.delete', i18nOptions),
					shortcut: { keys: ['Del'] },
					disabled: isReadOnly.value,
				},
			].filter(Boolean) as ActionDropdownItem[];

			if (nodes.length === 1) {
				const singleNodeActions = onlyStickies
					? [
							{
								id: 'open',
								label: i18n.baseText('contextMenu.editSticky'),
								shortcut: { keys: ['↵'] },
								disabled: isReadOnly.value,
							},
							{
								id: 'change_color',
								label: i18n.baseText('contextMenu.changeColor'),
								disabled: isReadOnly.value,
							},
						]
					: [
							{
								id: 'open',
								label: i18n.baseText('contextMenu.open'),
								shortcut: { keys: ['↵'] },
							},
							{
								id: 'execute',
								label: i18n.baseText('contextMenu.test'),
								disabled: isReadOnly.value,
							},
							{
								id: 'rename',
								label: i18n.baseText('contextMenu.rename'),
								shortcut: { keys: ['F2'] },
								disabled: isReadOnly.value,
							},
						];
				// Add actions only available for a single node
				menuActions.unshift(...singleNodeActions);
			}

			actions.value = menuActions;
		}
	};

	const _dispatchAction = (a: ContextMenuAction) => {
		actionCallback.value(a, targetNodeIds.value);
	};

	watch(
		() => uiStore.nodeViewOffsetPosition,
		() => {
			close();
		},
	);

	return {
		isOpen,
		position,
		target,
		actions,
		targetNodeIds,
		open,
		close,
		_dispatchAction,
	};
};
