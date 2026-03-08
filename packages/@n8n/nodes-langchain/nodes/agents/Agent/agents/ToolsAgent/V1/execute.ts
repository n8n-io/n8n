import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { RunnableSequence } from '@langchain/core/runnables';
import { AgentExecutor, createToolCallingAgent } from '@langchain/classic/agents';
import omit from 'lodash/omit';
import { jsonParse, NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { loadMemory, saveToMemory } from '@utils/agent-execution';
import type { ToolCallData } from '@utils/agent-execution';
import { getPromptInputByType } from '@utils/helpers';
import { getOptionalOutputParser } from '@utils/output_parsers/N8nOutputParser';
import { buildTracingMetadata, getTracingConfig } from '@utils/tracing';

import {
	fixEmptyContentMessage,
	getAgentStepsParser,
	getChatModel,
	getOptionalMemory,
	getTools,
	prepareMessages,
	preparePrompt,
} from '../common';
import { SYSTEM_MESSAGE } from '../prompt';

/** Main executor for the Tools Agent V1. */
export async function toolsAgentExecute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	this.logger.debug('Executing Tools Agent');

	const returnData: INodeExecutionData[] = [];
	const items = this.getInputData();
	const outputParser = await getOptionalOutputParser(this);
	const tools = await getTools(this, outputParser);

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			const model = (await getChatModel(this)) as BaseLanguageModel;
			const memory = await getOptionalMemory(this);

			const input = getPromptInputByType({
				ctx: this,
				i: itemIndex,
				inputKey: 'text',
				promptTypeKey: 'promptType',
			});
			if (input === undefined) {
				throw new NodeOperationError(this.getNode(), 'The “text” parameter is empty.');
			}

			const options = this.getNodeParameter('options', itemIndex, {}) as {
				systemMessage?: string;
				maxIterations?: number;
				returnIntermediateSteps?: boolean;
				passthroughBinaryImages?: boolean;
				tracingMetadata?: { values?: Array<{ key: string; value: unknown }> };
			};

			// Prepare the prompt messages and prompt template.
			const messages = await prepareMessages(this, itemIndex, {
				systemMessage: options.systemMessage,
				passthroughBinaryImages: options.passthroughBinaryImages ?? true,
				outputParser,
			});
			const prompt = preparePrompt(messages);

			// Create the base agent that calls tools.
			const agent = createToolCallingAgent({
				llm: model,
				tools,
				prompt,
				streamRunnable: false,
			});
			agent.streamRunnable = false;
			// Wrap the agent with parsers and fixes.
			const runnableAgent = RunnableSequence.from([
				agent,
				getAgentStepsParser(outputParser, memory),
				fixEmptyContentMessage,
			]);
			const executor = AgentExecutor.fromAgentAndTools({
				agent: runnableAgent,
				// Don't pass memory here — we save it ourselves to keep tool call messages
				tools,
				returnIntermediateSteps: true,
				maxIterations: options.maxIterations ?? 10,
			});
			const additionalMetadata = buildTracingMetadata(options.tracingMetadata?.values, this.logger);
			if (Object.keys(additionalMetadata).length > 0) {
				this.logger.debug('Tracing metadata', { additionalMetadata });
			}
			const executorWithTracing = executor.withConfig(
				getTracingConfig(this, { additionalMetadata }),
			);

			const chatHistory = memory ? await loadMemory(memory) : undefined;

			// Invoke the executor with the given input and system message.
			const response = await executorWithTracing.invoke(
				{
					input,
					chat_history: chatHistory ?? undefined,
					system_message: options.systemMessage ?? SYSTEM_MESSAGE,
					formatting_instructions:
						'IMPORTANT: For your response to user, you MUST use the `format_final_json_response` tool with your complete answer formatted according to the required schema. Do not attempt to format the JSON manually - always use this tool. Your response will be rejected if it is not properly formatted through this tool. Only use this tool once you are ready to provide your final answer.',
				},
				{ signal: this.getExecutionCancelSignal() },
			);

			const steps = (response.intermediateSteps ?? []) as ToolCallData[];
			if (memory && input && response.output) {
				await saveToMemory(input, response.output as string, memory, steps);
			}

			if (!options.returnIntermediateSteps) {
				delete response.intermediateSteps;
			}

			// If memory and outputParser are connected, parse the output.
			if (memory && outputParser) {
				const parsedOutput = jsonParse<{ output: Record<string, unknown> }>(
					response.output as string,
				);
				response.output = parsedOutput?.output ?? parsedOutput;
			}

			// Omit internal keys before returning the result.
			const itemResult = {
				json: omit(
					response,
					'system_message',
					'formatting_instructions',
					'input',
					'chat_history',
					'agent_scratchpad',
				),
			};

			returnData.push(itemResult);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: { error: error.message },
					pairedItem: { item: itemIndex },
				});
				continue;
			}
			throw error;
		}
	}

	return [returnData];
}
