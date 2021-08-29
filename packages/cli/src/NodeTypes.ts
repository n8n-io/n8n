import { INodeType, INodeTypeData, INodeTypes, NodeHelpers } from 'n8n-workflow';

class NodeTypesClass implements INodeTypes {
	nodeTypes: INodeTypeData = {};

	async init(nodeTypes: INodeTypeData): Promise<void> {
		// Some nodeTypes need to get special parameters applied like the
		// polling nodes the polling times
		// eslint-disable-next-line no-restricted-syntax
		for (const nodeTypeData of Object.values(nodeTypes)) {
			const applyParameters = NodeHelpers.getSpecialNodeParameters(nodeTypeData.type);

			if (applyParameters.length) {
				// eslint-disable-next-line prefer-spread
				nodeTypeData.type.description.properties.unshift.apply(
					nodeTypeData.type.description.properties,
					applyParameters,
				);
			}
		}
		this.nodeTypes = nodeTypes;
	}

	getAll(): INodeType[] {
		return Object.values(this.nodeTypes).map((data) => data.type);
	}

	getByName(nodeType: string): INodeType | undefined {
		if (this.nodeTypes[nodeType] === undefined) {
			throw new Error(`The node-type "${nodeType}" is not known!`);
		}
		return this.nodeTypes[nodeType].type;
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
