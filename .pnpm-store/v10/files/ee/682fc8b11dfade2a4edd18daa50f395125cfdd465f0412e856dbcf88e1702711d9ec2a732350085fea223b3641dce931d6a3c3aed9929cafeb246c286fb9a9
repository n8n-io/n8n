import {isParenthesized} from '@eslint-community/eslint-utils';
import eventTypes from './shared/dom-events.js';
import {isUndefined, isNullLiteral, isStaticRequire} from './ast/index.js';

const MESSAGE_ID = 'prefer-add-event-listener';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` over `{{method}}`.{{extra}}',
};
const extraMessages = {
	beforeunload: 'Use `event.preventDefault(); event.returnValue = \'foo\'` to trigger the prompt.',
	message: 'Note that there is difference between `SharedWorker#onmessage` and `SharedWorker#addEventListener(\'message\')`.',
	error: 'Note that there is difference between `{window,element}.onerror` and `{window,element}.addEventListener(\'error\')`.',
};

const getEventMethodName = memberExpression => memberExpression.property.name;
const getEventTypeName = eventMethodName => eventMethodName.slice('on'.length);

const fixCode = (fixer, sourceCode, assignmentNode, memberExpression) => {
	const eventTypeName = getEventTypeName(getEventMethodName(memberExpression));
	let eventObjectCode = sourceCode.getText(memberExpression.object);
	if (isParenthesized(memberExpression.object, sourceCode)) {
		eventObjectCode = `(${eventObjectCode})`;
	}

	let fncCode = sourceCode.getText(assignmentNode.right);
	if (isParenthesized(assignmentNode.right, sourceCode)) {
		fncCode = `(${fncCode})`;
	}

	const fixedCodeStatement = `${eventObjectCode}.addEventListener('${eventTypeName}', ${fncCode})`;
	return fixer.replaceText(assignmentNode, fixedCodeStatement);
};

const shouldFixBeforeUnload = (assignedExpression, nodeReturnsSomething) => {
	if (
		assignedExpression.type !== 'ArrowFunctionExpression'
		&& assignedExpression.type !== 'FunctionExpression'
	) {
		return false;
	}

	if (assignedExpression.body.type !== 'BlockStatement') {
		return false;
	}

	return !nodeReturnsSomething.get(assignedExpression);
};

const isClearing = node => isUndefined(node) || isNullLiteral(node);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const options = context.options[0] || {};
	const excludedPackages = new Set(options.excludedPackages || ['koa', 'sax']);
	let isDisabled;

	const nodeReturnsSomething = new WeakMap();
	let codePathInfo;

	return {
		onCodePathStart(codePath, node) {
			codePathInfo = {
				node,
				upper: codePathInfo,
				returnsSomething: false,
			};
		},

		onCodePathEnd() {
			nodeReturnsSomething.set(codePathInfo.node, codePathInfo.returnsSomething);
			codePathInfo = codePathInfo.upper;
		},

		CallExpression(node) {
			if (!isStaticRequire(node)) {
				return;
			}

			if (!isDisabled && excludedPackages.has(node.arguments[0].value)) {
				isDisabled = true;
			}
		},

		Literal(node) {
			if (node.parent.type === 'ImportDeclaration' && !isDisabled && excludedPackages.has(node.value)) {
				isDisabled = true;
			}
		},

		ReturnStatement(node) {
			codePathInfo.returnsSomething ||= Boolean(node.argument);
		},

		'AssignmentExpression:exit'(node) {
			if (isDisabled) {
				return;
			}

			const {left: memberExpression, right: assignedExpression, operator} = node;

			if (
				memberExpression.type !== 'MemberExpression'
				|| memberExpression.computed
			) {
				return;
			}

			const eventMethodName = getEventMethodName(memberExpression);

			if (!eventMethodName || !eventMethodName.startsWith('on')) {
				return;
			}

			const eventTypeName = getEventTypeName(eventMethodName);

			if (!eventTypes.has(eventTypeName)) {
				return;
			}

			let replacement = 'addEventListener';
			let extra = '';
			let fix;

			if (isClearing(assignedExpression)) {
				replacement = 'removeEventListener';
			} else if (
				eventTypeName === 'beforeunload'
				&& !shouldFixBeforeUnload(assignedExpression, nodeReturnsSomething)
			) {
				extra = extraMessages.beforeunload;
			} else if (eventTypeName === 'message') {
				// Disable `onmessage` fix, see #537
				extra = extraMessages.message;
			} else if (eventTypeName === 'error') {
				// Disable `onerror` fix, see #1493
				extra = extraMessages.error;
			} else if (
				operator === '='
				&& node.parent.type === 'ExpressionStatement'
				&& node.parent.expression === node
			) {
				fix = fixer => fixCode(fixer, context.sourceCode, node, memberExpression);
			}

			return {
				node: memberExpression.property,
				messageId: MESSAGE_ID,
				data: {
					replacement,
					method: eventMethodName,
					extra: extra ? ` ${extra}` : '',
				},
				fix,
			};
		},
	};
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			excludedPackages: {
				type: 'array',
				items: {
					type: 'string',
				},
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
			description: 'Prefer `.addEventListener()` and `.removeEventListener()` over `on`-functions.',
			recommended: true,
		},
		fixable: 'code',
		schema,
		defaultOptions: [{}],
		messages,
	},
};

export default config;
