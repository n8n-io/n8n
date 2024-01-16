import { getCurrentInstance, computed } from 'vue';
import type { IDataObject, INodeParameters } from 'n8n-workflow';
import type {
	ActionTypeDescription,
	AddedNode,
	AddedNodeConnection,
	AddedNodesAndConnections,
	INodeCreateElement,
	IUpdateInformation,
	LabelCreateElement,
} from '@/Interface';
import {
	AGENT_NODE_TYPE,
	BASIC_CHAIN_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	MANUAL_CHAT_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	NODE_CREATOR_OPEN_SOURCES,
	NO_OP_NODE_TYPE,
	OPEN_AI_ASSISTANT_NODE_TYPE,
	QA_CHAIN_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	SPLIT_IN_BATCHES_NODE_TYPE,
	STICKY_NODE_TYPE,
	TRIGGER_NODE_CREATOR_VIEW,
	WEBHOOK_NODE_TYPE,
} from '@/constants';
import { i18n } from '@/plugins/i18n';

import type { BaseTextKey } from '@/plugins/i18n';
import type { Telemetry } from '@/plugins/telemetry';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useExternalHooks } from '@/composables/useExternalHooks';

import { sortNodeCreateElements, transformNodeType } from '../utils';

export const useActions = () => {
	const nodeCreatorStore = useNodeCreatorStore();
	const instance = getCurrentInstance();

	const singleNodeOpenSources = [
		NODE_CREATOR_OPEN_SOURCES.PLUS_ENDPOINT,
		NODE_CREATOR_OPEN_SOURCES.NODE_CONNECTION_ACTION,
		NODE_CREATOR_OPEN_SOURCES.NODE_CONNECTION_DROP,
	];

	const actionsCategoryLocales = computed(() => {
		return {
			actions: instance?.proxy.$locale.baseText('nodeCreator.actionsCategory.actions') ?? '',
			triggers: instance?.proxy.$locale.baseText('nodeCreator.actionsCategory.triggers') ?? '',
		};
	});

	function getPlaceholderTriggerActions(subcategory: string) {
		const nodes = [WEBHOOK_NODE_TYPE, SCHEDULE_TRIGGER_NODE_TYPE];

		const matchedNodeTypes = nodeCreatorStore.mergedNodes
			.filter((node) => nodes.some((n) => n === node.name))
			.map((node) => {
				const transformed = transformNodeType(node, subcategory, 'action');

				if (transformed.type === 'action') {
					const nameBase = node.name.replace('n8n-nodes-base.', '');
					const localeKey = `nodeCreator.actionsPlaceholderNode.${nameBase}` as BaseTextKey;
					const overwriteLocale = instance?.proxy.$locale.baseText(localeKey) as string;

					// If the locale key is not the same as the node name, it means it contain a translation
					// and we should use it
					if (overwriteLocale !== localeKey) {
						transformed.properties.displayName = overwriteLocale;
					}
				}
				return transformed;
			});

		return matchedNodeTypes;
	}

	function filterActionsCategory(items: INodeCreateElement[], category: string) {
		return items.filter(
			(item) => item.type === 'action' && item.properties.codex.categories.includes(category),
		);
	}

	function injectActionsLabels(items: INodeCreateElement[]): INodeCreateElement[] {
		const extendedActions = sortNodeCreateElements([...items]);
		const labelsSet = new Set<string>();

		// Collect unique labels
		for (const action of extendedActions) {
			if (action.type !== 'action') continue;
			const label = action.properties?.codex?.label;
			labelsSet.add(label);
		}

		if (labelsSet.size <= 1) return extendedActions;

		// Create a map to store the first index of each label
		const firstIndexMap = new Map<string, number>();

		// Iterate through the extendedActions to find the first index of each label
		for (let i = 0; i < extendedActions.length; i++) {
			const action = extendedActions[i];
			if (action.type !== 'action') continue;
			const label = action.properties?.codex?.label;
			if (!firstIndexMap.has(label)) {
				firstIndexMap.set(label, i);
			}
		}

		// Keep track of the number of inserted labels
		let insertedLabels = 0;

		// Create and insert new label objects at the first index of each label
		for (const label of labelsSet) {
			const newLabel: LabelCreateElement = {
				uuid: label,
				type: 'label',
				key: label,
				subcategory: extendedActions[0].key,
				properties: {
					key: label,
				},
			};

			const insertIndex = firstIndexMap.get(label)! + insertedLabels;
			extendedActions.splice(insertIndex, 0, newLabel);
			insertedLabels++;
		}

		return extendedActions;
	}

	function parseCategoryActions(
		actions: INodeCreateElement[],
		category: string,
		withLabels = true,
	) {
		const filteredActions = filterActionsCategory(actions, category);
		if (withLabels) return injectActionsLabels(filteredActions);
		return filteredActions;
	}

	function getActionData(actionItem: ActionTypeDescription): IUpdateInformation {
		const displayOptions = actionItem.displayOptions;

		const displayConditions = Object.keys(displayOptions?.show || {}).reduce(
			(acc: IDataObject, showCondition: string) => {
				acc[showCondition] = displayOptions?.show?.[showCondition]?.[0];
				return acc;
			},
			{},
		);

		return {
			name: actionItem.displayName,
			key: actionItem.name,
			value: { ...actionItem.values, ...displayConditions } as INodeParameters,
		};
	}

	function shouldPrependManualTrigger(addedNodes: AddedNode[]): boolean {
		const { selectedView, openSource } = useNodeCreatorStore();
		const { workflowTriggerNodes } = useWorkflowsStore();
		const hasTrigger = addedNodes.some((node) => useNodeTypesStore().isTriggerNode(node.type));
		const workflowContainsTrigger = workflowTriggerNodes.length > 0;
		const isTriggerPanel = selectedView === TRIGGER_NODE_CREATOR_VIEW;
		const onlyStickyNodes = addedNodes.every((node) => node.type === STICKY_NODE_TYPE);

		// If the node creator was opened from the plus endpoint, node connection action, or node connection drop
		// then we do not want to append the manual trigger
		const isSingleNodeOpenSource = singleNodeOpenSources.includes(openSource);
		return (
			!isSingleNodeOpenSource &&
			!hasTrigger &&
			!workflowContainsTrigger &&
			isTriggerPanel &&
			!onlyStickyNodes
		);
	}
	function shouldPrependChatTrigger(addedNodes: AddedNode[]): boolean {
		const { allNodes } = useWorkflowsStore();

		const COMPATIBLE_CHAT_NODES = [
			QA_CHAIN_NODE_TYPE,
			AGENT_NODE_TYPE,
			BASIC_CHAIN_NODE_TYPE,
			OPEN_AI_ASSISTANT_NODE_TYPE,
		];

		const isChatTriggerMissing =
			allNodes.find((node) =>
				[MANUAL_CHAT_TRIGGER_NODE_TYPE, CHAT_TRIGGER_NODE_TYPE].includes(node.type),
			) === undefined;
		const isCompatibleNode = addedNodes.some((node) => COMPATIBLE_CHAT_NODES.includes(node.type));

		return isCompatibleNode && isChatTriggerMissing;
	}

	function getAddedNodesAndConnections(addedNodes: AddedNode[]): AddedNodesAndConnections {
		if (addedNodes.length === 0) {
			return { nodes: [], connections: [] };
		}

		const nodes: AddedNode[] = [];
		const connections: AddedNodeConnection[] = [];

		const nodeToAutoOpen = addedNodes.find((node) => node.type !== MANUAL_TRIGGER_NODE_TYPE);

		if (nodeToAutoOpen) {
			nodeToAutoOpen.openDetail = true;
		}

		if (shouldPrependChatTrigger(addedNodes)) {
			addedNodes.unshift({ type: CHAT_TRIGGER_NODE_TYPE, isAutoAdd: true });
			connections.push({
				from: { nodeIndex: 0 },
				to: { nodeIndex: 1 },
			});
		} else if (shouldPrependManualTrigger(addedNodes)) {
			addedNodes.unshift({ type: MANUAL_TRIGGER_NODE_TYPE, isAutoAdd: true });
			connections.push({
				from: { nodeIndex: 0 },
				to: { nodeIndex: 1 },
			});
		}

		addedNodes.forEach((node, index) => {
			nodes.push(node);

			switch (node.type) {
				case SPLIT_IN_BATCHES_NODE_TYPE: {
					const splitInBatchesIndex = index;
					const noOpIndex = splitInBatchesIndex + 1;
					nodes.push({
						type: NO_OP_NODE_TYPE,
						isAutoAdd: true,
						name: i18n.baseText('nodeView.replaceMe'),
					});
					connections.push(
						{
							from: { nodeIndex: splitInBatchesIndex, outputIndex: 1 },
							to: { nodeIndex: noOpIndex },
						},
						{
							from: { nodeIndex: noOpIndex },
							to: { nodeIndex: splitInBatchesIndex },
						},
					);
					break;
				}
			}
		});

		return { nodes, connections };
	}

	// Hook into addNode action to set the last node parameters & track the action selected
	function setAddedNodeActionParameters(
		action: IUpdateInformation,
		telemetry?: Telemetry,
		rootView = '',
	) {
		const { $onAction: onWorkflowStoreAction } = useWorkflowsStore();
		const storeWatcher = onWorkflowStoreAction(
			({ name, after, store: { setLastNodeParameters }, args }) => {
				if (name !== 'addNode' || args[0].type !== action.key) return;
				after(() => {
					setLastNodeParameters(action);
					if (telemetry) trackActionSelected(action, telemetry, rootView);
					// Unsubscribe from the store watcher
					storeWatcher();
				});
			},
		);

		return storeWatcher;
	}

	function trackActionSelected(action: IUpdateInformation, telemetry: Telemetry, rootView: string) {
		const payload = {
			node_type: action.key,
			action: action.name,
			source_mode: rootView.toLowerCase(),
			resource: (action.value as INodeParameters).resource || '',
		};
		void useExternalHooks().run('nodeCreateList.addAction', payload);
		telemetry?.trackNodesPanel('nodeCreateList.addAction', payload);
	}

	return {
		actionsCategoryLocales,
		getPlaceholderTriggerActions,
		parseCategoryActions,
		getAddedNodesAndConnections,
		getActionData,
		setAddedNodeActionParameters,
	};
};
