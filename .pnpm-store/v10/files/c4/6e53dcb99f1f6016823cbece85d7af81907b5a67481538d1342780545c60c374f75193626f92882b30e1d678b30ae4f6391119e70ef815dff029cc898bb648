import {getStaticValue} from '@eslint-community/eslint-utils';
import {isNewExpression, isStringLiteral} from './ast/index.js';

const MESSAGE_ID_NEVER = 'never';
const MESSAGE_ID_ALWAYS = 'always';
const MESSAGE_ID_REMOVE = 'remove';
const messages = {
	[MESSAGE_ID_NEVER]: 'Remove the `./` prefix from the relative URL.',
	[MESSAGE_ID_ALWAYS]: 'Add a `./` prefix to the relative URL.',
	[MESSAGE_ID_REMOVE]: 'Remove leading `./`.',
};

const DOT_SLASH = './';
const TEST_URL_BASES = [
	'https://example.com/a/b/',
	'https://example.com/a/b.html',
];
const isSafeToAddDotSlashToUrl = (url, base) => {
	try {
		return new URL(url, base).href === new URL(DOT_SLASH + url, base).href;
	} catch {}

	return false;
};

const isSafeToAddDotSlash = (url, bases = TEST_URL_BASES) => bases.every(base => isSafeToAddDotSlashToUrl(url, base));
const isSafeToRemoveDotSlash = (url, bases = TEST_URL_BASES) => bases.every(base => isSafeToAddDotSlashToUrl(url.slice(DOT_SLASH.length), base));

function canAddDotSlash(node, sourceCode) {
	const url = node.value;
	if (url.startsWith(DOT_SLASH) || url.startsWith('.') || url.startsWith('/')) {
		return false;
	}

	const baseNode = node.parent.arguments[1];
	const staticValueResult = getStaticValue(baseNode, sourceCode.getScope(node));

	if (
		typeof staticValueResult?.value === 'string'
		&& isSafeToAddDotSlash(url, [staticValueResult.value])
	) {
		return true;
	}

	return isSafeToAddDotSlash(url);
}

function canRemoveDotSlash(node, sourceCode) {
	const rawValue = node.raw.slice(1, -1);
	if (!rawValue.startsWith(DOT_SLASH)) {
		return false;
	}

	const baseNode = node.parent.arguments[1];
	const staticValueResult = getStaticValue(baseNode, sourceCode.getScope(node));

	if (
		typeof staticValueResult?.value === 'string'
		&& isSafeToRemoveDotSlash(node.value, [staticValueResult.value])
	) {
		return true;
	}

	return isSafeToRemoveDotSlash(node.value);
}

function addDotSlash(node, sourceCode) {
	if (!canAddDotSlash(node, sourceCode)) {
		return;
	}

	const insertPosition = sourceCode.getRange(node)[0] + 1; // After quote
	return fixer => fixer.insertTextAfterRange([insertPosition, insertPosition], DOT_SLASH);
}

function removeDotSlash(node, sourceCode) {
	if (!canRemoveDotSlash(node, sourceCode)) {
		return;
	}

	const start = sourceCode.getRange(node)[0] + 1; // After quote
	return fixer => fixer.removeRange([start, start + 2]);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const style = context.options[0] || 'never';

	const listeners = {};

	// TemplateLiteral are not always safe to remove `./`, but if it's starts with `./` we'll report
	if (style === 'never') {
		listeners.TemplateLiteral = function (node) {
			if (!(
				isNewExpression(node.parent, {name: 'URL', argumentsLength: 2})
				&& node.parent.arguments[0] === node
			)) {
				return;
			}

			const firstPart = node.quasis[0];
			if (!firstPart.value.raw.startsWith(DOT_SLASH)) {
				return;
			}

			return {
				node,
				messageId: style,
				suggest: [
					{
						messageId: MESSAGE_ID_REMOVE,
						fix(fixer) {
							const start = context.sourceCode.getRange(firstPart)[0] + 1;
							return fixer.removeRange([start, start + DOT_SLASH.length]);
						},
					},
				],
			};
		};
	}

	listeners.Literal = function (node) {
		if (!(
			isStringLiteral(node)
			&& isNewExpression(node.parent, {name: 'URL', argumentsLength: 2})
			&& node.parent.arguments[0] === node
		)) {
			return;
		}

		const {sourceCode} = context;
		const fix = (style === 'never' ? removeDotSlash : addDotSlash)(node, sourceCode);

		if (!fix) {
			return;
		}

		return {
			node,
			messageId: style,
			fix,
		};
	};

	return listeners;
};

const schema = [
	{
		enum: ['never', 'always'],
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce consistent relative URL style.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		defaultOptions: ['never'],
		messages,
	},
};

export default config;
