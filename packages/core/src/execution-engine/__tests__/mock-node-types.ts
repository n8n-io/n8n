import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	EngineResponse,
	EngineRequest,
	NodeOutput,
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

/**
 * Union type representing all possible return values from a node's execute method.
 * Can be execution data, an engine request, or a function that processes engine responses.
 */
type NodeExecuteResult =
	| NodeOutput
	| ((response?: EngineResponse) => INodeExecutionData[][] | EngineRequest);

/**
 * Interface for building modified node behavior through method chaining.
 * Allows setting predetermined responses for sequential node executions.
 */
interface NodeModifier {
	/**
	 * Sets a predetermined result for the next node execution call.
	 * @param result - The result to return on the next execution
	 */
	return(result: NodeExecuteResult): NodeModifier;

	/**
	 * Finalizes the node modification and returns the modified node.
	 */
	done(): INodeType;
}

/**
 * Creates a modified version of a node with predetermined execution responses.
 * Useful for testing scenarios where you need to control node execution results
 * across multiple calls in a predictable sequence.
 *
 * @example
 * ```typescript
 * const modifiedNode = modifyNode(originalNode)
 *   .return([mockData1])
 *   .return(engineRequest)
 *   .return((response) => processResponse(response))
 *   .done();
 * ```
 *
 * @param originalNode - The original node to modify
 * @returns A NodeModifier instance for configuring predetermined responses
 */
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
					response?: EngineResponse,
				): Promise<INodeExecutionData[][] | EngineRequest | null> {
					const currentCall = callCount++;

					// If we have a predetermined response for this call, use it
					if (currentCall < responses.length) {
						const predefinedResponse = responses[currentCall];

						// Handle function responses (for Response parameter injection)
						if (typeof predefinedResponse === 'function') {
							return predefinedResponse.call(this, response);
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
