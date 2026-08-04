import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { RunnableConfig } from '@langchain/core/runnables';
import z from 'zod';

import { workflowNamingPromptTemplate } from '@/prompts/chains/workflow-name.prompt';

export async function workflowNameChain(
	llm: BaseChatModel,
	initialPrompt: string,
	config?: RunnableConfig,
) {
	// Use structured output for the workflow name to ensure it meets the required format and length
	const nameSchema = z.object({
		name: z.string().min(10).max(128).describe('Name of the workflow based on the prompt'),
	});

	const modelWithStructure = llm.withStructuredOutput(nameSchema);

	const prompt = await workflowNamingPromptTemplate.invoke({
		initialPrompt,
	});

	const rawOutput = await modelWithStructure.invoke(prompt, config);
	const structuredOutput = nameSchema.parse(rawOutput);

	return {
		name: structuredOutput.name,
	};
}
