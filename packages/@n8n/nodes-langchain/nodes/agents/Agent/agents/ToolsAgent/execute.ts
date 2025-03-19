import type { BaseChatMemory } from '@langchain/community/memory/chat_memory';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import type { BaseMessagePromptTemplateLike } from '@langchain/core/prompts';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import type { Tool } from '@langchain/core/tools';
import { DynamicStructuredTool } from '@langchain/core/tools';
import type { AgentAction, AgentFinish } from 'langchain/agents';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import type { ToolsAgentAction } from 'langchain/dist/agents/tool_calling/output_parser';
import { omit } from 'lodash';
import { BINARY_ENCODING, jsonParse, NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import type { ZodObject } from 'zod';
import { z } from 'zod';

import { isChatInstance, getPromptInputByType, getConnectedTools } from '@utils/helpers';
import {
	getOptionalOutputParser,
	type N8nOutputParser,
} from '@utils/output_parsers/N8nOutputParser';

import { SYSTEM_MESSAGE } from './prompt';

/* -----------------------------------------------------------
   Output Parser Helper
----------------------------------------------------------- */
/**
 * Retrieve the output parser schema.
 * If the parser does not return a valid schema, default to a schema with a single text field.
 */
export function getOutputParserSchema(
	outputParser: N8nOutputParser,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): ZodObject<any, any, any, any> {
	const schema =
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(outputParser.getSchema() as ZodObject<any, any, any, any>) ?? z.object({ text: z.string() });
	return schema;
}

/* -----------------------------------------------------------
   Binary Data Helpers
----------------------------------------------------------- */
/**
 * Extracts binary image messages from the input data.
 * When operating in filesystem mode, the binary stream is first converted to a buffer.
 *
 * @param ctx - The execution context
 * @param itemIndex - The current item index
 * @returns A HumanMessage containing the binary image messages.
 */
export async function extractBinaryMessages(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<HumanMessage> {
	const binaryData = ctx.getInputData()?.[itemIndex]?.binary ?? {};
	const binaryMessages = await Promise.all(
		Object.values(binaryData)
			.filter((data) => data.mimeType.startsWith('image/'))
			.map(async (data) => {
				let binaryUrlString: string;

				// In filesystem mode we need to get binary stream by id before converting it to buffer
				if (data.id) {
					const binaryBuffer = await ctx.helpers.binaryToBuffer(
						await ctx.helpers.getBinaryStream(data.id),
					);
					binaryUrlString = `data:${data.mimeType};base64,${Buffer.from(binaryBuffer).toString(
						BINARY_ENCODING,
					)}`;
				} else {
					binaryUrlString = data.data.includes('base64')
						? data.data
						: `data:${data.mimeType};base64,${data.data}`;
				}

				return {
					type: 'image_url',
					image_url: {
						url: binaryUrlString,
					},
				};
			}),
	);
	return new HumanMessage({
		content: [...binaryMessages],
	});
}

/* -----------------------------------------------------------
   Agent Output Format Helpers
----------------------------------------------------------- */
/**
 * Fixes empty content messages in agent steps.
 *
 * This function is necessary when using RunnableSequence.from in LangChain.
 * If a tool doesn't have any arguments, LangChain returns input: '' (empty string).
 * This can throw an error for some providers (like Anthropic) which expect the input to always be an object.
 * This function replaces empty string inputs with empty objects to prevent such errors.
 *
 * @param steps - The agent steps to fix
 * @returns The fixed agent steps
 */
export function fixEmptyContentMessage(
	steps: AgentFinish | ToolsAgentAction[],
): AgentFinish | ToolsAgentAction[] {
	if (!Array.isArray(steps)) return steps;

	steps.forEach((step) => {
		if ('messageLog' in step && step.messageLog !== undefined) {
			if (Array.isArray(step.messageLog)) {
				step.messageLog.forEach((message: BaseMessage) => {
					if ('content' in message && Array.isArray(message.content)) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						(message.content as Array<{ input?: string | object }>).forEach((content) => {
							if (content.input === '') {
								content.input = {};
							}
						});
					}
				});
			}
		}
	});

	return steps;
}

/**
 * Ensures consistent handling of outputs regardless of the model used,
 * providing a unified output format for further processing.
 *
 * This method is necessary to handle different output formats from various language models.
 * Specifically, it checks if the agent step is the final step (contains returnValues) and determines
 * if the output is a simple string (e.g., from OpenAI models) or an array of outputs (e.g., from Anthropic models).
 *
 * Examples:
 * 1. Anthropic model output:
 * ```json
 *    {
 *      "output": [
 *        {
 *          "index": 0,
 *          "type": "text",
 *          "text": "The result of the calculation is approximately 1001.8166..."
 *        }
 *      ]
 *    }
 *```
 * 2. OpenAI model output:
 * ```json
 *    {
 *      "output": "The result of the calculation is approximately 1001.82..."
 *    }
 * ```
 *
 * @param steps - The agent finish or agent action steps.
 * @returns The modified agent finish steps or the original steps.
 */
export function handleAgentFinishOutput(
	steps: AgentFinish | AgentAction[],
): AgentFinish | AgentAction[] {
	type AgentMultiOutputFinish = AgentFinish & {
		returnValues: { output: Array<{ text: string; type: string; index: number }> };
	};
	const agentFinishSteps = steps as AgentMultiOutputFinish | AgentFinish;

	if (agentFinishSteps.returnValues) {
		const isMultiOutput = Array.isArray(agentFinishSteps.returnValues?.output);
		if (isMultiOutput) {
			// If all items in the multi-output array are of type 'text', merge them into a single string
			const multiOutputSteps = agentFinishSteps.returnValues.output as Array<{
				index: number;
				type: string;
				text: string;
			}>;
			const isTextOnly = multiOutputSteps.every((output) => 'text' in output);
			if (isTextOnly) {
				agentFinishSteps.returnValues.output = multiOutputSteps
					.map((output) => output.text)
					.join('\n')
					.trim();
			}
			return agentFinishSteps;
		}
	}

	return agentFinishSteps;
}

/**
 * Wraps the parsed output so that it can be stored in memory.
 * If memory is connected, the output is stringified.
 *
 * @param output - The parsed output object
 * @param memory - The connected memory (if any)
 * @returns The formatted output object
 */
export function handleParsedStepOutput(
	output: Record<string, unknown>,
	memory?: BaseChatMemory,
): { returnValues: Record<string, unknown>; log: string } {
	return {
		returnValues: memory ? { output: JSON.stringify(output) } : output,
		log: 'Final response formatted',
	};
}

/**
 * Parses agent steps using the provided output parser.
 * If the agent used the 'format_final_json_response' tool, the output is parsed accordingly.
 *
 * @param steps - The agent finish or action steps
 * @param outputParser - The output parser (if defined)
 * @param memory - The connected memory (if any)
 * @returns The parsed steps with the final output
 */
export const getAgentStepsParser =
	(outputParser?: N8nOutputParser, memory?: BaseChatMemory) =>
	async (steps: AgentFinish | AgentAction[]): Promise<AgentFinish | AgentAction[]> => {
		// Check if the steps contain the 'format_final_json_response' tool invocation.
		if (Array.isArray(steps)) {
			const responseParserTool = steps.find((step) => step.tool === 'format_final_json_response');
			if (responseParserTool && outputParser) {
				const toolInput = responseParserTool.toolInput;
				// Ensure the tool input is a string
				const parserInput = toolInput instanceof Object ? JSON.stringify(toolInput) : toolInput;
				const returnValues = (await outputParser.parse(parserInput)) as Record<string, unknown>;
				return handleParsedStepOutput(returnValues, memory);
			}
		}

		// Otherwise, if the steps contain a returnValues field, try to parse them manually.
		if (outputParser && typeof steps === 'object' && (steps as AgentFinish).returnValues) {
			const finalResponse = (steps as AgentFinish).returnValues;
			let parserInput: string;

			if (finalResponse instanceof Object) {
				if ('output' in finalResponse) {
					try {
						// If the output is an object, we will try to parse it as JSON
						// this is because parser expects stringified JSON object like { "output": { .... } }
						// so we try to parse the output before wrapping it and then stringify it
						parserInput = JSON.stringify({ output: jsonParse(finalResponse.output) });
					} catch (error) {
						// Fallback to the raw output if parsing fails.
						parserInput = finalResponse.output;
					}
				} else {
					// If the output is not an object, we will stringify it as it is
					parserInput = JSON.stringify(finalResponse);
				}
			} else {
				parserInput = finalResponse;
			}

			const returnValues = (await outputParser.parse(parserInput)) as Record<string, unknown>;
			return handleParsedStepOutput(returnValues, memory);
		}

		return handleAgentFinishOutput(steps);
	};

/* -----------------------------------------------------------
   Agent Setup Helpers
----------------------------------------------------------- */
/**
 * Retrieves the language model from the input connection.
 * Throws an error if the model is not a valid chat instance or does not support tools.
 *
 * @param ctx - The execution context
 * @returns The validated chat model
 */
export async function getChatModel(ctx: IExecuteFunctions): Promise<BaseChatModel> {
	const model = await ctx.getInputConnectionData(NodeConnectionType.AiLanguageModel, 0);
	if (!isChatInstance(model) || !model.bindTools) {
		throw new NodeOperationError(
			ctx.getNode(),
			'Tools Agent requires Chat Model which supports Tools calling',
		);
	}
	return model;
}

/**
 * Retrieves the memory instance from the input connection if it is connected
 *
 * @param ctx - The execution context
 * @returns The connected memory (if any)
 */
export async function getOptionalMemory(
	ctx: IExecuteFunctions,
): Promise<BaseChatMemory | undefined> {
	return (await ctx.getInputConnectionData(NodeConnectionType.AiMemory, 0)) as
		| BaseChatMemory
		| undefined;
}

/**
 * Retrieves the connected tools and (if an output parser is defined)
 * appends a structured output parser tool.
 *
 * @param ctx - The execution context
 * @param outputParser - The optional output parser
 * @returns The array of connected tools
 */
export async function getTools(
	ctx: IExecuteFunctions,
	outputParser?: N8nOutputParser,
): Promise<Array<DynamicStructuredTool | Tool>> {
	const tools = (await getConnectedTools(ctx, true, false)) as Array<DynamicStructuredTool | Tool>;

	// If an output parser is available, create a dynamic tool to validate the final output.
	if (outputParser) {
		const schema = getOutputParserSchema(outputParser);
		const structuredOutputParserTool = new DynamicStructuredTool({
			schema,
			name: 'format_final_json_response',
			description:
				'Use this tool to format your final response to the user in a structured JSON format. This tool validates your output against a schema to ensure it meets the required format. ONLY use this tool when you have completed all necessary reasoning and are ready to provide your final answer. Do not use this tool for intermediate steps or for asking questions. The output from this tool will be directly returned to the user.',
			// We do not use a function here because we intercept the output with the parser.
			func: async () => '',
		});
		tools.push(structuredOutputParserTool);
	}
	return tools;
}

/**
 * Prepares the prompt messages for the agent.
 *
 * @param ctx - The execution context
 * @param itemIndex - The current item index
 * @param options - Options containing systemMessage and other parameters
 * @returns The array of prompt messages
 */
export async function prepareMessages(
	ctx: IExecuteFunctions,
	itemIndex: number,
	options: {
		systemMessage?: string;
		passthroughBinaryImages?: boolean;
		outputParser?: N8nOutputParser;
	},
): Promise<BaseMessagePromptTemplateLike[]> {
	const messages: BaseMessagePromptTemplateLike[] = [
		['system', `{system_message}${options.outputParser ? '\n\n{formatting_instructions}' : ''}`],
		['placeholder', '{chat_history}'],
		['human', '{input}'],
	];

	// If there is binary data and the node option permits it, add a binary message
	const hasBinaryData = ctx.getInputData()?.[itemIndex]?.binary !== undefined;
	if (hasBinaryData && options.passthroughBinaryImages) {
		const binaryMessage = await extractBinaryMessages(ctx, itemIndex);
		messages.push(binaryMessage);
	}

	// We add the agent scratchpad last, so that the agent will not run in loops
	// by adding binary messages between each interaction
	messages.push(['placeholder', '{agent_scratchpad}']);
	return messages;
}

/**
 * Creates the chat prompt from messages.
 *
 * @param messages - The messages array
 * @returns The ChatPromptTemplate instance
 */
export function preparePrompt(messages: BaseMessagePromptTemplateLike[]): ChatPromptTemplate {
	return ChatPromptTemplate.fromMessages(messages);
}

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
			const model = await getChatModel(this);
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
