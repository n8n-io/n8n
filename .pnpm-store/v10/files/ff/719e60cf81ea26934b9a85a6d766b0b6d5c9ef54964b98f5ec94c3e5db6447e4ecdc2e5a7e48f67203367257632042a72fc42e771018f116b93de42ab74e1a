import {findVariable} from '@eslint-community/eslint-utils';
import {getAncestor} from './utils/index.js';
import {isStaticRequire, isStringLiteral, isMemberExpression} from './ast/index.js';

const MESSAGE_ID = 'prefer-event-target';
const messages = {
	[MESSAGE_ID]: 'Prefer `EventTarget` over `EventEmitter`.',
};

const packagesShouldBeIgnored = new Set([
	'@angular/core',
	'eventemitter3',
]);

const isConstVariableDeclarationId = node =>
	node.parent.type === 'VariableDeclarator'
	&& node.parent.id === node
	&& node.parent.parent.type === 'VariableDeclaration'
	&& node.parent.parent.kind === 'const'
	&& node.parent.parent.declarations.includes(node.parent);

function isAwaitImportOrRequireFromIgnoredPackages(node) {
	if (!node) {
		return false;
	}

	let source;
	if (isStaticRequire(node)) {
		[source] = node.arguments;
	} else if (node.type === 'AwaitExpression' && node.argument.type === 'ImportExpression') {
		({source} = node.argument);
	}

	if (isStringLiteral(source) && packagesShouldBeIgnored.has(source.value)) {
		return true;
	}

	return false;
}

function isFromIgnoredPackage(node) {
	if (!node) {
		return false;
	}

	const importDeclaration = getAncestor(node, 'ImportDeclaration');
	if (packagesShouldBeIgnored.has(importDeclaration?.source.value)) {
		return true;
	}

	// `const {EventEmitter} = ...`
	if (
		node.parent.type === 'Property'
		&& node.parent.value === node
		&& node.parent.key.type === 'Identifier'
		&& node.parent.key.name === 'EventEmitter'
		&& node.parent.parent.type === 'ObjectPattern'
		&& node.parent.parent.properties.includes(node.parent)
		&& isConstVariableDeclarationId(node.parent.parent)
		&& isAwaitImportOrRequireFromIgnoredPackages(node.parent.parent.parent.init)
	) {
		return true;
	}

	// `const EventEmitter = (...).EventEmitter`
	if (
		isConstVariableDeclarationId(node)
		&& isMemberExpression(node.parent.init, {property: 'EventEmitter', optional: false, computed: false})
		&& isAwaitImportOrRequireFromIgnoredPackages(node.parent.init.object)
	) {
		return true;
	}

	return false;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	Identifier(node) {
		if (!(
			node.name === 'EventEmitter'
			&& (
				(
					(node.parent.type === 'ClassDeclaration' || node.parent.type === 'ClassExpression')
					&& node.parent.superClass === node
				)
				|| (node.parent.type === 'NewExpression' && node.parent.callee === node)
			)
		)) {
			return;
		}

		const scope = context.sourceCode.getScope(node);
		const variableNode = findVariable(scope, node)?.defs[0]?.name;
		if (isFromIgnoredPackage(variableNode)) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `EventTarget` over `EventEmitter`.',
			recommended: true,
		},
		messages,
	},
};

export default config;
