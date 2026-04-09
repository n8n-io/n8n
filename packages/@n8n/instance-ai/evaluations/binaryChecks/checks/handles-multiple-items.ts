import { createLlmCheck } from './create-llm-check';

export const handlesMultipleItems = createLlmCheck({
	name: 'handles_multiple_items',
	description: 'Workflow handles multiple items correctly for its use case',
	systemPrompt: `You are an evaluator checking whether an n8n workflow handles multiple items correctly.

Important n8n context:
- Most n8n nodes automatically process ALL incoming items one by one — this is correct default behavior
- A workflow designed for single-item processing (manual trigger + one record) does NOT need batch handling
- Merge nodes with "combineByPosition" are correct for merging parallel single-item branches
- AI Agent nodes process one item at a time, which is normal

Only FAIL if there is a clear structural problem:
- A node configured with multipleFiles/multiple inputs but no downstream handling for arrays
- A splitInBatches that's clearly needed but missing (e.g., sending individual API calls for each item in a large list)
- An aggregate node producing an array that downstream nodes don't handle

Do NOT fail for:
- Single-item workflows (manual trigger processing one record)
- Workflows where n8n's automatic item-by-item processing is sufficient
- Chatbot/agent workflows that process one message at a time

Respond with pass: true if the workflow handles items correctly for its use case.`,
	humanTemplate: `User Request: {userPrompt}

Generated Workflow:
{generatedWorkflow}

Does this workflow handle multiple items correctly for its intended use case?`,
});
