import type { SimpleWorkflow } from '@/types';

import type { Violation } from '../../types/evaluation';
import type { SingleEvaluatorResult } from '../../types/test-result';
import { containsExpression } from '../../utils/expressions';
import { calcSingleEvaluatorScore } from '../../utils/score';

/**
 * Evaluates Agent nodes to ensure their prompts contain expressions.
 * Agent nodes without expressions in prompts (e.g., that failed to use chatInput
 * when there was a chat trigger) are most probably errors.
 */
export function evaluateAgentPrompt(workflow: SimpleWorkflow): SingleEvaluatorResult {
	const violations: Violation[] = [];

	// Check if workflow has nodes
	if (!workflow.nodes || workflow.nodes.length === 0) {
		return { violations, score: 0 };
	}

	// Find all agent nodes and check their prompts
	for (const node of workflow.nodes) {
		// Check if this is an Agent node (ToolsAgent)
		if (node.type === '@n8n/n8n-nodes-langchain.agent') {
			// Check the text parameter for expressions
			const textParam = node.parameters?.text;
			const promptType = node.parameters?.promptType;

			// Only check when promptType is 'define' or undefined (default)
			// 'auto' mode means it uses text from previous node
			if (promptType !== 'auto') {
				if (!textParam || !containsExpression(textParam)) {
					violations.push({
						type: 'minor',
						description: `Agent node "${node.name}" has no expression in its prompt field. This likely means it failed to use chatInput`,
						pointsDeducted: 15,
					});
				}
			}
		}
	}

	return { violations, score: calcSingleEvaluatorScore({ violations }) };
}
