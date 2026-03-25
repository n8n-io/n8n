import {isParenthesized, getStaticValue} from '@eslint-community/eslint-utils';
import escapeString from './utils/escape-string.js';
import shouldAddParenthesesToMemberExpressionObject from './utils/should-add-parentheses-to-member-expression-object.js';
import shouldAddParenthesesToLogicalExpressionChild from './utils/should-add-parentheses-to-logical-expression-child.js';
import {getParenthesizedText, getParenthesizedRange} from './utils/parentheses.js';
import {isMethodCall, isRegexLiteral} from './ast/index.js';

const MESSAGE_STARTS_WITH = 'prefer-starts-with';
const MESSAGE_ENDS_WITH = 'prefer-ends-with';
const FIX_TYPE_STRING_CASTING = 'useStringCasting';
const FIX_TYPE_OPTIONAL_CHAINING = 'useOptionalChaining';
const FIX_TYPE_NULLISH_COALESCING = 'useNullishCoalescing';
const messages = {
	[MESSAGE_STARTS_WITH]: 'Prefer `String#startsWith()` over a regex with `^`.',
	[MESSAGE_ENDS_WITH]: 'Prefer `String#endsWith()` over a regex with `$`.',
	[FIX_TYPE_STRING_CASTING]: 'Convert to string `String(…).{{method}}()`.',
	[FIX_TYPE_OPTIONAL_CHAINING]: 'Use optional chaining `…?.{{method}}()`.',
	[FIX_TYPE_NULLISH_COALESCING]: 'Use nullish coalescing `(… ?? \'\').{{method}}()`.',
};

const doesNotContain = (string, characters) => characters.every(character => !string.includes(character));
const isSimpleString = string => doesNotContain(
	string,
	['^', '$', '+', '[', '{', '(', '\\', '.', '?', '*', '|'],
);
const addParentheses = text => `(${text})`;

const checkRegex = ({pattern, flags}) => {
	if (flags.includes('i') || flags.includes('m')) {
		return;
	}

	if (pattern.startsWith('^')) {
		const string = pattern.slice(1);

		if (isSimpleString(string)) {
			return {
				messageId: MESSAGE_STARTS_WITH,
				string,
			};
		}
	}

	if (pattern.endsWith('$')) {
		const string = pattern.slice(0, -1);

		if (isSimpleString(string)) {
			return {
				messageId: MESSAGE_ENDS_WITH,
				string,
			};
		}
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	return {
		CallExpression(node) {
			if (
				!isMethodCall(node, {
					method: 'test',
					argumentsLength: 1,
					optionalCall: false,
					optionalMember: false,
				})
				|| !isRegexLiteral(node.callee.object)
			) {
				return;
			}

			const regexNode = node.callee.object;
			const {regex} = regexNode;
			const result = checkRegex(regex);
			if (!result) {
				return;
			}

			const [target] = node.arguments;
			const method = result.messageId === MESSAGE_STARTS_WITH ? 'startsWith' : 'endsWith';

			let isString = target.type === 'TemplateLiteral'
				|| (
					target.type === 'CallExpression'
					&& target.callee.type === 'Identifier'
					&& target.callee.name === 'String'
				);
			let isNonString = false;
			if (!isString) {
				const staticValue = getStaticValue(target, sourceCode.getScope(target));

				if (staticValue) {
					isString = typeof staticValue.value === 'string';
					isNonString = !isString;
				}
			}

			const problem = {
				node,
				messageId: result.messageId,
			};

			function * fix(fixer, fixType) {
				let targetText = getParenthesizedText(target, sourceCode);
				const isRegexParenthesized = isParenthesized(regexNode, sourceCode);
				const isTargetParenthesized = isParenthesized(target, sourceCode);

				switch (fixType) {
					// Goal: `(target ?? '').startsWith(pattern)`
					case FIX_TYPE_NULLISH_COALESCING: {
						if (
							!isTargetParenthesized
							&& shouldAddParenthesesToLogicalExpressionChild(target, {operator: '??', property: 'left'})
						) {
							targetText = addParentheses(targetText);
						}

						targetText += ' ?? \'\'';

						// `LogicalExpression` need add parentheses to call `.startsWith()`,
						// but if regex is parenthesized, we can reuse it
						if (!isRegexParenthesized) {
							targetText = addParentheses(targetText);
						}

						break;
					}

					// Goal: `String(target).startsWith(pattern)`
					case FIX_TYPE_STRING_CASTING: {
						// `target` was a call argument, don't need check parentheses
						targetText = `String(${targetText})`;
						// `CallExpression` don't need add parentheses to call `.startsWith()`
						break;
					}

					// Goal: `target.startsWith(pattern)` or `target?.startsWith(pattern)`
					case FIX_TYPE_OPTIONAL_CHAINING: {
						// Optional chaining: `target.startsWith` => `target?.startsWith`
						yield fixer.replaceText(sourceCode.getTokenBefore(node.callee.property), '?.');
					}

					// Fallthrough
					default: {
						if (
							!isRegexParenthesized
							&& !isTargetParenthesized
							&& shouldAddParenthesesToMemberExpressionObject(target, sourceCode)
						) {
							targetText = addParentheses(targetText);
						}
					}
				}

				// The regex literal always starts with `/` or `(`, so we don't need check ASI

				// Replace regex with string
				yield fixer.replaceText(regexNode, targetText);

				// `.test` => `.startsWith` / `.endsWith`
				yield fixer.replaceText(node.callee.property, method);

				// Replace argument with result.string
				yield fixer.replaceTextRange(getParenthesizedRange(target, sourceCode), escapeString(result.string));
			}

			if (isString || !isNonString) {
				problem.fix = fix;
			}

			if (!isString) {
				problem.suggest = [
					FIX_TYPE_STRING_CASTING,
					FIX_TYPE_OPTIONAL_CHAINING,
					FIX_TYPE_NULLISH_COALESCING,
				].map(type => ({messageId: type, data: {method}, fix: fixer => fix(fixer, type)}));
			}

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
			description: 'Prefer `String#startsWith()` & `String#endsWith()` over `RegExp#test()`.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
