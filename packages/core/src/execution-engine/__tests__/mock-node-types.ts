import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	Response,
	Request,
} from 'n8n-workflow';

import { NodeTypes } from '@test/helpers';

export const passThroughNode: INodeType = {
	description: {
		displayName: 'Test Node',
		name: 'testNode',
		group: ['transform'],
		version: 1,
		description: 'A minimal node for testing',
		defaults: { name: 'Test Node' },
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
		defaults: { name: 'Test Node with Required Property' },
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

export const nodeTypeArguments = {
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

type NodeExecuteResult =
	| INodeExecutionData[][]
	| Request
	| ((response?: Response) => INodeExecutionData[][] | Request);

interface NodeModifier {
	return(result: NodeExecuteResult): NodeModifier;
	done(): INodeType;
}

export function modifyNode(originalNode: INodeType): NodeModifier {
	const responses: NodeExecuteResult[] = [];
	let callCount = 0;

	const modifier: NodeModifier = {
		return(result: NodeExecuteResult): NodeModifier {
			responses.push(result);
			return this;
		},

		done(): INodeType {
			return {
				...originalNode,
				async execute(
					this: IExecuteFunctions,
					response?: Response,
				): Promise<INodeExecutionData[][] | Request | null> {
					const currentCall = callCount++;

					// If we have a predetermined response for this call, use it
					if (currentCall < responses.length) {
						const predefinedResponse = responses[currentCall];

						// Handle function responses (for Response parameter injection)
						if (typeof predefinedResponse === 'function') {
							return predefinedResponse(response);
						}

						return predefinedResponse;
					}

					// Fallback to original node's execute method
					if (originalNode.execute) {
						return await originalNode.execute.call(this, response);
					}

					// Default fallback
					return [this.getInputData()];
				},
			};
		},
	};

	return modifier;
}
