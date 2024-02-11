import {
	type IExecuteFunctions,
	type INodeExecutionData,
	NodeConnectionType,
	NodeOperationError,
} from 'n8n-workflow';

import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import type { Tool } from 'langchain/tools';
import type { BaseChatMemory } from 'langchain/memory';
import type { BaseOutputParser } from 'langchain/schema/output_parser';
import { PromptTemplate } from 'langchain/prompts';
import { CombiningOutputParser } from 'langchain/output_parsers';
import { isChatInstance } from '../../../../../utils/helpers';

export async function conversationalAgentExecute(
	this: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
	this.logger.verbose('Executing Conversational Agent');

	const model = await this.getInputConnectionData(NodeConnectionType.AiLanguageModel, 0);

	if (!isChatInstance(model)) {
		throw new NodeOperationError(this.getNode(), 'Conversational Agent requires Chat Model');
	}

	const memory = (await this.getInputConnectionData(NodeConnectionType.AiMemory, 0)) as
		| BaseChatMemory
		| undefined;
	const tools = (await this.getInputConnectionData(NodeConnectionType.AiTool, 0)) as Tool[];
	const outputParsers = (await this.getInputConnectionData(
		NodeConnectionType.AiOutputParser,
		0,
	)) as BaseOutputParser[];

	// TODO: Make it possible in the future to use values for other items than just 0
	const options = this.getNodeParameter('options', 0, {}) as {
		systemMessage?: string;
		humanMessage?: string;
		maxIterations?: number;
		returnIntermediateSteps?: boolean;
	};

	const agentExecutor = await initializeAgentExecutorWithOptions(tools, model, {
		// Passing "chat-conversational-react-description" as the agent type
		// automatically creates and uses BufferMemory with the executor.
		// If you would like to override this, you can pass in a custom
		// memory option, but the memoryKey set on it must be "chat_history".
		agentType: 'chat-conversational-react-description',
		memory,
		returnIntermediateSteps: options?.returnIntermediateSteps === true,
		maxIterations: options.maxIterations ?? 10,
		agentArgs: {
			systemMessage: options.systemMessage,
			humanMessage: options.humanMessage,
		},
	});

	const returnData: INodeExecutionData[] = [];

	let outputParser: BaseOutputParser | undefined;
	let prompt: PromptTemplate | undefined;
	if (outputParsers.length) {
		if (outputParsers.length === 1) {
			outputParser = outputParsers[0];
		} else {
			outputParser = new CombiningOutputParser(...outputParsers);
		}

		if (outputParser) {
			const formatInstructions = outputParser.getFormatInstructions();

			prompt = new PromptTemplate({
				template: '{input}\n{formatInstructions}',
				inputVariables: ['input'],
				partialVariables: { formatInstructions },
			});
		}
	}

	const items = this.getInputData();
	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		let input = this.getNodeParameter('text', itemIndex) as string;

		if (input === undefined) {
			throw new NodeOperationError(this.getNode(), 'The ‘text parameter is empty.');
		}

		if (prompt) {
			input = (await prompt.invoke({ input })).value;
		}

		let response = await agentExecutor.call({ input, outputParsers });

		if (outputParser) {
			response = { output: await outputParser.parse(response.output as string) };
		}

		returnData.push({ json: response });
	}

	return await this.prepareOutputData(returnData);
}
