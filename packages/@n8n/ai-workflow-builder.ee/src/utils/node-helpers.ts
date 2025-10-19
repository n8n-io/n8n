import { type INode, NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

/**
 * Determines if a node is a sub-node (has no main input connections)
 * Sub-nodes are nodes that only have AI inputs or no inputs at all
 * @param nodeType - The node type description to check
 * @returns true if the node is a sub-node, false otherwise
 */
export function isSubNode(nodeType: INodeTypeDescription, node?: INode): boolean {
	if (node?.parameters?.mode === 'retrieve-as-tool') {
		return true;
	}
	// Treating agent as main node always
	if (nodeType.name === '@n8n/n8n-nodes-langchain.agent') {
		return false;
	}
	// If no inputs at all, it's definitely a sub-node
	if (!nodeType.inputs || (Array.isArray(nodeType.inputs) && nodeType.inputs.length === 0)) {
		return true;
	}

	// Handle array of inputs
	if (Array.isArray(nodeType.inputs)) {
		// Check if ALL inputs are AI connections (no main inputs)
		const hasMainInput = nodeType.inputs.some((input) => {
			if (typeof input === 'string') {
				return input === NodeConnectionTypes.Main || input.toLowerCase() === 'main';
			}
			// It's an INodeInputConfiguration object
			return input.type === NodeConnectionTypes.Main || input.type.toLowerCase() === 'main';
		});

		return !hasMainInput;
	}
	// Handle expression-based inputs (dynamic)
	if (typeof nodeType.inputs === 'string') {
		// Check if the expression contains any indication of main input
		// We need to check for any pattern that would result in a main connection
		const mainInputPatterns = [
			'NodeConnectionTypes.Main',
			'type: "main"',
			"type: 'main'",
			'type:"main"',
			"type:'main'",
			'type: `main`',
			'type: NodeConnectionTypes.Main',
			'type:NodeConnectionTypes.Main',
			'{ displayName: "", type: "main"',
			"{ displayName: '', type: 'main'",
			'{ displayName: "", type: NodeConnectionTypes.Main',
			"{ displayName: '', type: NodeConnectionTypes.Main",
			// Patterns for arrays that include "main" as first element
			'return ["main"',
			"return ['main'",
			'return [`main`',
			'return[["main"',
			"return[['main'",
			'return [[`main`',
			// Pattern for spread operations that include main
			'["main", ...',
			"['main', ...",
			'[`main`, ...',
		];

		// If any main input pattern is found, it's NOT a sub-node
		const hasMainInput = mainInputPatterns.some(
			(pattern) =>
				typeof nodeType.inputs === 'string' &&
				nodeType.inputs.toLowerCase().includes(pattern.toLowerCase()),
		);

		return !hasMainInput;
	}
	// If we can't determine, assume it's not a sub-node (safer default)
	return false;
}
