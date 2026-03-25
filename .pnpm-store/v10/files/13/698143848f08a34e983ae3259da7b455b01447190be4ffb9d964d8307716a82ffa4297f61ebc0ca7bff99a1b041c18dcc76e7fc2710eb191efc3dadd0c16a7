import {
	getParenthesizedText,
	isArrayPrototypeProperty,
	isNodeMatches,
	isNodeMatchesNameOrPath,
	isParenthesized,
	isSameIdentifier,
	needsSemicolon,
	shouldAddParenthesesToMemberExpressionObject,
} from './utils/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {isMethodCall, isCallExpression} from './ast/index.js';

const MESSAGE_ID = 'prefer-array-flat';
const messages = {
	[MESSAGE_ID]: 'Prefer `Array#flat()` over `{{description}}` to flatten an array.',
};

const isEmptyArrayExpression = node =>
	node.type === 'ArrayExpression'
	&& node.elements.length === 0;

// `array.flatMap(x => x)`
const arrayFlatMap = {
	testFunction(node) {
		if (!isMethodCall(node, {
			method: 'flatMap',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})) {
			return false;
		}

		const [firstArgument] = node.arguments;
		return (
			firstArgument.type === 'ArrowFunctionExpression'
			&& !firstArgument.async
			&& firstArgument.params.length === 1
			&& isSameIdentifier(firstArgument.params[0], firstArgument.body)
		);
	},
	getArrayNode: node => node.callee.object,
	description: 'Array#flatMap()',
};

// `array.reduce((a, b) => a.concat(b), [])`
// `array.reduce((a, b) => [...a, ...b], [])`
const arrayReduce = {
	testFunction(node) {
		if (!isMethodCall(node, {
			method: 'reduce',
			argumentsLength: 2,
			optionalCall: false,
			optionalMember: false,
		})) {
			return false;
		}

		const [firstArgument, secondArgument] = node.arguments;
		if (!(
			firstArgument.type === 'ArrowFunctionExpression'
			&& !firstArgument.async
			&& firstArgument.params.length === 2
			&& isEmptyArrayExpression(secondArgument)
		)) {
			return false;
		}

		const firstArgumentBody = firstArgument.body;
		const [firstParameter, secondParameter] = firstArgument.params;
		return (
			// `(a, b) => a.concat(b)`
			(
				isMethodCall(firstArgumentBody, {
					method: 'concat',
					argumentsLength: 1,
					optionalCall: false,
					optionalMember: false,
				})
				&& isSameIdentifier(firstParameter, firstArgumentBody.callee.object)
				&& isSameIdentifier(secondParameter, firstArgumentBody.arguments[0])
			)
			// `(a, b) => [...a, ...b]`
			|| (
				firstArgumentBody.type === 'ArrayExpression'
				&& firstArgumentBody.elements.length === 2
				&& firstArgumentBody.elements.every((node, index) =>
					node?.type === 'SpreadElement'
					&& node.argument.type === 'Identifier'
					&& isSameIdentifier(firstArgument.params[index], node.argument),
				)
			)
		);
	},
	getArrayNode: node => node.callee.object,
	description: 'Array#reduce()',
};

// `[].concat(maybeArray)`
// `[].concat(...array)`
const emptyArrayConcat = {
	testFunction(node) {
		return isMethodCall(node, {
			method: 'concat',
			argumentsLength: 1,
			allowSpreadElement: true,
			optionalCall: false,
			optionalMember: false,
		})
		&& isEmptyArrayExpression(node.callee.object);
	},
	getArrayNode(node) {
		const argumentNode = node.arguments[0];
		return argumentNode.type === 'SpreadElement' ? argumentNode.argument : argumentNode;
	},
	description: '[].concat()',
	shouldSwitchToArray: node => node.arguments[0].type !== 'SpreadElement',
};

