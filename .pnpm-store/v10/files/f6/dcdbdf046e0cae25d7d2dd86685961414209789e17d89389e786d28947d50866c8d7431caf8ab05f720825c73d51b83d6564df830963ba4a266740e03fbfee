import {isNumberLiteral} from './literal.js';

export default function isNegativeOne(node) {
	return node?.type === 'UnaryExpression'
		&& node.operator === '-'
		&& isNumberLiteral(node.argument)
		&& node.argument.value === 1;
}
