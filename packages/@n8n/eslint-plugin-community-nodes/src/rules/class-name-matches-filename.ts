import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { AST_NODE_TYPES, parse } from '@typescript-eslint/typescript-estree';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

import { createRule, findJsonProperty, readPackageJsonRegisteredFiles } from '../utils/index.js';

export const ClassNameMatchesFilenameRule = createRule({
	name: 'class-name-matches-filename',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Ensure every file registered in "n8n.nodes" and "n8n.credentials" exports a class named after the file',
		},
		messages: {
			classNameMismatch:
				'n8n loads "{{ registeredPath }}" by looking up the export "{{ expected }}", which it takes from the file name, but the file exports {{ exported }}. Rename the class or the file so they match, otherwise n8n can\'t load the package.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!context.filename.endsWith('package.json')) {
			return {};
		}

		return {
			ObjectExpression(node: TSESTree.ObjectExpression) {
				// Only inspect the root object of the package.json file.
				if (node.parent?.type !== AST_NODE_TYPES.ExpressionStatement) {
					return;
				}

				for (const { registeredPath, filePath } of readPackageJsonRegisteredFiles(
					context.filename,
				)) {
					const exportedNames = findExportedNames(filePath);
					// Nothing recognisable is exported, so there is no basis for a finding.
					if (exportedNames.size === 0) {
						continue;
					}

					const expected = expectedClassName(registeredPath);
					if (exportedNames.has(expected)) {
						continue;
					}

					context.report({
						node: findRegistrationElement(node, registeredPath) ?? node,
						messageId: 'classNameMismatch',
						data: {
							registeredPath,
							expected,
							exported: [...exportedNames].map((name) => `"${name}"`).join(', '),
						},
					});
				}
			},
		};
	},
});

/**
 * The export n8n's loader looks up for a registered file: the file name up to
 * its first dot, e.g. `Foo` for `dist/nodes/Foo/Foo.node.js`. Mirrors
 * `DirectoryLoader.loadClass` in `@n8n/core`, which is case-sensitive.
 */
function expectedClassName(registeredPath: string): string {
	const fileName = path.parse(registeredPath).name;
	const firstDot = fileName.indexOf('.');
	return firstDot === -1 ? fileName : fileName.slice(0, firstDot);
}

/**
 * Collects the names a module exports, both from TypeScript or ES module source
 * (`export class Foo`) and from compiled CommonJS (`exports.Foo = Foo`,
 * `module.exports = { Foo }`, `Object.defineProperty(exports, 'Foo', ...)`).
 * Returns an empty set when the file can't be read or parsed.
 */
export function findExportedNames(filePath: string): Set<string> {
	const names = new Set<string>();

	let program: TSESTree.Program;
	try {
		program = parse(readFileSync(filePath, 'utf8'), { jsx: false });
	} catch {
		return names;
	}

	for (const statement of program.body) {
		if (statement.type === AST_NODE_TYPES.ExportNamedDeclaration) {
			collectEsmExportNames(statement, names);
		} else if (statement.type === AST_NODE_TYPES.ExpressionStatement) {
			collectCommonJsExportNames(statement.expression, names);
		}
	}

	// The interop marker tsc adds to every CommonJS module, not an export of its own.
	names.delete('__esModule');
	return names;
}

function collectEsmExportNames(statement: TSESTree.ExportNamedDeclaration, names: Set<string>) {
	const { declaration } = statement;
	if (
		(declaration?.type === AST_NODE_TYPES.ClassDeclaration ||
			declaration?.type === AST_NODE_TYPES.FunctionDeclaration) &&
		declaration.id
	) {
		names.add(declaration.id.name);
	}

	if (declaration?.type === AST_NODE_TYPES.VariableDeclaration) {
		for (const declarator of declaration.declarations) {
			if (declarator.id.type === AST_NODE_TYPES.Identifier) {
				names.add(declarator.id.name);
			}
		}
	}

	for (const specifier of statement.specifiers) {
		const name = moduleExportName(specifier.exported);
		if (name) {
			names.add(name);
		}
	}
}

