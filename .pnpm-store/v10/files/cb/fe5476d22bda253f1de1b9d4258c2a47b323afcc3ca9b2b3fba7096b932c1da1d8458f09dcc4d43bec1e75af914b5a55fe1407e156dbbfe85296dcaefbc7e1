import {isMethodCall, isCallExpression, isLiteral} from './ast/index.js';

const ERROR_MESSAGE_ID = 'error';
const SUGGESTION_REPLACE_MESSAGE_ID = 'replace';
const SUGGESTION_REMOVE_MESSAGE_ID = 'remove';
const messages = {
	[ERROR_MESSAGE_ID]: 'Use `undefined` instead of `null`.',
	[SUGGESTION_REPLACE_MESSAGE_ID]: 'Replace `null` with `undefined`.',
	[SUGGESTION_REMOVE_MESSAGE_ID]: 'Remove `null`.',
};

const isLooseEqual = node => node.type === 'BinaryExpression' && ['==', '!='].includes(node.operator);
const isStrictEqual = node => node.type === 'BinaryExpression' && ['===', '!=='].includes(node.operator);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {checkStrictEquality} = {
		checkStrictEquality: false,
		...context.options[0],
	};

	return {
		Literal(node) {
			if (
				// eslint-disable-next-line unicorn/no-null
				!isLiteral(node, null)
				|| (!checkStrictEquality && isStrictEqual(node.parent))
				// `Object.create(null)`, `Object.create(null, foo)`
				|| (
					isMethodCall(node.parent, {
						object: 'Object',
						method: 'create',
						minimumArguments: 1,
						maximumArguments: 2,
						optionalCall: false,
						optionalMember: false,
					})
					&& node.parent.arguments[0] === node
				)
				// `useRef(null)`
				|| (
					isCallExpression(node.parent, {
						name: 'useRef',
						argumentsLength: 1,
						optionalCall: false,
						optionalMember: false,
					})
					&& node.parent.arguments[0] === node
				)
				// `React.useRef(null)`
				|| (
					isMethodCall(node.parent, {
						object: 'React',
						method: 'useRef',
						argumentsLength: 1,
						optionalCall: false,
						optionalMember: false,
					})
					&& node.parent.arguments[0] === node
				)
				// `foo.insertBefore(bar, null)`
				|| (
					isMethodCall(node.parent, {
						method: 'insertBefore',
						argumentsLength: 2,
						optionalCall: false,
						optionalMember: false,
					})
					&& node.parent.arguments[1] === node
				)
			) {
				return;
			}

			const {parent} = node;

			const problem = {
				node,
				messageId: ERROR_MESSAGE_ID,
			};

			const useUndefinedFix = fixer => fixer.replaceText(node, 'undefined');

			if (isLooseEqual(parent)) {
				problem.fix = useUndefinedFix;
				return problem;
			}

			const useUndefinedSuggestion = {
				messageId: SUGGESTION_REPLACE_MESSAGE_ID,
				fix: useUndefinedFix,
			};

			if (parent.type === 'ReturnStatement' && parent.argument === node) {
				problem.suggest = [
					{
						messageId: SUGGESTION_REMOVE_MESSAGE_ID,
						fix: fixer => fixer.remove(node),
					},
					useUndefinedSuggestion,
				];
				return problem;
			}

			if (parent.type === 'VariableDeclarator' && parent.init === node && parent.parent.kind !== 'const') {
				const {sourceCode} = context;
				const [, start] = sourceCode.getRange(parent.id);
				const [, end] = sourceCode.getRange(node);
				problem.suggest = [
					{
						messageId: SUGGESTION_REMOVE_MESSAGE_ID,
						fix: fixer => fixer.removeRange([start, end]),
					},
					useUndefinedSuggestion,
				];
				return problem;
			}

			problem.suggest = [useUndefinedSuggestion];
			return problem;
		},
	};
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			checkStrictEquality: {
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
			description: 'Disallow the use of the `null` literal.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		defaultOptions: [{checkStrictEquality: false}],
		messages,
	},
};

export default config;
