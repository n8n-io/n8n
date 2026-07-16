import type { ActionDropdownItem, INodeUi } from '@/Interface';
import {
	NOT_DUPLICATABLE_NODE_TYPES,
	STICKY_NODE_TYPE,
	PRODUCTION_ONLY_TRIGGER_NODE_TYPES,
} from '@/app/constants';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useCollaborationStore } from '@/features/collaboration/collaboration/collaboration.store';
import { useFocusedNodesStore } from '@/features/ai/assistant/focusedNodes.store';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import type { INode, INodeTypeDescription } from 'n8n-workflow';
import { NodeHelpers, WEBHOOK_NODE_TYPE } from 'n8n-workflow';
import { computed, type ComputedRef } from 'vue';
import { isPresent } from '@/app/utils/typesUtils';
import { useEditorContext } from '@/app/composables/useEditorContext';
import { usePinnedData } from '@/app/composables/usePinnedData';
import { useSelectionValidation } from '@/app/composables/useSelectionValidation';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { injectContextMenuGroupView } from './contextMenuGroupView';

export type ContextMenuAction =
	| 'open'
	| 'copy'
	| 'toggle_activation'
	| 'duplicate'
	| 'execute'
	| 'copy_test_url'
	| 'copy_production_url'
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
	| 'extract_sub_workflow'
	| 'group_nodes'
	| 'rename_group'
	| 'ungroup_nodes'
	| 'expand_all_groups'
	| 'collapse_all_groups'
	| 'expand_selected_groups'
	| 'collapse_selected_groups'
	| 'focus_ai_on_selected';

/**
 * Actions that, once selected, hand off to another floating layer or input
 * (e.g. a popover, the group title editor) which then takes focus. For these
 * the context menu must not restore focus on close — otherwise the restore
 * lands outside the freshly-focused element and immediately dismisses it.
 * `group_nodes` qualifies because it autofocuses the created group's title
 * editor, just like `rename_group`.
 */
const FOCUS_HANDOFF_ACTIONS = new Set<ContextMenuAction>([
	'change_color',
	'rename_group',
	'group_nodes',
]);

export function isFocusHandoffAction(action: ContextMenuAction): boolean {
	return FOCUS_HANDOFF_ACTIONS.has(action);
}

type Item = ActionDropdownItem<ContextMenuAction>;

