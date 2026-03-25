import {isMethodCall, isCallExpression, isNewExpression} from './ast/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';

const MESSAGE_ID_DEFAULT = 'prefer-date';
const MESSAGE_ID_METHOD = 'prefer-date-now-over-methods';
const MESSAGE_ID_NUMBER = 'prefer-date-now-over-number-data-object';
const messages = {
	[MESSAGE_ID_DEFAULT]: 'Prefer `Date.now()` over `new Date()`.',
	[MESSAGE_ID_METHOD]: 'Prefer `Date.now()` over `Date#{{method}}()`.',
	[MESSAGE_ID_NUMBER]: 'Prefer `Date.now()` over `Number(new Date())`.',
};

const isNewDate = node => isNewExpression(node, {name: 'Date', argumentsLength: 0});

const getProblem = (node, problem, sourceCode) => ({
	node,
	messageId: MESSAGE_ID_DEFAULT,
	* fix(fixer) {
		yield fixer.replaceText(node, 'Date.now()');

		if (node.type === 'UnaryExpression') {
			yield * fixSpaceAroundKeyword(fixer, node, sourceCode);
		}
	},
	...problem,
});

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	CallExpression(callExpression) {
		// `new Date().{getTime,valueOf}()`
		if (
			isMethodCall(callExpression, {
				methods: ['getTime', 'valueOf'],
				argumentsLength: 0,
				optionalCall: false,
				optionalMember: false,
			})
			&& isNewDate(callExpression.callee.object)
		) {
			const method = callExpression.callee.property;
			return getProblem(callExpression, {
				node: method,
				messageId: MESSAGE_ID_METHOD,
				data: {method: method.name},
			});
		}

		// `{Number,BigInt}(new Date())`
		if (
			isCallExpression(callExpression, {
				names: ['Number', 'BigInt'],
				argumentsLength: 1,
				optional: false,
			})
			&& isNewDate(callExpression.arguments[0])
		) {
			const {name} = callExpression.callee;
			if (name === 'Number') {
				return getProblem(callExpression, {
					messageId: MESSAGE_ID_NUMBER,
				});
			}

			return getProblem(callExpression.arguments[0]);
		}
	},
	UnaryExpression(unaryExpression) {
		// https://github.com/estree/estree/blob/master/es5.md#unaryoperator
		if (
			unaryExpression.operator !== '+'
			&& unaryExpression.operator !== '-'
		) {
			return;
		}

		if (isNewDate(unaryExpression.argument)) {
			return getProblem(
				unaryExpression.operator === '-' ? unaryExpression.argument : unaryExpression,
				{},
				context.sourceCode,
			);
		}
	},
	AssignmentExpression(assignmentExpression) {
		if (
			assignmentExpression.operator !== '-='
			&& assignmentExpression.operator !== '*='
			&& assignmentExpression.operator !== '/='
			&& assignmentExpression.operator !== '%='
			&& assignmentExpression.operator !== '**='
		) {
			return;
		}

		if (isNewDate(assignmentExpression.right)) {
			return getProblem(assignmentExpression.right);
		}
	},
	* BinaryExpression(binaryExpression) {
		if (
			binaryExpression.operator !== '-'
			&& binaryExpression.operator !== '*'
			&& binaryExpression.operator !== '/'
			&& binaryExpression.operator !== '%'
			&& binaryExpression.operator !== '**'
		) {
			return;
		}

		for (const node of [binaryExpression.left, binaryExpression.right]) {
			if (isNewDate(node)) {
				yield getProblem(node);
			}
		}
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Date.now()` to get the number of milliseconds since the Unix Epoch.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
