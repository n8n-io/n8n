import { createLlmCheck } from './create-llm-check';

export const responseMatchesWorkflowChanges = createLlmCheck({
	name: 'response_matches_workflow_changes',
	description: "Agent's text response accurately describes the actual workflow changes",
	systemPrompt: `You are a strict evaluator checking whether an AI assistant's text response accurately describes the changes it made to an n8n workflow.

You are given:
- The workflow BEFORE the agent's turn (may be empty for new workflows)
- The workflow AFTER the agent's turn
- The agent's text response describing what it did

Your task:
1. Read the agent's text response and identify all claims about workflow changes (e.g., "I added a Slack node", "I configured the HTTP Request node to use POST method", "I connected the trigger to the filter node").
2. Compare the before and after workflow JSONs to determine what actually changed.
3. Verify each claim against the actual diff between before and after workflows.
4. Pass ONLY if every claim the agent makes is reflected in the actual changes.

Rules:
- If the agent claims to have added a node, that node must be in the AFTER workflow but NOT in the BEFORE workflow (or be newly configured).
- If the agent claims a specific configuration change, verify it differs between before and after.
- If the agent claims connections between nodes, verify those connections exist in the AFTER workflow.
- Ignore general/vague statements that don't make specific claims (e.g., "I built a workflow for you").
- If the agent's response contains NO specific claims about workflow changes, pass (nothing to verify).
- A single verifiably false claim means fail.`,
	humanTemplate: `User Request: {userPrompt}

Agent's Text Response:
{agentTextResponse}

Workflow BEFORE agent's turn:
{workflowBefore}

Workflow AFTER agent's turn:
{generatedWorkflow}

Compare the before and after workflows, then verify each specific claim the agent makes. If there are no specific claims, pass.`,
	skipIf: (_workflow, ctx) => {
		if (!ctx.agentTextResponse) {
			return 'Skipped: no agent text response available';
		}
		return undefined;
	},
});
