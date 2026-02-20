import { createLlmCheck } from './create-llm-check';

export const correctNodeOperations = createLlmCheck({
	name: 'correct_node_operations',
	systemPrompt: `You are an evaluator checking whether n8n workflow nodes use the correct resource and operation settings.
For each node, verify:
- The resource parameter matches what the node should operate on
- The operation parameter matches the intended action (create, read, update, delete, etc.)
- The combination of resource + operation makes sense for the workflow's purpose

Respond with pass: true if all nodes have correct resource/operation settings, false otherwise.
Provide clear reasoning for your decision.`,
	humanTemplate: `User Request: {userPrompt}

Generated Workflow:
{generatedWorkflow}

{referenceSection}

Do all nodes have the correct resource and operation settings for this workflow?`,
});
