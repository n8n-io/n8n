import { createLlmCheck } from './create-llm-check';

export const validDataFlow = createLlmCheck({
	name: 'valid_data_flow',
	systemPrompt: `You are an evaluator checking whether expressions in an n8n workflow correctly reference fields that exist upstream.
Check:
- Expressions using $json reference fields that the previous node actually outputs
- $node references point to nodes that exist and are connected upstream
- Data transformations reference valid input field names
- No expressions reference fields that would be undefined at runtime

Respond with pass: true if all expressions reference valid upstream fields, false otherwise.
Provide clear reasoning for your decision.`,
	humanTemplate: `User Request: {userPrompt}

Generated Workflow:
{generatedWorkflow}

{referenceSection}

Do all expressions in this workflow correctly reference fields that exist upstream?`,
});
