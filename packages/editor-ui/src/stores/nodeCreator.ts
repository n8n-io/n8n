import startCase from 'lodash.startCase';
import { defineStore } from "pinia";

import { INodeAction, INodePropertyCollection, INodePropertyOptions, INodeProperties, INodeTypeDescription, deepCopy } from 'n8n-workflow';
import { STORES } from "@/constants";
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { CUSTOM_API_CALL_KEY, ALL_NODE_FILTER } from '@/constants';
import { INodeCreateElement, INodeItemProps, INodeCreatorState, INodeFilterType } from '@/Interface';
import { i18n } from '@/plugins/i18n';

const PLACEHOLDER_RECOMMENDED_ACTION_KEY = 'placeholder_recommended';

const customNodeActionsParsers: {[key: string]: (matchedProperty: INodeProperties) => INodeAction[] | undefined} = {
	['n8n-nodes-base.hubspotTrigger']: (matchedProperty) => {
		const collection = matchedProperty?.options?.[0] as INodePropertyCollection;

		return (collection?.values[0]?.options as INodePropertyOptions[])?.map((categoryItem) => ({
			nodeName: 'n8n-nodes-base.hubspotTrigger',
			key: categoryItem.value as string,
			title: i18n.baseText('nodeCreator.actionsCategory.onEvent', {
				interpolate: {event: startCase(categoryItem.name)},
			}),
			description: categoryItem.description,
			displayOptions: matchedProperty.displayOptions,
			values: { eventsUi: { eventValues: [{ name: categoryItem.value }] } },
		}));
	},
};

function operationsCategory(nodeTypeDescription: INodeTypeDescription): INodeAction | null {
	if (!!nodeTypeDescription.properties.find((property) => property.name === 'resource')) return null;

	const matchedProperty = nodeTypeDescription.properties
		.find((property) =>property.name?.toLowerCase() === 'operation');

	if (!matchedProperty || !matchedProperty.options) return null;

	const filteredOutItems = (matchedProperty.options as INodePropertyOptions[]).filter(
		(categoryItem: INodePropertyOptions) => !['*', '', ' '].includes(categoryItem.name),
	);

	const items = filteredOutItems.map((item: INodePropertyOptions) => ({
		nodeName: nodeTypeDescription.name,
		key: item.value as string,
		title: item.action ?? startCase(item.name),
		description: item.description,
		displayOptions: matchedProperty.displayOptions,
		values: {
			[matchedProperty.name]: matchedProperty.type === 'multiOptions' ? [item.value] : item.value,
		},
	}));

	// Do not return empty category
	if (items.length === 0) return null;

	return {
		key: matchedProperty.name,
		title: i18n.baseText('nodeCreator.actionsCategory.operations'),
		type: 'category',
		items,
	};
}

function recommendedCategory(nodeTypeDescription: INodeTypeDescription): INodeAction | null {
	const matchingKeys = ['event', 'events', 'trigger on'];
	const isTrigger = nodeTypeDescription.displayName?.toLowerCase().includes('trigger');
	const matchedProperty = nodeTypeDescription.properties.find((property) =>
		matchingKeys.includes(property.displayName?.toLowerCase()),
	);

	if (!isTrigger) return null;

	// Inject placeholder action if no events are available
	// so user is able to add node to the canvas from the actions panel
	if (!matchedProperty || !matchedProperty.options) {
		return {
			key: PLACEHOLDER_RECOMMENDED_ACTION_KEY,
			title: i18n.baseText('nodeCreator.actionsCategory.recommended'),
			type: 'category',
			items: [
				{
					nodeName: nodeTypeDescription.name,
					key: nodeTypeDescription.name,
					title: i18n.baseText('nodeCreator.actionsCategory.onNewEvent', {
						interpolate: {event: nodeTypeDescription.displayName.replace('Trigger', '').trimEnd()},
					}),
					displayOptions: {},
					values: {},
				},
			],
		};
	}

	const filteredOutItems = (matchedProperty.options as INodePropertyOptions[]).filter(
		(categoryItem: INodePropertyOptions) => !['*', '', ' '].includes(categoryItem.name),
	);

	const customParsedItem = customNodeActionsParsers[nodeTypeDescription.name]?.(matchedProperty);

	const items =
		customParsedItem ??
		filteredOutItems.map((categoryItem: INodePropertyOptions) => ({
			nodeName: nodeTypeDescription.name,
			key: categoryItem.value as string,
			title: i18n.baseText('nodeCreator.actionsCategory.onEvent', {
				interpolate: {event: startCase(categoryItem.name)},
			}),
			description: categoryItem.description,
			displayOptions: matchedProperty.displayOptions,
			values: {
				[matchedProperty.name]:
					matchedProperty.type === 'multiOptions' ? [categoryItem.value] : categoryItem.value,
			},
		}));

	// Do not return empty category
	if (items.length === 0) return null;

	return {
		key: matchedProperty.name,
		title: i18n.baseText('nodeCreator.actionsCategory.recommended'),
		type: 'category',
		items,
	};
}

