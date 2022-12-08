import startCase from 'lodash.startCase';
import { defineStore } from "pinia";
import { INodePropertyCollection, INodePropertyOptions, IDataObject, INodeProperties, INodeTypeDescription, deepCopy, INodeParameters, INodeActionTypeDescription } from 'n8n-workflow';
import { STORES, MANUAL_TRIGGER_NODE_TYPE, CORE_NODES_CATEGORY, CALENDLY_TRIGGER_NODE_TYPE, TRIGGER_NODE_FILTER } from "@/constants";
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { useWorkflowsStore } from './workflows';
import { CUSTOM_API_CALL_KEY, ALL_NODE_FILTER } from '@/constants';
import { INodeCreatorState, INodeFilterType, IUpdateInformation } from '@/Interface';
import { i18n } from '@/plugins/i18n';
import { externalHooks } from '@/mixins/externalHooks';
import { Telemetry } from '@/plugins/telemetry';

const PLACEHOLDER_RECOMMENDED_ACTION_KEY = 'placeholder_recommended';

const customNodeActionsParsers: {[key: string]: (matchedProperty: INodeProperties, nodeTypeDescription: INodeTypeDescription) => INodeActionTypeDescription[] | undefined} = {
	['n8n-nodes-base.hubspotTrigger']: (matchedProperty, nodeTypeDescription) => {
		const collection = matchedProperty?.options?.[0] as INodePropertyCollection;

		return (collection?.values[0]?.options as INodePropertyOptions[])?.map((categoryItem): INodeActionTypeDescription => ({
			...getNodeTypeBase(nodeTypeDescription, i18n.baseText('nodeCreator.actionsCategory.recommended')),
			actionKey: categoryItem.value as string,
			displayName: i18n.baseText('nodeCreator.actionsCategory.onEvent', {
				interpolate: {event: startCase(categoryItem.name)},
			}),
			description: categoryItem.description || '',
			displayOptions: matchedProperty.displayOptions,
			values: { eventsUi: { eventValues: [{ name: categoryItem.value }] } },
		}));
	},
};

function filterSinglePlaceholderAction(actions: INodeActionTypeDescription[]) {
	return actions.filter((action: INodeActionTypeDescription, _: number, arr: INodeActionTypeDescription[]) => {
		const isPlaceholderTriggerAction = action.actionKey === PLACEHOLDER_RECOMMENDED_ACTION_KEY;
		return !isPlaceholderTriggerAction || (isPlaceholderTriggerAction && arr.length > 1);
	});
}

function getNodeTypeBase(nodeTypeDescription: INodeTypeDescription, category: string) {
	return {
		name: nodeTypeDescription.name,
		group: ['trigger'],
		codex: {
			categories: [category],
			subcategories: {
				[nodeTypeDescription.displayName]: [category],
			},
		},
		iconUrl: nodeTypeDescription.iconUrl,
		icon: nodeTypeDescription.icon,
		version: [1],
		defaults: {},
		inputs: [],
		outputs: [],
		properties: [],
	};
}

function operationsCategory(nodeTypeDescription: INodeTypeDescription): INodeActionTypeDescription[] {
	if (!!nodeTypeDescription.properties.find((property) => property.name === 'resource')) return [];

	const matchedProperty = nodeTypeDescription.properties
		.find((property) =>property.name?.toLowerCase() === 'operation');

	if (!matchedProperty || !matchedProperty.options) return [];

	const filteredOutItems = (matchedProperty.options as INodePropertyOptions[]).filter(
		(categoryItem: INodePropertyOptions) => !['*', '', ' '].includes(categoryItem.name),
	);

	const items = filteredOutItems.map((item: INodePropertyOptions) => ({
		...getNodeTypeBase(nodeTypeDescription, i18n.baseText('nodeCreator.actionsCategory.operations')),
		actionKey: item.value as string,
		displayName: item.action ?? startCase(item.name),
		description: item.description ?? '',
		displayOptions: matchedProperty.displayOptions,
		values: {
			[matchedProperty.name]: matchedProperty.type === 'multiOptions' ? [item.value] : item.value,
		},
	}));

	// Do not return empty category
	if (items.length === 0) return [];

	return items;
}

