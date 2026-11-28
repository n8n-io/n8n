import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { GuardrailModelRunner, GuardrailResult } from '@n8n/ai-utilities/guardrails';
import {
	createLLMCheckFn as createLLMCheckFnCore,
	runLLMValidation as runLLMValidationCore,
} from '@n8n/ai-utilities/guardrails';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { toParserInputText } from '@utils/output_parsers/parserInput';

import type { LLMConfig } from '../actions/types';

export { LLM_SYSTEM_RULES } from '@n8n/ai-utilities/guardrails';

export async function getChatModel(this: IExecuteFunctions): Promise<BaseChatModel> {
	const model = await this.getInputConnectionData(NodeConnectionTypes.AiLanguageModel, 0);
	if (Array.isArray(model)) {
		return model[0] as BaseChatModel;
	}
	return model as BaseChatModel;
}

/**
 * LangChain adapter for the model-agnostic guardrail seam in
 * `@n8n/ai-utilities/guardrails`.
 */
export function createLangChainGuardrailRunner(model: BaseChatModel): GuardrailModelRunner {
	return async (systemPrompt, input) => {
		const chatPrompt = ChatPromptTemplate.fromMessages([
			['system', '{system_message}'],
			['human', '{input}'],
			['placeholder', '{agent_scratchpad}'],
		]);
		const chain = chatPrompt.pipe(model);
		const result = await chain.invoke({
			steps: [],
			input,
			system_message: systemPrompt,
		});
		// Read only the text blocks: models with thinking enabled put a thinking
		// block before the text, and a reply can have more than one text block.
		return toParserInputText(result);
	};
}

export async function runLLMValidation(
	name: string,
	inputText: string,
	{ model, ...config }: LLMConfig,
): Promise<GuardrailResult> {
	return await runLLMValidationCore(name, inputText, {
		...config,
		run: createLangChainGuardrailRunner(model),
	});
}

export const createLLMCheckFn = (name: string, { model, ...config }: LLMConfig) =>
	createLLMCheckFnCore(name, { ...config, run: createLangChainGuardrailRunner(model) });
