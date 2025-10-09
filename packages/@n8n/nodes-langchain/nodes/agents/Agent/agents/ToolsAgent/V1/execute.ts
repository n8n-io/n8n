import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { RunnableSequence } from '@langchain/core/runnables';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import omit from 'lodash/omit';
import { jsonParse, NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { getPromptInputByType } from '@utils/helpers';
import { getOptionalOutputParser } from '@utils/output_parsers/N8nOutputParser';

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

/* -----------------------------------------------------------
   Main Executor Function
----------------------------------------------------------- */
/**
 * The main executor method for the Tools Agent.
 *
 * This function retrieves necessary components (model, memory, tools), prepares the prompt,
 * creates the agent, and processes each input item. The error handling for each item is also
 * managed here based on the node's continueOnFail setting.
 *
 * @returns The array of execution data for all processed items
 */
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
				memory,
				tools,
				returnIntermediateSteps: options.returnIntermediateSteps === true,
				maxIterations: options.maxIterations ?? 10,
			});

			// Invoke the executor with the given input and system message.
			const response = await executor.invoke(
				{
					input,
					system_message: options.systemMessage ?? SYSTEM_MESSAGE,
					formatting_instructions:
						'IMPORTANT: For your response to user, you MUST use the `format_final_json_response` tool with your complete answer formatted according to the required schema. Do not attempt to format the JSON manually - always use this tool. Your response will be rejected if it is not properly formatted through this tool. Only use this tool once you are ready to provide your final answer.',
				},
				{ signal: this.getExecutionCancelSignal() },
			);

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
