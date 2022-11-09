import {
	INodeTypeDescription,
	INodeProperties,
	INodeAction,
	INodePropertyOptions,
	INodePropertyCollection,
} from 'n8n-workflow';
import { capitalCase } from 'change-case';

const customNodeActionsParsers: {
	[key: string]: (matchedProperty: INodeProperties) => INodeAction[] | undefined;
} = {
	['n8n-nodes-base.hubspotTrigger']: (matchedProperty) => {
		const collection = matchedProperty?.options?.[0] as INodePropertyCollection;
		return collection?.values[0]?.options?.map((categoryItem: INodePropertyOptions) => ({
			nodeName: 'n8n-nodes-base.hubspotTrigger',
			key: categoryItem.value as string,
			title: `When ${capitalCase(categoryItem.name)}`,
			description: categoryItem.description,
			displayOptions: matchedProperty.displayOptions,
			values: { eventsUi: { eventValues: [{ name: categoryItem.value }] } },
		}));
	},
};

class NodeTypeActionsClass {
	#recommendedCategory(properties: INodeProperties[], name: string): INodeAction | null {
		const matchingKeys = ['event', 'events', 'trigger on'];
		const matchedProperty = properties.find((property) =>
			matchingKeys.includes(property.displayName?.toLowerCase()),
		);

		if (!matchedProperty || !matchedProperty.options) return null;

		const filteredOutItems = matchedProperty.options.filter(
			(categoryItem: INodePropertyOptions) => !['*', '', ' '].includes(categoryItem.name),
		);

		const customParsedItem = customNodeActionsParsers[name]?.(matchedProperty);

		const items =
			customParsedItem ??
			filteredOutItems.map((categoryItem: INodePropertyOptions) => ({
				nodeName: name,
				key: categoryItem.value as string,
				title: `When ${capitalCase(categoryItem.name)}`,
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

	#resourceCategories(properties: INodeProperties[], name: string): INodeAction[] {
		const categories: INodeAction[] = [];
		const matchingKeys = ['resource'];
		const matchedProperties = properties?.filter((property) =>
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

				const operations = properties.find(
					(operation) =>
						operation.name === 'operation' &&
						operation.displayOptions?.show?.resource?.includes(resourceOption.value),
				);

				if (!operations?.options) return;

				resourceCategory.items = operations.options.map(
					(operationOption: INodePropertyOptions) => ({
						nodeName: name,
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
				this.#recommendedCategory(nodeTypeDescription.properties, nodeTypeDescription.name),
				...this.#resourceCategories(nodeTypeDescription.properties, nodeTypeDescription.name),
			].filter((action): action is INodeAction => action !== null),
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
