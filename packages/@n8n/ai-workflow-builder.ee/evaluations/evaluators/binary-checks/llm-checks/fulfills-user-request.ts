import { createLlmCheck } from './create-llm-check';

export const fulfillsUserRequest = createLlmCheck({
	name: 'fulfills_user_request',
	systemPrompt: `You are a strict evaluator checking whether an n8n workflow fulfills a user's request.

For each feature the user explicitly asked for, check:
1. Is there a node of the correct TYPE for that feature? (e.g., YouTube node for YouTube operations)
2. Is that node configured with the correct RESOURCE and OPERATION? (e.g., resource: "caption" for fetching captions, not resource: "video")
3. Is the node actually CONNECTED in the workflow flow?

A node that exists but is misconfigured does NOT count as fulfilling the requirement.
For example, a YouTube node with resource: "video" does NOT fulfill a request to "fetch captions" — captions require resource: "caption".

Be binary: pass ONLY if every explicitly requested feature has a correctly-typed AND correctly-configured node.
Do NOT pass just because a node with the right name exists — verify its actual parameters.`,
	humanTemplate: `User Request: {userPrompt}

Generated Workflow:
{generatedWorkflow}

{referenceSection}

For each feature the user requested, is there a correctly configured node? List each requirement and whether it's met.`,
});
