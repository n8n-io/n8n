import { startCase } from 'lodash';
import { defineStore } from 'pinia';
import {
	INodePropertyCollection,
	INodePropertyOptions,
	IDataObject,
	INodeProperties,
	INodeTypeDescription,
	deepCopy,
	INodeParameters,
	INodeActionTypeDescription,
} from 'n8n-workflow';
import {
	STORES,
	MANUAL_TRIGGER_NODE_TYPE,
	CORE_NODES_CATEGORY,
	TRIGGER_NODE_FILTER,
	STICKY_NODE_TYPE,
} from '@/constants';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { useWorkflowsStore } from './workflows';
import { CUSTOM_API_CALL_KEY, ALL_NODE_FILTER } from '@/constants';
import { INodeCreatorState, INodeFilterType, IUpdateInformation } from '@/Interface';
import { BaseTextKey, i18n } from '@/plugins/i18n';
import { externalHooks } from '@/mixins/externalHooks';
import { Telemetry } from '@/plugins/telemetry';

const PLACEHOLDER_RECOMMENDED_ACTION_KEY = 'placeholder_recommended';

const customNodeActionsParsers: {
	[key: string]: (
		matchedProperty: INodeProperties,
		nodeTypeDescription: INodeTypeDescription,
	) => INodeActionTypeDescription[] | undefined;
} = {
	['n8n-nodes-base.hubspotTrigger']: (matchedProperty, nodeTypeDescription) => {
		const collection = matchedProperty?.options?.[0] as INodePropertyCollection;

		return (collection?.values[0]?.options as INodePropertyOptions[])?.map(
			(categoryItem): INodeActionTypeDescription => ({
				...getNodeTypeBase(
					nodeTypeDescription,
					i18n.baseText('nodeCreator.actionsCategory.triggers'),
				),
				actionKey: categoryItem.value as string,
				displayName: i18n.baseText('nodeCreator.actionsCategory.onEvent', {
					interpolate: { event: startCase(categoryItem.name) },
				}),
				description: categoryItem.description || '',
				displayOptions: matchedProperty.displayOptions,
				values: { eventsUi: { eventValues: [{ name: categoryItem.value }] } },
			}),
		);
	},
};

function filterActions(actions: INodeActionTypeDescription[]) {
	return actions.filter(
		(action: INodeActionTypeDescription, _: number, arr: INodeActionTypeDescription[]) => {
			const isApiCall = action.actionKey === CUSTOM_API_CALL_KEY;
			if (isApiCall) return false;

			const isPlaceholderTriggerAction = action.actionKey === PLACEHOLDER_RECOMMENDED_ACTION_KEY;
			return !isPlaceholderTriggerAction || (isPlaceholderTriggerAction && arr.length > 1);
		},
	);
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
		defaults: {
			...nodeTypeDescription.defaults,
		},
		inputs: [],
		outputs: [],
		properties: [],
	};
}

