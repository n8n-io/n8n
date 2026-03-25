import {isParenthesized, findVariable} from '@eslint-community/eslint-utils';
import {
	extendFixRange,
	removeMemberExpressionProperty,
	removeMethodCall,
	renameVariable,
} from './fix/index.js';
import {
	isLeftHandSide,
	singular,
	getScopes,
	getAvailableVariableName,
	getVariableIdentifiers,
} from './utils/index.js';
import {isMethodCall} from './ast/index.js';

const ERROR_ZERO_INDEX = 'error-zero-index';
const ERROR_SHIFT = 'error-shift';
const ERROR_POP = 'error-pop';
const ERROR_AT_ZERO = 'error-at-zero';
const ERROR_AT_MINUS_ONE = 'error-at-minus-one';
const ERROR_DESTRUCTURING_DECLARATION = 'error-destructuring-declaration';
const ERROR_DESTRUCTURING_ASSIGNMENT = 'error-destructuring-assignment';
const ERROR_DECLARATION = 'error-variable';
const SUGGESTION_NULLISH_COALESCING_OPERATOR = 'suggest-nullish-coalescing-operator';
const SUGGESTION_LOGICAL_OR_OPERATOR = 'suggest-logical-or-operator';
const messages = {
	[ERROR_DECLARATION]: 'Prefer `.find(…)` over `.filter(…)`.',
	[ERROR_ZERO_INDEX]: 'Prefer `.find(…)` over `.filter(…)[0]`.',
	[ERROR_AT_ZERO]: 'Prefer `.find(…)` over `.filter(…).at(0)`.',
	[ERROR_SHIFT]: 'Prefer `.find(…)` over `.filter(…).shift()`.',
	[ERROR_POP]: 'Prefer `.findLast(…)` over `.filter(…).pop()`.',
	[ERROR_AT_MINUS_ONE]: 'Prefer `.findLast(…)` over `.filter(…).at(-1)`.',
	[ERROR_DESTRUCTURING_DECLARATION]: 'Prefer `.find(…)` over destructuring `.filter(…)`.',
	// Same message as `ERROR_DESTRUCTURING_DECLARATION`, but different case
	[ERROR_DESTRUCTURING_ASSIGNMENT]: 'Prefer `.find(…)` over destructuring `.filter(…)`.',
	[SUGGESTION_NULLISH_COALESCING_OPERATOR]: 'Replace `.filter(…)` with `.find(…) ?? …`.',
	[SUGGESTION_LOGICAL_OR_OPERATOR]: 'Replace `.filter(…)` with `.find(…) || …`.',
};

const isArrayFilterCall = node => isMethodCall(node, {
	method: 'filter',
	minimumArguments: 1,
	maximumArguments: 2,
	optionalCall: false,
	optionalMember: false,
});

// Need add `()` to the `AssignmentExpression`
// - `ObjectExpression`: `[{foo}] = array.filter(bar)` fix to `{foo} = array.find(bar)`
// - `ObjectPattern`: `[{foo = baz}] = array.filter(bar)`
const assignmentNeedParenthesize = (node, sourceCode) => {
	const isAssign = node.type === 'AssignmentExpression';

	if (!isAssign || isParenthesized(node, sourceCode)) {
		return false;
	}

	const {left} = getDestructuringLeftAndRight(node);
	const [element] = left.elements;
	const {type} = element.type === 'AssignmentPattern' ? element.left : element;
	return type === 'ObjectExpression' || type === 'ObjectPattern';
};

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence#Table
const hasLowerPrecedence = (node, operator) => (
	(node.type === 'LogicalExpression' && (
		node.operator === operator
		// https://tc39.es/proposal-nullish-coalescing/ says
		// `??` has lower precedence than `||`
		// But MDN says
		// `??` has higher precedence than `||`
		|| (operator === '||' && node.operator === '??')
		|| (operator === '??' && (node.operator === '||' || node.operator === '&&'))
	))
	|| node.type === 'ConditionalExpression'
	// Lower than `assignment`, should already parenthesized
	/* c8 ignore next */
	|| node.type === 'AssignmentExpression'
	|| node.type === 'YieldExpression'
	|| node.type === 'SequenceExpression'
);

const getDestructuringLeftAndRight = node => {
	/* c8 ignore next 3 */
	if (!node) {
		return {};
	}

	if (node.type === 'AssignmentExpression') {
		return node;
	}

	if (node.type === 'VariableDeclarator') {
		return {left: node.id, right: node.init};
	}

	return {};
};