function recommendedCategory(nodeTypeDescription: INodeTypeDescription): INodeActionTypeDescription[] {
	const matchingKeys = ['event', 'events', 'trigger on'];
	const isTrigger = nodeTypeDescription.displayName?.toLowerCase().includes('trigger');
	const matchedProperty = nodeTypeDescription.properties.find((property) =>
		matchingKeys.includes(property.displayName?.toLowerCase()),
	);

	if (!isTrigger) return [];

	// Inject placeholder action if no events are available
	// so user is able to add node to the canvas from the actions panel
	if (!matchedProperty || !matchedProperty.options) {
		return [{
			...getNodeTypeBase(nodeTypeDescription, i18n.baseText('nodeCreator.actionsCategory.recommended')),
			actionKey: PLACEHOLDER_RECOMMENDED_ACTION_KEY,
			displayName: i18n.baseText('nodeCreator.actionsCategory.onNewEvent', {
				interpolate: {event: nodeTypeDescription.displayName.replace('Trigger', '').trimEnd()},
			}),
			description: '',
		}];
	}

	const filteredOutItems = (matchedProperty.options as INodePropertyOptions[]).filter(
		(categoryItem: INodePropertyOptions) => !['*', '', ' '].includes(categoryItem.name),
	);

	const customParsedItem = customNodeActionsParsers[nodeTypeDescription.name]?.(matchedProperty, nodeTypeDescription);

	const items =
		customParsedItem ??
		filteredOutItems.map((categoryItem: INodePropertyOptions) => ({
			...getNodeTypeBase(nodeTypeDescription, i18n.baseText('nodeCreator.actionsCategory.recommended')),
			actionKey: categoryItem.value as string,
			displayName: i18n.baseText('nodeCreator.actionsCategory.onEvent', {
				interpolate: {event: startCase(categoryItem.name)},
			}),
			description: categoryItem.description || '',
			displayOptions: matchedProperty.displayOptions,
			values: {
				[matchedProperty.name]:
					matchedProperty.type === 'multiOptions' ? [categoryItem.value] : categoryItem.value,
			},
		}));

	return items;
}

function resourceCategories(nodeTypeDescription: INodeTypeDescription): INodeActionTypeDescription[] {
	const transformedNodes: INodeActionTypeDescription[] = [];
	const matchedProperties = nodeTypeDescription.properties.filter((property) =>property.displayName?.toLowerCase() === 'resource');

	matchedProperties.forEach((property) => {
		(property.options as INodePropertyOptions[] || [])
			.filter((option) => option.value !== CUSTOM_API_CALL_KEY)
			.forEach((resourceOption, i, options) => {
				const isSingleResource = options.length === 1;

				// Match operations for the resource by checking if displayOptions matches or contains the resource name
				const operations = nodeTypeDescription.properties.find(
					(operation) =>
						operation.name === 'operation' &&
						(operation.displayOptions?.show?.resource?.includes(resourceOption.value) ||
							isSingleResource),
				);

				if (!operations?.options) return;

				const items = (operations.options as INodePropertyOptions[] || []).map(
					(operationOption) => {
						const displayName =
							operationOption.action ??
							`${resourceOption.name} ${startCase(operationOption.name)}`;

						// We need to manually populate displayOptions as they are not present in the node description
						// if the resource has only one option
						const displayOptions = isSingleResource
							? { show: { resource: [(options as INodePropertyOptions[])[0]?.value] } }
							: operations?.displayOptions;

						return {
							...getNodeTypeBase(nodeTypeDescription, resourceOption.name),
							actionKey: operationOption.value as string,
							description: operationOption?.description ?? '',
							displayOptions,
							values: {
								operation:
									operations?.type === 'multiOptions'
										? [operationOption.value]
										: operationOption.value,
							},
							displayName,
							group: ['trigger'],
						};
					},
				);

				transformedNodes.push(...items);
			});
	});

	return transformedNodes;
}

