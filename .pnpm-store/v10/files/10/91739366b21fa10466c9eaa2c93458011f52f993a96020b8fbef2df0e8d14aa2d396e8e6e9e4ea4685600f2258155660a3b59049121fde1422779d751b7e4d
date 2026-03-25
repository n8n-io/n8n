import {isParenthesized, hasSideEffect} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {
	getParenthesizedText,
	isNodeValueNotDomNode,
	isValueNotUsable,
	needsSemicolon,
	shouldAddParenthesesToMemberExpressionObject,
} from './utils/index.js';

const ERROR_MESSAGE_ID = 'error';
const SUGGESTION_MESSAGE_ID = 'suggestion';
const messages = {
	[ERROR_MESSAGE_ID]: 'Prefer `childNode.remove()` over `parentNode.removeChild(childNode)`.',
	[SUGGESTION_MESSAGE_ID]: 'Replace `parentNode.removeChild(childNode)` with `childNode{{dotOrQuestionDot}}remove()`.',
};

// TODO: Don't check node.type twice
const isMemberExpressionOptionalObject = node =>
	node.parent.type === 'MemberExpression'
	&& node.parent.object === node
	&& (
		node.parent.optional
		|| (node.type === 'MemberExpression' && isMemberExpressionOptionalObject(node.object))
	);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	return {
		CallExpression(node) {
			if (
				!isMethodCall(node, {
					method: 'removeChild',
					argumentsLength: 1,
					optionalCall: false,
				})
				|| isNodeValueNotDomNode(node.callee.object)
				|| isNodeValueNotDomNode(node.arguments[0])
			) {
				return;
			}

			const parentNode = node.callee.object;
			const childNode = node.arguments[0];

			const problem = {
				node,
				messageId: ERROR_MESSAGE_ID,
			};

			const isOptionalParentNode = isMemberExpressionOptionalObject(parentNode);

			const createFix = (optional = false) => fixer => {
				let childNodeText = getParenthesizedText(childNode, sourceCode);
				if (
					!isParenthesized(childNode, sourceCode)
					&& shouldAddParenthesesToMemberExpressionObject(childNode, sourceCode)
				) {
					childNodeText = `(${childNodeText})`;
				}

				if (needsSemicolon(sourceCode.getTokenBefore(node), sourceCode, childNodeText)) {
					childNodeText = `;${childNodeText}`;
				}

				return fixer.replaceText(node, `${childNodeText}${optional ? '?' : ''}.remove()`);
			};

			if (!hasSideEffect(parentNode, sourceCode) && isValueNotUsable(node)) {
				if (!isOptionalParentNode) {
					problem.fix = createFix(false);
					return problem;
				}

				// The most common case `foo?.parentNode.remove(foo)`
				// TODO: Allow case like `foo.bar?.parentNode.remove(foo.bar)`
				if (
					node.callee.type === 'MemberExpression'
					&& !node.callee.optional
					&& parentNode.type === 'MemberExpression'
					&& parentNode.optional
					&& !parentNode.computed
					&& parentNode.property.type === 'Identifier'
					&& parentNode.property.name === 'parentNode'
					&& parentNode.object.type === 'Identifier'
					&& childNode.type === 'Identifier'
					&& parentNode.object.name === childNode.name
				) {
					problem.fix = createFix(true);
					return problem;
				}
			}

			problem.suggest = (
				isOptionalParentNode ? [true, false] : [false]
			).map(optional => ({
				messageId: SUGGESTION_MESSAGE_ID,
				data: {dotOrQuestionDot: optional ? '?.' : '.'},
				fix: createFix(optional),
			}));

			return problem;
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `childNode.remove()` over `parentNode.removeChild(childNode)`.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
