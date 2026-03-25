import {findVariable, getFunctionHeadLocation} from '@eslint-community/eslint-utils';
import {isFunction, isMemberExpression, isMethodCall} from './ast/index.js';

const ERROR_PROMISE = 'promise';
const ERROR_IIFE = 'iife';
const ERROR_IDENTIFIER = 'identifier';
const SUGGESTION_ADD_AWAIT = 'add-await';
const messages = {
	[ERROR_PROMISE]: 'Prefer top-level await over using a promise chain.',
	[ERROR_IIFE]: 'Prefer top-level await over an async IIFE.',
	[ERROR_IDENTIFIER]: 'Prefer top-level await over an async function `{{name}}` call.',
	[SUGGESTION_ADD_AWAIT]: 'Insert `await`.',
};

const promisePrototypeMethods = ['then', 'catch', 'finally'];
const isTopLevelCallExpression = node => {
	if (node.type !== 'CallExpression') {
		return false;
	}

	for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) {
		if (
			isFunction(ancestor)
			|| ancestor.type === 'ClassDeclaration'
			|| ancestor.type === 'ClassExpression'
		) {
			return false;
		}
	}

	return true;
};

const isPromiseMethodCalleeObject = node =>
	node.parent.type === 'MemberExpression'
	&& node.parent.object === node
	&& !node.parent.computed
	&& node.parent.property.type === 'Identifier'
	&& promisePrototypeMethods.includes(node.parent.property.name)
	&& node.parent.parent.type === 'CallExpression'
	&& node.parent.parent.callee === node.parent;
const isAwaitExpressionArgument = node => {
	if (node.parent.type === 'ChainExpression') {
		node = node.parent;
	}

	return node.parent.type === 'AwaitExpression' && node.parent.argument === node;
};

// `Promise.{all,allSettled,any,race}([foo()])`
const isInPromiseMethods = node =>
	node.parent.type === 'ArrayExpression'
	&& node.parent.elements.includes(node)
	&& isMethodCall(node.parent.parent, {
		object: 'Promise',
		methods: ['all', 'allSettled', 'any', 'race'],
		argumentsLength: 1,
	})
	&& node.parent.parent.arguments[0] === node.parent;

/** @param {import('eslint').Rule.RuleContext} context */
function create(context) {
	if (context.filename.toLowerCase().endsWith('.cjs')) {
		return;
	}

	return {
		CallExpression(node) {
			if (
				!isTopLevelCallExpression(node)
				|| isPromiseMethodCalleeObject(node)
				|| isAwaitExpressionArgument(node)
				|| isInPromiseMethods(node)
			) {
				return;
			}

			// Promises
			if (isMemberExpression(node.callee, {
				properties: promisePrototypeMethods,
				computed: false,
			})) {
				return {
					node: node.callee.property,
					messageId: ERROR_PROMISE,
				};
			}

			const {sourceCode} = context;

			// IIFE
			if (
				(node.callee.type === 'FunctionExpression' || node.callee.type === 'ArrowFunctionExpression')
				&& node.callee.async
				&& !node.callee.generator
			) {
				return {
					node,
					loc: getFunctionHeadLocation(node.callee, sourceCode),
					messageId: ERROR_IIFE,
				};
			}

			// Identifier
			if (node.callee.type !== 'Identifier') {
				return;
			}

			const variable = findVariable(sourceCode.getScope(node), node.callee);
			if (!variable || variable.defs.length !== 1) {
				return;
			}

			const [definition] = variable.defs;
			const value = definition.type === 'Variable' && definition.kind === 'const'
				? definition.node.init
				: definition.node;
			if (
				!value
				|| !(isFunction(value) && !value.generator && value.async)
			) {
				return;
			}

			return {
				node,
				messageId: ERROR_IDENTIFIER,
				data: {name: node.callee.name},
				suggest: [
					{
						messageId: SUGGESTION_ADD_AWAIT,
						fix: fixer => fixer.insertTextBefore(node, 'await '),
					},
				],
			};
		},
	};
}

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer top-level await over top-level promises and async function calls.',
			recommended: true,
		},
		hasSuggestions: true,
		messages,
	},
};

export default config;
