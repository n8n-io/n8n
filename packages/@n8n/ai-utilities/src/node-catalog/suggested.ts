/**
 * Plain "suggested nodes by category" lookup.
 *
 * Returns curated node recommendations organized by workflow technique
 * category. The LangChain `tool()` wrapper lives in `@n8n/ai-workflow-builder`
 * and re-uses `getSuggestedNodes()` from this module.
 */

import type { NodeTypeParser } from './node-type-parser';
import { suggestedNodesData, type CategorySuggestedNode } from './suggested-nodes-data';

export { categoryList } from './suggested-nodes-data';

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

/**
 * Look up suggested nodes by workflow technique category.
 * Unknown categories produce a "Category not found" entry in the output rather
 * than throwing, so callers can pass user-supplied category lists directly.
 */
export function getSuggestedNodes(nodeTypeParser: NodeTypeParser, categories: string[]): string {
	const results: Array<FormattedCategoryResult | null> = [];

	for (const category of categories) {
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
}