export const useNodeCreatorStore = defineStore(STORES.NODE_CREATOR, {
	state: (): INodeCreatorState => ({
		itemsFilter: '',
		showTabs: true,
		showScrim: false,
		selectedType: ALL_NODE_FILTER,
	}),
	actions: {
		setShowTabs(isVisible: boolean) {
			this.showTabs = isVisible;
		},
		setShowScrim(isVisible: boolean) {
			this.showScrim = isVisible;
		},
		setSelectedType(selectedNodeType: INodeFilterType) {
			this.selectedType = selectedNodeType;
		},
		setFilter(search: string) {
			this.itemsFilter = search;
		},
		setAddedNodeActionParameters (action: IUpdateInformation, telemetry?: Telemetry, track = true) {
			const { $onAction: onWorkflowStoreAction } = useWorkflowsStore();
			const storeWatcher = onWorkflowStoreAction(({ name, after, store: { setLastNodeParameters }, args }) => {
				if (name !== 'addNode' || args[0].type !== action.key) return;
				after(() => {
					setLastNodeParameters(action);
					if(track) this.trackActionSelected(action, telemetry);
					storeWatcher();
				});
			});

			return storeWatcher;
		},
		trackActionSelected (action: IUpdateInformation, telemetry?: Telemetry) {
			const { $externalHooks } = new externalHooks();

			const payload = {
				node_type: action.key,
				action: action.name,
				resource: (action.value as INodeParameters).resource || '',
			};
			$externalHooks().run('nodeCreateList.addAction', payload);
			telemetry?.trackNodesPanel('nodeCreateList.addAction', payload);
		},
	},
	getters: {
		visibleNodesWithActions(): INodeTypeDescription[] {
			const nodes = deepCopy(useNodeTypesStore().visibleNodeTypes);
			const nodesWithActions = nodes.map((node) => {
				const isCoreNode = node.codex?.categories?.includes(CORE_NODES_CATEGORY);
				// Core nodes shouldn't support actions
				node.actions = [];
				if(isCoreNode) return node;

				node.actions.push(
					...recommendedCategory(node),
					...operationsCategory(node),
					...resourceCategories(node),
				);

				return node;
			});
			return nodesWithActions;
		},
		mergedAppNodes(): INodeTypeDescription[] {
			const mergedNodes = this.visibleNodesWithActions.reduce((acc: Record<string, INodeTypeDescription>, node: INodeTypeDescription) => {

				const clonedNode = deepCopy(node);
				const isCoreNode = node.codex?.categories?.includes(CORE_NODES_CATEGORY);
				const actions = node.actions || [];
				// Do not merge core nodes
				const normalizedName = isCoreNode ? node.name : node.name.toLowerCase().replace('trigger', '');
				const existingNode = acc[normalizedName];

				if(existingNode) existingNode.actions?.push(...actions);
				else acc[normalizedName] = clonedNode;

				if(!isCoreNode) acc[normalizedName].displayName = node.displayName.replace('Trigger', '');

				acc[normalizedName].actions = filterSinglePlaceholderAction(acc[normalizedName].actions || []);
				return acc;
			}, {});
			return Object.values(mergedNodes);
		},
		getNodeTypesWithManualTrigger: () => (nodeType?: string): string[] => {
			if(!nodeType) return [];

			const { workflowTriggerNodes } = useWorkflowsStore();
			const isTriggerAction = nodeType.toLocaleLowerCase().includes('trigger');
			const workflowContainsTrigger = workflowTriggerNodes.length > 0;
			const isTriggerPanel = useNodeCreatorStore().selectedType === TRIGGER_NODE_FILTER;

			const nodeTypes = !isTriggerAction && !workflowContainsTrigger && isTriggerPanel
				? [MANUAL_TRIGGER_NODE_TYPE, nodeType]
				: [nodeType];

			return nodeTypes;
		},

		getActionData: () => (actionItem: INodeActionTypeDescription): IUpdateInformation => {
			const displayOptions = actionItem.displayOptions ;

			const displayConditions = Object.keys(displayOptions?.show || {})
				.reduce((acc: IDataObject, showCondition: string) => {
					acc[showCondition] = displayOptions?.show?.[showCondition]?.[0];
					return acc;
				}, {});

			return {
				name: actionItem.displayName,
				key: actionItem.name as string,
				value: { ...actionItem.values , ...displayConditions} as INodeParameters,
			};
		},
	},
});
