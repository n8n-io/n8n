import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import type { AgentAction, AgentFinish, AgentStep } from 'langchain/agents';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import type { BaseChatMemory } from '@langchain/community/memory/chat_memory';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { omit } from 'lodash';
import type { Tool } from '@langchain/core/tools';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { RunnableSequence } from '@langchain/core/runnables';
import type { ZodObject } from 'zod';
import { z } from 'zod';
import type { BaseOutputParser, StructuredOutputParser } from '@langchain/core/output_parsers';
import { OutputFixingParser } from 'langchain/output_parsers';
import {
	isChatInstance,
	getPromptInputByType,
	getOptionalOutputParsers,
	getConnectedTools,
} from '../../../../../utils/helpers';
import { SYSTEM_MESSAGE } from './prompt';

function getOutputParserSchema(outputParser: BaseOutputParser): ZodObject<any, any, any, any> {
	const parserType = outputParser.lc_namespace[outputParser.lc_namespace.length - 1];
	let schema: ZodObject<any, any, any, any>;

	if (parserType === 'structured') {
		// If the output parser is a structured output parser, we will use the schema from the parser
		schema = (outputParser as StructuredOutputParser<ZodObject<any, any, any, any>>).schema;
	} else if (parserType === 'fix' && outputParser instanceof OutputFixingParser) {
		// If the output parser is a fixing parser, we will use the schema from the connected structured output parser
		schema = (outputParser.parser as StructuredOutputParser<ZodObject<any, any, any, any>>).schema;
	} else {
		// If the output parser is not a structured output parser, we will use a fallback schema
		schema = z.object({ text: z.string() });
	}

	return schema;
}

export async function toolsAgentExecute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	this.logger.verbose('Executing Tools Agent');
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

	const tools = (await getConnectedTools(this, true)) as Array<DynamicStructuredTool | Tool>;
	const outputParser = (await getOptionalOutputParsers(this))?.[0];
	let structuredOutputParserTool: DynamicStructuredTool | undefined;

	async function agentStepsParser(
		steps: AgentFinish | AgentAction[],
	): Promise<AgentFinish | AgentAction[]> {
		if (Array.isArray(steps)) {
			const responseParserTool = steps.find((step) => step.tool === 'format_final_response');
			if (responseParserTool) {
				const toolInput = responseParserTool?.toolInput;
				const returnValues = (await outputParser.parse(toolInput as unknown as string)) as Record<
					string,
					unknown
				>;

				return {
					returnValues,
					log: 'Final response formatted',
				};
			}
		}

		// If the steps are an AgentFinish and the outputParser is defined it must mean that the LLM didn't use `format_final_response` tool so we will parse the output manually
		if (outputParser && typeof steps === 'object' && (steps as AgentFinish).returnValues) {
			const finalResponse = (steps as AgentFinish).returnValues;
			const returnValues = (await outputParser.parse(finalResponse as unknown as string)) as Record<
				string,
				unknown
			>;

			return {
				returnValues,
				log: 'Final response formatted',
			};
		}
		return steps;
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

	const prompt = ChatPromptTemplate.fromMessages([
		['system', `{system_message}${outputParser ? '\n\n{formatting_instructions}' : ''}`],
		['placeholder', '{chat_history}'],
		['human', '{input}'],
		['placeholder', '{agent_scratchpad}'],
	]);

	const agent = createToolCallingAgent({
		llm: model,
		tools,
		prompt,
		streamRunnable: false,
	});
	agent.streamRunnable = false;

	const runnableAgent = RunnableSequence.from<{
		steps: AgentStep[];
	}>([agent, agentStepsParser]);

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
				throw new NodeOperationError(this.getNode(), 'The ‘text parameter is empty.');
			}

			// OpenAI doesn't allow empty tools array so we will provide a more user-friendly error message
			if (model.lc_namespace.includes('openai') && tools.length === 0) {
				throw new NodeOperationError(
					this.getNode(),
					"Please connect at least one tool. If you don't need any, try the conversational agent instead",
				);
			}

			const response = await executor.invoke({
				input,
				system_message: options.systemMessage ?? SYSTEM_MESSAGE,
				formatting_instructions:
					'IMPORTANT: Always call `format_final_response` to format your final response!',
			});

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
					json: { error: error?.message },
					pairedItem: { item: itemIndex },
				});
				continue;
			}

			throw error;
		}
	}

	return [returnData];
}
