import {getStaticValue, getPropertyName} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';

const MESSAGE_ID_OBJECT = 'no-thenable-object';
const MESSAGE_ID_EXPORT = 'no-thenable-export';
const MESSAGE_ID_CLASS = 'no-thenable-class';
const messages = {
	[MESSAGE_ID_OBJECT]: 'Do not add `then` to an object.',
	[MESSAGE_ID_EXPORT]: 'Do not export `then`.',
	[MESSAGE_ID_CLASS]: 'Do not add `then` to a class.',
};

const isStringThen = (node, context) =>
	getStaticValue(node, context.sourceCode.getScope(node))?.value === 'then';

const isPropertyThen = (node, context) =>
	getPropertyName(node, context.sourceCode.getScope(node)) === 'then';

const cases = [
	// `{then() {}}`,
	// `{get then() {}}`,
	// `{[computedKey]() {}}`,
	// `{get [computedKey]() {}}`,
	{
		selector: 'ObjectExpression',
		* getNodes(node, context) {
			for (const property of node.properties) {
				if (property.type === 'Property' && isPropertyThen(property, context)) {
					yield property.key;
				}
			}
		},
		messageId: MESSAGE_ID_OBJECT,
	},
	// `class Foo {then}`,
	// `class Foo {static then}`,
	// `class Foo {get then() {}}`,
	// `class Foo {static get then() {}}`,
	{
		selectors: ['PropertyDefinition', 'MethodDefinition'],
		* getNodes(node, context) {
			if (getPropertyName(node, context.sourceCode.getScope(node)) === 'then') {
				yield node.key;
			}
		},
		messageId: MESSAGE_ID_CLASS,
	},
	// `foo.then = …`
	// `foo[computedKey] = …`
	{
		selector: 'MemberExpression',
		* getNodes(node, context) {
			if (!(node.parent.type === 'AssignmentExpression' && node.parent.left === node)) {
				return;
			}

			if (getPropertyName(node, context.sourceCode.getScope(node)) === 'then') {
				yield node.property;
			}
		},
		messageId: MESSAGE_ID_OBJECT,
	},
	// `Object.defineProperty(foo, 'then', …)`
	// `Reflect.defineProperty(foo, 'then', …)`
	{
		selector: 'CallExpression',
		* getNodes(node, context) {
			if (!(
				isMethodCall(node, {
					objects: ['Object', 'Reflect'],
					method: 'defineProperty',
					minimumArguments: 3,
					optionalCall: false,
					optionalMember: false,
				})
				&& node.arguments[0].type !== 'SpreadElement'
			)) {
				return;
			}

			const [, secondArgument] = node.arguments;
			if (isStringThen(secondArgument, context)) {
				yield secondArgument;
			}
		},
		messageId: MESSAGE_ID_OBJECT,
	},
	// `Object.fromEntries([['then', …]])`
	{
		selector: 'CallExpression',
		* getNodes(node, context) {
			if (!(
				isMethodCall(node, {
					object: 'Object',
					method: 'fromEntries',
					argumentsLength: 1,
					optionalCall: false,
					optionalMember: false,
				})
				&& node.arguments[0].type === 'ArrayExpression'
			)) {
				return;
			}

			for (const pairs of node.arguments[0].elements) {
				if (
					pairs?.type === 'ArrayExpression'
					&& pairs.elements[0]
					&& pairs.elements[0].type !== 'SpreadElement'
				) {
					const [key] = pairs.elements;

					if (isStringThen(key, context)) {
						yield key;
					}
				}
			}
		},
		messageId: MESSAGE_ID_OBJECT,
	},
	// `export {then}`
	{
		selector: 'Identifier',
		* getNodes(node) {
			if (
				node.name === 'then'
				&& node.parent.type === 'ExportSpecifier'
				&& node.parent.exported === node
			) {
				yield node;
			}
		},
		messageId: MESSAGE_ID_EXPORT,
	},
	// `export function then() {}`,
	// `export class then {}`,
	{
		selector: 'Identifier',
		* getNodes(node) {
			if (
				node.name === 'then'
				&& (node.parent.type === 'FunctionDeclaration' || node.parent.type === 'ClassDeclaration')
				&& node.parent.id === node
				&& node.parent.parent.type === 'ExportNamedDeclaration'
				&& node.parent.parent.declaration === node.parent
			) {
				yield node;
			}
		},
		messageId: MESSAGE_ID_EXPORT,
	},
	// `export const … = …`;
	{
		selector: 'VariableDeclaration',
		* getNodes(node, context) {
			if (!(node.parent.type === 'ExportNamedDeclaration' && node.parent.declaration === node)) {
				return;
			}

			for (const variable of context.sourceCode.getDeclaredVariables(node)) {
				if (variable.name === 'then') {
					yield * variable.identifiers;
				}
			}
		},
		messageId: MESSAGE_ID_EXPORT,
	},
];

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	for (const {selector, selectors, messageId, getNodes} of cases) {
		context.on(selector ?? selectors, function * (node) {
			for (const problematicNode of getNodes(node, context)) {
				yield {node: problematicNode, messageId};
			}
		});
	}
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow `then` property.',
			recommended: true,
		},
		messages,
	},
};

export default config;
