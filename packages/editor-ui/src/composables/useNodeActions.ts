import { INodeAction, INodePropertyCollection, INodePropertyOptions, INodeProperties, INodeTypeDescription, deepCopy } from 'n8n-workflow';
import { reactive, del, computed, onMounted, onUnmounted, getCurrentInstance } from 'vue';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import startcase from 'lodash.startcase';
import { CUSTOM_API_CALL_KEY, CORE_NODES_CATEGORY, EMAIL_IMAP_NODE_TYPE, WEBHOOK_NODE_TYPE } from '@/constants';
import { INodeCreateElement, INodeItemProps } from '@/Interface';
import { I18nClass } from '@/plugins/i18n';

const WHITELISTED_APP_CORE_NODES = [
	EMAIL_IMAP_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
];

const customNodeActionsParsers: {[key: string]: (matchedProperty: INodeProperties) => INodeAction[] | undefined} = {
	['n8n-nodes-base.hubspotTrigger']: (matchedProperty) => {
		const collection = matchedProperty?.options?.[0] as INodePropertyCollection;

		return (collection?.values[0]?.options as INodePropertyOptions[])?.map((categoryItem) => ({
			nodeName: 'n8n-nodes-base.hubspotTrigger',
			key: categoryItem.value as string,
			title: `On ${startcase(categoryItem.name)}`,
			description: categoryItem.description,
			displayOptions: matchedProperty.displayOptions,
			values: { eventsUi: { eventValues: [{ name: categoryItem.value }] } },
		}));
	},
};

function operationsCategory(nodeTypeDescription: INodeTypeDescription, $locale: I18nClass): INodeAction | null {
	console.log($locale.baseText('nodeCreator.actionsCategory.recommended'));
	const matchingKeys = ['operation'];
	const excludedKeys = ['resource'];

	if (!!nodeTypeDescription.properties.find((property) => excludedKeys.includes(property.name)))
		return null;

	const matchedProperty = nodeTypeDescription.properties.find((property) =>
		matchingKeys.includes(property.name?.toLowerCase()),
	);

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
		title: 'Operations',
		type: 'category',
		items,
	};
}

function recommendedCategory(nodeTypeDescription: INodeTypeDescription,  $locale: I18nClass): INodeAction | null {
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
			key: 'placeholder_recommended',
			title: 'Recommended',
			type: 'category',
			items: [
				{
					nodeName: nodeTypeDescription.name,
					key: nodeTypeDescription.name,
					title: `On new ${nodeTypeDescription.displayName
						.replace('Trigger', '')
						.trimEnd()} event`,
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
			title: `On ${startcase(categoryItem.name)}`,
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
		title: 'Recommended',
		type: 'category',
		items,
	};
}

function resourceCategories(nodeTypeDescription: INodeTypeDescription, $locale: I18nClass): INodeAction[] {
	const categories: INodeAction[] = [];
	const matchingKeys = ['resource'];
	const matchedProperties = nodeTypeDescription.properties?.filter((property) =>
		matchingKeys.includes(property.displayName?.toLowerCase()),
	);

	matchedProperties.forEach((property) => {
		(property.options as INodePropertyOptions[])
			?.filter((option) => option.value !== CUSTOM_API_CALL_KEY)
			.forEach((resourceOption, i, options) => {
				const isSingleResource = options.length === 1;
				const resourceCategory: INodeAction = {
					title: resourceOption.name,
					key: resourceOption.value as string,
					type: 'category',
					items: [],
				};

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

export default () => {
	const instance = getCurrentInstance();
	const $locale = instance?.proxy.$locale as I18nClass;
	const { categorizedItems } = useNodeTypesStore();

	const categorizedNodesWithActions = computed<INodeCreateElement[]>(() => {
		const nodes = deepCopy(categorizedItems).filter((i) => i.type === 'node');

		const nodesWithActions = nodes.map((node) => {
			const nodeTypeDescription = (node.properties as INodeItemProps).nodeType;

			nodeTypeDescription.actions = [
				recommendedCategory(nodeTypeDescription, $locale),
				...resourceCategories(nodeTypeDescription, $locale),
				operationsCategory(nodeTypeDescription, $locale),
			].filter((action: INodeAction | null) => action) as INodeAction[];

			return node;
		});

		return nodesWithActions;
	});

	function getMergedNodesActions(excludedCoreNode = false): INodeCreateElement[] {
		console.log('Recalculating merged nodes actions');
		return Object.values(
			categorizedNodesWithActions.value.reduce((acc: Record<string, INodeCreateElement>, node: INodeCreateElement) => {
				const clonedNode = deepCopy(node);
				const nodeType = (clonedNode.properties as INodeItemProps).nodeType;
				const actions = nodeType.actions || [];
				const isCoreNode = nodeType.codex?.categories?.includes(CORE_NODES_CATEGORY) && !WHITELISTED_APP_CORE_NODES.includes(node.key);
				const normalizedName = clonedNode.key.toLowerCase().replace('trigger', '');

				if(excludedCoreNode && isCoreNode) return acc;

				const existingNode = acc[normalizedName];
				if(existingNode) {
					(existingNode.properties as INodeItemProps).nodeType.actions?.push(...actions);
				} else {
					acc[normalizedName] = clonedNode;
				}

				// Filter-out placeholder recommended actions if they are the only actions
				nodeType.actions = (nodeType.actions || []).filter((action: INodeAction, _: number, arr: INodeAction[]) => {
					const isPlaceholderCategory = action.key === 'placeholder_recommended';
					return !isPlaceholderCategory || (isPlaceholderCategory && arr.length > 1);
				});

				return acc;
			}, {}),
		);
	}
	return {
		categorizedNodesWithActions,
		getMergedNodesActions,
	};
};

