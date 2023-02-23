import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import {
	INodeType,
	INodeTypeData,
	INodeTypes,
	IVersionedNodeType,
	NodeHelpers,
} from 'n8n-workflow';

// TODO: delete this
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
		'fake-scheduler': {
			sourcePath: '',
			type: {
				description: {
					displayName: 'Schedule',
					name: 'set',
					group: ['input'],
					version: 1,
					description: 'Schedules execuitons',
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
				trigger: () => {
					return Promise.resolve(undefined);
				},
			},
		},
	};

	constructor(nodesAndCredentials?: LoadNodesAndCredentials) {
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

export function NodeTypes(nodesAndCredentials?: LoadNodesAndCredentials): NodeTypesClass {
	if (nodeTypesInstance === undefined) {
		nodeTypesInstance = new NodeTypesClass(nodesAndCredentials);
	}

	return nodeTypesInstance;
}

/**
 * Ensure all pending promises settle. The promise's `resolve` is placed in
 * the macrotask queue and so called at the next iteration of the event loop
 * after all promises in the microtask queue have settled first.
 */
export const flushPromises = async () => new Promise(setImmediate);

export function mockNodeTypesData(
	nodeNames: string[],
	options?: {
		addTrigger?: boolean;
	},
) {
	return nodeNames.reduce<INodeTypeData>((acc, nodeName) => {
		return (
			(acc[`n8n-nodes-base.${nodeName}`] = {
				sourcePath: '',
				type: {
					description: {
						displayName: nodeName,
						name: nodeName,
						group: [],
						description: '',
						version: 1,
						defaults: {},
						inputs: [],
						outputs: [],
						properties: [],
					},
					trigger: options?.addTrigger ? () => Promise.resolve(undefined) : undefined,
				},
			}),
			acc
		);
	}, {});
}
