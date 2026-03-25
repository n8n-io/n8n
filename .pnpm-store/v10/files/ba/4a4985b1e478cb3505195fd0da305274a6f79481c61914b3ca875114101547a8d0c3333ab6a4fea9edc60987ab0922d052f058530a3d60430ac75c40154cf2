import {getStaticValue, isCommaToken, hasSideEffect} from '@eslint-community/eslint-utils';
import {
	getParenthesizedRange,
	getParenthesizedText,
	needsSemicolon,
	isNodeMatches,
	isMethodNamed,
	hasOptionalChainElement,
} from './utils/index.js';
import {removeMethodCall} from './fix/index.js';
import {isLiteral, isMethodCall} from './ast/index.js';

const ERROR_ARRAY_FROM = 'array-from';
const ERROR_ARRAY_CONCAT = 'array-concat';
const ERROR_ARRAY_SLICE = 'array-slice';
const ERROR_ARRAY_TO_SPLICED = 'array-to-spliced';
const ERROR_STRING_SPLIT = 'string-split';
const SUGGESTION_CONCAT_ARGUMENT_IS_SPREADABLE = 'argument-is-spreadable';
const SUGGESTION_CONCAT_ARGUMENT_IS_NOT_SPREADABLE = 'argument-is-not-spreadable';
const SUGGESTION_CONCAT_TEST_ARGUMENT = 'test-argument';
const SUGGESTION_CONCAT_SPREAD_ALL_ARGUMENTS = 'spread-all-arguments';
const SUGGESTION_USE_SPREAD = 'use-spread';
const messages = {
	[ERROR_ARRAY_FROM]: 'Prefer the spread operator over `Array.from(…)`.',
	[ERROR_ARRAY_CONCAT]: 'Prefer the spread operator over `Array#concat(…)`.',
	[ERROR_ARRAY_SLICE]: 'Prefer the spread operator over `Array#slice()`.',
	[ERROR_ARRAY_TO_SPLICED]: 'Prefer the spread operator over `Array#toSpliced()`.',
	[ERROR_STRING_SPLIT]: 'Prefer the spread operator over `String#split(\'\')`.',
	[SUGGESTION_CONCAT_ARGUMENT_IS_SPREADABLE]: 'First argument is an `array`.',
	[SUGGESTION_CONCAT_ARGUMENT_IS_NOT_SPREADABLE]: 'First argument is not an `array`.',
	[SUGGESTION_CONCAT_TEST_ARGUMENT]: 'Test first argument with `Array.isArray(…)`.',
	[SUGGESTION_CONCAT_SPREAD_ALL_ARGUMENTS]: 'Spread all unknown arguments`.',
	[SUGGESTION_USE_SPREAD]: 'Use `...` operator.',
};

const ignoredSliceCallee = [
	'arrayBuffer',
	'blob',
	'buffer',
	'file',
	'this',
];

const isArrayLiteral = node => node.type === 'ArrayExpression';
const isArrayLiteralHasTrailingComma = (node, sourceCode) => {
	if (node.elements.length === 0) {
		return false;
	}

	return isCommaToken(sourceCode.getLastToken(node, 1));
};