function * fixDestructuring(node, sourceCode, fixer) {
	const {left} = getDestructuringLeftAndRight(node);
	const [element] = left.elements;

	const leftText = sourceCode.getText(element.type === 'AssignmentPattern' ? element.left : element);
	yield fixer.replaceText(left, leftText);

	// `AssignmentExpression` always starts with `[` or `(`, so we don't need check ASI
	if (assignmentNeedParenthesize(node, sourceCode)) {
		yield fixer.insertTextBefore(node, '(');
		yield fixer.insertTextAfter(node, ')');
	}
}

const hasDefaultValue = node => getDestructuringLeftAndRight(node).left.elements[0].type === 'AssignmentPattern';

const fixDestructuringDefaultValue = (node, sourceCode, fixer, operator) => {
	const {left, right} = getDestructuringLeftAndRight(node);
	const [element] = left.elements;
	const defaultValue = element.right;
	let defaultValueText = sourceCode.getText(defaultValue);

	if (isParenthesized(defaultValue, sourceCode) || hasLowerPrecedence(defaultValue, operator)) {
		defaultValueText = `(${defaultValueText})`;
	}

	return fixer.insertTextAfter(right, ` ${operator} ${defaultValueText}`);
};

const fixDestructuringAndReplaceFilter = (sourceCode, node) => {
	const {property} = getDestructuringLeftAndRight(node).right.callee;

	let suggest;
	let fix;

	if (hasDefaultValue(node)) {
		suggest = [
			{operator: '??', messageId: SUGGESTION_NULLISH_COALESCING_OPERATOR},
			{operator: '||', messageId: SUGGESTION_LOGICAL_OR_OPERATOR},
		].map(({messageId, operator}) => ({
			messageId,
			* fix(fixer) {
				yield fixer.replaceText(property, 'find');
				yield fixDestructuringDefaultValue(node, sourceCode, fixer, operator);
				yield * fixDestructuring(node, sourceCode, fixer);
			},
		}));
	} else {
		fix = function * (fixer) {
			yield fixer.replaceText(property, 'find');
			yield * fixDestructuring(node, sourceCode, fixer);
		};
	}

	return {fix, suggest};
};

const isAccessingZeroIndex = node =>
	node.parent.type === 'MemberExpression'
	&& node.parent.computed === true
	&& node.parent.object === node
	&& node.parent.property.type === 'Literal'
	&& node.parent.property.raw === '0';

