/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
	INodeType,
	INodeTypeData,
	INodeTypeDescription,
	INodeTypes,
	INodeVersionedType,
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

	getAll(): Array<INodeType | INodeVersionedType> {
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
		nodeType: INodeType | INodeVersionedType,
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

	extendNodeTypeWithActions(nodeType: INodeTypeDescription): INodeTypeDescription {
		function recommendedCategory(properties: INodeProperties[]) {
			const matchingKeys = ['event', 'events', 'trigger on'];
			const matchedProperties = (properties ?? []).filter((property) =>
				matchingKeys.includes(property.displayName?.toLowerCase()),
			);

			if (matchedProperties.length === 0) return [];

			const items = matchedProperties.reduce((acc: INodeAction[], category) => {
				const options = (category.options ?? [])
					.filter(
						(categoryItem: INodePropertyOptions) => !['*', '', ' '].includes(categoryItem.name),
					)
					.map((categoryItem: INodePropertyOptions) => ({
						key: categoryItem.value?.toString(),
						title: `When ${capitalCase(categoryItem.name)}`,
						description: categoryItem.description,
						displayOptions: category.displayOptions,
						values: {
							[matchedProperties[0].name]:
								category.type === 'multiOptions' ? [categoryItem.value] : categoryItem.value,
						},
					}));

				return [...acc, ...options];
			}, []);

			// Do not return empty category
			if (items.length === 0) return [];

			return [
				{
					key: matchedProperties[0].name,
					title: 'Recommended',
					type: 'category',
					items,
				},
			];
		}

		function resourceCategories(properties: INodeProperties[]): INodeAction[] {
			const categories: INodeAction[] = [];
			const matchingKeys = ['resource'];
			const matchedProperties = properties?.filter((property: INodeProperties) =>
				matchingKeys.includes(property.displayName?.toLowerCase()),
			);

			matchedProperties.forEach((property) => {
				property.options?.forEach((resourceOption: INodePropertyOptions) => {
					const resourceCategory = {
						title: resourceOption.name,
						key: resourceOption.value?.toString(),
						type: 'category',
						items: [] as INodeAction[],
					};

					const operations = properties.find(
						(operation) =>
							operation.name === 'operation' &&
							operation.displayOptions?.show?.resource?.includes(resourceOption.value),
					);

					if (!operations?.options) return;

					resourceCategory.items = operations.options.map(
						(operationOption: INodePropertyOptions) => ({
							key: operationOption.value.toString(),
							title: `${resourceOption.name} ${capitalCase(operationOption.name)}`,
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

		return {
			...nodeType,
			actions: [
				...recommendedCategory(nodeType.properties),
				...resourceCategories(nodeType.properties),
			],
		};
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