// - `[].concat.apply([], array)` and `Array.prototype.concat.apply([], array)`
// - `[].concat.call([], maybeArray)` and `Array.prototype.concat.call([], maybeArray)`
// - `[].concat.call([], ...array)` and `Array.prototype.concat.call([], ...array)`
const arrayPrototypeConcat = {
	testFunction(node) {
		if (!(
			isMethodCall(node, {
				methods: ['apply', 'call'],
				argumentsLength: 2,
				allowSpreadElement: true,
				optionalCall: false,
				optionalMember: false,
			})
			&& isArrayPrototypeProperty(node.callee.object, {
				property: 'concat',
			})
		)) {
			return false;
		}

		const [firstArgument, secondArgument] = node.arguments;
		return isEmptyArrayExpression(firstArgument)
			&& (
				node.callee.property.name === 'call'
				|| secondArgument.type !== 'SpreadElement'
			);
	},
	getArrayNode(node) {
		const argumentNode = node.arguments[1];
		return argumentNode.type === 'SpreadElement' ? argumentNode.argument : argumentNode;
	},
	description: 'Array.prototype.concat()',
	shouldSwitchToArray: node => node.arguments[1].type !== 'SpreadElement' && node.callee.property.name === 'call',
};

const lodashFlattenFunctions = [
	'_.flatten',
	'lodash.flatten',
	'underscore.flatten',
];

function fix(node, array, sourceCode, shouldSwitchToArray) {
	if (typeof shouldSwitchToArray === 'function') {
		shouldSwitchToArray = shouldSwitchToArray(node);
	}

	return function * (fixer) {
		let fixed = getParenthesizedText(array, sourceCode);
		if (shouldSwitchToArray) {
			// `array` is an argument, when it changes to `array[]`, we don't need add extra parentheses
			fixed = `[${fixed}]`;
			// And we don't need to add parentheses to the new array to call `.flat()`
		} else if (
			!isParenthesized(array, sourceCode)
			&& shouldAddParenthesesToMemberExpressionObject(array, sourceCode)
		) {
			fixed = `(${fixed})`;
		}

		fixed = `${fixed}.flat()`;

		const tokenBefore = sourceCode.getTokenBefore(node);
		if (needsSemicolon(tokenBefore, sourceCode, fixed)) {
			fixed = `;${fixed}`;
		}

		yield fixer.replaceText(node, fixed);

		yield * fixSpaceAroundKeyword(fixer, node, sourceCode);
	};
}

function create(context) {
	const {functions: configFunctions} = {
		functions: [],
		...context.options[0],
	};
	const functions = [...configFunctions, ...lodashFlattenFunctions];

	const cases = [
		arrayFlatMap,
		arrayReduce,
		emptyArrayConcat,
		arrayPrototypeConcat,
		{
			testFunction: node => isCallExpression(node, {
				argumentsLength: 1,
				optional: false,
			}) && isNodeMatches(node.callee, functions),
			getArrayNode: node => node.arguments[0],
			description: node => `${functions.find(nameOrPath => isNodeMatchesNameOrPath(node.callee, nameOrPath)).trim()}()`,
		},
	];

	return {
		* CallExpression(node) {
			for (const {testFunction, description, getArrayNode, shouldSwitchToArray} of cases) {
				if (!testFunction(node)) {
					continue;
				}

				const array = getArrayNode(node);

				const data = {
					description: typeof description === 'string' ? description : description(node),
				};

				const problem = {
					node,
					messageId: MESSAGE_ID,
					data,
				};

				const {sourceCode} = context;

				// Don't fix if it has comments.
				if (
					sourceCode.getCommentsInside(node).length
					=== sourceCode.getCommentsInside(array).length
				) {
					problem.fix = fix(node, array, sourceCode, shouldSwitchToArray);
				}

				yield problem;
			}
		},
	};
}

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			functions: {
				type: 'array',
				uniqueItems: true,
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
			description: 'Prefer `Array#flat()` over legacy techniques to flatten arrays.',
			recommended: true,
		},
		fixable: 'code',
		schema,
		defaultOptions: [{}],
		messages,
	},
};

export default config;
