import { PromptTemplate } from '@langchain/core/prompts';

import { WorkflowTechnique, TechniqueDescription } from '@/types/categorization';

/** Few-shot examples for prompt categorization - helps LLM understand expected output format */
export const examplePrompts = [
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

/** Formats example prompts as "prompt → techniques" for few-shot learning */
export function formatExamplePrompts(): string {
	return examplePrompts
		.map((example) => `- ${example.prompt} → ${example.techniques.join(',')}`)
		.join('\n');
}

/** Generates bullet list of all techniques with descriptions */
export function formatTechniqueList(): string {
	return Object.entries(TechniqueDescription)
		.map(([key, description]) => `- **${key}**: ${description}`)
		.join('\n');
}

/** Template for analyzing user prompts and identifying workflow techniques */
export const promptCategorizationTemplate = PromptTemplate.fromTemplate(
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
confident that they are applicable. If the prompt is ambiguous or does not provide an obvious workflow
do not provide any techniques - if confidence is low avoid providing techniques.

Select ALL techniques that apply to this workflow. Most workflows use multiple techniques.
Rate your confidence in this categorization from 0.0 to 1.0.
`,
);
