import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, SystemMessagePromptTemplate } from '@langchain/core/prompts';
import type { OutputFixingParser } from 'langchain/output_parsers';
import { NodeOperationError, type IExecuteFunctions } from 'n8n-workflow';

import { getTracingConfig } from '@utils/tracing';

import { SYSTEM_PROMPT_TEMPLATE } from './constants';

export async function processItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
	llm: BaseLanguageModel,
	parser: OutputFixingParser<object>,
) {
	const input = ctx.getNodeParameter('text', itemIndex) as string;
	if (!input?.trim()) {
		throw new NodeOperationError(ctx.getNode(), `Text for item ${itemIndex} is not defined`, {
			itemIndex,
		});
	}
	const inputPrompt = new HumanMessage(input);

	const options = ctx.getNodeParameter('options', itemIndex, {}) as {
		systemPromptTemplate?: string;
	};

	const systemPromptTemplate = SystemMessagePromptTemplate.fromTemplate(
		`${options.systemPromptTemplate ?? SYSTEM_PROMPT_TEMPLATE}
{format_instructions}`,
	);

	const messages = [
		await systemPromptTemplate.format({
			format_instructions: parser.getFormatInstructions(),
		}),
		inputPrompt,
	];
	const prompt = ChatPromptTemplate.fromMessages(messages);
	const chain = prompt.pipe(llm).pipe(parser).withConfig(getTracingConfig(ctx));

	return await chain.invoke(messages);
}
