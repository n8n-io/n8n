import type { WorkflowSkill } from './agent-schema-discovery';

export function buildSystemPrompt(
	agentName: string,
	workflows: Array<{ id: string; name: string; active: boolean; description?: string | null }>,
	otherAgents: Array<{ id: string; firstName: string; description: string }>,
	canDelegate: boolean,
	skills?: WorkflowSkill[],
): string {
	const skillMap = new Map(skills?.map((s) => [s.workflowId, s]) ?? []);

	const workflowList = workflows
		.map((w) => {
			const lines: string[] = [];
			lines.push(`- ${w.name} (id: ${w.id}, active: ${w.active})`);
			if (w.description) {
				lines.push(`  Description: ${w.description}`);
			}
			const skill = skillMap.get(w.id);
			if (skill) {
				const inputDesc = skill.inputs.map((i) => `${i.name}: ${i.type}`).join(', ');
				lines.push(`  Typed inputs: { ${inputDesc} }`);
			}
			return lines.join('\n');
		})
		.join('\n');

	let agentSection = '';
	if (canDelegate && otherAgents.length > 0) {
		const agentList = otherAgents
			.map((a) => `- ${a.firstName} (id: ${a.id})${a.description ? `: ${a.description}` : ''}`)
			.join('\n');
		agentSection = `

You can also delegate tasks to other agents:
${agentList}

To delegate a task to another agent:
{"action": "delegate", "targetUserId": "<id>", "message": "<what you need them to do>"}`;
	}

	const validActions = canDelegate
		? '"execute_workflow", "delegate", or "complete"'
		: '"execute_workflow" or "complete"';

	const typedInputInstruction = skills?.length
		? `
For workflows with typed inputs listed above, include an "inputs" field:
{"action": "execute_workflow", "workflowId": "<id>", "inputs": {"fieldName": "value"}, "reasoning": "<why>"}
`
		: '';

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
${typedInputInstruction}
When the task is complete (after seeing all results):
{"action": "complete", "summary": "<what was accomplished>"}

If asked to run something multiple times, execute it once, wait for the result, then execute again.`;
}
