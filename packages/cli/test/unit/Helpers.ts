import {
	INodesAndCredentials,
	INodeType,
	INodeTypeData,
	INodeTypes,
	IVersionedNodeType,
	NodeHelpers,
} from 'n8n-workflow';

class NodeTypesClass implements INodeTypes {
	nodeTypes: INodeTypeData = {
		'test.set': {
			sourcePath: '',
			type: {
				description: {
					displayName: 'Set',
					name: 'set',
					group: ['input'],
					version: 1,
					description: 'Sets a value',
					defaults: {
						name: 'Set',
						color: '#0000FF',
					},
					inputs: ['main'],
					outputs: ['main'],
					properties: [
						{
							displayName: 'Value1',
							name: 'value1',
							type: 'string',
							default: 'default-value1',
						},
						{
							displayName: 'Value2',
							name: 'value2',
							type: 'string',
							default: 'default-value2',
						},
					],
				},
			},
		},
	};

	constructor(nodesAndCredentials?: INodesAndCredentials) {
		if (nodesAndCredentials?.loaded?.nodes) {
			this.nodeTypes = nodesAndCredentials?.loaded?.nodes;
		}
	}

	getByName(nodeType: string): INodeType | IVersionedNodeType {
		return this.nodeTypes[nodeType].type;
	}

	getByNameAndVersion(nodeType: string, version?: number): INodeType {
		return NodeHelpers.getVersionedNodeType(this.nodeTypes[nodeType].type, version);
	}
}

let nodeTypesInstance: NodeTypesClass | undefined;

export function NodeTypes(nodesAndCredentials?: INodesAndCredentials): NodeTypesClass {
	if (nodeTypesInstance === undefined) {
		nodeTypesInstance = new NodeTypesClass(nodesAndCredentials);
	}

	return nodeTypesInstance;
}
