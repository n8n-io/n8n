import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';

import {
	WorkflowTechnique,
	TechniqueDescription,
	type PromptCategorization,
} from '@/types/categorization';

const examplePrompts = [
	{
		prompt: 'Monitor social channels for product mentions and auto-respond with campaign messages',
		techniques: [
			WorkflowTechnique.MONITORING,
			WorkflowTechnique.CHATBOT,
			WorkflowTechnique.CONTENT_GENERATION,
		],
	},
	{
		prompt: 'Collect partner referral submissions and verify client instances via BigQuery',
		techniques: [
			WorkflowTechnique.FORM_INPUT,
			WorkflowTechnique.HUMAN_IN_THE_LOOP,
			WorkflowTechnique.NOTIFICATION,
		],
	},
	{
		prompt: 'Scrape competitor pricing pages weekly and generate a summary report of changes',
		techniques: [
			WorkflowTechnique.SCHEDULING,
			WorkflowTechnique.SCRAPING_AND_RESEARCH,
			WorkflowTechnique.DATA_EXTRACTION,
			WorkflowTechnique.DATA_ANALYSIS,
		],
	},
	{
		prompt: 'Process uploaded PDF contracts to extract client details and update CRM records',
		techniques: [
			WorkflowTechnique.DOCUMENT_PROCESSING,
			WorkflowTechnique.DATA_EXTRACTION,
			WorkflowTechnique.DATA_TRANSFORMATION,
			WorkflowTechnique.ENRICHMENT,
		],
	},
	{
		prompt: 'Build a searchable internal knowledge base from past support tickets',
		techniques: [
			WorkflowTechnique.DATA_TRANSFORMATION,
			WorkflowTechnique.DATA_ANALYSIS,
			WorkflowTechnique.KNOWLEDGE_BASE,
		],
	},
];

function formatExamplePrompts() {
	return examplePrompts
		.map((example) => `- ${example.prompt} → ${example.techniques.join(',')}`)
		.join('\n');
}

const promptCategorizationTemplate = PromptTemplate.fromTemplate(
	`Analyze the following user prompt and identify the workflow techniques required to fulfill the request.
Be specific and identify all relevant techniques.

<user_prompt>
{userPrompt}
</user_prompt>

<workflow_techniques>
{techniques}
</workflow_techniques>

The following prompt categorization examples show a prompt → techniques involved to provide a sense
of how the categorization should be carried out.
<example_categorization>
${formatExamplePrompts()}
</example_categorization>

Select a maximum of 5 techniques that you believe are applicable, but only select them if you are
confident that they are applicable. If the prompt is ambigious or does not provide an obvious workflow
do not provide any techniques - if confidence is low avoid providing techniques.

Select ALL techniques that apply to this workflow. Most workflows use multiple techniques.
Rate your confidence in this categorization from 0.0 to 1.0.
`,
);

function formatTechniqueList(): string {
	return Object.entries(TechniqueDescription)
		.map(([key, description]) => `- **${key}**: ${description}`)
		.join('\n');
}

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
