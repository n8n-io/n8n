import { createLlmCheck } from './create-llm-check';

export const handlesMultipleItems = createLlmCheck({
	name: 'handles_multiple_items',
	systemPrompt: `You are an evaluator checking whether an n8n workflow properly handles array/multiple-item inputs.
Check:
- When a node outputs multiple items, are downstream nodes configured to handle them?
- Are loops or splitInBatches nodes used where appropriate for batch processing?
- Are aggregate operations (like summarize or merge) used correctly when combining multiple items?

Note: Most n8n nodes automatically process all items, so this check mainly looks for cases where
special handling is needed but missing (e.g., HTTP Request nodes that should iterate over items).

Respond with pass: true if the workflow handles multiple items correctly, false otherwise.
Provide clear reasoning for your decision.`,
	humanTemplate: `User Request: {userPrompt}

Generated Workflow:
{generatedWorkflow}

{referenceSection}

Does this workflow properly handle cases where multiple items flow through the nodes?`,
});
