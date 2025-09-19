import type { IExecuteFunctions, INodeExecutionData, INodeType } from 'n8n-workflow';

import { NodeTypes } from '@test/helpers';

export const passThroughNode: INodeType = {
	description: {
		displayName: 'Test Node',
		name: 'testNode',
		group: ['transform'],
		version: 1,
		description: 'A minimal node for testing',
		defaults: {
			name: 'Test Node',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	},
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		return await Promise.resolve([items]);
	},
};

export const testNodeWithRequiredProperty: INodeType = {
	description: {
		displayName: 'Test Node with Required Property',
		name: 'testNodeWithRequiredProperty',
		group: ['transform'],
		version: 1,
		description: 'A node for testing with required property',
		defaults: {
			name: 'Test Node with Required Property',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Required Text',
				name: 'requiredText',
				type: 'string',
				default: '',
				placeholder: 'Enter some text',
				description: 'A required text input',
				required: true,
			},
		],
	},
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		return await Promise.resolve([items]);
	},
};

const nodeTypeArguments = {
	passThrough: {
		type: passThroughNode,
		sourcePath: '',
	},
	testNodeWithRequiredProperty: {
		type: testNodeWithRequiredProperty,
		sourcePath: '',
	},
};

export const nodeTypes = NodeTypes(nodeTypeArguments);

export const types: Record<keyof typeof nodeTypeArguments, string> = {
	passThrough: 'passThrough',
	testNodeWithRequiredProperty: 'testNodeWithRequiredProperty',
};
