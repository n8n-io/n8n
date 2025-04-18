import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { PromptTemplate } from '@langchain/core/prompts';
import { AgentExecutor, ChatAgent, ZeroShotAgent } from 'langchain/agents';
import {
	type IExecuteFunctions,
	type INodeExecutionData,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';

import { getConnectedTools, getPromptInputByType, isChatInstance } from '@utils/helpers';
import { getOptionalOutputParser } from '@utils/output_parsers/N8nOutputParser';
import { throwIfToolSchema } from '@utils/schemaParsing';
import { getTracingConfig } from '@utils/tracing';

import { checkForStructuredTools, extractParsedOutput } from '../utils';

export async function reActAgentAgentExecute(
	this: IExecuteFunctions,
	nodeVersion: number,
): Promise<INodeExecutionData[][]> {
	this.logger.debug('Executing ReAct Agent');

	const model = (await this.getInputConnectionData(NodeConnectionTypes.AiLanguageModel, 0)) as
		| BaseLanguageModel
		| BaseChatModel;

	const tools = await getConnectedTools(this, nodeVersion >= 1.5, true, true);

	await checkForStructuredTools(tools, this.getNode(), 'ReAct Agent');

	const outputParser = await getOptionalOutputParser(this);

	const options = this.getNodeParameter('options', 0, {}) as {
		prefix?: string;
		suffix?: string;
		suffixChat?: string;
		maxIterations?: number;
		humanMessageTemplate?: string;
		returnIntermediateSteps?: boolean;
	};
	let agent: ChatAgent | ZeroShotAgent;

	if (isChatInstance(model)) {
		agent = ChatAgent.fromLLMAndTools(model, tools, {
			prefix: options.prefix,
			suffix: options.suffixChat,
			humanMessageTemplate: options.humanMessageTemplate,
		});
	} else {
		agent = ZeroShotAgent.fromLLMAndTools(model, tools, {
			prefix: options.prefix,
			suffix: options.suffix,
		});
	}

	const agentExecutor = AgentExecutor.fromAgentAndTools({
		agent,
		tools,
		returnIntermediateSteps: options?.returnIntermediateSteps === true,
		maxIterations: options.maxIterations ?? 10,
	});

	const returnData: INodeExecutionData[] = [];

	let prompt: PromptTemplate | undefined;
	if (outputParser) {
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
				.invoke({ input, outputParser });

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
