import { createLlmCheck } from './create-llm-check';

export const fulfillsUserRequest = createLlmCheck({
	name: 'fulfills_user_request',
	systemPrompt: `You are an evaluator checking whether an n8n workflow fulfills a user's request.
Analyze the workflow JSON and determine if ALL explicitly requested features and behaviors are present.
Focus on:
- Are all requested integrations/services included as nodes?
- Are all requested actions/operations configured?
- Does the workflow flow match the user's described process?

Respond with pass: true if ALL explicitly requested features are present, false otherwise.
Provide clear reasoning for your decision.`,
	humanTemplate: `User Request: {userPrompt}

Generated Workflow:
{generatedWorkflow}

{referenceSection}

Does this workflow fulfill all parts of the user's request?`,
});
