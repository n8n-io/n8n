import { atRuleParamIndex, declarationValueIndex } from '../../utils/nodeFieldIndices.mjs';
import functionArgumentsSearch from '../../utils/functionArgumentsSearch.mjs';
import getAtRuleParams from '../../utils/getAtRuleParams.mjs';
import getDeclarationValue from '../../utils/getDeclarationValue.mjs';
import isStandardSyntaxDeclaration from '../../utils/isStandardSyntaxDeclaration.mjs';
import isStandardSyntaxUrl from '../../utils/isStandardSyntaxUrl.mjs';
import optionsMatches from '../../utils/optionsMatches.mjs';
import report from '../../utils/report.mjs';
import ruleMessages from '../../utils/ruleMessages.mjs';
import validateOptions from '../../utils/validateOptions.mjs';

const ruleName = 'function-url-quotes';

const messages = ruleMessages(ruleName, {
	expected: (functionName) => `Expected quotes around "${functionName}" function argument`,
	rejected: (functionName) => `Unexpected quotes around "${functionName}" function argument`,
});

const meta = {
	url: 'https://stylelint.io/user-guide/rules/function-url-quotes',
	fixable: true,
};

const URL_FUNC_REGEX = /url\(/i;

/** @import { Problem, CoreRules } from 'stylelint' */
/** @import { FunctionNode, ParsedValue } from 'postcss-value-parser' */
/** @import { AtRule, Declaration } from 'postcss' */

/** @type {CoreRules[ruleName]} */
const rule = (primary, secondaryOptions) => {
	return (root, result) => {
		const validOptions = validateOptions(
			result,
			ruleName,
			{
				actual: primary,
				possible: ['always', 'never'],
			},
			{
				actual: secondaryOptions,
				possible: {
					except: ['empty'],
				},
				optional: true,
			},
		);

		if (!validOptions) {
			return;
		}

		const exceptEmpty = optionsMatches(secondaryOptions, 'except', 'empty');
		const emptyArgumentPatterns = new Set(['', "''", '""']);

		root.walkAtRules(checkAtRuleParams);
		root.walkDecls(checkDeclParams);

		/**
		 * @param {Declaration|AtRule} node
		 * @param {FunctionNode} fn
		 * @param {keyof messages} messageType
		 * @param {ParsedValue} parsedValue
		 */
		function getFix(node, fn, messageType, parsedValue) {
			return () => {
				switch (messageType) {
					case 'expected':
						addQuotes(fn);
						break;
					case 'rejected':
						removeQuotes(fn);
						break;
				}

				switch (node.type) {
					case 'decl':
						node.value = parsedValue.toString();
						break;
					case 'atrule':
						node.params = parsedValue.toString();
						break;
				}
			};
		}

		/**
		 * @param {AtRule|Declaration} node
		 * @param {string} source
		 * @param {number} startIndex
		 */
		function complain(node, source, startIndex) {
			functionArgumentsSearch(source, /^url$/i, (args, index, funcNode, parsedValue) => {
				const object = checkArgs(args, startIndex + index);

				if (object) {
					const { messageType, ...rest } = object;
					const message = messages[messageType];
					const messageArgs = [funcNode.value.toLowerCase()];
					const fix = getFix(node, funcNode, messageType, parsedValue);

					report({
						...rest,
						node,
						fix: { apply: fix, node },
						message,
						messageArgs,
						result,
						ruleName,
					});
				}
			});
		}

		/** @param {Declaration} decl */
		function checkDeclParams(decl) {
			if (!URL_FUNC_REGEX.test(decl.value)) return;

			if (!isStandardSyntaxDeclaration(decl)) return;

			const value = getDeclarationValue(decl);
			const startIndex = declarationValueIndex(decl);

			complain(decl, value, startIndex);
		}

		/** @param {AtRule} atRule */
		function checkAtRuleParams(atRule) {
			const params = getAtRuleParams(atRule);
			const startIndex = atRuleParamIndex(atRule);

			complain(atRule, params, startIndex);
		}

		/** @param {FunctionNode} funcNode */
		function addQuotes(funcNode) {
			for (const argNode of funcNode.nodes) {
				if (argNode.type === 'word') {
					argNode.value = `"${argNode.value}"`;
				}
			}
		}

		/** @param {FunctionNode} funcNode */
		function removeQuotes(funcNode) {
			for (const argNode of funcNode.nodes) {
				if (argNode.type === 'string') {
					// NOTE: We can ignore this error because the test passes.
					// @ts-expect-error -- TS2322: Type '"word"' is not assignable to type '"string"'.
					argNode.type = 'word';
				}
			}
		}

		/**
		 * @param {string} args
		 * @param {number} index
		 * @returns {Pick<Problem, 'index' | 'endIndex'> & { messageType: keyof messages } | undefined}
		 */
		function checkArgs(args, index) {
			const leftTrimmedArgs = args.trimStart();

			if (!isStandardSyntaxUrl(leftTrimmedArgs)) return;

			let expectQuotes = primary === 'always';

			if (exceptEmpty && emptyArgumentPatterns.has(args.trim())) {
				expectQuotes = !expectQuotes;
			}

			const hasQuotes = leftTrimmedArgs.startsWith("'") || leftTrimmedArgs.startsWith('"');

			if (expectQuotes && hasQuotes) return;

			if (!expectQuotes && !hasQuotes) return;

			const messageType = expectQuotes ? 'expected' : 'rejected';
			const reportIndex = index + args.length - leftTrimmedArgs.length;
			const reportEndIndex = index + args.length;

			return {
				messageType,
				index: reportIndex,
				endIndex: reportEndIndex,
			};
		}
	};
};

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;
export default rule;
