import {
	INodeType,
	INodeTypeData,
	INodeTypeDataContent,
	INodeTypes,
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

	getByName(nodeType: string): INodeType;
	getByName(nodeType: string, fullNode: true): INodeTypeDataContent;
	getByName(nodeType: string, fullNode?: boolean): INodeType | INodeTypeDataContent {
		const node = this.nodeTypes[nodeType];

		if (node === undefined) {
			throw new Error(`The node-type "${nodeType}" is not known!`);
		}

		return fullNode ? node : node.type;
	}
}



let nodeTypesInstance: NodeTypesClass | undefined;

export function NodeTypes(): NodeTypesClass {
	if (nodeTypesInstance === undefined) {
		nodeTypesInstance = new NodeTypesClass();
	}

	return nodeTypesInstance;
}
