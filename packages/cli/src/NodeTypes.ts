import {
	INodeType,
	INodeTypes,
} from 'n8n-workflow';


class NodeTypesClass implements INodeTypes {

	nodeTypes: {
		[key: string]: INodeType
	} = {};


	async init(nodeTypes: {[key: string]: INodeType }): Promise<void> {
		this.nodeTypes = nodeTypes;
	}

	getAll(): INodeType[] {
		return Object.values(this.nodeTypes);
	}

	getByName(nodeType: string): INodeType | undefined {
		return this.nodeTypes[nodeType];
	}
}



let nodeTypesInstance: NodeTypesClass | undefined;

export function NodeTypes(): NodeTypesClass {
	if (nodeTypesInstance === undefined) {
		nodeTypesInstance = new NodeTypesClass();
	}

	return nodeTypesInstance;
}
