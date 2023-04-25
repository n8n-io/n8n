import { getCurrentInstance, computed } from 'vue';
import type { IDataObject, INodeParameters } from 'n8n-workflow';
import type {
	ActionTypeDescription,
	INodeCreateElement,
	IUpdateInformation,
	LabelCreateElement,
} from '@/Interface';
import {
	MANUAL_TRIGGER_NODE_TYPE,
	NODE_CREATOR_OPEN_SOURCES,
	SCHEDULE_TRIGGER_NODE_TYPE,
	STICKY_NODE_TYPE,
	TRIGGER_NODE_CREATOR_VIEW,
	WEBHOOK_NODE_TYPE,
} from '@/constants';

import type { BaseTextKey } from '@/plugins/i18n';
import type { Telemetry } from '@/plugins/telemetry';
import { useNodeCreatorStore } from '@/stores/nodeCreator';
import { useWorkflowsStore } from '@/stores/workflows';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { runExternalHook } from '@/utils';
import { useWebhooksStore } from '@/stores/webhooks';

import { sortNodeCreateElements, transformNodeType } from '../utils';

export const useActions = () => {
	const nodeCreatorStore = useNodeCreatorStore();
	const instance = getCurrentInstance();

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
			key: actionItem.name as string,
			value: { ...actionItem.values, ...displayConditions } as INodeParameters,
		};
	}

	function getNodeTypesWithManualTrigger(nodeType?: string): string[] {
		if (!nodeType) return [];

		const { selectedView, openSource } = useNodeCreatorStore();
		const { workflowTriggerNodes } = useWorkflowsStore();
		const isTrigger = useNodeTypesStore().isTriggerNode(nodeType);
		const workflowContainsTrigger = workflowTriggerNodes.length > 0;
		const isTriggerPanel = selectedView === TRIGGER_NODE_CREATOR_VIEW;
		const isStickyNode = nodeType === STICKY_NODE_TYPE;
		const singleNodeOpenSources = [
			NODE_CREATOR_OPEN_SOURCES.PLUS_ENDPOINT,
			NODE_CREATOR_OPEN_SOURCES.NODE_CONNECTION_ACTION,
			NODE_CREATOR_OPEN_SOURCES.NODE_CONNECTION_DROP,
		];

		// If the node creator was opened from the plus endpoint, node connection action, or node connection drop
		// then we do not want to append the manual trigger
		const isSingleNodeOpenSource = singleNodeOpenSources.includes(openSource);
		const shouldAppendManualTrigger =
			!isSingleNodeOpenSource &&
			!isTrigger &&
			!workflowContainsTrigger &&
			isTriggerPanel &&
			!isStickyNode;

		const nodeTypes = shouldAppendManualTrigger ? [MANUAL_TRIGGER_NODE_TYPE, nodeType] : [nodeType];

		return nodeTypes;
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
		runExternalHook('nodeCreateList.addAction', useWebhooksStore(), payload);
		telemetry?.trackNodesPanel('nodeCreateList.addAction', payload);
	}

	return {
		actionsCategoryLocales,
		getPlaceholderTriggerActions,
		parseCategoryActions,
		getNodeTypesWithManualTrigger,
		getActionData,
		setAddedNodeActionParameters,
	};
};
