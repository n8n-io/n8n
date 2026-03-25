import {isMethodCall} from './ast/index.js';

const messages = {
	'error/charCodeAt': 'Prefer `String#codePointAt()` over `String#charCodeAt()`.',
	'error/fromCharCode': 'Prefer `String.fromCodePoint()` over `String.fromCharCode()`.',
	'suggestion/codePointAt': 'Use `String#codePointAt()`.',
	'suggestion/fromCodePoint': 'Use `String.fromCodePoint()`.',
};

const getReplacement = node => {
	if (isMethodCall(node, {
		method: 'charCodeAt',
		optionalCall: false,
		optionalMember: false,
	})) {
		return 'codePointAt';
	}

	if (isMethodCall(node, {
		object: 'String',
		method: 'fromCharCode',
		optionalCall: false,
		optionalMember: false,
	})) {
		return 'fromCodePoint';
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = () => ({
	CallExpression(node) {
		const replacement = getReplacement(node);

		if (!replacement) {
			return;
		}

		const method = node.callee.property;
		const methodName = method.name;
		const fix = fixer => fixer.replaceText(method, replacement);

		return {
			node: method,
			messageId: `error/${methodName}`,
			suggest: [
				{
					messageId: `suggestion/${replacement}`,
					fix,
				},
			],
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `String#codePointAt(…)` over `String#charCodeAt(…)` and `String.fromCodePoint(…)` over `String.fromCharCode(…)`.',
			recommended: true,
		},
		hasSuggestions: true,
		messages,
	},
};

export default config;