function fixConcat(node, sourceCode, fixableArguments) {
	const array = node.callee.object;
	const concatCallArguments = node.arguments;
	const arrayParenthesizedRange = getParenthesizedRange(array, sourceCode);
	const arrayIsArrayLiteral = isArrayLiteral(array);
	const arrayHasTrailingComma = arrayIsArrayLiteral && isArrayLiteralHasTrailingComma(array, sourceCode);

	const getArrayLiteralElementsText = (node, keepTrailingComma) => {
		if (
			!keepTrailingComma
			&& isArrayLiteralHasTrailingComma(node, sourceCode)
		) {
			const start = sourceCode.getRange(node)[0] + 1;
			const [end] = sourceCode.getRange(sourceCode.getLastToken(node, 1));
			return sourceCode.text.slice(start, end);
		}

		return sourceCode.getText(node, -1, -1);
	};

	const getFixedText = () => {
		const nonEmptyArguments = fixableArguments
			.filter(({node, isArrayLiteral}) => (!isArrayLiteral || node.elements.length > 0));
		const lastArgument = nonEmptyArguments.at(-1);

		let text = nonEmptyArguments
			.map(({node, isArrayLiteral, isSpreadable, testArgument}) => {
				if (isArrayLiteral) {
					return getArrayLiteralElementsText(node, node === lastArgument.node);
				}

				let text = getParenthesizedText(node, sourceCode);

				if (testArgument) {
					return `...(Array.isArray(${text}) ? ${text} : [${text}])`;
				}

				if (isSpreadable) {
					text = `...${text}`;
				}

				return text || ' ';
			})
			.join(', ');

		if (!text) {
			return '';
		}

		if (arrayIsArrayLiteral) {
			if (array.elements.length > 0) {
				text = ` ${text}`;

				if (!arrayHasTrailingComma) {
					text = `,${text}`;
				}

				if (
					arrayHasTrailingComma
					&& (!lastArgument.isArrayLiteral || !isArrayLiteralHasTrailingComma(lastArgument.node, sourceCode))
				) {
					text = `${text},`;
				}
			}
		} else {
			text = `, ${text}`;
		}

		return text;
	};

	function removeArguments(fixer) {
		const [firstArgument] = concatCallArguments;
		const lastArgument = concatCallArguments[fixableArguments.length - 1];

		const [start] = getParenthesizedRange(firstArgument, sourceCode);
		let [, end] = sourceCode.getRange(sourceCode.getTokenAfter(lastArgument, isCommaToken));

		const textAfter = sourceCode.text.slice(end);
		const [leadingSpaces] = textAfter.match(/^\s*/);
		end += leadingSpaces.length;

		return fixer.removeRange([start, end]);
	}

	return function * (fixer) {
		// Fixed code always starts with `[`
		if (
			!arrayIsArrayLiteral
			&& needsSemicolon(sourceCode.getTokenBefore(node), sourceCode, '[')
		) {
			yield fixer.insertTextBefore(node, ';');
		}

		if (concatCallArguments.length - fixableArguments.length === 0) {
			yield * removeMethodCall(fixer, node, sourceCode);
		} else {
			yield removeArguments(fixer);
		}

		const text = getFixedText();

		if (arrayIsArrayLiteral) {
			const closingBracketToken = sourceCode.getLastToken(array);
			yield fixer.insertTextBefore(closingBracketToken, text);
		} else {
			// The array is already accessing `.concat`, there should not any case need add extra `()`
			yield fixer.insertTextBeforeRange(arrayParenthesizedRange, '[...');
			yield fixer.insertTextAfterRange(arrayParenthesizedRange, text);
			yield fixer.insertTextAfterRange(arrayParenthesizedRange, ']');
		}
	};
}

const getConcatArgumentSpreadable = (node, scope) => {
	if (node.type === 'SpreadElement') {
		return;
	}

	if (isArrayLiteral(node)) {
		return {node, isArrayLiteral: true};
	}

	const result = getStaticValue(node, scope);

	if (!result) {
		return;
	}

	const isSpreadable = Array.isArray(result.value);

	return {node, isSpreadable};
};

function getConcatFixableArguments(argumentsList, scope) {
	const fixableArguments = [];

	for (const node of argumentsList) {
		const result = getConcatArgumentSpreadable(node, scope);

		if (result) {
			fixableArguments.push(result);
		} else {
			break;
		}
	}

	return fixableArguments;
}

function fixArrayFrom(node, sourceCode) {
	const [object] = node.arguments;

	function getObjectText() {
		if (isArrayLiteral(object)) {
			return sourceCode.getText(object);
		}

		const [start, end] = getParenthesizedRange(object, sourceCode);
		const text = sourceCode.text.slice(start, end);

		return `[...${text}]`;
	}

	return function * (fixer) {
		// Fixed code always starts with `[`
		if (needsSemicolon(sourceCode.getTokenBefore(node), sourceCode, '[')) {
			yield fixer.insertTextBefore(node, ';');
		}

		const objectText = getObjectText();

		yield fixer.replaceText(node, objectText);
	};
}

function methodCallToSpread(node, sourceCode) {
	return function * (fixer) {
		// Fixed code always starts with `[`
		if (needsSemicolon(sourceCode.getTokenBefore(node), sourceCode, '[')) {
			yield fixer.insertTextBefore(node, ';');
		}

		yield fixer.insertTextBefore(node, '[...');
		yield fixer.insertTextAfter(node, ']');

		// The array is already accessing `.slice` or `.split`, there should not any case need add extra `()`

		yield * removeMethodCall(fixer, node, sourceCode);
	};
}

function isClassName(node) {
	if (node.type === 'MemberExpression') {
		node = node.property;
	}

	if (node.type !== 'Identifier') {
		return false;
	}

	const {name} = node;

	return /^[A-Z]./.test(name) && name.toUpperCase() !== name;
}

