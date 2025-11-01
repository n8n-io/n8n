import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, SystemMessagePromptTemplate } from '@langchain/core/prompts';
import type { OutputFixingParser, StructuredOutputParser } from 'langchain/output_parsers';
import { NodeOperationError, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';

import { getTracingConfig } from '@utils/tracing';

import { SYSTEM_PROMPT_TEMPLATE } from './constants';

export async function processItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
	item: INodeExecutionData,
	llm: BaseLanguageModel,
	parser: StructuredOutputParser<any> | OutputFixingParser<any>,
	categories: Array<{ category: string; description: string }>,
	multiClassPrompt: string,
	fallbackPrompt: string | undefined,
): Promise<Record<string, unknown>> {
	const input = ctx.getNodeParameter('inputText', itemIndex) as string;

	if (!input) {
		throw new NodeOperationError(
			ctx.getNode(),
			`Text to classify for item ${itemIndex} is not defined`,
		);
	}

	item.pairedItem = { item: itemIndex };

	const inputPrompt = new HumanMessage(input);

	const systemPromptTemplateOpt = ctx.getNodeParameter(
		'options.systemPromptTemplate',
		itemIndex,
		SYSTEM_PROMPT_TEMPLATE,
	) as string;
	const systemPromptTemplate = SystemMessagePromptTemplate.fromTemplate(
		`${systemPromptTemplateOpt ?? SYSTEM_PROMPT_TEMPLATE}
	{format_instructions}
	${multiClassPrompt}
	${fallbackPrompt}`,
	);

	const messages = [
		await systemPromptTemplate.format({
			categories: categories.map((cat) => cat.category).join(', '),
			format_instructions: parser.getFormatInstructions(),
		}),
		inputPrompt,
	];
	const prompt = ChatPromptTemplate.fromMessages(messages);
	const chain = prompt.pipe(llm).pipe(parser).withConfig(getTracingConfig(ctx));

	return await chain.invoke(messages);
}
