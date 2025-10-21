import type { SimpleWorkflow } from '@/types';

import type { ProgrammaticViolation } from '../types';
import { containsExpression } from '../utils/expressions';

export function validateAgentPrompt(workflow: SimpleWorkflow): ProgrammaticViolation[] {
	const violations: ProgrammaticViolation[] = [];

	if (!workflow.nodes || workflow.nodes.length === 0) {
		return violations;
	}

	for (const node of workflow.nodes) {
		if (node.type === '@n8n/n8n-nodes-langchain.agent') {
			const textParam = node.parameters?.text;
			const promptType = node.parameters?.promptType;

			if (promptType !== 'auto') {
				if (!textParam || !containsExpression(textParam)) {
					violations.push({
						type: 'major',
						description: `Agent node "${node.name}" has no expression in its prompt field. This likely means it failed to use chatInput`,
						pointsDeducted: 20,
					});
				}
			}
		}
	}

	return violations;
}
