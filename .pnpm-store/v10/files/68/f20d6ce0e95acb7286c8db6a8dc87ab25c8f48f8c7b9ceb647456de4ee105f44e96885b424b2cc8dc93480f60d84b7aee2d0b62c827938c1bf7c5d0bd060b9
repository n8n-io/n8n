import {getParenthesizedRange} from './utils/index.js';
import {isFunction, isMethodCall} from './ast/index.js';

const MESSAGE_ID_RESOLVE = 'resolve';
const MESSAGE_ID_REJECT = 'reject';
const messages = {
	[MESSAGE_ID_RESOLVE]: 'Prefer `{{type}} value` over `{{type}} Promise.resolve(value)`.',
	[MESSAGE_ID_REJECT]: 'Prefer `throw error` over `{{type}} Promise.reject(error)`.',
};

function getFunctionNode(node) {
	let isInTryStatement = false;
	let functionNode;
	for (; node; node = node.parent) {
		if (isFunction(node)) {
			functionNode = node;
			break;
		}

		if (node.type === 'TryStatement') {
			isInTryStatement = true;
		}
	}

	return {
		functionNode,
		isInTryStatement,
	};
}

function isPromiseCallback(node) {
	if (
		node.parent.type === 'CallExpression'
		&& node.parent.callee.type === 'MemberExpression'
		&& !node.parent.callee.computed
		&& node.parent.callee.property.type === 'Identifier'
	) {
		const {callee: {property}, arguments: arguments_} = node.parent;

		if (
			arguments_.length === 1
			&& (
				property.name === 'then'
				|| property.name === 'catch'
				|| property.name === 'finally'
			)
			&& arguments_[0] === node
		) {
			return true;
		}

		if (
			arguments_.length === 2
			&& property.name === 'then'
			&& (
				arguments_[0] === node
				|| (arguments_[0].type !== 'SpreadElement' && arguments_[1] === node)
			)
		) {
			return true;
		}
	}

	return false;
}

function createProblem(callExpression, fix) {
	const {callee, parent} = callExpression;
	const method = callee.property.name;
	const type = parent.type === 'YieldExpression' ? 'yield' : 'return';

	return {
		node: callee,
		messageId: method,
		data: {type},
		fix,
	};
}

function fix(callExpression, isInTryStatement, sourceCode) {
	if (callExpression.arguments.length > 1) {
		return;
	}

	const {callee, parent, arguments: [errorOrValue]} = callExpression;
	if (errorOrValue?.type === 'SpreadElement') {
		return;
	}

	const isReject = callee.property.name === 'reject';
	const isYieldExpression = parent.type === 'YieldExpression';
	if (
		isReject
		&& (
			isInTryStatement
			|| (isYieldExpression && parent.parent.type !== 'ExpressionStatement')
		)
	) {
		return;
	}

	return function (fixer) {
		const isArrowFunctionBody = parent.type === 'ArrowFunctionExpression';

		let text = errorOrValue ? sourceCode.getText(errorOrValue) : '';

		if (errorOrValue?.type === 'SequenceExpression') {
			text = `(${text})`;
		}

		if (isReject) {
			// `return Promise.reject()` -> `throw undefined`
			text ||= 'undefined';
			text = `throw ${text}`;

			if (isYieldExpression) {
				return fixer.replaceTextRange(
					getParenthesizedRange(parent, sourceCode),
					text,
				);
			}

			text += ';';

			// `=> Promise.reject(error)` -> `=> { throw error; }`
			if (isArrowFunctionBody) {
				text = `{ ${text} }`;
				return fixer.replaceTextRange(
					getParenthesizedRange(callExpression, sourceCode),
					text,
				);
			}
		} else {
			// eslint-disable-next-line no-lonely-if
			if (isYieldExpression) {
				text = `yield${text ? ' ' : ''}${text}`;
			} else if (parent.type === 'ReturnStatement') {
				text = `return${text ? ' ' : ''}${text};`;
			} else {
				if (errorOrValue?.type === 'ObjectExpression') {
					text = `(${text})`;
				}

				// `=> Promise.resolve()` -> `=> {}`
				text ||= '{}';
			}
		}

		return fixer.replaceText(
			isArrowFunctionBody ? callExpression : parent,
			text,
		);
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	return {
		CallExpression(callExpression) {
			if (!(
				isMethodCall(callExpression, {
					object: 'Promise',
					methods: ['resolve', 'reject'],
					optionalCall: false,
					optionalMember: false,
				})
				&& (
					(
						callExpression.parent.type === 'ArrowFunctionExpression'
						&& callExpression.parent.body === callExpression
					)
					|| (
						callExpression.parent.type === 'ReturnStatement'
						&& callExpression.parent.argument === callExpression
					)
					|| (
						callExpression.parent.type === 'YieldExpression'
						&& !callExpression.parent.delegate && callExpression.parent.argument === callExpression
					)
				)
			)) {
				return;
			}

			const {functionNode, isInTryStatement} = getFunctionNode(callExpression);
			if (!functionNode || !(functionNode.async || isPromiseCallback(functionNode))) {
				return;
			}

			return createProblem(
				callExpression,
				fix(callExpression, isInTryStatement, sourceCode),
			);
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow returning/yielding `Promise.resolve/reject()` in async functions or promise callbacks',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
