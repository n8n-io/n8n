import {isNodeValueNotDomNode} from './utils/index.js';
import {isMethodCall, isStringLiteral, isNullLiteral} from './ast/index.js';

const MESSAGE_ID = 'prefer-query-selector';
const messages = {
	[MESSAGE_ID]: 'Prefer `.{{replacement}}()` over `.{{method}}()`.',
};

const disallowedIdentifierNames = new Map([
	['getElementById', 'querySelector'],
	['getElementsByClassName', 'querySelectorAll'],
	['getElementsByTagName', 'querySelectorAll'],
	['getElementsByName', 'querySelectorAll'],
]);

const getReplacementForId = value => `#${value}`;
const getReplacementForClass = value => value.match(/\S+/g).map(className => `.${className}`).join('');
const getReplacementForName = (value, originQuote) => `[name=${wrapQuoted(value, originQuote)}]`;

const getQuotedReplacement = (node, value) => {
	const leftQuote = node.raw.charAt(0);
	const rightQuote = node.raw.at(-1);
	return `${leftQuote}${value}${rightQuote}`;
};

const wrapQuoted = (value, originalQuote) => {
	switch (originalQuote) {
		case '\'': {
			return `"${value}"`;
		}

		case '"': {
			return `'${value}'`;
		}

		case '`': {
			return `'${value}'`;
		}

		// No default
	}
};

function * getLiteralFix(fixer, node, identifierName) {
	let replacement = node.raw;
	if (identifierName === 'getElementById') {
		replacement = getQuotedReplacement(node, getReplacementForId(node.value));
	}

	if (identifierName === 'getElementsByClassName') {
		replacement = getQuotedReplacement(node, getReplacementForClass(node.value));
	}

	if (identifierName === 'getElementsByName') {
		const quoted = node.raw.charAt(0);
		replacement = getQuotedReplacement(node, getReplacementForName(node.value, quoted));
	}

	yield fixer.replaceText(node, replacement);
}

function * getTemplateLiteralFix(fixer, node, identifierName) {
	yield fixer.insertTextAfter(node, '`');
	yield fixer.insertTextBefore(node, '`');

	for (const templateElement of node.quasis) {
		if (identifierName === 'getElementById') {
			yield fixer.replaceText(
				templateElement,
				getReplacementForId(templateElement.value.cooked),
			);
		}

		if (identifierName === 'getElementsByClassName') {
			yield fixer.replaceText(
				templateElement,
				getReplacementForClass(templateElement.value.cooked),
			);
		}

		if (identifierName === 'getElementsByName') {
			const quoted = node.raw ? node.raw.charAt(0) : '"';
			yield fixer.replaceText(
				templateElement,
				getReplacementForName(templateElement.value.cooked, quoted),
			);
		}
	}
}

const canBeFixed = node =>
	isNullLiteral(node)
	|| (isStringLiteral(node) && Boolean(node.value.trim()))
	|| (
		node.type === 'TemplateLiteral'
		&& node.expressions.length === 0
		&& node.quasis.some(templateElement => templateElement.value.cooked.trim())
	);

const hasValue = node => {
	if (node.type === 'Literal') {
		return node.value;
	}

	return true;
};

const fix = (node, identifierName, preferredSelector) => {
	const nodeToBeFixed = node.arguments[0];
	if (identifierName === 'getElementsByTagName' || !hasValue(nodeToBeFixed)) {
		return fixer => fixer.replaceText(node.callee.property, preferredSelector);
	}

	const getArgumentFix = nodeToBeFixed.type === 'Literal' ? getLiteralFix : getTemplateLiteralFix;
	return function * (fixer) {
		yield * getArgumentFix(fixer, nodeToBeFixed, identifierName);
		yield fixer.replaceText(node.callee.property, preferredSelector);
	};
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = () => ({
	CallExpression(node) {
		if (
			!isMethodCall(node, {
				methods: ['getElementById', 'getElementsByClassName', 'getElementsByTagName', 'getElementsByName'],
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
			|| isNodeValueNotDomNode(node.callee.object)
		) {
			return;
		}

		const method = node.callee.property.name;
		const preferredSelector = disallowedIdentifierNames.get(method);

		const problem = {
			node: node.callee.property,
			messageId: MESSAGE_ID,
			data: {
				replacement: preferredSelector,
				method,
			},
		};

		if (canBeFixed(node.arguments[0])) {
			problem.fix = fix(node, method, preferredSelector);
		}

		return problem;
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.querySelector()` over `.getElementById()`, `.querySelectorAll()` over `.getElementsByClassName()` and `.getElementsByTagName()` and `.getElementsByName()`.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
