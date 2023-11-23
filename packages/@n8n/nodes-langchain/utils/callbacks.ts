import { CallbackManager } from 'langchain/callbacks';
import { NodeConnectionType, type IExecuteFunctions } from 'n8n-workflow';

export const getLlmInputOutputCallbacks = (context: IExecuteFunctions) => {
	let lastInputIndex = 0;

	return CallbackManager.fromHandlers({
		handleLLMStart: (llm, prompts, runId) => {
			const { index } = context.addInputData(NodeConnectionType.AiLanguageModel, [
				[{ json: { response: prompts } }],
			]);
			// console.log('LLM Start:', llm, prompts, runId);
			context.addNodeExecutionTrace({
				content: { prompts, runId },
				type: 'input',
				node: { name: context.getNode().name, type: context.getNode().type },
			});
			lastInputIndex = index;
		},
		handleLLMEnd: (output, runId) => {
			context.addOutputData(NodeConnectionType.AiLanguageModel, lastInputIndex, [
				[{ json: { response: output } }],
			]);
			// console.log('LLM End', output, runId);
			context.addNodeExecutionTrace({
				content: { output, runId },
				type: 'output',
				node: { name: context.getNode().name, type: context.getNode().type },
			});
		},
		handleLLMError: (error, runId, parentRunId, tags) => {
			// console.log('LLM Error:', error, runId, parentRunId, tags);
			context.addNodeExecutionTrace({
				content: { error, runId },
				type: 'error',
				node: { name: context.getNode().name, type: context.getNode().type },
			});
		},
	});
};

export const getToolCallbacks = (context: IExecuteFunctions) => {
	let lastInputIndex = 0;

	return CallbackManager.fromHandlers({
		handleToolStart(tool, query, runId, parentRunId, tags, metadata, name) {
			console.log(
				'🚀 ~ file: callbacks.ts:39 ~ handleToolStart ~ tool, query, runId, parentRunId, tags, metadata, name:',
				tool,
				query,
				runId,
				parentRunId,
				tags,
				metadata,
				name,
			);
			const { index } = context.addInputData(NodeConnectionType.AiTool, [[{ json: { query } }]]);
			lastInputIndex = index;
		},
		handleToolEnd(output, runId, parentRunId, tags) {
			console.log(
				'🚀 ~ file: callbacks.ts:52 ~ handleToolEnd ~ output, runId, parentRunId, tags:',
				output,
				runId,
				parentRunId,
				tags,
			);
			context.addOutputData(NodeConnectionType.AiTool, lastInputIndex, [
				[{ json: { response: output } }],
			]);
			context.addNodeExecutionTrace({
				content: { output, runId },
				type: 'output',
				node: { name: context.getNode().name, type: context.getNode().type },
			});
		},
		handleToolError(error, runId, parentRunId, tags) {
			console.log(
				'🚀 ~ file: callbacks.ts:69 ~ handleToolError ~ error, runId, parentRunId, tags:',
				error,
				runId,
				parentRunId,
				tags,
			);
			context.addOutputData(NodeConnectionType.AiTool, lastInputIndex, error);
		},
	});
};
