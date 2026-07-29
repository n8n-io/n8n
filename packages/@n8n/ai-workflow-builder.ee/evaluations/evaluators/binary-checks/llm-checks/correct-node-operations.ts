import { createLlmCheck } from './create-llm-check';

export const correctNodeOperations = createLlmCheck({
	name: 'correct_node_operations',
	systemPrompt: `You are an evaluator checking whether n8n workflow nodes use the correct resource and operation settings.

For each node that has resource/operation parameters, verify:
1. The resource matches what the node SHOULD operate on given its name and the workflow's purpose
2. The operation matches the intended action (get, getAll, create, update, delete, etc.)
3. Two nodes that should do different things are NOT configured identically

Common mistakes to catch:
- A node named "Get Captions" but configured with resource: "video" instead of resource: "caption"
- A node that should create records but uses operation: "get"
- Two nodes configured identically when they should fetch different resources

Nodes without resource/operation parameters (triggers, Set, Merge, AI agents, LLM models) should be skipped.

Respond with pass: true ONLY if all resource/operation combinations are correct for the workflow's intent.`,
	humanTemplate: `User Request: {userPrompt}

Generated Workflow:
{generatedWorkflow}

{referenceSection}

Check each node's resource and operation parameters. Are they all correct for this workflow's purpose?`,
});
