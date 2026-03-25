import {isCommaToken, isArrowToken, isClosingParenToken} from '@eslint-community/eslint-utils';
import {isMethodCall, isLiteral} from './ast/index.js';
import {removeParentheses} from './fix/index.js';
import {
	getParentheses,
	getParenthesizedText,
	isNodeMatchesNameOrPath,
	isSameIdentifier,
} from './utils/index.js';
import {isCallExpression} from './ast/call-or-new-expression.js';

const MESSAGE_ID_REDUCE = 'reduce';
const MESSAGE_ID_FUNCTION = 'function';
const messages = {
	[MESSAGE_ID_REDUCE]: 'Prefer `Object.fromEntries()` over `Array#reduce()`.',
	[MESSAGE_ID_FUNCTION]: 'Prefer `Object.fromEntries()` over `{{functionName}}()`.',
};

const isEmptyObject = node =>
	// `{}`
	(node.type === 'ObjectExpression' && node.properties.length === 0)
	// `Object.create(null)`
	|| (
		isMethodCall(node, {
			object: 'Object',
			method: 'create',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})
		// eslint-disable-next-line unicorn/no-null
		&& isLiteral(node.arguments[0], null)
	);

const isArrowFunctionCallback = node =>
	node.type === 'ArrowFunctionExpression'
	&& !node.async
	&& node.params.length > 0
	&& node.params[0].type === 'Identifier';

const isProperty = node =>
	node.type === 'Property'
	&& node.kind === 'init'
	&& !node.method;

// - `pairs.reduce(…, {})`
// - `pairs.reduce(…, Object.create(null))`
const isArrayReduceWithEmptyObject = node =>
	isMethodCall(node, {
		method: 'reduce',
		argumentsLength: 2,
		optionalCall: false,
		optionalMember: false,
	})
	&& isEmptyObject(node.arguments[1]);

const fixableArrayReduceCases = [
	{
		test: callExpression =>
			isArrayReduceWithEmptyObject(callExpression)
			// `() => Object.assign(object, {key})`
			&& isArrowFunctionCallback(callExpression.arguments[0])
			&& isMethodCall(callExpression.arguments[0].body, {
				object: 'Object',
				method: 'assign',
				argumentsLength: 2,
				optionalCall: false,
				optionalMember: false,
			})
			&& callExpression.arguments[0].body.arguments[1].type === 'ObjectExpression'
			&& callExpression.arguments[0].body.arguments[1].properties.length === 1
			&& isProperty(callExpression.arguments[0].body.arguments[1].properties[0])
			&& isSameIdentifier(callExpression.arguments[0].params[0], callExpression.arguments[0].body.arguments[0]),
		getProperty: callback => callback.body.arguments[1].properties[0],
	},
	{
		test: callExpression =>
			isArrayReduceWithEmptyObject(callExpression)
			// `() => ({...object, key})`
			&& isArrowFunctionCallback(callExpression.arguments[0])
			&& callExpression.arguments[0].body.type === 'ObjectExpression'
			&& callExpression.arguments[0].body.properties.length === 2
			&& callExpression.arguments[0].body.properties[0].type === 'SpreadElement'
			&& isProperty(callExpression.arguments[0].body.properties[1])
			&& isSameIdentifier(callExpression.arguments[0].params[0], callExpression.arguments[0].body.properties[0].argument),
		getProperty: callback => callback.body.properties[1],
	},
];

// `_.flatten(array)`
const lodashFromPairsFunctions = [
	'_.fromPairs',
	'lodash.fromPairs',
];

