import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { SystemMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts';
import type { Runnable } from '@langchain/core/runnables';
import { RunnableSequence } from '@langchain/core/runnables';
import { OperationalError } from 'n8n-workflow';
import type { z } from 'zod';

import type { EvaluationInput } from '../../types/evaluation';

type EvaluatorChainInput = {
	userPrompt: string;
	generatedWorkflow: string;
	referenceSection: string;
};

export function createEvaluatorChain<TResult extends Record<string, unknown>>(
	llm: BaseChatModel,
	schema: z.ZodType<TResult>,
	systemPrompt: string,
	humanTemplate: string,
): RunnableSequence<EvaluatorChainInput, TResult> {
	if (!llm.bindTools) {
		throw new OperationalError("LLM doesn't support binding tools");
	}

	const prompt = ChatPromptTemplate.fromMessages([
		new SystemMessage(systemPrompt),
		HumanMessagePromptTemplate.fromTemplate(humanTemplate),
	]);

	const llmWithStructuredOutput = llm.withStructuredOutput<TResult>(schema);

	return RunnableSequence.from<EvaluatorChainInput, TResult>([prompt, llmWithStructuredOutput]);
}

export async function invokeEvaluatorChain<TResult>(
	chain: Runnable<EvaluatorChainInput, TResult>,
	input: EvaluationInput,
): Promise<TResult> {
	const referenceSection = input.referenceWorkflow
		? `<reference_workflow>\n${JSON.stringify(input.referenceWorkflow, null, 2)}\n</reference_workflow>`
		: '';

	const result = await chain.invoke({
		userPrompt: input.userPrompt,
		generatedWorkflow: JSON.stringify(input.generatedWorkflow, null, 2),
		referenceSection,
	});

	return result;
}
