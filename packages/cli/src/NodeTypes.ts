import {
	INodeType,
	INodeTypes,
	INodeTypeData,
} from 'n8n-workflow';


class NodeTypesClass implements INodeTypes {

	nodeTypes: INodeTypeData = {};


	async init(nodeTypes: INodeTypeData): Promise<void> {
		this.nodeTypes = nodeTypes;
	}

	getAll(): INodeType[] {
		return Object.values(this.nodeTypes).map((data) => data.type);
	}

	getByName(nodeType: string): INodeType | undefined {
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
