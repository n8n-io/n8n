import {
	isOpeningBracketToken,
	isClosingBracketToken,
	getStaticValue,
} from '@eslint-community/eslint-utils';
import {
	isParenthesized,
	getParenthesizedRange,
	getParenthesizedText,
	isNodeMatchesNameOrPath,
	needsSemicolon,
	shouldAddParenthesesToMemberExpressionObject,
	isLeftHandSide,
} from './utils/index.js';
import {
	getNegativeIndexLengthNode,
	removeLengthNode,
} from './shared/negative-index.js';
import {removeMemberExpressionProperty, removeMethodCall} from './fix/index.js';
import {isLiteral, isCallExpression, isMethodCall} from './ast/index.js';

const MESSAGE_ID_NEGATIVE_INDEX = 'negative-index';
const MESSAGE_ID_INDEX = 'index';
const MESSAGE_ID_STRING_CHAR_AT_NEGATIVE = 'string-char-at-negative';
const MESSAGE_ID_STRING_CHAR_AT = 'string-char-at';
const MESSAGE_ID_SLICE = 'slice';
const MESSAGE_ID_GET_LAST_FUNCTION = 'get-last-function';
const SUGGESTION_ID = 'use-at';
const messages = {
	[MESSAGE_ID_NEGATIVE_INDEX]: 'Prefer `.at(…)` over `[….length - index]`.',
	[MESSAGE_ID_INDEX]: 'Prefer `.at(…)` over index access.',
	[MESSAGE_ID_STRING_CHAR_AT_NEGATIVE]: 'Prefer `String#at(…)` over `String#charAt(….length - index)`.',
	[MESSAGE_ID_STRING_CHAR_AT]: 'Prefer `String#at(…)` over `String#charAt(…)`.',
	[MESSAGE_ID_SLICE]: 'Prefer `.at(…)` over the first element from `.slice(…)`.',
	[MESSAGE_ID_GET_LAST_FUNCTION]: 'Prefer `.at(-1)` over `{{description}}(…)` to get the last element.',
	[SUGGESTION_ID]: 'Use `.at(…)`.',
};

const isArguments = node => node.type === 'Identifier' && node.name === 'arguments';

const isLiteralNegativeInteger = node =>
	node.type === 'UnaryExpression'
	&& node.prefix
	&& node.operator === '-'
	&& node.argument.type === 'Literal'
	&& Number.isInteger(node.argument.value)
	&& node.argument.value > 0;
const isZeroIndexAccess = node => {
	const {parent} = node;
	return parent.type === 'MemberExpression'
		&& !parent.optional
		&& parent.computed
		&& parent.object === node
		&& isLiteral(parent.property, 0);
};

const isArrayPopOrShiftCall = (node, method) => {
	const {parent} = node;
	return parent.type === 'MemberExpression'
		&& !parent.optional
		&& !parent.computed
		&& parent.object === node
		&& parent.property.type === 'Identifier'
		&& parent.property.name === method
		&& parent.parent.type === 'CallExpression'
		&& parent.parent.callee === parent
		&& !parent.parent.optional
		&& parent.parent.arguments.length === 0;
};

const isArrayPopCall = node => isArrayPopOrShiftCall(node, 'pop');
const isArrayShiftCall = node => isArrayPopOrShiftCall(node, 'shift');

function checkSliceCall(node) {
	const sliceArgumentsLength = node.arguments.length;
	const [startIndexNode, endIndexNode] = node.arguments;

	if (!isLiteralNegativeInteger(startIndexNode)) {
		return;
	}

	let firstElementGetMethod = '';
	if (isZeroIndexAccess(node)) {
		if (isLeftHandSide(node.parent)) {
			return;
		}

		firstElementGetMethod = 'zero-index';
	} else if (isArrayShiftCall(node)) {
		firstElementGetMethod = 'shift';
	} else if (isArrayPopCall(node)) {
		firstElementGetMethod = 'pop';
	}

	if (!firstElementGetMethod) {
		return;
	}

	const startIndex = -startIndexNode.argument.value;
	if (sliceArgumentsLength === 1) {
		if (
			startIndexNode.argument.value === 1
			&& (
				firstElementGetMethod === 'zero-index'
				|| firstElementGetMethod === 'shift'
				|| (startIndex === -1 && firstElementGetMethod === 'pop')
			)
		) {
			return {safeToFix: true, firstElementGetMethod};
		}

		return;
	}

	if (
		isLiteralNegativeInteger(endIndexNode)
		&& -endIndexNode.argument.value === startIndex + 1
	) {
		return {safeToFix: true, firstElementGetMethod};
	}

	if (firstElementGetMethod === 'pop') {
		return;
	}

	return {safeToFix: false, firstElementGetMethod};
}

const lodashLastFunctions = [
	'_.last',
	'lodash.last',
	'underscore.last',
];

