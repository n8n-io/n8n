import {
	type IExecuteFunctions,
	type INodeExecutionData,
	NodeConnectionType,
	NodeOperationError,
} from 'n8n-workflow';

import type { Tool } from 'langchain/tools';
import type { BaseOutputParser } from 'langchain/schema/output_parser';
import { PromptTemplate } from 'langchain/prompts';
import { CombiningOutputParser } from 'langchain/output_parsers';
import type { BaseChatModel } from 'langchain/chat_models/base';
import { PlanAndExecuteAgentExecutor } from 'langchain/experimental/plan_and_execute';

export async function planAndExecuteAgentExecute(
	this: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
	this.logger.verbose('Executing PlanAndExecute Agent');
	const model = (await this.getInputConnectionData(
		NodeConnectionType.AiLanguageModel,
		0,
	)) as BaseChatModel;

	const tools = (await this.getInputConnectionData(NodeConnectionType.AiTool, 0)) as Tool[];

	const outputParsers = (await this.getInputConnectionData(
		NodeConnectionType.AiOutputParser,
		0,
	)) as BaseOutputParser[];

	const options = this.getNodeParameter('options', 0, {}) as {
		humanMessageTemplate?: string;
	};

	const agentExecutor = await PlanAndExecuteAgentExecutor.fromLLMAndTools({
		llm: model,
		tools,
		humanMessageTemplate: options.humanMessageTemplate,
	});

	const returnData: INodeExecutionData[] = [];

	let outputParser: BaseOutputParser | undefined;
	let prompt: PromptTemplate | undefined;
	if (outputParsers.length) {
		outputParser =
			outputParsers.length === 1 ? outputParsers[0] : new CombiningOutputParser(...outputParsers);

		const formatInstructions = outputParser.getFormatInstructions();

		prompt = new PromptTemplate({
			template: '{input}\n{formatInstructions}',
			inputVariables: ['input'],
			partialVariables: { formatInstructions },
		});
	}

	const items = this.getInputData();
	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		let input = this.getNodeParameter('text', itemIndex) as string;

		if (input === undefined) {
			throw new NodeOperationError(this.getNode(), 'The ‘text‘ parameter is empty.');
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