function resourceCategories(nodeTypeDescription: INodeTypeDescription): INodeAction[] {
	const categories: INodeAction[] = [];
	const matchedProperties = nodeTypeDescription.properties.filter((property) =>property.displayName?.toLowerCase() === 'resource');

	matchedProperties.forEach((property) => {
		(property.options as INodePropertyOptions[] || [])
			.filter((option) => option.value !== CUSTOM_API_CALL_KEY)
			.forEach((resourceOption, i, options) => {
				const isSingleResource = options.length === 1;
				const resourceCategory: INodeAction = {
					title: resourceOption.name,
					key: resourceOption.value as string,
					type: 'category',
					items: [],
				};

				// Match operations for the resource by checking if displayOptions matches or contains the resource name
				const operations = nodeTypeDescription.properties.find(
					(operation) =>
						operation.name === 'operation' &&
						(operation.displayOptions?.show?.resource?.includes(resourceOption.value) ||
							isSingleResource),
				);

				if (!operations?.options) return;

				resourceCategory.items = (operations.options as INodePropertyOptions[]).map(
					(operationOption) => {
						const title =
							operationOption.action ??
							`${resourceOption.name} ${startCase(operationOption.name)}`;

						// We need to manually populate displayOptions as they are not present in the node description
						// if the resource has only one option
						const displayOptions = isSingleResource
							? { show: { resource: [(options as INodePropertyOptions[])[0]?.value] } }
							: operations?.displayOptions;

						return {
							nodeName: nodeTypeDescription.name,
							key: operationOption.value as string,
							title,
							description: operationOption?.description,
							displayOptions,
							values: {
								operation:
									operations?.type === 'multiOptions'
										? [operationOption.value]
										: operationOption.value,
							},
						};
					},
				);

				if (resourceCategory.items.length > 0) categories.push(resourceCategory);
			});
	});

	return categories;
}

const getNodeType = (nodeCreateElement: INodeCreateElement): INodeTypeDescription => (nodeCreateElement.properties as INodeItemProps).nodeType;

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
	},
	getters: {
		mergedNodesWithActions(): INodeCreateElement[] {
			const mergedNodes = this.categorizedNodesWithActions.reduce((acc: Record<string, INodeCreateElement>, node: INodeCreateElement) => {
				const clonedNode = deepCopy(node);
				const nodeType = getNodeType(clonedNode);
				const actions = nodeType.actions || [];
				const normalizedName = nodeType.name.toLowerCase().replace('trigger', '');
				const existingNode = acc[normalizedName];

				if(existingNode) getNodeType(existingNode).actions?.push(...actions);
				else acc[normalizedName] = clonedNode;

				// Filter-out placeholder recommended actions if they are the only actions
				nodeType.actions = (nodeType.actions || [])
					.filter((action: INodeAction, _: number, arr: INodeAction[]) => {
						const isPlaceholderCategory = action.key === PLACEHOLDER_RECOMMENDED_ACTION_KEY;
						return !isPlaceholderCategory || (isPlaceholderCategory && arr.length > 1);
					});

				return acc;
			}, {});

			return Object.values(mergedNodes)
				.sort((a, b) => getNodeType(a).displayName.localeCompare(getNodeType(b).displayName));
		},
		categorizedNodesWithActions(): INodeCreateElement[] {
			const nodes = deepCopy(useNodeTypesStore().categorizedItems).filter((i) => i.type === 'node');
			const uniqueNodes = [...new Map(nodes.map((node: INodeCreateElement) => [getNodeType(node).name, node])).values()];
			const nodesWithActions = uniqueNodes.map((node) => {
				const nodeType = getNodeType(node);

				nodeType.actions = [
					recommendedCategory(nodeType),
					...resourceCategories(nodeType),
					operationsCategory(nodeType),
				].filter((action: INodeAction | null) => action) as INodeAction[];

				return node;
			});

			return nodesWithActions;
		},
	},
});