/** @param {import('eslint').Rule.RuleContext} context */
function create(context) {
	const {
		getLastElementFunctions,
		checkAllIndexAccess,
	} = {
		getLastElementFunctions: [],
		checkAllIndexAccess: false,
		...context.options[0],
	};
	const getLastFunctions = [...getLastElementFunctions, ...lodashLastFunctions];
	const {sourceCode} = context;

	// Index access
	context.on('MemberExpression', node => {
		if (
			node.optional
			|| !node.computed
			|| isLeftHandSide(node)
		) {
			return;
		}

		const indexNode = node.property;
		const lengthNode = getNegativeIndexLengthNode(indexNode, node.object);

		if (!lengthNode) {
			if (!checkAllIndexAccess) {
				return;
			}

			// Only if we are sure it's an positive integer
			const staticValue = getStaticValue(indexNode, sourceCode.getScope(indexNode));
			if (!staticValue || !Number.isInteger(staticValue.value) || staticValue.value < 0) {
				return;
			}
		}

		const problem = {
			node: indexNode,
			messageId: lengthNode ? MESSAGE_ID_NEGATIVE_INDEX : MESSAGE_ID_INDEX,
		};

		if (isArguments(node.object)) {
			return problem;
		}

		problem.fix = function * (fixer) {
			if (lengthNode) {
				yield removeLengthNode(lengthNode, fixer, sourceCode);
			}

			// Only remove space for `foo[foo.length - 1]`
			if (
				indexNode.type === 'BinaryExpression'
				&& indexNode.operator === '-'
				&& indexNode.left === lengthNode
				&& indexNode.right.type === 'Literal'
				&& /^\d+$/.test(indexNode.right.raw)
			) {
				const numberNode = indexNode.right;
				const tokenBefore = sourceCode.getTokenBefore(numberNode);
				if (
					tokenBefore.type === 'Punctuator'
					&& tokenBefore.value === '-'
					&& /^\s+$/.test(sourceCode.text.slice(sourceCode.getRange(tokenBefore)[1], sourceCode.getRange(numberNode)[0]))
				) {
					yield fixer.removeRange([sourceCode.getRange(tokenBefore)[1], sourceCode.getRange(numberNode)[0]]);
				}
			}

			const openingBracketToken = sourceCode.getTokenBefore(indexNode, isOpeningBracketToken);
			yield fixer.replaceText(openingBracketToken, '.at(');

			const closingBracketToken = sourceCode.getTokenAfter(indexNode, isClosingBracketToken);
			yield fixer.replaceText(closingBracketToken, ')');
		};

		return problem;
	});

	// `string.charAt`
	context.on('CallExpression', node => {
		if (!isMethodCall(node, {
			method: 'charAt',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const [indexNode] = node.arguments;
		const lengthNode = getNegativeIndexLengthNode(indexNode, node.callee.object);

		// `String#charAt` don't care about index value, we assume it's always number
		if (!lengthNode && !checkAllIndexAccess) {
			return;
		}

		return {
			node: indexNode,
			messageId: lengthNode ? MESSAGE_ID_STRING_CHAR_AT_NEGATIVE : MESSAGE_ID_STRING_CHAR_AT,
			suggest: [{
				messageId: SUGGESTION_ID,
				* fix(fixer) {
					if (lengthNode) {
						yield removeLengthNode(lengthNode, fixer, sourceCode);
					}

					yield fixer.replaceText(node.callee.property, 'at');
				},
			}],
		};
	});

	// `.slice()`
	context.on('CallExpression', sliceCall => {
		if (!isMethodCall(sliceCall, {
			method: 'slice',
			minimumArguments: 1,
			maximumArguments: 2,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const result = checkSliceCall(sliceCall);
		if (!result) {
			return;
		}

		const {safeToFix, firstElementGetMethod} = result;

		/** @param {import('eslint').Rule.RuleFixer} fixer */
		function * fix(fixer) {
			// `.slice` to `.at`
			yield fixer.replaceText(sliceCall.callee.property, 'at');

			// Remove extra arguments
			if (sliceCall.arguments.length !== 1) {
				const [, start] = getParenthesizedRange(sliceCall.arguments[0], sourceCode);
				const [end] = sourceCode.getRange(sourceCode.getLastToken(sliceCall));
				yield fixer.removeRange([start, end]);
			}

			// Remove `[0]`, `.shift()`, or `.pop()`
			if (firstElementGetMethod === 'zero-index') {
				yield removeMemberExpressionProperty(fixer, sliceCall.parent, sourceCode);
			} else {
				yield * removeMethodCall(fixer, sliceCall.parent.parent, sourceCode);
			}
		}

		const problem = {
			node: sliceCall.callee.property,
			messageId: MESSAGE_ID_SLICE,
		};

		if (safeToFix) {
			problem.fix = fix;
		} else {
			problem.suggest = [{messageId: SUGGESTION_ID, fix}];
		}

		return problem;
	});

	context.on('CallExpression', node => {
		if (!isCallExpression(node, {argumentsLength: 1, optional: false})) {
			return;
		}

		const matchedFunction = getLastFunctions.find(nameOrPath => isNodeMatchesNameOrPath(node.callee, nameOrPath));
		if (!matchedFunction) {
			return;
		}

		const problem = {
			node: node.callee,
			messageId: MESSAGE_ID_GET_LAST_FUNCTION,
			data: {description: matchedFunction.trim()},
		};

		const [array] = node.arguments;

		if (isArguments(array)) {
			return problem;
		}

		problem.fix = function (fixer) {
			let fixed = getParenthesizedText(array, sourceCode);

			if (
				!isParenthesized(array, sourceCode)
				&& shouldAddParenthesesToMemberExpressionObject(array, sourceCode)
			) {
				fixed = `(${fixed})`;
			}

			fixed = `${fixed}.at(-1)`;

			const tokenBefore = sourceCode.getTokenBefore(node);
			if (needsSemicolon(tokenBefore, sourceCode, fixed)) {
				fixed = `;${fixed}`;
			}

			return fixer.replaceText(node, fixed);
		};

		return problem;
	});
}

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			getLastElementFunctions: {
				type: 'array',
				uniqueItems: true,
			},
			checkAllIndexAccess: {
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
			description: 'Prefer `.at()` method for index access and `String#charAt()`.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		defaultOptions: [{getLastElementFunctions: [], checkAllIndexAccess: false}],
		messages,
	},
};

export default config;
