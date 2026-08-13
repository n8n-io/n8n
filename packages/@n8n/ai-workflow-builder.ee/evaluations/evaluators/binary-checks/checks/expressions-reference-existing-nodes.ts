import type { BinaryCheck, SimpleWorkflow } from '../types';

/**
 * Regex patterns to extract node names from n8n expression syntaxes.
 * Mirrors ACCESS_PATTERNS from packages/workflow/src/node-reference-parser-utils.ts.
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

/** Remove backslash escapes from a captured node name (e.g. `Node\'s` → `Node's`). */
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

	// Legacy $node.Name dot-notation
	for (const name of collectMatches(DOT_NODE_REF, expression, 1)) {
		names.push(name);
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
