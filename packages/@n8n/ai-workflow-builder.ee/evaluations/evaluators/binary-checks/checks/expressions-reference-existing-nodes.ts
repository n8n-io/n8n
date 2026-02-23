import type { BinaryCheck, SimpleWorkflow } from '../types';

/**
 * Regex patterns to extract node names from n8n expression syntaxes.
 * Mirrors ACCESS_PATTERNS from packages/workflow/src/node-reference-parser-utils.ts.
 */
const EXPRESSION_NODE_REFS: RegExp[] = [
	/\$\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1\s*\)/g, // $('Node Name')
	/\$node\[\s*(['"])((?:\\.|(?!\1)[^\\])*)\1\s*\]/g, // $node["Node Name"]
	/\$items\(\s*(['"])((?:\\.|(?!\1)[^\\])*)\1\s*\)/g, // $items("Node Name")
];

/** Extract all referenced node names from an expression string. */
function extractNodeNamesFromExpression(expression: string): string[] {
	const names: string[] = [];
	for (const pattern of EXPRESSION_NODE_REFS) {
		// Reset lastIndex for each use since the regex has /g flag
		pattern.lastIndex = 0;
		let match: RegExpExecArray | null;
		while ((match = pattern.exec(expression)) !== null) {
			names.push(match[2]);
		}
	}
	return names;
}

/** Recursively extract all expression strings from node parameters. */
function extractExpressionsFromParams(value: unknown, key?: string): string[] {
	if (typeof value === 'string') {
		// Expressions start with '=', jsCode fields are also expressions
		if (value.charAt(0) === '=' || key === 'jsCode') {
			return [value];
		}
		return [];
	}

	if (Array.isArray(value)) {
		return value.flatMap((item) => extractExpressionsFromParams(item));
	}

	if (typeof value === 'object' && value !== null) {
		return Object.entries(value).flatMap(([k, v]) => extractExpressionsFromParams(v, k));
	}

	return [];
}

export const expressionsReferenceExistingNodes: BinaryCheck = {
	name: 'expressions_reference_existing_nodes',
	kind: 'deterministic',
	async run(workflow: SimpleWorkflow) {
		if (!workflow.nodes || workflow.nodes.length === 0) {
			return { pass: true };
		}

		const existingNodeNames = new Set(workflow.nodes.map((n) => n.name));
		const invalid: string[] = [];

		for (const node of workflow.nodes) {
			if (!node.parameters) continue;

			const expressions = extractExpressionsFromParams(node.parameters);
			for (const expr of expressions) {
				const referencedNames = extractNodeNamesFromExpression(expr);
				for (const refName of referencedNames) {
					if (!existingNodeNames.has(refName)) {
						invalid.push(`"${refName}" (in node "${node.name}")`);
					}
				}
			}
		}

		// Deduplicate
		const unique = [...new Set(invalid)];

		return {
			pass: unique.length === 0,
			...(unique.length > 0
				? { comment: `Expressions reference non-existent nodes: ${unique.join(', ')}` }
				: {}),
		};
	},
};
