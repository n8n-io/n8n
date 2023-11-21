import { CallbackManager } from 'langchain/callbacks';
import { NodeConnectionType, type IExecuteFunctions } from 'n8n-workflow';

export const getLlmInputOutputCallbacks = (context: IExecuteFunctions, itemIndex: number) =>
	CallbackManager.fromHandlers({
		handleLLMEnd: (output, runId) => {
			context.addOutputData(NodeConnectionType.AiLanguageModel, itemIndex, [
				[{ json: { response: output } }],
			]);
			// console.log('LLM End', output, runId);
			context.addNodeExecutionTrace({
				content: { output, runId },
				type: 'output',
				node: { name: context.getNode().name, type: context.getNode().type },
			});
		},
		handleLLMStart: (llm, prompts, runId) => {
			context.addInputData(NodeConnectionType.AiLanguageModel, [[{ json: { response: prompts } }]]);
			// console.log('LLM Start:', llm, prompts, runId);
			context.addNodeExecutionTrace({
				content: { prompts, runId },
				type: 'input',
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
