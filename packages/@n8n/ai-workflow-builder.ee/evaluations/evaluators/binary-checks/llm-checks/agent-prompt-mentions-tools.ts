import { createLlmCheck } from './create-llm-check';

export const agentPromptMentionsTools = createLlmCheck({
	name: 'agent_prompt_mentions_tools',
	systemPrompt: `You are an evaluator checking whether an n8n AI Agent node's system prompt mentions the tools connected to it.
Check:
- Does the agent's system message reference or describe the tools available to it?
- Are the connected tool nodes mentioned by name or capability in the system prompt?
- Does the prompt guide the agent on when and how to use its tools?

If the workflow has no Agent nodes, pass automatically.
If the Agent node has no system message, this should fail.

Respond with pass: true if the agent prompt adequately mentions its tools, false otherwise.
Provide clear reasoning for your decision.`,
	humanTemplate: `User Request: {userPrompt}

Generated Workflow:
{generatedWorkflow}

{referenceSection}

Does the AI Agent's system prompt mention and describe its connected tools?`,
});
