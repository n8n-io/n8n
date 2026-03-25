import {hasSideEffect, isSemicolonToken} from '@eslint-community/eslint-utils';
import {getCallExpressionTokens, getCallExpressionArgumentsText} from './utils/index.js';
import isSameReference from './utils/is-same-reference.js';
import {isNodeMatches} from './utils/is-node-matches.js';
import getPreviousNode from './utils/get-previous-node.js';
import {isMethodCall, isMemberExpression, isCallExpression} from './ast/index.js';

const ERROR = 'error/array-push';
const SUGGESTION = 'suggestion';
const messages = {
	[ERROR]: 'Do not call `{{description}}` multiple times.',
	[SUGGESTION]: 'Merge with previous one.',
};

const isExpressionStatement = node =>
	node?.parent.type === 'ExpressionStatement'
	&& node.parent.expression === node;
const isClassList = node => isMemberExpression(node, {
	property: 'classList',
	optional: false,
	computed: false,
});

const cases = [
	{
		description: 'Array#push()',
		test: callExpression => isMethodCall(callExpression, {
			method: 'push',
			optionalCall: false,
			optionalMember: false,
		}),
		ignore: [
			'stream.push',
			'this.push',
			'this.stream.push',
			'process.stdin.push',
			'process.stdout.push',
			'process.stderr.push',
		],
	},
	{
		description: 'Element#classList.add()',
		test: callExpression =>
			isMethodCall(callExpression, {
				method: 'add',
				optionalCall: false,
				optionalMember: false,
			})
			&& isClassList(callExpression.callee.object),
	},
	{
		description: 'Element#classList.remove()',
		test: callExpression =>
			isMethodCall(callExpression, {
				method: 'remove',
				optionalCall: false,
				optionalMember: false,
			})
			&& isClassList(callExpression.callee.object),
	},
	{
		description: 'importScripts()',
		test: callExpression => isCallExpression(callExpression, {
			name: 'importScripts',
			optional: false,
		}),
	},
].map(problematicalCase => ({
	...problematicalCase,
	test: callExpression => problematicalCase.test(callExpression) && isExpressionStatement(callExpression),
}));

function create(context) {
	const {
		ignore: ignoredCalleeInOptions,
	} = {
		ignore: [],
		...context.options[0],
	};
	const {sourceCode} = context;

	return {
		* CallExpression(secondCall) {
			for (const {description, test, ignore = []} of cases) {
				if (!test(secondCall)) {
					continue;
				}

				const ignoredCallee = [...ignore, ...ignoredCalleeInOptions];
				if (isNodeMatches(secondCall.callee, ignoredCallee)) {
					continue;
				}

				const firstCall = getPreviousNode(secondCall.parent, sourceCode)?.expression;
				if (!test(firstCall) || !isSameReference(firstCall.callee, secondCall.callee)) {
					continue;
				}

				const secondCallArguments = secondCall.arguments;
				const problem = {
					node: secondCall.callee.type === 'Identifier' ? secondCall.callee : secondCall.callee.property,
					messageId: ERROR,
					data: {description},
				};

				const fix = function * (fixer) {
					if (secondCallArguments.length > 0) {
						const text = getCallExpressionArgumentsText(sourceCode, secondCall);

						const {
							trailingCommaToken,
							closingParenthesisToken,
						} = getCallExpressionTokens(sourceCode, firstCall);

						yield (
							trailingCommaToken
								? fixer.insertTextAfter(trailingCommaToken, ` ${text}`)
								: fixer.insertTextBefore(closingParenthesisToken, firstCall.arguments.length > 0 ? `, ${text}` : text)
						);
					}

					const firstExpression = firstCall.parent;
					const secondExpression = secondCall.parent;
					const shouldKeepSemicolon = !isSemicolonToken(sourceCode.getLastToken(firstExpression))
						&& isSemicolonToken(sourceCode.getLastToken(secondExpression));
					const [, start] = sourceCode.getRange(firstExpression);
					const [, end] = sourceCode.getRange(secondExpression);

					yield fixer.replaceTextRange([start, end], shouldKeepSemicolon ? ';' : '');
				};

				if (secondCallArguments.some(element => hasSideEffect(element, sourceCode))) {
					problem.suggest = [
						{
							messageId: SUGGESTION,
							fix,
						},
					];
				} else {
					problem.fix = fix;
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
			ignore: {
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
			description: 'Enforce combining multiple `Array#push()`, `Element#classList.{add,remove}()`, and `importScripts()` into one call.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		defaultOptions: [{}],
		messages,
	},
};

export default config;
