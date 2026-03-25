import {isUndefined, isCallExpression, isMethodCall} from '../ast/index.js';

// AST Types:
// https://github.com/eslint/espree/blob/master/lib/ast-node-types.js#L18
// Only types possible to be `argument` are listed
const impossibleNodeTypes = new Set([
	'ArrayExpression',
	'BinaryExpression',
	'ClassExpression',
	'Literal',
	'ObjectExpression',
	'TemplateLiteral',
	'UnaryExpression',
	'UpdateExpression',
]);

// Technically these nodes could be a function, but most likely not
const mostLikelyNotNodeTypes = new Set([
	'AssignmentExpression',
	'AwaitExpression',
	'NewExpression',
	'TaggedTemplateExpression',
	'ThisExpression',
]);

const isNodeValueNotFunction = node => (
	impossibleNodeTypes.has(node.type)
	|| mostLikelyNotNodeTypes.has(node.type)
	|| isUndefined(node)
	|| (
		isCallExpression(node)
		&& !(isMethodCall(node, {
			method: 'bind',
			optionalCall: false,
			optionalMember: false,
		}))
	)
);

export default isNodeValueNotFunction;
