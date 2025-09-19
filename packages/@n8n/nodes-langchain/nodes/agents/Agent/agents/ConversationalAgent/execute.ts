import type { BaseChatMemory } from '@langchain/community/memory/chat_memory';
import { PromptTemplate } from '@langchain/core/prompts';
import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { isChatInstance, getPromptInputByType, getConnectedTools } from '@utils/helpers';
import { getOptionalOutputParser } from '@utils/output_parsers/N8nOutputParser';
import { throwIfToolSchema } from '@utils/schemaParsing';
import { getTracingConfig } from '@utils/tracing';

import { checkForStructuredTools, extractParsedOutput } from '../utils';

export async function conversationalAgentExecute(
	this: IExecuteFunctions,
	nodeVersion: number,
): Promise<INodeExecutionData[][]> {
	this.logger.debug('Executing Conversational Agent');
	const model = await this.getInputConnectionData(NodeConnectionTypes.AiLanguageModel, 0);

	if (!isChatInstance(model)) {
		throw new NodeOperationError(this.getNode(), 'Conversational Agent requires Chat Model');
	}

	const memory = (await this.getInputConnectionData(NodeConnectionTypes.AiMemory, 0)) as
		| BaseChatMemory
		| undefined;

	const tools = await getConnectedTools(this, nodeVersion >= 1.5, true, true);
	const outputParser = await getOptionalOutputParser(this);

	await checkForStructuredTools(tools, this.getNode(), 'Conversational Agent');

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
				throw new NodeOperationError(this.getNode(), 'The ‘text parameter is empty.');
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
