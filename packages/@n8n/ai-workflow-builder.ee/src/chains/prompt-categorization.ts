import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';

import {
	workflowTechnique,
	workflowUseCase,
	TECHNIQUE_DESCRIPTIONS,
	USE_CASE_DESCRIPTIONS,
	type PromptCategorization,
} from '@/types/categorization';

const promptCategorizationTemplate = PromptTemplate.fromTemplate(
	`You are an expert at analyzing workflow automation requests and categorizing them based on common patterns.

Analyze the following user prompt and identify:
1. The primary use case (if clearly identifiable)
2. The workflow techniques required to fulfill the request

<user_prompt>
{userPrompt}
</user_prompt>

## Available Workflow Techniques

{techniques}

## Available Use Cases

{useCases}

## Instructions

- **Techniques**: Select ALL techniques that apply to this workflow. Most workflows use multiple techniques.
- **Use Case**: Select the most appropriate use case, or use "other" if none fit well.
- **Confidence**: Rate your confidence in this categorization from 0.0 to 1.0.

Be specific and identify all relevant techniques. For example, a chatbot that enriches leads would include both "chatbot" and "enrichment" techniques.
`,
);

/**
 * Create formatted technique list for the prompt
 */
function formatTechniqueList(): string {
	return Object.entries(TECHNIQUE_DESCRIPTIONS)
		.map(([key, description]) => `- **${key}**: ${description}`)
		.join('\n');
}

/**
 * Create formatted use case list for the prompt
 */
function formatUseCaseList(): string {
	return Object.entries(USE_CASE_DESCRIPTIONS)
		.map(([key, description]) => `- **${key}**: ${description}`)
		.join('\n');
}

/**
 * Chain for categorizing user prompts into a prompt category
 * @param llm - The language model to use for categorization
 * @param userPrompt - The user's workflow request to categorize
 * @returns Categorization result with use case, techniques, and confidence
 */
export async function promptCategorizationChain(
	llm: BaseChatModel,
	userPrompt: string,
): Promise<PromptCategorization> {
	// Define the schema for structured output
	const categorizationSchema = z.object({
		techniques: z
			.array(z.nativeEnum(workflowTechnique))
			.min(1)
			.describe('One or more workflow techniques identified in the prompt'),
		useCase: z
			.nativeEnum(workflowUseCase)
			.optional()
			.describe('The primary use case if clearly identifiable'),
		confidence: z
			.number()
			.min(0)
			.max(1)
			.describe('Confidence level in this categorization from 0.0 to 1.0'),
	});

	const modelWithStructure = llm.withStructuredOutput(categorizationSchema);

	const prompt = await promptCategorizationTemplate.invoke({
		userPrompt,
		techniques: formatTechniqueList(),
		useCases: formatUseCaseList(),
	});

	const structuredOutput = (await modelWithStructure.invoke(prompt)) as z.infer<
		typeof categorizationSchema
	>;

	return {
		techniques: structuredOutput.techniques,
		useCase: structuredOutput.useCase,
		confidence: structuredOutput.confidence,
	};
}
