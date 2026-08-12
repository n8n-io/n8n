import ts from 'typescript';

function findNodes(node: ts.Node, check: (node: ts.Node) => boolean): ts.Node[] {
	const result: ts.Node[] = [];

	// If the current node matches the condition, add it to the result
	if (check(node)) {
		result.push(node);
	}

	// Recursively check all child nodes
	node.forEachChild((child) => {
		result.push(...findNodes(child, check));
	});

	return result;
}

/**
 * Get nodes mentioned in the code
 * Check if code includes calls to $('Node A')
 */
export async function getUsedNodeNames(file: ts.SourceFile) {
	const callExpressions = findNodes(
		file,
		(n) =>
			n.kind === ts.SyntaxKind.CallExpression &&
			(n as ts.CallExpression).expression.getText() === '$',
	);

	if (callExpressions.length === 0) return [];

	const nodeNames = (callExpressions as ts.CallExpression[])
		.map((e) => (e.arguments.at(0) as ts.StringLiteral)?.text)
		.filter(Boolean);

	return nodeNames;
}
