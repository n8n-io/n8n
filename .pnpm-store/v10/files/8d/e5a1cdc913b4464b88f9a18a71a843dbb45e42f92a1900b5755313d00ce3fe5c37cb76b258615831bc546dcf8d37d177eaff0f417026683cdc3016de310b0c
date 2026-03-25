const MESSAGE_ID_ERROR = 'consistent-assert/error';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `{{name}}.ok(…)` over `{{name}}(…)`.',
};

/**
@param {import('estree').ImportSpecifier | import('estree').ImportDefaultSpecifier | import('estree').ImportSpecifier | import('estree').ImportDeclaration} node
*/
const isValueImport = node => !node.importKind || node.importKind === 'value';

/**
Check if a specifier is `assert` function.

@param {import('estree').ImportSpecifier | import('estree').ImportDefaultSpecifier} specifier
@param {string} moduleName
*/
const isAssertFunction = (specifier, moduleName) =>
	// `import assert from 'node:assert';`
	// `import assert from 'node:assert/strict';`
	specifier.type === 'ImportDefaultSpecifier'
	// `import {default as assert} from 'node:assert';`
	// `import {default as assert} from 'node:assert/strict';`
	|| (
		specifier.type === 'ImportSpecifier'
		&& specifier.imported.name === 'default'
	)
	// `import {strict as assert} from 'node:assert';`
	|| (
		moduleName === 'assert'
		&& specifier.type === 'ImportSpecifier'
		&& specifier.imported.name === 'strict'
	);

const NODE_PROTOCOL = 'node:';

/** @type {import('eslint').Rule.RuleModule['create']} */
const create = context => ({
	* ImportDeclaration(importDeclaration) {
		if (!isValueImport(importDeclaration)) {
			return;
		}

		let moduleName = importDeclaration.source.value;

		if (moduleName.startsWith(NODE_PROTOCOL)) {
			moduleName = moduleName.slice(NODE_PROTOCOL.length);
		}

		if (moduleName !== 'assert' && moduleName !== 'assert/strict') {
			return;
		}

		for (const specifier of importDeclaration.specifiers) {
			if (!isValueImport(specifier) || !isAssertFunction(specifier, moduleName)) {
				continue;
			}

			const variables = context.sourceCode.getDeclaredVariables(specifier);

			/* c8 ignore next 3 */
			if (!Array.isArray(variables) && variables.length === 1) {
				continue;
			}

			const [variable] = variables;

			for (const {identifier} of variable.references) {
				if (!(identifier.parent.type === 'CallExpression' && identifier.parent.callee === identifier)) {
					continue;
				}

				yield {
					node: identifier,
					messageId: MESSAGE_ID_ERROR,
					data: {name: identifier.name},
					/** @param {import('eslint').Rule.RuleFixer} fixer */
					fix: fixer => fixer.insertTextAfter(identifier, '.ok'),
				};
			}
		}
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Enforce consistent assertion style with `node:assert`.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