function operationsCategory(
	nodeTypeDescription: INodeTypeDescription,
): INodeActionTypeDescription[] {
	if (!!nodeTypeDescription.properties.find((property) => property.name === 'resource')) return [];

	const matchedProperty = nodeTypeDescription.properties.find(
		(property) => property.name?.toLowerCase() === 'operation',
	);

	if (!matchedProperty || !matchedProperty.options) return [];

	const filteredOutItems = (matchedProperty.options as INodePropertyOptions[]).filter(
		(categoryItem: INodePropertyOptions) => !['*', '', ' '].includes(categoryItem.name),
	);

	const items = filteredOutItems.map((item: INodePropertyOptions) => ({
		...getNodeTypeBase(nodeTypeDescription, i18n.baseText('nodeCreator.actionsCategory.actions')),
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

function triggersCategory(nodeTypeDescription: INodeTypeDescription): INodeActionTypeDescription[] {
	const matchingKeys = ['event', 'events', 'trigger on'];
	const isTrigger = nodeTypeDescription.displayName?.toLowerCase().includes('trigger');
	const matchedProperty = nodeTypeDescription.properties.find((property) =>
		matchingKeys.includes(property.displayName?.toLowerCase()),
	);

	if (!isTrigger) return [];

	// Inject placeholder action if no events are available
	// so user is able to add node to the canvas from the actions panel
	if (!matchedProperty || !matchedProperty.options) {
		return [
			{
				...getNodeTypeBase(
					nodeTypeDescription,
					i18n.baseText('nodeCreator.actionsCategory.triggers'),
				),
				actionKey: PLACEHOLDER_RECOMMENDED_ACTION_KEY,
				displayName: i18n.baseText('nodeCreator.actionsCategory.onNewEvent', {
					interpolate: { event: nodeTypeDescription.displayName.replace('Trigger', '').trimEnd() },
				}),
				description: '',
			},
		];
	}

	const filteredOutItems = (matchedProperty.options as INodePropertyOptions[]).filter(
		(categoryItem: INodePropertyOptions) => !['*', '', ' '].includes(categoryItem.name),
	);

	const customParsedItem = customNodeActionsParsers[nodeTypeDescription.name]?.(
		matchedProperty,
		nodeTypeDescription,
	);

	const items =
		customParsedItem ??
		filteredOutItems.map((categoryItem: INodePropertyOptions) => ({
			...getNodeTypeBase(
				nodeTypeDescription,
				i18n.baseText('nodeCreator.actionsCategory.triggers'),
			),
			actionKey: categoryItem.value as string,
			displayName:
				categoryItem.action ??
				i18n.baseText('nodeCreator.actionsCategory.onEvent', {
					interpolate: { event: startCase(categoryItem.name) },
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

function resourceCategories(
	nodeTypeDescription: INodeTypeDescription,
): INodeActionTypeDescription[] {
	const transformedNodes: INodeActionTypeDescription[] = [];
	const matchedProperties = nodeTypeDescription.properties.filter(
		(property) => property.displayName?.toLowerCase() === 'resource',
	);

	matchedProperties.forEach((property) => {
		((property.options as INodePropertyOptions[]) || [])
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

				const items = ((operations.options as INodePropertyOptions[]) || []).map(
					(operationOption) => {
						const displayName =
							operationOption.action ?? `${resourceOption.name} ${startCase(operationOption.name)}`;

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
		showScrim: false,
		selectedView: TRIGGER_NODE_FILTER,
		rootViewHistory: [],
	}),
	actions: {
		setShowScrim(isVisible: boolean) {
			this.showScrim = isVisible;
		},
		setSelectedView(selectedNodeType: INodeFilterType) {
			this.selectedView = selectedNodeType;
			if (!this.rootViewHistory.includes(selectedNodeType)) {
				this.rootViewHistory.push(selectedNodeType);
			}
		},
		closeCurrentView() {
			this.rootViewHistory.pop();
			this.selectedView = this.rootViewHistory[this.rootViewHistory.length - 1];
		},
		resetRootViewHistory() {
			this.rootViewHistory = [];
		},
		setFilter(search: string) {
			this.itemsFilter = search;
		},
		setAddedNodeActionParameters(action: IUpdateInformation, telemetry?: Telemetry, track = true) {
			const { $onAction: onWorkflowStoreAction } = useWorkflowsStore();
			const storeWatcher = onWorkflowStoreAction(
				({ name, after, store: { setLastNodeParameters }, args }) => {
					if (name !== 'addNode' || args[0].type !== action.key) return;
					after(() => {
						setLastNodeParameters(action);
						if (track) this.trackActionSelected(action, telemetry);
						storeWatcher();
					});
				},
			);

			return storeWatcher;
		},
		trackActionSelected(action: IUpdateInformation, telemetry?: Telemetry) {
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
				node.actions = [
					...triggersCategory(node),
					...operationsCategory(node),
					...resourceCategories(node),
				];

				return node;
			});
			return nodesWithActions;
		},
		mergedAppNodes(): INodeTypeDescription[] {
			const mergedNodes = [...this.visibleNodesWithActions]
				// Sort triggers so they are always on top and when later get merged
				// they won't be discarded if they have the same name as a core node which doesn't contain actions
				.sort((a, b) => {
					if (a.group.includes('trigger')) return -1;
					if (b.group.includes('trigger')) return 1;

					return 0;
				})
				.reduce((acc: Record<string, INodeTypeDescription>, node: INodeTypeDescription) => {
					const clonedNode = deepCopy(node);
					const actions = node.actions || [];
					// Do not merge core nodes
					const normalizedName = node.name.toLowerCase().replace('trigger', '');
					const existingNode = acc[normalizedName];

					if (existingNode) existingNode.actions?.push(...actions);
					else acc[normalizedName] = clonedNode;

					acc[normalizedName].displayName = node.displayName.replace('Trigger', '');

					return acc;
				}, {});

			const filteredNodes = Object.values(mergedNodes).map((node) => ({
				...node,
				actions: filterActions(node.actions || []),
			}));

			return filteredNodes;
		},
		getNodeTypesWithManualTrigger:
			() =>
			(nodeType?: string): string[] => {
				if (!nodeType) return [];

				const { workflowTriggerNodes } = useWorkflowsStore();
				const isTrigger = useNodeTypesStore().isTriggerNode(nodeType);
				const workflowContainsTrigger = workflowTriggerNodes.length > 0;
				const isTriggerPanel = useNodeCreatorStore().selectedView === TRIGGER_NODE_FILTER;
				const isStickyNode = nodeType === STICKY_NODE_TYPE;

				const nodeTypes =
					!isTrigger && !workflowContainsTrigger && isTriggerPanel && !isStickyNode
						? [MANUAL_TRIGGER_NODE_TYPE, nodeType]
						: [nodeType];

				return nodeTypes;
			},

		getActionData:
			() =>
			(actionItem: INodeActionTypeDescription): IUpdateInformation => {
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
			},
	},
});
