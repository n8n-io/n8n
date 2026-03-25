import {findVariable, getStaticValue, getPropertyName} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {removeArgument} from './fix/index.js';

const MESSAGE_ID = 'prefer-json-parse-buffer';
const messages = {
	[MESSAGE_ID]: 'Prefer reading the JSON file as a buffer.',
};

const getAwaitExpressionArgument = node => {
	while (node.type === 'AwaitExpression') {
		node = node.argument;
	}

	return node;
};

function getIdentifierDeclaration(node, scope) {
	if (!node) {
		return;
	}

	node = getAwaitExpressionArgument(node);

	if (!node || node.type !== 'Identifier') {
		return node;
	}

	const variable = findVariable(scope, node);
	if (!variable) {
		return;
	}

	const {identifiers, references} = variable;

	if (identifiers.length !== 1 || references.length !== 2) {
		return;
	}

	const [identifier] = identifiers;

	if (
		identifier.parent.type !== 'VariableDeclarator'
		|| identifier.parent.id !== identifier
	) {
		return;
	}

	return getIdentifierDeclaration(identifier.parent.init, variable.scope);
}

const isUtf8EncodingStringNode = (node, scope) =>
	isUtf8EncodingString(getStaticValue(node, scope)?.value);

const isUtf8EncodingString = value => {
	if (typeof value !== 'string') {
		return false;
	}

	value = value.toLowerCase();

	// eslint-disable-next-line unicorn/text-encoding-identifier-case
	return value === 'utf8' || value === 'utf-8';
};

function isUtf8Encoding(node, scope) {
	if (
		node.type === 'ObjectExpression'
		&& node.properties.length === 1
		&& node.properties[0].type === 'Property'
		&& getPropertyName(node.properties[0], scope) === 'encoding'
		&& isUtf8EncodingStringNode(node.properties[0].value, scope)
	) {
		return true;
	}

	if (isUtf8EncodingStringNode(node, scope)) {
		return true;
	}

	const staticValue = getStaticValue(node, scope);
	if (!staticValue) {
		return false;
	}

	const {value} = staticValue;
	if (
		typeof value === 'object'
		&& Object.keys(value).length === 1
		&& isUtf8EncodingString(value.encoding)
	) {
		return true;
	}

	return false;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	CallExpression(callExpression) {
		if (!(isMethodCall(callExpression, {
			object: 'JSON',
			method: 'parse',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		}))) {
			return;
		}

		let [node] = callExpression.arguments;
		const {sourceCode} = context;
		const scope = sourceCode.getScope(node);
		node = getIdentifierDeclaration(node, scope);
		if (
			!(
				node
				&& node.type === 'CallExpression'
				&& !node.optional
				&& node.arguments.length === 2
				&& !node.arguments.some(node => node.type === 'SpreadElement')
				&& node.callee.type === 'MemberExpression'
				&& !node.callee.optional
			)
		) {
			return;
		}

		const method = getPropertyName(node.callee, scope);
		if (method !== 'readFile' && method !== 'readFileSync') {
			return;
		}

		const [, charsetNode] = node.arguments;
		if (!isUtf8Encoding(charsetNode, scope)) {
			return;
		}

		return {
			node: charsetNode,
			messageId: MESSAGE_ID,
			fix: fixer => removeArgument(fixer, charsetNode, sourceCode),
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer reading a JSON file as a buffer.',
			recommended: false,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
