import isSameReference from '../utils/is-same-reference.js';
import {getParenthesizedRange} from '../utils/parentheses.js';
import {isNumberLiteral} from '../ast/index.js';

const isLengthMemberExpression = node =>
	node.type === 'MemberExpression'
	&& !node.computed
	&& !node.optional
	&& node.property.type === 'Identifier'
	&& node.property.name === 'length';

const isLiteralPositiveNumber = node =>
	isNumberLiteral(node)
	&& node.value > 0;

export function getNegativeIndexLengthNode(node, objectNode) {
	if (!node) {
		return;
	}

	const {type, operator, left, right} = node;

	if (type !== 'BinaryExpression' || operator !== '-' || !isLiteralPositiveNumber(right)) {
		return;
	}

	if (isLengthMemberExpression(left) && isSameReference(left.object, objectNode)) {
		return left;
	}

	// Nested BinaryExpression
	return getNegativeIndexLengthNode(left, objectNode);
}

export function removeLengthNode(node, fixer, sourceCode) {
	const [start, end] = getParenthesizedRange(node, sourceCode);
	return fixer.removeRange([
		start,
		end + sourceCode.text.slice(end).match(/\S|$/).index,
	]);
}

