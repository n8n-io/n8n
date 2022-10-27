/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
	INodeType,
	INodeTypeData,
	INodeTypeDescription,
	INodeTypes,
	IVersionedNodeType,
	NodeHelpers,
	INodeProperties,
	INodeAction,
	INodePropertyOptions,
} from 'n8n-workflow';
import { capitalCase } from 'change-case';

class NodeTypesClass implements INodeTypes {
	nodeTypes: INodeTypeData = {};

	async init(nodeTypes: INodeTypeData): Promise<void> {
		// Some nodeTypes need to get special parameters applied like the
		// polling nodes the polling times
		// eslint-disable-next-line no-restricted-syntax
		for (const nodeTypeData of Object.values(nodeTypes)) {
			const nodeType = NodeHelpers.getVersionedNodeType(nodeTypeData.type);
			const applyParameters = NodeHelpers.getSpecialNodeParameters(nodeType);

			if (applyParameters.length) {
				nodeType.description.properties.unshift(...applyParameters);
			}
		}
		this.nodeTypes = nodeTypes;
	}

	getAll(): Array<INodeType | IVersionedNodeType> {
		return Object.values(this.nodeTypes).map((data) => data.type);
	}

	/**
	 * Variant of `getByNameAndVersion` that includes the node's source path, used to locate a node's translations.
	 */
	getWithSourcePath(
		nodeTypeName: string,
		version: number,
	): { description: INodeTypeDescription } & { sourcePath: string } {
		const nodeType = this.nodeTypes[nodeTypeName];

		if (!nodeType) {
			throw new Error(`Unknown node type: ${nodeTypeName}`);
		}

		const { description } = NodeHelpers.getVersionedNodeType(nodeType.type, version);

		return { description: { ...description }, sourcePath: nodeType.sourcePath };
	}

	getByNameAndVersion(nodeType: string, version?: number): INodeType {
		if (this.nodeTypes[nodeType] === undefined) {
			throw new Error(`The node-type "${nodeType}" is not known!`);
		}
		return NodeHelpers.getVersionedNodeType(this.nodeTypes[nodeType].type, version);
	}

	attachNodeType(
		nodeTypeName: string,
		nodeType: INodeType | IVersionedNodeType,
		sourcePath: string,
	): void {
		this.nodeTypes[nodeTypeName] = {
			type: nodeType,
			sourcePath,
		};
	}

	removeNodeType(nodeType: string): void {
		delete this.nodeTypes[nodeType];
	}

	#recommendedCategory(properties: INodeProperties[], name: string): INodeAction | null {
		const matchingKeys = ['event', 'events', 'trigger on'];
		const matchedProperty = properties.find((property) =>
			matchingKeys.includes(property.displayName?.toLowerCase()),
		);

		if (!matchedProperty || !matchedProperty.options) return null;

		const items = matchedProperty.options
			.filter(
				(categoryItem): categoryItem is INodePropertyOptions =>
					!['*', '', ' '].includes(categoryItem.name),
			)
			.map((categoryItem) => ({
				nodeName: name,
				key: categoryItem.value?.toString(),
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

let nodeTypesInstance: NodeTypesClass | undefined;

// eslint-disable-next-line @typescript-eslint/naming-convention
export function NodeTypes(): NodeTypesClass {
	if (nodeTypesInstance === undefined) {
		nodeTypesInstance = new NodeTypesClass();
	}

	return nodeTypesInstance;
}
