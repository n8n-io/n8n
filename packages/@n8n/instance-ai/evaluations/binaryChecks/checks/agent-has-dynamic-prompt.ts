import type { BinaryCheck } from '../types';
import { AGENT_TYPE } from '../utils';

function containsExpression(value: unknown): boolean {
	if (typeof value === 'string') return value.startsWith('=');
	if (typeof value === 'object' && value !== null) {
		return Object.values(value).some(containsExpression);
	}
	return false;
}

export const agentHasDynamicPrompt: BinaryCheck = {
	name: 'agent_has_dynamic_prompt',
	description: 'Agent nodes have an expression in their prompt and a system message',
	kind: 'deterministic',
	run(workflow) {
		const nodes = (workflow.nodes ?? []).filter((n) => n.type === AGENT_TYPE);
		if (nodes.length === 0) return { pass: true };

		const issues: string[] = [];

		for (const node of nodes) {
			const params = node.parameters ?? {};
			const promptType = params.promptType as string | undefined;

			// auto (default when omitted) and guardrails modes handle prompting internally
			if (!promptType || promptType === 'auto' || promptType === 'guardrails') continue;

			const textParam = params.text;
			if (!textParam || !containsExpression(textParam)) {
				issues.push(`"${node.name}" has no expression in its prompt field`);
			}

			const options = params.options as { systemMessage?: string } | undefined;
			const systemMessage = options?.systemMessage;
			if (!systemMessage || systemMessage.trim().length === 0) {
				issues.push(`"${node.name}" has no system message`);
			}
		}

		return {
			pass: issues.length === 0,
			...(issues.length > 0 ? { comment: issues.join('; ') } : {}),
		};
	},
};
