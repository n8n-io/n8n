import { INodeAction, INodePropertyCollection, INodePropertyOptions, INodeProperties, INodeTypeDescription, deepCopy } from 'n8n-workflow';
import { computed, getCurrentInstance } from 'vue';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import startcase from 'lodash.startcase';
import { CUSTOM_API_CALL_KEY, CORE_NODES_CATEGORY, EMAIL_IMAP_NODE_TYPE, WEBHOOK_NODE_TYPE } from '@/constants';
import { INodeCreateElement, INodeItemProps } from '@/Interface';
import { I18nClass } from '@/plugins/i18n';

const WHITELISTED_APP_CORE_NODES = [
	EMAIL_IMAP_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
];

const PLACEHOLDER_RECOMMENDED_ACTION_KEY = 'placeholder_recommended';

const customNodeActionsParsers: {[key: string]: (matchedProperty: INodeProperties, $locale: I18nClass) => INodeAction[] | undefined} = {
	['n8n-nodes-base.hubspotTrigger']: (matchedProperty, $locale) => {
		const collection = matchedProperty?.options?.[0] as INodePropertyCollection;

		return (collection?.values[0]?.options as INodePropertyOptions[])?.map((categoryItem) => ({
			nodeName: 'n8n-nodes-base.hubspotTrigger',
			key: categoryItem.value as string,
			title: $locale.baseText('nodeCreator.actionsCategory.onEvent', {
				interpolate: {event: startcase(categoryItem.name)},
			}),
			description: categoryItem.description,
			displayOptions: matchedProperty.displayOptions,
			values: { eventsUi: { eventValues: [{ name: categoryItem.value }] } },
		}));
	},
};

function operationsCategory(nodeTypeDescription: INodeTypeDescription, $locale: I18nClass): INodeAction | null {
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
		title: item.action ?? startcase(item.name),
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
		title: $locale.baseText('nodeCreator.actionsCategory.operations'),
		type: 'category',
		items,
	};
}

function recommendedCategory(nodeTypeDescription: INodeTypeDescription, $locale: I18nClass): INodeAction | null {
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
			title: $locale.baseText('nodeCreator.actionsCategory.recommended'),
			type: 'category',
			items: [
				{
					nodeName: nodeTypeDescription.name,
					key: nodeTypeDescription.name,
					title: $locale.baseText('nodeCreator.actionsCategory.onNewEvent', {
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

	const customParsedItem = customNodeActionsParsers[nodeTypeDescription.name]?.(matchedProperty, $locale);

	const items =
		customParsedItem ??
		filteredOutItems.map((categoryItem: INodePropertyOptions) => ({
			nodeName: nodeTypeDescription.name,
			key: categoryItem.value as string,
			title: $locale.baseText('nodeCreator.actionsCategory.onEvent', {
				interpolate: {event: startcase(categoryItem.name)},
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
		title: $locale.baseText('nodeCreator.actionsCategory.recommended'),
		type: 'category',
		items,
	};
}

function resourceCategories(nodeTypeDescription: INodeTypeDescription, $locale: I18nClass): INodeAction[] {
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
							`${resourceOption.name} ${startcase(operationOption.name)}`;

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

export default () => {
	const instance = getCurrentInstance();
	const $locale = instance?.proxy.$locale as I18nClass;
	const { categorizedItems } = useNodeTypesStore();

	const categorizedNodesWithActions = computed<INodeCreateElement[]>(() => {
		const nodes = deepCopy(categorizedItems).filter((i) => i.type === 'node');

		const uniqueNodes = [...new Map(nodes.map((node: INodeCreateElement) => [getNodeType(node).name, node])).values()];

		const nodesWithActions = uniqueNodes.map((node) => {
			const nodeType = getNodeType(node);

			nodeType.actions = [
				recommendedCategory(nodeType, $locale),
				...resourceCategories(nodeType, $locale),
				operationsCategory(nodeType, $locale),
			].filter((action: INodeAction | null) => action) as INodeAction[];

			return node;
		});

		return nodesWithActions;
	});

	function getMergedNodesActions(excludedCoreNode = false): INodeCreateElement[] {
		const mergedNodes = categorizedNodesWithActions.value.reduce((acc: Record<string, INodeCreateElement>, node: INodeCreateElement) => {
			const clonedNode = deepCopy(node);
			const nodeType = getNodeType(clonedNode);
			const actions = nodeType.actions || [];
			const isCoreNode = nodeType.codex?.categories?.includes(CORE_NODES_CATEGORY) && !WHITELISTED_APP_CORE_NODES.includes(node.key);
			const normalizedName = nodeType.name.toLowerCase().replace('trigger', '');

			if(excludedCoreNode && isCoreNode) return acc;

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
	}

	return {
		categorizedNodesWithActions,
		getMergedNodesActions,
	};
};

