import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

import {
	suggestedNodesData,
	categoryList,
	type CategorySuggestedNode,
} from './suggested-nodes-data';
import type { NodeTypeParser } from '../utils/node-type-parser';

const GetSuggestedNodesSchema = z.object({
	categories: z
		.array(z.string())
		.describe('List of workflow technique categories to get node suggestions for'),
});

type GetSuggestedNodesInput = z.infer<typeof GetSuggestedNodesSchema>;

interface FormattedCategoryResult {
	category: string;
	patternHint: string;
	nodes: Array<{
		name: string;
		displayName: string;
		description: string;
		note?: string;
	}>;
}

function formatCategoryResult(
	nodeTypeParser: NodeTypeParser,
	category: string,
): FormattedCategoryResult | null {
	const categoryData = suggestedNodesData[category];
	if (!categoryData) {
		return null;
	}

	const nodes = categoryData.nodes.map((node: CategorySuggestedNode) => {
		const nodeType = nodeTypeParser.getNodeType(node.name);
		if (nodeType) {
			return {
				name: node.name,
				displayName: nodeType.displayName,
				description: nodeType.description,
				note: node.note,
			};
		}
		return {
			name: node.name,
			displayName: '(not found)',
			description: '(not found)',
			note: node.note,
		};
	});

	return {
		category,
		patternHint: categoryData.patternHint,
		nodes,
	};
}

function formatOutput(results: Array<FormattedCategoryResult | null>): string {
	const lines: string[] = [];

	for (const result of results) {
		if (!result) {
			lines.push('Category not found\n');
			continue;
		}

		lines.push(`## ${result.category}`);
		lines.push(`patternHint: ${result.patternHint}`);
		lines.push('');
		lines.push('Suggested nodes:');

		for (const node of result.nodes) {
			lines.push(`- ${node.name}`);
			lines.push(`  displayName: ${node.displayName}`);
			lines.push(`  description: ${node.description}`);
			if (node.note) {
				lines.push(`  note: ${node.note}`);
			}
		}

		lines.push('');
	}

	return lines.join('\n');
}

export function createGetSuggestedNodesTool(nodeTypeParser: NodeTypeParser) {
	return new DynamicStructuredTool({
		name: 'get_suggested_nodes',
		description: `Returns curated node recommendations by workflow technique category.

Available categories: ${categoryList.join(', ')}`,
		schema: GetSuggestedNodesSchema,
		func: async (input: GetSuggestedNodesInput): Promise<string> => {
			const results: Array<FormattedCategoryResult | null> = [];

			for (const category of input.categories) {
				const result = formatCategoryResult(nodeTypeParser, category);
				if (result) {
					results.push(result);
				} else {
					// Unknown category - return error message
					results.push({
						category,
						patternHint: 'Category not found',
						nodes: [],
					});
				}
			}

			return formatOutput(results);
		},
	});
}
