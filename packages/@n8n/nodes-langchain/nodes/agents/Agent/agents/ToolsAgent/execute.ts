import type { BaseChatMemory } from '@langchain/community/memory/chat_memory';
import { HumanMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import type { BaseMessagePromptTemplateLike } from '@langchain/core/prompts';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import type { Tool } from '@langchain/core/tools';
import { DynamicStructuredTool } from '@langchain/core/tools';
import type { AgentAction, AgentFinish } from 'langchain/agents';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { omit } from 'lodash';
import { BINARY_ENCODING, jsonParse, NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import type { ZodObject } from 'zod';
import { z } from 'zod';

import { SYSTEM_MESSAGE } from './prompt';
import {
	isChatInstance,
	getPromptInputByType,
	getConnectedTools,
} from '../../../../../utils/helpers';
import {
	getOptionalOutputParsers,
	type N8nOutputParser,
} from '../../../../../utils/output_parsers/N8nOutputParser';

function getOutputParserSchema(outputParser: N8nOutputParser): ZodObject<any, any, any, any> {
	const schema =
		(outputParser.getSchema() as ZodObject<any, any, any, any>) ?? z.object({ text: z.string() });

	return schema;
}

async function extractBinaryMessages(ctx: IExecuteFunctions) {
	const binaryData = ctx.getInputData()?.[0]?.binary ?? {};
	const binaryMessages = await Promise.all(
		Object.values(binaryData)
			.filter((data) => data.mimeType.startsWith('image/'))
			.map(async (data) => {
				let binaryUrlString;

				// In filesystem mode we need to get binary stream by id before converting it to buffer
				if (data.id) {
					const binaryBuffer = await ctx.helpers.binaryToBuffer(
						await ctx.helpers.getBinaryStream(data.id),
					);

					binaryUrlString = `data:${data.mimeType};base64,${Buffer.from(binaryBuffer).toString(BINARY_ENCODING)}`;
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
function fixEmptyContentMessage(steps: AgentFinish | AgentAction[]) {
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

export async function toolsAgentExecute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	this.logger.debug('Executing Tools Agent');
	const model = await this.getInputConnectionData(NodeConnectionType.AiLanguageModel, 0);

	if (!isChatInstance(model) || !model.bindTools) {
		throw new NodeOperationError(
			this.getNode(),
			'Tools Agent requires Chat Model which supports Tools calling',
		);
	}

	const memory = (await this.getInputConnectionData(NodeConnectionType.AiMemory, 0)) as
		| BaseChatMemory
		| undefined;

	const tools = (await getConnectedTools(this, true, false)) as Array<DynamicStructuredTool | Tool>;
	const outputParser = (await getOptionalOutputParsers(this))?.[0];
	let structuredOutputParserTool: DynamicStructuredTool | undefined;
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
	function handleAgentFinishOutput(steps: AgentFinish | AgentAction[]) {
		// Check if the steps contain multiple outputs
		type AgentMultiOutputFinish = AgentFinish & {
			returnValues: { output: Array<{ text: string; type: string; index: number }> };
		};
		const agentFinishSteps = steps as AgentMultiOutputFinish | AgentFinish;

		if (agentFinishSteps.returnValues) {
			const isMultiOutput = Array.isArray(agentFinishSteps.returnValues?.output);

			if (isMultiOutput) {
				// Define the type for each item in the multi-output array
				type MultiOutputItem = { index: number; type: string; text: string };
				const multiOutputSteps = agentFinishSteps.returnValues.output as MultiOutputItem[];

				// Check if all items in the multi-output array are of type 'text'
				const isTextOnly = (multiOutputSteps ?? []).every((output) => 'text' in output);

				if (isTextOnly) {
					// If all items are of type 'text', merge them into a single string
					agentFinishSteps.returnValues.output = multiOutputSteps
						.map((output) => output.text)
						.join('\n')
						.trim();
				}
				return agentFinishSteps;
			}
		}

		// If the steps do not contain multiple outputs, return them as is
		return agentFinishSteps;
	}

	// If memory is connected we need to stringify the returnValues so that it can be saved in the memory as a string
	function handleParsedStepOutput(output: Record<string, unknown>) {
		return {
			returnValues: memory ? { output: JSON.stringify(output) } : output,
			log: 'Final response formatted',
		};
	}
	async function agentStepsParser(
		steps: AgentFinish | AgentAction[],
	): Promise<AgentFinish | AgentAction[]> {
		if (Array.isArray(steps)) {
			const responseParserTool = steps.find((step) => step.tool === 'format_final_response');
			if (responseParserTool) {
				const toolInput = responseParserTool?.toolInput;
				// Check if the tool input is a string or an object and convert it to a string
				const parserInput = toolInput instanceof Object ? JSON.stringify(toolInput) : toolInput;
				const returnValues = (await outputParser.parse(parserInput)) as Record<string, unknown>;

				return handleParsedStepOutput(returnValues);
			}
		}

		// If the steps are an AgentFinish and the outputParser is defined it must mean that the LLM didn't use `format_final_response` tool so we will try to parse the output manually
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
						// If parsing of the output fails, we will use the raw output
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
			return handleParsedStepOutput(returnValues);
		}
		return handleAgentFinishOutput(steps);
	}

	if (outputParser) {
		const schema = getOutputParserSchema(outputParser);
		structuredOutputParserTool = new DynamicStructuredTool({
			schema,
			name: 'format_final_response',
			description:
				'Always use this tool for the final output to the user. It validates the output so only use it when you are sure the output is final.',
			// We will not use the function here as we will use the parser to intercept & parse the output in the agentStepsParser
			func: async () => '',
		});

		tools.push(structuredOutputParserTool);
	}

	const options = this.getNodeParameter('options', 0, {}) as {
		systemMessage?: string;
		maxIterations?: number;
		returnIntermediateSteps?: boolean;
	};

	const passthroughBinaryImages = this.getNodeParameter('options.passthroughBinaryImages', 0, true);
	const messages: BaseMessagePromptTemplateLike[] = [
		['system', `{system_message}${outputParser ? '\n\n{formatting_instructions}' : ''}`],
		['placeholder', '{chat_history}'],
		['human', '{input}'],
	];

	const hasBinaryData = this.getInputData()?.[0]?.binary !== undefined;
	if (hasBinaryData && passthroughBinaryImages) {
		const binaryMessage = await extractBinaryMessages(this);
		messages.push(binaryMessage);
	}
	// We add the agent scratchpad last, so that the agent will not run in loops
	// by adding binary messages between each interaction
	messages.push(['placeholder', '{agent_scratchpad}']);
	const prompt = ChatPromptTemplate.fromMessages(messages);

	const agent = createToolCallingAgent({
		llm: model,
		tools,
		prompt,
		streamRunnable: false,
	});
	agent.streamRunnable = false;

	const runnableAgent = RunnableSequence.from([agent, agentStepsParser, fixEmptyContentMessage]);

	const executor = AgentExecutor.fromAgentAndTools({
		agent: runnableAgent,
		memory,
		tools,
		returnIntermediateSteps: options.returnIntermediateSteps === true,
		maxIterations: options.maxIterations ?? 10,
	});
	const returnData: INodeExecutionData[] = [];

	const items = this.getInputData();
	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			const input = getPromptInputByType({
				ctx: this,
				i: itemIndex,
				inputKey: 'text',
				promptTypeKey: 'promptType',
			});

			if (input === undefined) {
				throw new NodeOperationError(this.getNode(), 'The ‘text‘ parameter is empty.');
			}

			const response = await executor.invoke({
				input,
				system_message: options.systemMessage ?? SYSTEM_MESSAGE,
				formatting_instructions:
					'IMPORTANT: Always call `format_final_response` to format your final response!',
			});

			if (memory && outputParser) {
				const parsedOutput = jsonParse<{ output: Record<string, unknown> }>(
					response.output as string,
				);
				response.output = parsedOutput?.output ?? parsedOutput;
			}

			returnData.push({
				json: omit(
					response,
					'system_message',
					'formatting_instructions',
					'input',
					'chat_history',
					'agent_scratchpad',
				),
			});
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
