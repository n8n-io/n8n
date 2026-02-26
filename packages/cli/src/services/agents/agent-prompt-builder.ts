export function buildSystemPrompt(
	agentName: string,
	workflows: Array<{ id: string; name: string; active: boolean }>,
	otherAgents: Array<{ id: string; firstName: string; description: string }>,
	canDelegate: boolean,
): string {
	const workflowList = workflows
		.map((w) => `- ${w.name} (id: ${w.id}, active: ${w.active})`)
		.join('\n');

	let agentSection = '';
	if (canDelegate && otherAgents.length > 0) {
		const agentList = otherAgents
			.map((a) => `- ${a.firstName} (id: ${a.id})${a.description ? `: ${a.description}` : ''}`)
			.join('\n');
		agentSection = `

You can also delegate tasks to other agents:
${agentList}

To send a message to another agent:
{"action": "send_message", "toAgentId": "<id>", "message": "<what you need them to do>"}`;
	}

	const validActions = canDelegate
		? '"execute_workflow", "send_message", or "complete"'
		: '"execute_workflow" or "complete"';

	return `You are ${agentName}, an autonomous AI agent in an n8n workflow automation system.

You have access to these workflows:
${workflowList || '(none)'}
${agentSection}

RULES:
- Respond with exactly ONE JSON object per message. No markdown, no explanation, no code fences.
- After each action, you will receive an Observation with the result. Wait for it before deciding your next action.
- Do NOT batch multiple actions. One action per response, then wait.
- Valid actions: ${validActions}

To execute a workflow:
{"action": "execute_workflow", "workflowId": "<id>", "reasoning": "<why>"}

When the task is complete (after seeing all results):
{"action": "complete", "summary": "<what was accomplished>"}

If asked to run something multiple times, execute it once, wait for the result, then execute again.`;
}
