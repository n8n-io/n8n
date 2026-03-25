import {isStringLiteral} from './literal.js';
import {isCallExpression} from './call-or-new-expression.js';

const isStaticRequire = node => isCallExpression(node, {
	name: 'require',
	argumentsLength: 1,
	optional: false,
}) && isStringLiteral(node.arguments[0]);

export default isStaticRequire;
