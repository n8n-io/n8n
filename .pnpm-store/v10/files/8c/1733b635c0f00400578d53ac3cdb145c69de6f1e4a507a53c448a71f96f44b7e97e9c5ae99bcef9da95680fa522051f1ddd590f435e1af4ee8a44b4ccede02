import {GlobalReferenceTracker} from './utils/global-reference-tracker.js';
import * as builtins from './utils/builtins.js';
import {
	switchCallExpressionToNewExpression,
	switchNewExpressionToCallExpression,
	fixSpaceAroundKeyword,
} from './fix/index.js';

const MESSAGE_ID_ERROR_DATE = 'error-date';
const MESSAGE_ID_SUGGESTION_DATE = 'suggestion-date';

const messages = {
	enforce: 'Use `new {{name}}()` instead of `{{name}}()`.',
	disallow: 'Use `{{name}}()` instead of `new {{name}}()`.',
	[MESSAGE_ID_ERROR_DATE]: 'Use `String(new Date())` instead of `Date()`.',
	[MESSAGE_ID_SUGGESTION_DATE]: 'Switch to `String(new Date())`.',
};

function enforceNewExpression({node, path: [name]}, sourceCode) {
	if (name === 'Object') {
		const {parent} = node;
		if (
			parent.type === 'BinaryExpression'
			&& (parent.operator === '===' || parent.operator === '!==')
			&& (parent.left === node || parent.right === node)
		) {
			return;
		}
	}

	// `Date()` returns a string representation of the current date and time, exactly as `new Date().toString()` does.
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date#return_value
	if (name === 'Date') {
		function * fix(fixer) {
			yield fixer.replaceText(node, 'String(new Date())');
			yield * fixSpaceAroundKeyword(fixer, node, sourceCode);
		}

		const problem = {
			node,
			messageId: MESSAGE_ID_ERROR_DATE,
		};

		if (sourceCode.getCommentsInside(node).length === 0 && node.arguments.length === 0) {
			problem.fix = fix;
		} else {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION_DATE,
					fix,
				},
			];
		}

		return problem;
	}

	return {
		node,
		messageId: 'enforce',
		data: {name},
		fix: fixer => switchCallExpressionToNewExpression(node, sourceCode, fixer),
	};
}

function enforceCallExpression({node, path: [name]}, sourceCode) {
	const problem = {
		node,
		messageId: 'disallow',
		data: {name},
	};

	if (name !== 'String' && name !== 'Boolean' && name !== 'Number') {
		problem.fix = function * (fixer) {
			yield * switchNewExpressionToCallExpression(node, sourceCode, fixer);
		};
	}

	return problem;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const newExpressionTracker = new GlobalReferenceTracker({
		objects: builtins.disallowNew,
		type: GlobalReferenceTracker.CONSTRUCT,
		handle: reference => enforceCallExpression(reference, sourceCode),
	});
	const callExpressionTracker = new GlobalReferenceTracker({
		objects: builtins.enforceNew,
		type: GlobalReferenceTracker.CALL,
		handle: reference => enforceNewExpression(reference, sourceCode),
	});

	return {
		* 'Program:exit'(program) {
			const scope = sourceCode.getScope(program);

			yield * newExpressionTracker.track(scope);
			yield * callExpressionTracker.track(scope);
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce the use of `new` for all builtins, except `String`, `Number`, `Boolean`, `Symbol` and `BigInt`.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