export function useContextMenuItems(
	targetNodeIds: ComputedRef<string[]>,
	targetGroupId?: ComputedRef<string | undefined>,
	targetReadOnly?: ComputedRef<boolean>,
): ComputedRef<Item[]> {
	const uiStore = useUIStore();
	const nodeTypesStore = useNodeTypesStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const sourceControlStore = useSourceControlStore();
	const collaborationStore = useCollaborationStore();
	const focusedNodesStore = useFocusedNodesStore();
	const { resolveGroupableNodeIds } = useSelectionValidation();
	const groupView = injectContextMenuGroupView();
	const i18n = useI18n();

	// Per-editor host overrides (already ANDed with the instance-wide store
	// flags) — e.g. the Instance AI artifact preview supersedes the AI
	// capabilities of its embedded editor, which must hide the AI actions.
	const { aiAssistant, aiBuilder, instanceAi } = useEditorContext();

	const workflowPermissions = computed(
		() => getResourcePermissions(workflowDocumentStore?.value?.scopes).workflow,
	);

	const isReadOnly = computed(
		() =>
			(targetReadOnly?.value ?? false) ||
			sourceControlStore.preferences.branchReadOnly ||
			uiStore.isReadOnlyView ||
			!workflowPermissions.value.update ||
			(workflowDocumentStore?.value?.isArchived ?? false) ||
			collaborationStore.shouldBeReadOnly,
	);

	const canOpenSubworkflow = computed(() => {
		if (targetNodes.value.length !== 1) return false;

		const node = targetNodes.value[0];

		if (!NodeHelpers.isNodeWithWorkflowSelector(node)) return false;

		return !!NodeHelpers.getSubworkflowId(node);
	});

	const targetNodes = computed(() =>
		targetNodeIds.value
			.map((nodeId) => workflowDocumentStore?.value?.getNodeById(nodeId))
			.filter(isPresent),
	);

	// Mirrors the Cmd+G eligibility — the same resolver also produces the
	// member ids at execution time, so enablement can't diverge from it.
	const canGroupTargetNodes = computed(() => resolveGroupableNodeIds(targetNodeIds.value) !== null);

	const canAddNodeOfType = (nodeType: INodeTypeDescription) => {
		const sameTypeNodes = (workflowDocumentStore?.value?.allNodes ?? []).filter(
			(n) => n.type === nodeType.name,
		);
		return nodeType.maxNodes === undefined || sameTypeNodes.length < nodeType.maxNodes;
	};

	const canDuplicateNode = (node: INode): boolean => {
		const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
		if (!nodeType) return false;
		if (NOT_DUPLICATABLE_NODE_TYPES.includes(nodeType.name)) return false;

		return canAddNodeOfType(nodeType);
	};

	const hasPinData = (node: INode): boolean => {
		return !!workflowDocumentStore?.value?.pinnedDataByNodeName?.[node.name];
	};

	const isExecutable = (node: INodeUi) => {
		if (!workflowDocumentStore?.value) return false;

		const nodeType = nodeTypesStore.getNodeType(
			node.type,
			node.typeVersion,
		) as INodeTypeDescription;

		return NodeHelpers.isExecutable(
			{ expression: workflowDocumentStore.value.getExpressionHandler() },
			node,
			nodeType,
		);
	};

	const isWebhookNode = (node: INodeUi) => {
		if (node.type === WEBHOOK_NODE_TYPE) return true;
		if (!node.webhookId) return false;
		if (!node.type.toLocaleLowerCase().includes('trigger')) return false;
		if (!isExecutable(node)) return false;

		return true;
	};

	const isAiSubNode = (node: INodeUi): boolean => {
		const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
		return NodeHelpers.isSubNodeType(nodeType);
	};

	return computed(() => {
		// A group target gets the multi-selection menu over its member nodes,
		// worded for the group as a whole, plus the group's own actions on top.
		const isGroupTarget = targetGroupId?.value !== undefined;
		const groupActions: Item[] = isGroupTarget
			? [
					{
						id: 'rename_group',
						label: i18n.baseText('contextMenu.renameGroup'),
						disabled: isReadOnly.value,
					},
					{
						id: 'ungroup_nodes',
						label: i18n.baseText('contextMenu.ungroupNodes'),
						shortcut: { metaKey: true, shiftKey: true, keys: ['G'] },
						disabled: isReadOnly.value,
					},
				]
			: [];

		const nodes = targetNodes.value;

		// A group whose members can't be resolved anymore (e.g. deleted by a
		// collaborator while the menu was open) keeps only its own actions.
		if (isGroupTarget && nodes.length === 0) {
			return groupActions;
		}

		const onlyStickies = nodes.every((node) => node.type === STICKY_NODE_TYPE);
		const canExtract = nodes.some(isExecutable) && !nodes.every(isAiSubNode);

		const i18nOptions = isGroupTarget
			? {
					// Always the multi-selection wording ("Copy {subject}"), with the
					// group as the subject, regardless of how many nodes it contains.
					adjustToNumber: 2,
					interpolate: { subject: i18n.baseText('contextMenu.nodeGroup') },
				}
			: {
					adjustToNumber: nodes.length,
					interpolate: {
						subject: i18n.baseText(onlyStickies ? 'contextMenu.sticky' : 'contextMenu.node', {
							adjustToNumber: nodes.length,
							interpolate: { count: nodes.length },
						}),
					},
				};

		const selectionActions: Item[] = [
			{
				id: 'select_all',
				divided: true,
				label: i18n.baseText('contextMenu.selectAll'),
				shortcut: { metaKey: true, keys: ['A'] },
				disabled: nodes.length === (workflowDocumentStore?.value?.allNodes ?? []).length,
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
				label: i18n.baseText('contextMenu.extract', i18nOptions),
				shortcut: { altKey: true, keys: ['X'] },
				disabled: isReadOnly.value,
			},
		];

		// Grouping doesn't apply to an existing group — it offers ungroup instead.
		const groupingActions: Item[] = !isGroupTarget
			? [
					{
						id: 'group_nodes',
						// Starts its own section when the extraction item above is hidden
						divided: !canExtract,
						label: i18n.baseText('contextMenu.group', { adjustToNumber: nodes.length }),
						shortcut: { metaKey: true, keys: ['G'] },
						disabled: isReadOnly.value || !canGroupTargetNodes.value,
					},
				]
			: [];

		const aiActions: Item[] = [
			!onlyStickies &&
				(aiAssistant.value || aiBuilder.value) &&
				!instanceAi.value &&
				focusedNodesStore.isFeatureEnabled && {
					id: 'focus_ai_on_selected',
					divided: true,
					label: i18n.baseText('contextMenu.focusAiOnSelected', i18nOptions),
					shortcut: { altKey: true, keys: ['I'] },
					disabled: isReadOnly.value,
				},
		].filter(Boolean) as Item[];

		const layoutActions: Item[] = [
			{
				id: 'tidy_up',
				divided: true,
				label: i18n.baseText(
					nodes.length < 2 ? 'contextMenu.tidyUpWorkflow' : 'contextMenu.tidyUpSelection',
				),
				shortcut: { shiftKey: true, altKey: true, keys: ['T'] },
				disabled: isReadOnly.value,
			},
		];

		// Distinct groups behind the target — a targeted title bar or the groups
		// of the targeted nodes. Only a groups-only target qualifies: a single
		// loose node yields undefined and hides the expand/collapse pair.
		// Alt+G follows the same rule, so shortcut and menu can't diverge.
		const targetGroupIds = ((): string[] | undefined => {
			const carriedGroupId = targetGroupId?.value;
			if (carriedGroupId !== undefined) return [carriedGroupId];
			const groupIds = new Set<string>();
			for (const node of nodes) {
				const group = workflowDocumentStore?.value?.getGroupForNode(node.id);
				if (!group) return undefined;
				groupIds.add(group.id);
			}
			return groupIds.size > 0 ? [...groupIds] : undefined;
		})();
		// View preferences, so they stay enabled in read-only mode. An item is
		// disabled when every target group is already in its end state; without
		// a canvas-provided group view the state is unknown and both stay enabled.
		const selectedGroupViewActions: Item[] = targetGroupIds
			? [
					{
						id: 'expand_selected_groups',
						divided: true,
						label: i18n.baseText('contextMenu.expandSelectedGroups'),
						shortcut: { altKey: true, keys: ['G'] },
						disabled:
							groupView !== undefined &&
							targetGroupIds.every((groupId) => !groupView.isGroupCollapsed(groupId)),
					},
					{
						id: 'collapse_selected_groups',
						label: i18n.baseText('contextMenu.collapseSelectedGroups'),
						shortcut: { shiftKey: true, altKey: true, keys: ['G'] },
						disabled:
							groupView !== undefined &&
							targetGroupIds.every((groupId) => groupView.isGroupCollapsed(groupId)),
					},
				]
			: [];

		// Toggling group collapse is a view preference, not a workflow mutation,
		// so these stay enabled in read-only mode. Same end-state rule as the
		// selection-scoped items, applied to every group in the workflow.
		const allGroups = workflowDocumentStore?.value?.allGroups ?? [];
		const groupViewActions: Item[] = [
			{
				id: 'expand_all_groups',
				divided: true,
				label: i18n.baseText('contextMenu.expandAllGroups'),
				shortcut: { altKey: true, keys: ['G'] },
				disabled:
					allGroups.length === 0 ||
					(groupView !== undefined &&
						allGroups.every((group) => !groupView.isGroupCollapsed(group.id))),
			},
			{
				id: 'collapse_all_groups',
				label: i18n.baseText('contextMenu.collapseAllGroups'),
				shortcut: { shiftKey: true, altKey: true, keys: ['G'] },
				disabled:
					allGroups.length === 0 ||
					(groupView !== undefined &&
						allGroups.every((group) => groupView.isGroupCollapsed(group.id))),
			},
		];

		if (nodes.length === 0) {
			return [
				{
					id: 'add_node',
					shortcut: { keys: ['N'] },
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
				...groupViewActions,
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
				...selectedGroupViewActions,
				...(canExtract ? extractionActions : []),
				...groupingActions,
				...aiActions,
				...selectionActions,
				{
					id: 'delete',
					divided: true,
					label: i18n.baseText('contextMenu.delete', i18nOptions),
					shortcut: { keys: ['Del'] },
					disabled: isReadOnly.value,
				},
			].filter(Boolean) as Item[];

			if (isGroupTarget) {
				// The group's own actions sit on top, like single-node actions do
				menuActions.unshift(...groupActions);
			} else if (nodes.length === 1) {
				const copyWebhookActions: Item[] = [];

				if (isWebhookNode(nodes[0])) {
					const isProductionOnly = PRODUCTION_ONLY_TRIGGER_NODE_TYPES.includes(nodes[0].type);
					const isWorkflowActive = workflowDocumentStore?.value?.active ?? false;
					if (!isProductionOnly) {
						copyWebhookActions.push({
							divided: true,
							id: 'copy_test_url',
							label: i18n.baseText('contextMenu.copyTestUrl'),
							shortcut: { shiftKey: true, altKey: true, keys: ['U'] },
							disabled: false,
						});
					}

					if (isWorkflowActive) {
						copyWebhookActions.push({
							divided: isProductionOnly,
							id: 'copy_production_url',
							label: i18n.baseText('contextMenu.copyProductionUrl'),
							shortcut: { altKey: true, keys: ['U'] },
							disabled: false,
						});
					}
				}

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
							...copyWebhookActions,
							{
								divided: !!copyWebhookActions.length,
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
