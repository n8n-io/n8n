import type {
	AssignmentExpression,
	Identifier,
	Literal,
	MemberExpression,
	Node,
	VariableDeclarator,
} from 'acorn';

export function isLiteral(node?: Node): node is Literal {
	return node?.type === 'Literal';
}

export function isIdentifier(node?: Node): node is Identifier {
	return node?.type === 'Identifier';
}

export function isMemberExpression(node?: Node): node is MemberExpression {
	return node?.type === 'MemberExpression';
}

export function isVariableDeclarator(node?: Node): node is VariableDeclarator {
	return node?.type === 'VariableDeclarator';
}

export function isAssignmentExpression(node?: Node): node is AssignmentExpression {
	return node?.type === 'AssignmentExpression';
}
