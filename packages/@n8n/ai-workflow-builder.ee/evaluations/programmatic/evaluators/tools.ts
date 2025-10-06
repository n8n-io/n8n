import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';

import type { Violation } from '../../types/evaluation';
import type { SingleEvaluatorResult } from '../../types/test-result';
import { nodeParametersContainExpression } from '../../utils/expressions';
import { isTool } from '../../utils/is-tool';
import { calcSingleEvaluatorScore } from '../../utils/score';

const toolsWithoutParameters = [
	'@n8n/n8n-nodes-langchain.toolCalculator',
	'@n8n/n8n-nodes-langchain.toolVectorStore',
	'@n8n/n8n-nodes-langchain.vectorStoreInMemory',
	'@n8n/n8n-nodes-langchain.mcpClientTool',
	'@n8n/n8n-nodes-langchain.toolWikipedia',
	'@n8n/n8n-nodes-langchain.toolSerpApi',
];

export function evaluateTools(
	workflow: SimpleWorkflow,
	nodeTypes: INodeTypeDescription[],
): SingleEvaluatorResult {
	const violations: Violation[] = [];

	// Check if workflow has nodes
	if (!workflow.nodes || workflow.nodes.length === 0) {
		return { violations, score: 0 };
	}

	// Find all agent nodes and check their prompts
	for (const node of workflow.nodes) {
		// Find node type
		const nodeType = nodeTypes.find((type) => type.name === node.type);
		if (!nodeType) {
			continue;
		}

		// Check if this is a tool requiring dynamic parameters
		if (isTool(nodeType) && !toolsWithoutParameters.includes(node.type)) {
			// Check if the tool node has required parameters set
			if (!node.parameters || Object.keys(node.parameters).length === 0) {
				violations.push({
					type: 'major',
					description: `Tool node "${node.name}" has no parameters set.`,
					pointsDeducted: 20,
				});
				continue;
			}

			// Tool should have at least one parameter with expression
			if (!nodeParametersContainExpression(node.parameters)) {
				violations.push({
					type: 'major',
					description: `Tool node "${node.name}" has no expressions in its parameters. This likely means it is not using dynamic input.`,
					pointsDeducted: 20,
				});
			}
		}
	}

	return { violations, score: calcSingleEvaluatorScore({ violations }) };
}
