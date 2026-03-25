import isLogicalExpression from './is-logical-expression.js';

const isLogicNot = node => node?.type === 'UnaryExpression' && node.operator === '!';
const isLogicNotArgument = node => isLogicNot(node.parent) && node.parent.argument === node;
const isBooleanCallArgument = node => isBooleanCall(node.parent) && node.parent.arguments[0] === node;
const isBooleanCall = node =>
	node?.type === 'CallExpression'
	&& node.callee.type === 'Identifier'
	&& node.callee.name === 'Boolean'
	&& node.arguments.length === 1;
const isVueBooleanAttributeValue = node =>
	node?.type === 'VExpressionContainer'
	&& node.parent.type === 'VAttribute'
	&& node.parent.directive
	&& node.parent.value === node
	&& node.parent.key.type === 'VDirectiveKey'
	&& node.parent.key.name.type === 'VIdentifier'
	&& (
		node.parent.key.name.rawName === 'if'
		|| node.parent.key.name.rawName === 'else-if'
		|| node.parent.key.name.rawName === 'show'
	);

/**
Check if the value of node is a `boolean`.

@param {Node} node
@returns {boolean}
*/
export function isBooleanNode(node) {
	if (
		isLogicNot(node)
		|| isLogicNotArgument(node)
		|| isBooleanCall(node)
		|| isBooleanCallArgument(node)
	) {
		return true;
	}

	const {parent} = node;
	if (isVueBooleanAttributeValue(parent)) {
		return true;
	}

	if (
		(
			parent.type === 'IfStatement'
			|| parent.type === 'ConditionalExpression'
			|| parent.type === 'WhileStatement'
			|| parent.type === 'DoWhileStatement'
			|| parent.type === 'ForStatement'
		)
		&& parent.test === node
	) {
		return true;
	}

	if (isLogicalExpression(parent)) {
		return isBooleanNode(parent);
	}

	return false;
}

/**
Get the boolean type-casting ancestor.

@typedef {{ node: Node, isNegative: boolean }} Result

@param {Node} node
@returns {Result}
*/
export function getBooleanAncestor(node) {
	let isNegative = false;

	while (true) {
		if (isLogicNotArgument(node)) {
			isNegative = !isNegative;
			node = node.parent;
		} else if (isBooleanCallArgument(node)) {
			node = node.parent;
		} else {
			break;
		}
	}

	return {node, isNegative};
}
