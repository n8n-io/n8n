import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { PromptTemplate } from '@langchain/core/prompts';
import z from 'zod';

const workflowNamingPromptTemplate = PromptTemplate.fromTemplate(
	`Based on the initial user prompt, please generate a name for the workflow that captures its essence and purpose.

<initial_prompt>
{initialPrompt}
</initial_prompt>

This name should be concise, descriptive, and suitable for a workflow that automates tasks related to the given prompt. The name should be in a format that is easy to read and understand. Do not include the word "workflow" in the name.
`,
);

export async function workflowNameChain(llm: BaseChatModel, initialPrompt: string) {
	// Use structured output for the workflow name to ensure it meets the required format and length
	const nameSchema = z.object({
		name: z.string().min(10).max(128).describe('Name of the workflow based on the prompt'),
	});

	const modelWithStructure = llm.withStructuredOutput(nameSchema);

	const prompt = await workflowNamingPromptTemplate.invoke({
		initialPrompt,
	});

	const structuredOutput = (await modelWithStructure.invoke(prompt)) as z.infer<typeof nameSchema>;

	return {
		name: structuredOutput.name,
	};
}
