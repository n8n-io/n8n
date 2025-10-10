import type { ActionDropdownItem, INodeUi } from '@/Interface';
import { NOT_DUPLICATABLE_NODE_TYPES, STICKY_NODE_TYPE } from '@/constants';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useSourceControlStore } from '@/features/sourceControl.ee/sourceControl.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import type { INode, INodeTypeDescription, Workflow } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import { computed, type ComputedRef } from 'vue';
import { isPresent } from '@/utils/typesUtils';
import { usePinnedData } from '@/composables/usePinnedData';

export type ContextMenuAction =
	| 'open'
	| 'copy'
	| 'toggle_activation'
	| 'duplicate'
	| 'execute'
	| 'rename'
	| 'replace'
	| 'toggle_pin'
	| 'delete'
	| 'select_all'
	| 'deselect_all'
	| 'add_node'
	| 'add_sticky'
	| 'change_color'
	| 'open_sub_workflow'
	| 'tidy_up'
	| 'extract_sub_workflow';

type Item = ActionDropdownItem<ContextMenuAction>;

export function useContextMenuItems(targetNodeIds: ComputedRef<string[]>): ComputedRef<Item[]> {
	const uiStore = useUIStore();
	const nodeTypesStore = useNodeTypesStore();
	const workflowsStore = useWorkflowsStore();
	const sourceControlStore = useSourceControlStore();
	const i18n = useI18n();

	const workflowObject = computed(() => workflowsStore.workflowObject as Workflow);

	const workflowPermissions = computed(
		() => getResourcePermissions(workflowsStore.workflow.scopes).workflow,
	);

	const isReadOnly = computed(
		() =>
			sourceControlStore.preferences.branchReadOnly ||
			uiStore.isReadOnlyView ||
			!workflowPermissions.value.update ||
			workflowsStore.workflow.isArchived,
	);

	const canOpenSubworkflow = computed(() => {
		if (targetNodes.value.length !== 1) return false;

		const node = targetNodes.value[0];

		if (!NodeHelpers.isNodeWithWorkflowSelector(node)) return false;

		return !!NodeHelpers.getSubworkflowId(node);
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

	const isExecutable = (node: INodeUi) => {
		const workflowNode = workflowObject.value.getNode(node.name) as INode;
		const nodeType = nodeTypesStore.getNodeType(
			workflowNode.type,
			workflowNode.typeVersion,
		) as INodeTypeDescription;
		return NodeHelpers.isExecutable(workflowObject.value, workflowNode, nodeType);
	};

	return computed(() => {
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

		const selectionActions: Item[] = [
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

		const extractionActions: Item[] = [
			{
				id: 'extract_sub_workflow',
				divided: true,
				label: i18n.baseText('contextMenu.extract', { adjustToNumber: nodes.length }),
				shortcut: { altKey: true, keys: ['X'] },
				disabled: isReadOnly.value,
			},
		];

		const layoutActions: Item[] = [
			{
				id: 'tidy_up',
				divided: true,
				label: i18n.baseText(
					nodes.length < 2 ? 'contextMenu.tidyUpWorkflow' : 'contextMenu.tidyUpSelection',
				),
				shortcut: { shiftKey: true, altKey: true, keys: ['T'] },
			},
		];

		if (nodes.length === 0) {
			return [
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
				...layoutActions,
				...selectionActions,
			];
		} else {
			const menuActions: Item[] = [
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
				...layoutActions,
				...extractionActions,
				...selectionActions,
				{
					id: 'delete',
					divided: true,
					label: i18n.baseText('contextMenu.delete', i18nOptions),
					shortcut: { keys: ['Del'] },
					disabled: isReadOnly.value,
				},
			].filter(Boolean) as Item[];

			if (nodes.length === 1) {
				const singleNodeActions: Item[] = onlyStickies
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
								disabled: isReadOnly.value || !isExecutable(nodes[0]),
							},
							{
								id: 'rename',
								label: i18n.baseText('contextMenu.rename'),
								shortcut: { keys: ['Space'] },
								disabled: isReadOnly.value,
							},
							{
								id: 'replace',
								label: i18n.baseText('contextMenu.replace'),
								shortcut: { keys: ['R'] },
								disabled: isReadOnly.value,
							},
						];

				if (NodeHelpers.isNodeWithWorkflowSelector(nodes[0])) {
					singleNodeActions.push({
						id: 'open_sub_workflow',
						label: i18n.baseText('contextMenu.openSubworkflow'),
						shortcut: { shiftKey: true, metaKey: true, keys: ['O'] },
						disabled: !canOpenSubworkflow.value,
					});
				}
				// Add actions only available for a single node
				menuActions.unshift(...singleNodeActions);
			}

			return menuActions;
		}
	});
}
