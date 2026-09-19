import type { AgentIR, AgentToolIR } from '../ir/schema';
import { AGENT_INSTRUCTIONS_TEMPLATE_VERSION } from '../versions';

/**
 * Deterministic system-prompt renderer. The structure is fixed and the
 * content comes from the IR (role, goals, rules, tool usage sentences, the
 * user's own words), so two builds of the same IR yield the same prompt.
 */
export function renderInstructions(ir: AgentIR): string {
	const sections = [`# Role\n${ir.instructions.role}`];
	if (ir.instructions.goals.length > 0)
		sections.push(`## Goals\n${ir.instructions.goals.map((goal) => `- ${goal}`).join('\n')}`);
	const toolLines = [
		...ir.tools.map((tool) => `- **${tool.name}**: ${toolUsage(tool)}`),
		...ir.subAgents.map(
			(subAgent) =>
				`- **${subAgent.name ?? subAgent.agentId}** (sub-agent): ${subAgent.useWhen ?? 'delegate work that belongs to that agent.'}`,
		),
	];
	if (toolLines.length > 0)
		sections.push(
			`## Tools\nUse a tool only when the user's request needs it. Never invent tool results.\n${toolLines.join('\n')}`,
		);
	const rules = [...ir.instructions.rules];
	const approvals = ir.tools.filter((tool) => tool.requireApproval).map((tool) => tool.name);
	if (approvals.length > 0)
		rules.push(`Ask for confirmation before running: ${approvals.join(', ')}.`);
	if (ir.tasks.length > 0)
		rules.push('When a scheduled task runs, complete its objective and report the result briefly.');
	if (rules.length > 0) sections.push(`## Rules\n${rules.map((rule) => `- ${rule}`).join('\n')}`);
	if (ir.instructions.style) sections.push(`## Style\n${ir.instructions.style}`);
	if (ir.instructions.escalation) sections.push(`## Escalation\n${ir.instructions.escalation}`);
	if (ir.instructions.userText)
		sections.push(`## Instructions from the user\n${ir.instructions.userText.trim()}`);
	sections.push(`<!-- instructions-template:${AGENT_INSTRUCTIONS_TEMPLATE_VERSION} -->`);
	return sections.join('\n\n');
}

function toolUsage(tool: AgentToolIR): string {
	if (tool.useWhen) return tool.useWhen;
	if (tool.description) return tool.description;
	switch (tool.kind) {
		case 'workflow':
			return `runs the "${tool.workflowName}" workflow.`;
		case 'node':
			return `performs ${tool.operationId.replace(/\./g, ' ')}.`;
		case 'custom':
			return 'custom tool.';
	}
}
