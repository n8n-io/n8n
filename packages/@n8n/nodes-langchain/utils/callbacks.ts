import { CallbackManager } from 'langchain/callbacks';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import type { ConnectionTypes, IExecuteFunctions } from 'n8n-workflow';

const errorsMap: { [key: string]: { message: string; description: string } } = {
	'You exceeded your current quota, please check your plan and billing details.': {
		message: 'OpenAI quota exceeded',
		description: 'You exceeded your current quota, please check your plan and billing details.',
	},
};

export function handleLangchainAsyncError(
	context: IExecuteFunctions,
	originalError: Error,
	connectionType: ConnectionTypes,
	currentNodeRunIndex: number,
) {
	const connectedNode = context.getNode();

	const error = new NodeOperationError(connectedNode, originalError, {
		functionality: 'configuration-node',
	});

	if (errorsMap[error.message]) {
		error.description = errorsMap[error.message].description;
		error.message = errorsMap[error.message].message;
	}

	context.addOutputData(connectionType, currentNodeRunIndex, error);
	if (error.message) {
		error.description = error.message;
		throw error;
	}
	throw new NodeOperationError(
		connectedNode,
		`Error on node "${connectedNode.name}" which is connected via input "${connectionType}"`,
		{ functionality: 'configuration-node' },
	);
}

export const getLlmInputOutputCallbacks = (context: IExecuteFunctions) => {
	// To correctly set input/output we need to store the indexes by runId
	const ioIndexMap = new Map<string, number>();

	return CallbackManager.fromHandlers({
		handleLLMStart: (_llm, prompts, runId) => {
			const { index } = context.addInputData(NodeConnectionType.AiLanguageModel, [
				[{ json: { response: prompts } }],
			]);

			ioIndexMap.set(runId, index);
		},
		handleLLMEnd: (output, runId) => {
			context.addOutputData(NodeConnectionType.AiLanguageModel, ioIndexMap.get(runId) ?? 0, [
				[{ json: { response: output } }],
			]);
		},
		handleLLMError: (error, runId) => {
			handleLangchainAsyncError(
				context,
				error,
				NodeConnectionType.AiLanguageModel,
				ioIndexMap.get(runId) ?? 0,
			);
		},
	});
};

export const getToolCallbacks = (context: IExecuteFunctions) => {
	const ioIndexMap = new Map<string, number>();

	return CallbackManager.fromHandlers({
		handleToolStart(_tool, query, runId) {
			const { index } = context.addInputData(NodeConnectionType.AiTool, [[{ json: { query } }]]);

			ioIndexMap.set(runId, index);
		},
		handleToolEnd(output, runId) {
			context.addOutputData(NodeConnectionType.AiTool, ioIndexMap.get(runId) ?? 0, [
				[{ json: { response: output } }],
			]);
		},
		handleToolError(error, runId) {
			handleLangchainAsyncError(
				context,
				error,
				NodeConnectionType.AiTool,
				ioIndexMap.get(runId) ?? 0,
			);
		},
	});
};