function isNotArray(node, scope) {
	if (
		node.type === 'TemplateLiteral'
		|| node.type === 'Literal'
		|| node.type === 'BinaryExpression'
		|| isClassName(node)
		// `foo.join()`
		|| (isMethodNamed(node, 'join') && node.arguments.length <= 1)
	) {
		return true;
	}

	const staticValue = getStaticValue(node, scope);
	if (staticValue && !Array.isArray(staticValue.value)) {
		return true;
	}

	return false;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	// `Array.from()`
	context.on('CallExpression', node => {
		if (
			isMethodCall(node, {
				object: 'Array',
				method: 'from',
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
			// Allow `Array.from({length})`
			&& node.arguments[0].type !== 'ObjectExpression'
		) {
			return {
				node,
				messageId: ERROR_ARRAY_FROM,
				fix: fixArrayFrom(node, sourceCode),
			};
		}
	});

	// `array.concat()`
	context.on('CallExpression', node => {
		if (!isMethodCall(node, {
			method: 'concat',
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const {object} = node.callee;
		const scope = sourceCode.getScope(object);

		if (isNotArray(object, scope)) {
			return;
		}

		const staticResult = getStaticValue(object, scope);
		if (staticResult && !Array.isArray(staticResult.value)) {
			return;
		}

		const problem = {
			node: node.callee.property,
			messageId: ERROR_ARRAY_CONCAT,
		};

		const fixableArguments = getConcatFixableArguments(node.arguments, scope);

		if (fixableArguments.length > 0 || node.arguments.length === 0) {
			problem.fix = fixConcat(node, sourceCode, fixableArguments);
			return problem;
		}

		const [firstArgument, ...restArguments] = node.arguments;
		if (firstArgument.type === 'SpreadElement') {
			return problem;
		}

		const fixableArgumentsAfterFirstArgument = getConcatFixableArguments(restArguments, scope);
		const suggestions = [
			{
				messageId: SUGGESTION_CONCAT_ARGUMENT_IS_SPREADABLE,
				isSpreadable: true,
			},
			{
				messageId: SUGGESTION_CONCAT_ARGUMENT_IS_NOT_SPREADABLE,
				isSpreadable: false,
			},
		];

		if (!hasSideEffect(firstArgument, sourceCode)) {
			suggestions.push({
				messageId: SUGGESTION_CONCAT_TEST_ARGUMENT,
				testArgument: true,
			});
		}

		problem.suggest = suggestions.map(({messageId, isSpreadable, testArgument}) => ({
			messageId,
			fix: fixConcat(
				node,
				sourceCode,
				// When apply suggestion, we also merge fixable arguments after the first one
				[
					{
						node: firstArgument,
						isSpreadable,
						testArgument,
					},
					...fixableArgumentsAfterFirstArgument,
				],
			),
		}));

		if (
			fixableArgumentsAfterFirstArgument.length < restArguments.length
			&& restArguments.every(({type}) => type !== 'SpreadElement')
		) {
			problem.suggest.push({
				messageId: SUGGESTION_CONCAT_SPREAD_ALL_ARGUMENTS,
				fix: fixConcat(
					node,
					sourceCode,
					node.arguments.map(node => getConcatArgumentSpreadable(node, scope) || {node, isSpreadable: true}),
				),
			});
		}

		return problem;
	});

	// `array.slice()`
	context.on('CallExpression', node => {
		if (!(
			isMethodCall(node, {
				method: 'slice',
				minimumArguments: 0,
				maximumArguments: 1,
				optionalCall: false,
				optionalMember: false,
			})
			&& !isArrayLiteral(node.callee.object)
			&& !hasOptionalChainElement(node.callee.object)
		)) {
			return;
		}

		if (isNodeMatches(node.callee.object, ignoredSliceCallee)) {
			return;
		}

		const [firstArgument] = node.arguments;
		if (firstArgument && !isLiteral(firstArgument, 0)) {
			return;
		}

		return {
			node: node.callee.property,
			messageId: ERROR_ARRAY_SLICE,
			fix: methodCallToSpread(node, sourceCode),
		};
	});

	// `array.toSpliced()`
	context.on('CallExpression', node => {
		if (!(
			isMethodCall(node, {
				method: 'toSpliced',
				argumentsLength: 0,
				optionalCall: false,
				optionalMember: false,
			})
			&& node.callee.object.type !== 'ArrayExpression'
		)) {
			return;
		}

		return {
			node: node.callee.property,
			messageId: ERROR_ARRAY_TO_SPLICED,
			fix: methodCallToSpread(node, sourceCode),
		};
	});

	// `string.split()`
	context.on('CallExpression', node => {
		if (!isMethodCall(node, {
			method: 'split',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const [separator] = node.arguments;
		if (!isLiteral(separator, '')) {
			return;
		}

		const string = node.callee.object;
		const staticValue = getStaticValue(string, sourceCode.getScope(string));
		let hasSameResult = false;
		if (staticValue) {
			const {value} = staticValue;

			if (typeof value !== 'string') {
				return;
			}

			// eslint-disable-next-line unicorn/prefer-spread
			const resultBySplit = value.split('');
			const resultBySpread = [...value];

			hasSameResult = resultBySplit.length === resultBySpread.length
				&& resultBySplit.every((character, index) => character === resultBySpread[index]);
		}

		const problem = {
			node: node.callee.property,
			messageId: ERROR_STRING_SPLIT,
		};

		if (hasSameResult) {
			problem.fix = methodCallToSpread(node, sourceCode);
		} else {
			problem.suggest = [
				{
					messageId: SUGGESTION_USE_SPREAD,
					fix: methodCallToSpread(node, sourceCode),
				},
			];
		}

		return problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer the spread operator over `Array.from(…)`, `Array#concat(…)`, `Array#{slice,toSpliced}()` and `String#split(\'\')`.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
