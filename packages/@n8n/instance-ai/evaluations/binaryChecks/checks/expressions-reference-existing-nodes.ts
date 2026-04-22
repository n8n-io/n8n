import type { BinaryCheck } from '../types';
import { extractExpressionsFromParams } from '../utils';

/**
 * Regex patterns to extract node names from n8n expression syntaxes.
 *
 * Quoted patterns capture at group index 2; dot-notation captures at group index 1.
 */
const QUOTED_NODE_REFS: RegExp[] = [
	/\$\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1\s*\)/g, // $('Node Name')
	/\$node\[\s*(['"])((?:\\.|(?!\1)[^\\])*)\1\s*\]/g, // $node["Node Name"]
	/\$items\(\s*(['"])((?:\\.|(?!\1)[^\\])*)\1\s*[,)]/g, // $items("Node Name") or $items("Node Name", 0)
];

/** Legacy dot-notation: $node.NodeName.json... — name is a JS identifier after $node. */
const DOT_NODE_REF = /\$node\.(\w+)\./g;

/** Remove backslash escapes from a captured node name (e.g. `Node\'s` -> `Node's`). */
function unescapeNodeName(raw: string): string {
	return raw.replace(/\\(.)/g, '$1');
}

/** Collect all matches from a global regex, returning captured groups at the given index. */
function collectMatches(pattern: RegExp, text: string, groupIndex: number): string[] {
	return Array.from(text.matchAll(pattern), (m) => m[groupIndex]);
}

/** Extract all referenced node names from an expression string. */
function extractNodeNamesFromExpression(expression: string): string[] {
	const names: string[] = [];

	for (const pattern of QUOTED_NODE_REFS) {
		for (const raw of collectMatches(pattern, expression, 2)) {
			names.push(unescapeNodeName(raw));
		}
	}

	for (const name of collectMatches(DOT_NODE_REF, expression, 1)) {
		names.push(name);
	}

	return names;
}

export const expressionsReferenceExistingNodes: BinaryCheck = {
	name: 'expressions_reference_existing_nodes',
	description: 'Expressions only reference nodes that exist in the workflow',
	kind: 'deterministic',
	run(workflow) {
		const nodes = workflow.nodes ?? [];
		if (nodes.length === 0) return { pass: true };

		const existingNodeNames = new Set(nodes.map((n) => n.name));
		const invalid: string[] = [];

		for (const node of nodes) {
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

		const unique = [...new Set(invalid)];

		return {
			pass: unique.length === 0,
			...(unique.length > 0
				? { comment: `Expressions reference non-existent nodes: ${unique.join(', ')}` }
				: {}),
		};
	},
};