const isDestructuringFirstElement = node => {
	const {left, right} = getDestructuringLeftAndRight(node.parent);
	return left
		&& right
		&& right === node
		&& left.type === 'ArrayPattern'
		&& left.elements.length === 1
		&& left.elements[0]
		&& left.elements[0].type !== 'RestElement';
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const {
		checkFromLast,
	} = {
		checkFromLast: true,
		...context.options[0],
	};

	// Zero index access
	context.on('MemberExpression', node => {
		if (!(
			node.computed
			&& node.property.type === 'Literal'
			&& node.property.raw === '0'
			&& isArrayFilterCall(node.object)
			&& !isLeftHandSide(node)
		)) {
			return;
		}

		return {
			node: node.object.callee.property,
			messageId: ERROR_ZERO_INDEX,
			fix: fixer => [
				fixer.replaceText(node.object.callee.property, 'find'),
				removeMemberExpressionProperty(fixer, node, sourceCode),
			],
		};
	});

	// `array.filter().shift()`
	context.on('CallExpression', node => {
		if (!(
			isMethodCall(node, {
				method: 'shift',
				argumentsLength: 0,
				optionalCall: false,
				optionalMember: false,
			})
			&& isArrayFilterCall(node.callee.object)
		)) {
			return;
		}

		return {
			node: node.callee.object.callee.property,
			messageId: ERROR_SHIFT,
			fix: fixer => [
				fixer.replaceText(node.callee.object.callee.property, 'find'),
				...removeMethodCall(fixer, node, sourceCode),
			],
		};
	});

	// `const [foo] = array.filter()`
	context.on('VariableDeclarator', node => {
		if (!(
			node.id.type === 'ArrayPattern'
			&& node.id.elements.length === 1
			&& node.id.elements[0]
			&& node.id.elements[0].type !== 'RestElement'
			&& isArrayFilterCall(node.init)
		)) {
			return;
		}

		return {
			node: node.init.callee.property,
			messageId: ERROR_DESTRUCTURING_DECLARATION,
			...fixDestructuringAndReplaceFilter(sourceCode, node),
		};
	});

	// `[foo] = array.filter()`
	context.on('AssignmentExpression', node => {
		if (!(
			node.left.type === 'ArrayPattern'
			&& node.left.elements.length === 1
			&& node.left.elements[0]
			&& node.left.elements[0].type !== 'RestElement'
			&& isArrayFilterCall(node.right)
		)) {
			return;
		}

		return {
			node: node.right.callee.property,
			messageId: ERROR_DESTRUCTURING_ASSIGNMENT,
			...fixDestructuringAndReplaceFilter(sourceCode, node),
		};
	});

	// `const foo = array.filter(); foo[0]; [bar] = foo`
	context.on('VariableDeclarator', node => {
		if (!(
			node.id.type === 'Identifier'
			&& isArrayFilterCall(node.init)
			&& node.parent.type === 'VariableDeclaration'
			&& node.parent.declarations.includes(node)
			// Exclude `export const foo = [];`
			&& !(
				node.parent.parent.type === 'ExportNamedDeclaration'
				&& node.parent.parent.declaration === node.parent
			)
		)) {
			return;
		}

		const scope = sourceCode.getScope(node);
		const variable = findVariable(scope, node.id);
		const identifiers = getVariableIdentifiers(variable).filter(identifier => identifier !== node.id);

		if (identifiers.length === 0) {
			return;
		}

		const zeroIndexNodes = [];
		const destructuringNodes = [];
		for (const identifier of identifiers) {
			if (isAccessingZeroIndex(identifier)) {
				zeroIndexNodes.push(identifier.parent);
			} else if (isDestructuringFirstElement(identifier)) {
				destructuringNodes.push(identifier.parent);
			} else {
				return;
			}
		}

		const problem = {
			node: node.init.callee.property,
			messageId: ERROR_DECLARATION,
		};

		// `const [foo = bar] = baz` is not fixable
		if (!destructuringNodes.some(node => hasDefaultValue(node))) {
			problem.fix = function * (fixer) {
				yield fixer.replaceText(node.init.callee.property, 'find');

				const singularName = singular(node.id.name);
				if (singularName) {
					// Rename variable to be singularized now that it refers to a single item in the array instead of the entire array.
					const singularizedName = getAvailableVariableName(singularName, getScopes(scope));
					yield * renameVariable(variable, singularizedName, fixer);

					// Prevent possible variable conflicts
					yield * extendFixRange(fixer, sourceCode.getRange(sourceCode.ast));
				}

				for (const node of zeroIndexNodes) {
					yield removeMemberExpressionProperty(fixer, node, sourceCode);
				}

				for (const node of destructuringNodes) {
					yield * fixDestructuring(node, sourceCode, fixer);
				}
			};
		}

		return problem;
	});

	// `array.filter().at(0)`
	context.on('CallExpression', node => {
		if (!(
			isMethodCall(node, {
				method: 'at',
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
			&& node.arguments[0].type === 'Literal'
			&& node.arguments[0].raw === '0'
			&& isArrayFilterCall(node.callee.object)
		)) {
			return;
		}

		return {
			node: node.callee.object.callee.property,
			messageId: ERROR_AT_ZERO,
			fix: fixer => [
				fixer.replaceText(node.callee.object.callee.property, 'find'),
				...removeMethodCall(fixer, node, sourceCode),
			],
		};
	});

	if (!checkFromLast) {
		return;
	}

	// `array.filter().pop()`
	context.on('CallExpression', node => {
		if (!(
			isMethodCall(node, {
				method: 'pop',
				argumentsLength: 0,
				optionalCall: false,
				optionalMember: false,
			})
			&& isArrayFilterCall(node.callee.object)
		)) {
			return;
		}

		return {
			node: node.callee.object.callee.property,
			messageId: ERROR_POP,
			fix: fixer => [
				fixer.replaceText(node.callee.object.callee.property, 'findLast'),
				...removeMethodCall(fixer, node, sourceCode),
			],
		};
	});

	// `array.filter().at(-1)`
	context.on('CallExpression', node => {
		if (!(
			isMethodCall(node, {
				method: 'at',
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
			&& node.arguments[0].type === 'UnaryExpression'
			&& node.arguments[0].operator === '-'
			&& node.arguments[0].prefix
			&& node.arguments[0].argument.type === 'Literal'
			&& node.arguments[0].argument.raw === '1'
			&& isArrayFilterCall(node.callee.object)
		)) {
			return;
		}

		return {
			node: node.callee.object.callee.property,
			messageId: ERROR_AT_MINUS_ONE,
			fix: fixer => [
				fixer.replaceText(node.callee.object.callee.property, 'findLast'),
				...removeMethodCall(fixer, node, sourceCode),
			],
		};
	});
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			checkFromLast: {
				type: 'boolean',
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.find(…)` and `.findLast(…)` over the first or last element from `.filter(…)`.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		defaultOptions: [{checkFromLast: true}],
		messages,
	},
};

export default config;
