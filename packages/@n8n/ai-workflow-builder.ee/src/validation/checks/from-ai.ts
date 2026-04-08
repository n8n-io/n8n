import type { INodeTypeDescription, INodeParameters } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';
import { createNodeTypeMaps, getNodeTypeForNode } from '@/validation/utils/node-type-map';

import type { ProgrammaticViolation } from '../types';
import { isTool } from '../utils/is-tool';

function containsFromAi(value: unknown): boolean {
	if (typeof value !== 'string') {
		return false;
	}

	return /\$from[Aa][Ii]\(.+\)/.test(value);
}

function parametersContainFromAi(parameters: INodeParameters): boolean {
	for (const value of Object.values(parameters)) {
		if (containsFromAi(value)) {
			return true;
		}

		if (value && typeof value === 'object' && !Array.isArray(value)) {
			if (parametersContainFromAi(value as INodeParameters)) {
				return true;
			}
		}

		if (Array.isArray(value)) {
			for (const item of value) {
				if (containsFromAi(item)) {
					return true;
				}

				if (item && typeof item === 'object' && !Array.isArray(value)) {
					if (parametersContainFromAi(value as INodeParameters)) {
						return true;
					}
				}
			}
		}
	}

	return false;
}

export function validateFromAi(
	workflow: SimpleWorkflow,
	nodeTypes: INodeTypeDescription[],
): ProgrammaticViolation[] {
	const violations: ProgrammaticViolation[] = [];

	if (!workflow.nodes || workflow.nodes.length === 0) {
		return violations;
	}

	const { nodeTypeMap, nodeTypesByName } = createNodeTypeMaps(nodeTypes);

	for (const node of workflow.nodes) {
		const nodeType = getNodeTypeForNode(node, nodeTypeMap, nodeTypesByName);
		if (!nodeType) {
			continue;
		}

		if (isTool(nodeType)) {
			continue;
		}

		if (node.parameters && parametersContainFromAi(node.parameters)) {
			violations.push({
				name: 'non-tool-node-uses-fromai',
				type: 'major',
				description: `Non-tool node "${node.name}" (${node.type}) uses $fromAI in its parameters. $fromAI is only for tool nodes connected to AI agents.`,
				pointsDeducted: 20,
			});
		}
	}

	return violations;
}
