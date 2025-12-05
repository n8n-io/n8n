import { PromptTemplate } from '@langchain/core/prompts';

/** Template for generating descriptive workflow names from user prompts */
export const workflowNamingPromptTemplate = PromptTemplate.fromTemplate(
	`Based on the initial user prompt, please generate a name for the workflow that captures its essence and purpose.

<initial_prompt>
{initialPrompt}
</initial_prompt>

This name should be concise, descriptive, and suitable for a workflow that automates tasks related to the given prompt. The name should be in a format that is easy to read and understand. Do not include the word "workflow" in the name.
`,
);
