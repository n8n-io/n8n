import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';

import type { SingleEvaluatorResult } from '../types';
import { isTool } from '../utils/is-tool';

const toolsWithoutParameters = [
	'@n8n/n8n-nodes-langchain.toolCalculator',
	'@n8n/n8n-nodes-langchain.toolVectorStore',
	'@n8n/n8n-nodes-langchain.vectorStoreInMemory',
	'@n8n/n8n-nodes-langchain.mcpClientTool',
	'@n8n/n8n-nodes-langchain.toolWikipedia',
	'@n8n/n8n-nodes-langchain.toolSerpApi',
];

export function validateTools(
	workflow: SimpleWorkflow,
	nodeTypes: INodeTypeDescription[],
): SingleEvaluatorResult['violations'] {
	const violations: SingleEvaluatorResult['violations'] = [];

	if (!workflow.nodes || workflow.nodes.length === 0) {
		return violations;
	}

	for (const node of workflow.nodes) {
		const nodeType = nodeTypes.find((type) => type.name === node.type);
		if (!nodeType) {
			continue;
		}

		if (isTool(nodeType) && !toolsWithoutParameters.includes(node.type)) {
			if (!node.parameters || Object.keys(node.parameters).length === 0) {
				violations.push({
					name: 'tool-node-has-no-parameters',
					type: 'major',
					description: `Tool node "${node.name}" has no parameters set.`,
					pointsDeducted: 20,
				});
			}
		}
	}

	return violations;
}
