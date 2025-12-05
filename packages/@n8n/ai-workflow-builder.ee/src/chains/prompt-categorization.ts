import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { z } from 'zod';

import {
	formatTechniqueList,
	promptCategorizationTemplate,
} from '@/prompts/chains/categorization.prompt';
import { WorkflowTechnique, type PromptCategorization } from '@/types/categorization';

export async function promptCategorizationChain(
	llm: BaseChatModel,
	userPrompt: string,
): Promise<PromptCategorization> {
	const categorizationSchema = z.object({
		techniques: z
			.array(z.nativeEnum(WorkflowTechnique))
			.min(0)
			.max(5)
			.describe('Zero to five workflow techniques identified in the prompt (maximum of 5)'),
		confidence: z
			.number()
			.min(0)
			.max(1)
			.describe('Confidence level in this categorization from 0.0 to 1.0'),
	});

	const modelWithStructure = llm.withStructuredOutput<PromptCategorization>(categorizationSchema);

	const prompt = await promptCategorizationTemplate.invoke({
		userPrompt,
		techniques: formatTechniqueList(),
	});

	const structuredOutput = await modelWithStructure.invoke(prompt);

	return {
		techniques: structuredOutput.techniques,
		confidence: structuredOutput.confidence,
	};
}