function fixReduceAssignOrSpread({sourceCode, callExpression, property}) {
	const removeInitObject = fixer => {
		const initObject = callExpression.arguments[1];
		const parentheses = getParentheses(initObject, sourceCode);
		const firstToken = parentheses[0] || initObject;
		const lastToken = parentheses.at(-1) || initObject;
		const startToken = sourceCode.getTokenBefore(firstToken);
		const [start] = sourceCode.getRange(startToken);
		const [, end] = sourceCode.getRange(lastToken);
		return fixer.removeRange([start, end]);
	};

	function * removeFirstParameter(fixer) {
		const parameters = callExpression.arguments[0].params;
		const [firstParameter] = parameters;
		const tokenAfter = sourceCode.getTokenAfter(firstParameter);

		if (isCommaToken(tokenAfter)) {
			yield fixer.remove(tokenAfter);
		}

		let shouldAddParentheses = false;
		if (parameters.length === 1) {
			const arrowToken = sourceCode.getTokenAfter(firstParameter, isArrowToken);
			const tokenBeforeArrowToken = sourceCode.getTokenBefore(arrowToken);

			if (!isClosingParenToken(tokenBeforeArrowToken)) {
				shouldAddParentheses = true;
			}
		}

		yield fixer.replaceText(firstParameter, shouldAddParentheses ? '()' : '');
	}

	const getKeyValueText = () => {
		const {key, value} = property;
		let keyText = getParenthesizedText(key, sourceCode);
		const valueText = getParenthesizedText(value, sourceCode);

		if (!property.computed && key.type === 'Identifier') {
			keyText = `'${keyText}'`;
		}

		return {keyText, valueText};
	};

	function * replaceFunctionBody(fixer) {
		const functionBody = callExpression.arguments[0].body;
		const {keyText, valueText} = getKeyValueText();
		yield fixer.replaceText(functionBody, `[${keyText}, ${valueText}]`);
		yield * removeParentheses(functionBody, fixer, sourceCode);
	}

	return function * (fixer) {
		// Wrap `array.reduce()` with `Object.fromEntries()`
		yield fixer.insertTextBefore(callExpression, 'Object.fromEntries(');
		yield fixer.insertTextAfter(callExpression, ')');

		// Switch `.reduce` to `.map`
		yield fixer.replaceText(callExpression.callee.property, 'map');

		// Remove empty object
		yield removeInitObject(fixer);

		// Remove the first parameter
		yield * removeFirstParameter(fixer);

		// Replace function body
		yield * replaceFunctionBody(fixer);
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
function create(context) {
	const {sourceCode} = context;
	const {functions: configFunctions} = {
		functions: [],
		...context.options[0],
	};
	const functions = [...configFunctions, ...lodashFromPairsFunctions];

	return {
		* CallExpression(callExpression) {
			for (const {test, getProperty} of fixableArrayReduceCases) {
				if (!test(callExpression)) {
					continue;
				}

				const [callbackFunction] = callExpression.arguments;
				const [firstParameter] = callbackFunction.params;
				const variables = sourceCode.getDeclaredVariables(callbackFunction);
				const firstParameterVariable = variables.find(variable => variable.identifiers.length === 1 && variable.identifiers[0] === firstParameter);
				if (!firstParameterVariable || firstParameterVariable.references.length !== 1) {
					continue;
				}

				yield {
					node: callExpression.callee.property,
					messageId: MESSAGE_ID_REDUCE,
					fix: fixReduceAssignOrSpread({
						sourceCode,
						callExpression,
						property: getProperty(callbackFunction),
					}),
				};
			}

			if (!isCallExpression(callExpression, {
				argumentsLength: 1,
				optional: false,
			})) {
				return;
			}

			const functionNode = callExpression.callee;
			for (const nameOrPath of functions) {
				const functionName = nameOrPath.trim();
				if (isNodeMatchesNameOrPath(functionNode, functionName)) {
					yield {
						node: functionNode,
						messageId: MESSAGE_ID_FUNCTION,
						data: {functionName},
						fix: fixer => fixer.replaceText(functionNode, 'Object.fromEntries'),
					};
				}
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
			description: 'Prefer using `Object.fromEntries(…)` to transform a list of key-value pairs into an object.',
			recommended: true,
		},
		fixable: 'code',
		schema,
		defaultOptions: [{}],
		messages,
	},
};

export default config;
