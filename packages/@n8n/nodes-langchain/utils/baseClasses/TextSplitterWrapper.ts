import type { TextSplitter } from 'langchain/text_splitter';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import type { ConnectionTypes, IExecuteFunctions } from 'n8n-workflow';

/*
 * Wrapper class for Text Splitter to implement input and output tracing.
 */
const errorsMap: { [key: string]: { message: string; description: string } } = {
	'You exceeded your current quota, please check your plan and billing details.': {
		message: 'OpenAI quota exceeded',
		description: 'You exceeded your current quota, please check your plan and billing details.',
	},
};
export async function callMethodAsync<T>(
	this: T,
	parameters: {
		executeFunctions: IExecuteFunctions;
		connectionType: ConnectionTypes;
		currentNodeRunIndex: number;
		method: (...args: any[]) => Promise<unknown>;
		arguments: unknown[];
	},
): Promise<unknown> {
	try {
		return await parameters.method.call(this, ...parameters.arguments);
	} catch (e) {
		const connectedNode = parameters.executeFunctions.getNode();

		const error = new NodeOperationError(connectedNode, e, {
			functionality: 'configuration-node',
		});

		if (errorsMap[error.message]) {
			error.description = errorsMap[error.message].description;
			error.message = errorsMap[error.message].message;
		}

		parameters.executeFunctions.addOutputData(
			parameters.connectionType,
			parameters.currentNodeRunIndex,
			error,
		);
		if (error.message) {
			error.description = error.message;
			throw error;
		}
		throw new NodeOperationError(
			connectedNode,
			`Error on node "${connectedNode.name}" which is connected via input "${parameters.connectionType}"`,
			{ functionality: 'configuration-node' },
		);
	}
}

export function callMethodSync<T>(
	this: T,
	parameters: {
		executeFunctions: IExecuteFunctions;
		connectionType: ConnectionTypes;
		currentNodeRunIndex: number;
		method: (...args: any[]) => T;
		arguments: unknown[];
	},
): unknown {
	try {
		return parameters.method.call(this, ...parameters.arguments);
	} catch (e) {
		const connectedNode = parameters.executeFunctions.getNode();
		const error = new NodeOperationError(connectedNode, e);
		parameters.executeFunctions.addOutputData(
			parameters.connectionType,
			parameters.currentNodeRunIndex,
			error,
		);
		throw new NodeOperationError(
			connectedNode,
			`Error on node "${connectedNode.name}" which is connected via input "${parameters.connectionType}"`,
			{ functionality: 'configuration-node' },
		);
	}
}

function catchTracedError(
	context: IExecuteFunctions,
	connectionType: ConnectionTypes,
	currentNodeRunIndex: number,
	error: Error,
): void {
	// const connectedNode = context.getNode();
	// const nodeError = new NodeOperationError(connectedNode, error);
	// context.addOutputData(connectionType, currentNodeRunIndex, nodeError);
	// throw new NodeOperationError(
	// 	connectedNode,
	// 	`Error on node "${connectedNode.name}" which is connected via input "${connectionType}"`,
	// 	{ functionality: 'configuration-node' },
	// );

	const connectedNode = context.getNode();
	let operationError = new NodeOperationError(connectedNode, error);

	// Additional error handling from callMethodAsync
	if (errorsMap[error.message]) {
		operationError = new NodeOperationError(connectedNode, error, {
			functionality: 'configuration-node',
		});
		operationError.description = errorsMap[error.message].description;
		operationError.message = errorsMap[error.message].message;
	}

	context.addOutputData(connectionType, currentNodeRunIndex, operationError);

	// throw error;
}

export function createTracedSplitter(
	context: IExecuteFunctions,
	provider: TextSplitter,
): TextSplitter {
	return new Proxy(provider, {
		get: (target, prop, receiver) => {
			// Specifically intercepting the splitText method
			if (prop === 'splitText') {
				return async (
					...args: Parameters<TextSplitter['splitText']>
				): Promise<ReturnType<TextSplitter['splitText']>> => {
					// Ensuring method call is type-safe
					const method = target[prop];
					if (typeof method === 'function') {
						const [text] = args;

						const { index } = context.addInputData(NodeConnectionType.AiTextSplitter, [
							[{ json: { text } }],
						]);

						try {
							const response = await method.apply(target, args);

							context.addOutputData(NodeConnectionType.AiTextSplitter, index, [
								[{ json: { response } }],
							]);

							return response;
						} catch (error) {
							catchTracedError(context, NodeConnectionType.AiTextSplitter, index, error);
						}
					}
					// Fallback in case of property mismatch
					throw new Error(`Property ${String(prop)} is not a function`);
				};
			}
			// Handle non-function properties and other methods
			return Reflect.get(target, prop, receiver);
		},
	});
}