function collectCommonJsExportNames(expression: TSESTree.Expression, names: Set<string>) {
	if (expression.type === AST_NODE_TYPES.SequenceExpression) {
		for (const part of expression.expressions) {
			collectCommonJsExportNames(part, names);
		}
		return;
	}

	if (expression.type === AST_NODE_TYPES.AssignmentExpression) {
		if (expression.left.type === AST_NODE_TYPES.MemberExpression) {
			// exports.Foo = ... or module.exports.Foo = ...
			if (isExportsObject(expression.left.object)) {
				const name = memberPropertyName(expression.left);
				if (name) {
					names.add(name);
				}
			}

			// module.exports = { Foo, Bar: Baz }
			if (
				isExportsObject(expression.left) &&
				expression.right.type === AST_NODE_TYPES.ObjectExpression
			) {
				for (const property of expression.right.properties) {
					if (property.type === AST_NODE_TYPES.Property && !property.computed) {
						const name = propertyKeyName(property.key);
						if (name) {
							names.add(name);
						}
					}
				}
			}
		}

		// tsc chains declarations: exports.Foo = exports.Bar = void 0
		collectCommonJsExportNames(expression.right, names);
		return;
	}

	// Object.defineProperty(exports, 'Foo', { ... })
	if (
		expression.type === AST_NODE_TYPES.CallExpression &&
		expression.callee.type === AST_NODE_TYPES.MemberExpression &&
		expression.callee.object.type === AST_NODE_TYPES.Identifier &&
		expression.callee.object.name === 'Object' &&
		memberPropertyName(expression.callee) === 'defineProperty'
	) {
		const [target, key] = expression.arguments;
		if (
			target &&
			isExportsObject(target) &&
			key?.type === AST_NODE_TYPES.Literal &&
			typeof key.value === 'string'
		) {
			names.add(key.value);
		}
	}
}

/** `exports` or `module.exports` */
function isExportsObject(node: TSESTree.Node): boolean {
	if (node.type === AST_NODE_TYPES.Identifier) {
		return node.name === 'exports';
	}

	return (
		node.type === AST_NODE_TYPES.MemberExpression &&
		node.object.type === AST_NODE_TYPES.Identifier &&
		node.object.name === 'module' &&
		memberPropertyName(node) === 'exports'
	);
}

function memberPropertyName(node: TSESTree.MemberExpression): string | null {
	if (!node.computed && node.property.type === AST_NODE_TYPES.Identifier) {
		return node.property.name;
	}

	if (
		node.computed &&
		node.property.type === AST_NODE_TYPES.Literal &&
		typeof node.property.value === 'string'
	) {
		return node.property.value;
	}

	return null;
}

function propertyKeyName(key: TSESTree.Property['key']): string | null {
	if (key.type === AST_NODE_TYPES.Identifier) {
		return key.name;
	}

	return key.type === AST_NODE_TYPES.Literal && typeof key.value === 'string' ? key.value : null;
}

function moduleExportName(node: TSESTree.Identifier | TSESTree.StringLiteral): string | null {
	return node.type === AST_NODE_TYPES.Identifier ? node.name : node.value;
}

/** The string in "n8n.nodes" or "n8n.credentials" that registers the given path. */
function findRegistrationElement(
	root: TSESTree.ObjectExpression,
	registeredPath: string,
): TSESTree.Node | null {
	const n8nProperty = findJsonProperty(root, 'n8n');
	if (n8nProperty?.value.type !== AST_NODE_TYPES.ObjectExpression) {
		return null;
	}

	for (const key of ['nodes', 'credentials']) {
		const listProperty = findJsonProperty(n8nProperty.value, key);
		if (listProperty?.value.type !== AST_NODE_TYPES.ArrayExpression) {
			continue;
		}

		const element = listProperty.value.elements.find(
			(candidate) =>
				candidate?.type === AST_NODE_TYPES.Literal && candidate.value === registeredPath,
		);
		if (element) {
			return element;
		}
	}

	return null;
}
