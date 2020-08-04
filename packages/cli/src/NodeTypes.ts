import {
	INodeType,
	INodeTypes,
	INodeTypeData,
	NodeHelpers,
} from 'n8n-workflow';


class NodeTypesClass implements INodeTypes {

	nodeTypes: INodeTypeData = {};


	async init(nodeTypes: INodeTypeData): Promise<void> {
		// Some nodeTypes need to get special parameters applied like the
		// polling nodes the polling times
		for (const nodeTypeData of Object.values(nodeTypes)) {
			const applyParameters = NodeHelpers.getSpecialNodeParameters(nodeTypeData.type);

			if (applyParameters.length) {
				nodeTypeData.type.description.properties.unshift.apply(nodeTypeData.type.description.properties, applyParameters);
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

export function NodeTypes(): NodeTypesClass {
	if (nodeTypesInstance === undefined) {
		nodeTypesInstance = new NodeTypesClass();
	}

	return nodeTypesInstance;
}
