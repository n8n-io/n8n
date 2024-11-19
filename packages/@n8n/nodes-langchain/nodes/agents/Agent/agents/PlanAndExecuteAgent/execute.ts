import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { PlanAndExecuteAgentExecutor } from 'langchain/experimental/plan_and_execute';
import { CombiningOutputParser } from 'langchain/output_parsers';
import {
	type IExecuteFunctions,
	type INodeExecutionData,
	NodeConnectionType,
	NodeOperationError,
} from 'n8n-workflow';

import { getConnectedTools, getPromptInputByType } from '../../../../../utils/helpers';
import { getOptionalOutputParsers } from '../../../../../utils/output_parsers/N8nOutputParser';
import { throwIfToolSchema } from '../../../../../utils/schemaParsing';
import { getTracingConfig } from '../../../../../utils/tracing';
import { checkForStructuredTools, extractParsedOutput } from '../utils';

export async function planAndExecuteAgentExecute(
	this: IExecuteFunctions,
	nodeVersion: number,
): Promise<INodeExecutionData[][]> {
	this.logger.debug('Executing PlanAndExecute Agent');
	const model = (await this.getInputConnectionData(
		NodeConnectionType.AiLanguageModel,
		0,
	)) as BaseChatModel;

	const tools = await getConnectedTools(this, nodeVersion >= 1.5, true, true);

	await checkForStructuredTools(tools, this.getNode(), 'Plan & Execute Agent');
	const outputParsers = await getOptionalOutputParsers(this);

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
		try {
			let input;
			if (this.getNode().typeVersion <= 1.2) {
				input = this.getNodeParameter('text', itemIndex) as string;
			} else {
				input = getPromptInputByType({
					ctx: this,
					i: itemIndex,
					inputKey: 'text',
					promptTypeKey: 'promptType',
				});
			}

			if (input === undefined) {
				throw new NodeOperationError(this.getNode(), 'The ‘text‘ parameter is empty.');
			}

			if (prompt) {
				input = (await prompt.invoke({ input })).value;
			}

			const response = await agentExecutor
				.withConfig(getTracingConfig(this))
				.invoke({ input, outputParsers });

			if (outputParser) {
				response.output = await extractParsedOutput(this, outputParser, response.output as string);
			}

			returnData.push({ json: response });
		} catch (error) {
			throwIfToolSchema(this, error);
			if (this.continueOnFail()) {
				returnData.push({ json: { error: error.message }, pairedItem: { item: itemIndex } });
				continue;
			}

			throw error;
		}
	}

	return [returnData];
}
