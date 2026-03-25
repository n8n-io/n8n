// eslint-disable-next-line complexity
function isNotReference(node) {
	const {parent} = node;

	switch (parent.type) {
		// `foo.Identifier`
		case 'MemberExpression': {
			return !parent.computed && parent.property === node;
		}

		case 'FunctionDeclaration':
		case 'FunctionExpression': {
			return (
				// `function foo(Identifier) {}`
				// `const foo = function(Identifier) {}`
				parent.params.includes(node)
				// `function Identifier() {}`
				// `const foo = function Identifier() {}`
				|| parent.id === node
			);
		}

		case 'ArrowFunctionExpression': {
			// `const foo = (Identifier) => {}`
			return parent.params.includes(node);
		}

		// `class Identifier() {}`
		// `const foo = class Identifier() {}`
		// `const Identifier = 1`
		case 'ClassDeclaration':
		case 'ClassExpression':
		case 'VariableDeclarator': {
			return parent.id === node;
		}

		// `class Foo {Identifier = 1}`
		// `class Foo {Identifier() {}}`
		case 'PropertyDefinition':
		case 'MethodDefinition': {
			return !parent.computed && parent.key === node;
		}

		// `const foo = {Identifier: 1}`
		// `const {Identifier} = {}`
		// `const {Identifier: foo} = {}`
		// `const {Identifier} = {}`
		// `const {foo: Identifier} = {}`
		case 'Property': {
			return (
				(
					!parent.computed
					&& parent.key === node
					&& (
						(parent.parent.type === 'ObjectExpression' || parent.parent.type === 'ObjectPattern')
						&& parent.parent.properties.includes(parent)
					)
				)
				|| (
					parent.value === node
					&& parent.parent.type === 'ObjectPattern'
					&& parent.parent.properties.includes(parent)
				)
			);
		}

		// `const [Identifier] = []`
		case 'ArrayPattern': {
			return parent.elements.includes(node);
		}

		/*
			```
			Identifier: for (const foo of bar) {
				continue Identifier;
				break Identifier;
			}
			```
		*/
		case 'LabeledStatement':
		case 'ContinueStatement':
		case 'BreakStatement': {
			return parent.label === node;
		}

		// `import * as Identifier from 'foo'`
		// `import Identifier from 'foo'`
		case 'ImportDefaultSpecifier':
		case 'ImportNamespaceSpecifier': {
			return parent.local === node;
		}

		// `export * as Identifier from 'foo'`
		case 'ExportAllDeclaration': {
			return parent.exported === node;
		}

		// `import {foo as Identifier} from 'foo'`
		// `import {Identifier as foo} from 'foo'`
		case 'ImportSpecifier': {
			return (parent.local === node || parent.imported === node);
		}

		// `export {foo as Identifier}`
		// `export {Identifier as foo}`
		case 'ExportSpecifier': {
			return (parent.local === node || parent.exported === node);
		}

		// TypeScript
		case 'TSDeclareFunction':
		case 'TSEnumMember': {
			return parent.id === node;
		}

		// `type Foo = { [Identifier: string]: string }`
		case 'TSIndexSignature': {
			return parent.parameters.includes(node);
		}

		// `@typescript-eslint/parse` v7
		// `type Foo = { [Identifier in keyof string]: number; };`
		case 'TSTypeParameter': {
			return parent.name === node;
		}

		// `@typescript-eslint/parse` v8
		// `type Foo = { [Identifier in keyof string]: number; };`
		case 'TSMappedType': {
			return parent.key === node;
		}

		// `type Identifier = Foo`
		case 'TSTypeAliasDeclaration': {
			return parent.id === node;
		}

		case 'TSPropertySignature': {
			return parent.key === node;
		}

		// No default
	}

	return false;
}

export default function isReferenceIdentifier(node, nameOrNames = []) {
	if (node.type !== 'Identifier') {
		return false;
	}

	const names = Array.isArray(nameOrNames) ? nameOrNames : [nameOrNames];
	if (names.length > 0 && !names.includes(node.name)) {
		return false;
	}

	return !isNotReference(node);
}
