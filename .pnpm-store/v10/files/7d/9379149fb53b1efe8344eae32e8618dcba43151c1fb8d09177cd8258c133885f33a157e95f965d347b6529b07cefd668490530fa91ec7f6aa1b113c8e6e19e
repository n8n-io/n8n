import {getStaticValue} from '@eslint-community/eslint-utils';
import regjsparser from 'regjsparser';
import escapeString from './utils/escape-string.js';
import {isRegexLiteral, isNewExpression, isMethodCall} from './ast/index.js';

const {parse: parseRegExp} = regjsparser;
const MESSAGE_ID_USE_REPLACE_ALL = 'method';
const MESSAGE_ID_USE_STRING = 'pattern';
const messages = {
	[MESSAGE_ID_USE_REPLACE_ALL]: 'Prefer `String#replaceAll()` over `String#replace()`.',
	[MESSAGE_ID_USE_STRING]: 'This pattern can be replaced with {{replacement}}.',
};

function getPatternReplacement(node) {
	if (!isRegexLiteral(node)) {
		return;
	}

	const {pattern, flags} = node.regex;
	if (flags.replace('u', '').replace('v', '') !== 'g') {
		return;
	}

	let tree;

	try {
		tree = parseRegExp(pattern, flags, {
			unicodePropertyEscape: flags.includes('u'),
			unicodeSet: flags.includes('v'),
			namedGroups: true,
			lookbehind: true,
		});
	} catch {
		return;
	}

	const parts = tree.type === 'alternative' ? tree.body : [tree];
	if (parts.some(part => part.type !== 'value')) {
		return;
	}

	// TODO: Preserve escape
	const string = String.fromCodePoint(...parts.map(part => part.codePoint));

	return escapeString(string);
}

const isRegExpWithGlobalFlag = (node, scope) => {
	if (isRegexLiteral(node)) {
		return node.regex.flags.includes('g');
	}

	if (
		isNewExpression(node, {name: 'RegExp'})
		&& node.arguments[0]?.type !== 'SpreadElement'
		&& node.arguments[1]?.type === 'Literal'
		&& typeof node.arguments[1].value === 'string'
	) {
		return node.arguments[1].value.includes('g');
	}

	const staticResult = getStaticValue(node, scope);

	// Don't know if there is `g` flag
	if (!staticResult) {
		return false;
	}

	const {value} = staticResult;
	return (
		Object.prototype.toString.call(value) === '[object RegExp]'
		&& value.global
	);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	CallExpression(node) {
		if (!isMethodCall(node, {
			methods: ['replace', 'replaceAll'],
			argumentsLength: 2,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const {
			arguments: [pattern],
			callee: {property},
		} = node;

		if (!isRegExpWithGlobalFlag(pattern, context.sourceCode.getScope(pattern))) {
			return;
		}

		const methodName = property.name;
		const patternReplacement = getPatternReplacement(pattern);

		if (methodName === 'replaceAll') {
			if (!patternReplacement) {
				return;
			}

			return {
				node: pattern,
				messageId: MESSAGE_ID_USE_STRING,
				data: {
					// Show `This pattern can be replaced with a string literal.` for long strings
					replacement: patternReplacement.length < 20 ? patternReplacement : 'a string literal',
				},
				/** @param {import('eslint').Rule.RuleFixer} fixer */
				fix: fixer => fixer.replaceText(pattern, patternReplacement),
			};
		}

		return {
			node: property,
			messageId: MESSAGE_ID_USE_REPLACE_ALL,
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			* fix(fixer) {
				yield fixer.insertTextAfter(property, 'All');

				if (!patternReplacement) {
					return;
				}

				yield fixer.replaceText(pattern, patternReplacement);
			},
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `String#replaceAll()` over regex searches with the global flag.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
