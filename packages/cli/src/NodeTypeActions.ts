import {
	INodeTypeDescription,
	INodeProperties,
	INodeAction,
	INodePropertyOptions,
	INodePropertyCollection,
} from 'n8n-workflow';
import { capitalCase } from 'change-case';
import { NodeTypes } from '@/NodeTypes';

class NodeTypeActionsClass {
	customNodeActionsParsers: {
		[key: string]: (matchedProperty: INodeProperties) => INodeAction[] | undefined;
	} = {
		['n8n-nodes-base.hubspotTrigger']: (matchedProperty) => {
			const collection = matchedProperty?.options?.[0] as INodePropertyCollection;
			return collection?.values[0]?.options?.map((categoryItem: INodePropertyOptions) => ({
				nodeName: 'n8n-nodes-base.hubspotTrigger',
				key: categoryItem.value as string,
				title: `On ${capitalCase(categoryItem.name)}`,
				description: categoryItem.description,
				displayOptions: matchedProperty.displayOptions,
				values: { eventsUi: { eventValues: [{ name: categoryItem.value }] } },
			}));
		},
	};

	#operationsCategory(nodeTypeDescription: INodeTypeDescription): INodeAction | null {
		const matchingKeys = ['operation'];
		const excludedKeys = ['resource'];
		if (!!nodeTypeDescription.properties.find((property) => excludedKeys.includes(property.name)))
			return null;

		const matchedProperty = nodeTypeDescription.properties.find((property) =>
			matchingKeys.includes(property.name?.toLowerCase()),
		);

		if (!matchedProperty || !matchedProperty.options) return null;

		const filteredOutItems = matchedProperty.options.filter(
			(categoryItem: INodePropertyOptions) => !['*', '', ' '].includes(categoryItem.name),
		);

		const items = filteredOutItems.map((item: INodePropertyOptions) => ({
			nodeName: nodeTypeDescription.name,
			key: item.value as string,
			title: item.action ?? capitalCase(item.name),
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

	#recommendedCategory(nodeTypeDescription: INodeTypeDescription): INodeAction | null {
		const matchingKeys = ['event', 'events', 'trigger on'];
		const isTrigger = nodeTypeDescription.displayName?.toLowerCase().includes('trigger');
		const matchedProperty = nodeTypeDescription.properties.find((property) =>
			matchingKeys.includes(property.displayName?.toLowerCase()),
		);

		if (!isTrigger) return null;

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

		const filteredOutItems = matchedProperty.options.filter(
			(categoryItem: INodePropertyOptions) => !['*', '', ' '].includes(categoryItem.name),
		);

		const customParsedItem =
			this.customNodeActionsParsers[nodeTypeDescription.name]?.(matchedProperty);

		const items =
			customParsedItem ??
			filteredOutItems.map((categoryItem: INodePropertyOptions) => ({
				nodeName: nodeTypeDescription.name,
				key: categoryItem.value as string,
				title: `On ${capitalCase(categoryItem.name)}`,
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

	#resourceCategories(nodeTypeDescription: INodeTypeDescription): INodeAction[] {
		const categories: INodeAction[] = [];
		const matchingKeys = ['resource'];
		const matchedProperties = nodeTypeDescription.properties?.filter((property) =>
			matchingKeys.includes(property.displayName?.toLowerCase()),
		);

		matchedProperties.forEach((property) => {
			property.options?.forEach((resourceOption: INodePropertyOptions) => {
				const resourceCategory: INodeAction = {
					title: resourceOption.name,
					key: resourceOption.value as string,
					type: 'category',
					items: [],
				};

				const operations = nodeTypeDescription.properties.find(
					(operation) =>
						operation.name === 'operation' &&
						operation.displayOptions?.show?.resource?.includes(resourceOption.value),
				);

				if (!operations?.options) return;

				resourceCategory.items = operations.options.map(
					(operationOption: INodePropertyOptions) => ({
						nodeName: nodeTypeDescription.name,
						key: operationOption.value as string,
						title:
							operationOption.action ??
							`${resourceOption.name} ${capitalCase(operationOption.name)}`,
						description: operationOption?.description,
						displayOptions: operations?.displayOptions,
						values: {
							operation:
								operations?.type === 'multiOptions'
									? [operationOption.value]
									: operationOption.value,
						},
					}),
				);

				if (resourceCategory.items.length > 0) categories.push(resourceCategory);
			});
		});

		return categories;
	}

	extendWithActions(nodeTypeDescription: INodeTypeDescription): INodeTypeDescription {
		return Object.assign(nodeTypeDescription, {
			actions: [
				this.#recommendedCategory(NodeTypes().injectCustomApiCallOption(nodeTypeDescription)),
				...this.#resourceCategories(NodeTypes().injectCustomApiCallOption(nodeTypeDescription)),
				this.#operationsCategory(NodeTypes().injectCustomApiCallOption(nodeTypeDescription)),
			].filter((action: INodeAction) => action !== null),
		});
	}
}

let nodeTypesActionsInstance: NodeTypeActionsClass | undefined;

// eslint-disable-next-line @typescript-eslint/naming-convention
export function NodeTypeActions(): NodeTypeActionsClass {
	if (nodeTypesActionsInstance === undefined) {
		nodeTypesActionsInstance = new NodeTypeActionsClass();
	}

	return nodeTypesActionsInstance;
}
