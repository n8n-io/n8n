import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, SystemMessagePromptTemplate } from '@langchain/core/prompts';
import type { OutputFixingParser, StructuredOutputParser } from '@langchain/classic/output_parsers';
import { NodeOperationError, type IExecuteFunctions } from 'n8n-workflow';

import { wrapLangChainParserError } from '@utils/output_parsers/langchainParserError';
import { toParserInputText } from '@utils/output_parsers/parserInput';
import { getTracingConfig } from '@utils/tracing';

import { toClassificationResult, type Category, type ClassificationResult } from './classification';
import { SYSTEM_PROMPT_TEMPLATE } from './constants';

export async function processItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
	llm: BaseLanguageModel,
	parser: StructuredOutputParser<any> | OutputFixingParser<any>,
	categories: Category[],
	multiClassPrompt: string,
	fallbackPrompt: string | undefined,
): Promise<ClassificationResult> {
	const input = ctx.getNodeParameter('inputText', itemIndex) as string;

	if (!input) {
		throw new NodeOperationError(
			ctx.getNode(),
			`Text to classify for item ${itemIndex} is not defined`,
		);
	}

	const inputPrompt = new HumanMessage(input);

	const systemPromptTemplateOpt = ctx.getNodeParameter(
		'options.systemPromptTemplate',
		itemIndex,
		SYSTEM_PROMPT_TEMPLATE,
	) as string;
	const escapedTemplate = (systemPromptTemplateOpt ?? SYSTEM_PROMPT_TEMPLATE)
		.replace(/[{}]/g, (match) => match + match)
		.replaceAll('{{categories}}', '{categories}');

	const systemPromptTemplate = SystemMessagePromptTemplate.fromTemplate(
		`${escapedTemplate}
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
	const chain = prompt
		.pipe(llm)
		.pipe(toParserInputText)
		.pipe(parser)
		.withConfig(getTracingConfig(ctx));

	try {
		return toClassificationResult(await chain.invoke(messages), categories);
	} catch (error) {
		throw wrapLangChainParserError(error, ctx.getNode(), itemIndex);
	}
}
