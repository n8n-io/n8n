import { parse, simpleTraverse } from '@typescript-eslint/typescript-estree';
import { AST_NODE_TYPES, ASTUtils, type TSESTree } from '@typescript-eslint/utils';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
	createRule,
	findNodeDescriptionObject,
	findNodeSourceFilesOnDisk,
	findObjectProperty,
	findPackageJson,
	getBooleanLiteralValue,
	getStringLiteralValue,
	isContainedWithin,
	isNodeTypeClass,
} from '../utils/index.js';

const EXEMPT_NAMES = new Set([
	'resource',
	'operation',
	'returnAll',
	'limit',
	'simplify',
	'authentication',
]);
const EXEMPT_TYPES = new Set(['collection', 'fixedCollection', 'notice']);

interface ModuleReference {
	source: string;
	name: string;
}

interface SourceModule {
	filename: string;
	program: TSESTree.Program;
	bindings: Map<string, TSESTree.Node>;
	imports: Map<string, ModuleReference>;
	exports: Map<string, TSESTree.Node>;
	reExports: Map<string, ModuleReference>;
	exportAllSources: string[];
}

function describeModule(filename: string, program: TSESTree.Program): SourceModule {
	const module: SourceModule = {
		filename,
		program,
		bindings: new Map(),
		imports: new Map(),
		exports: new Map(),
		reExports: new Map(),
		exportAllSources: [],
	};
	for (const statement of program.body) {
		if (statement.type === AST_NODE_TYPES.ImportDeclaration) {
			for (const specifier of statement.specifiers) {
				if (specifier.type !== AST_NODE_TYPES.ImportSpecifier) continue;
				const name =
					specifier.imported.type === AST_NODE_TYPES.Identifier
						? specifier.imported.name
						: String(specifier.imported.value);
				module.imports.set(specifier.local.name, { source: statement.source.value, name });
			}
		}
		const declaration =
			statement.type === AST_NODE_TYPES.ExportNamedDeclaration ? statement.declaration : statement;
		if (declaration?.type === AST_NODE_TYPES.VariableDeclaration) {
			for (const variable of declaration.declarations) {
				if (variable.id.type !== AST_NODE_TYPES.Identifier || !variable.init) continue;
				module.bindings.set(variable.id.name, variable.init);
				if (statement.type === AST_NODE_TYPES.ExportNamedDeclaration) {
					module.exports.set(variable.id.name, variable.init);
				}
			}
		}
		if (statement.type === AST_NODE_TYPES.ExportNamedDeclaration) {
			for (const specifier of statement.specifiers) {
				const name =
					specifier.exported.type === AST_NODE_TYPES.Identifier
						? specifier.exported.name
						: String(specifier.exported.value);
				if (statement.source) {
					const importedName =
						specifier.local.type === AST_NODE_TYPES.Identifier
							? specifier.local.name
							: String(specifier.local.value);
					module.reExports.set(name, { source: statement.source.value, name: importedName });
				} else {
					module.exports.set(name, specifier.local);
				}
			}
		}
		if (statement.type === AST_NODE_TYPES.ExportAllDeclaration && !statement.exported) {
			module.exportAllSources.push(statement.source.value);
		}
	}
	return module;
}

export const OptionalFieldsInCollectionRule = createRule({
	name: 'optional-fields-in-collection',
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Require optional node parameters to be inside a collection',
		},
		messages: {
			optionalField:
				'Optional parameter `{{ name }}` sits at the top level of the node form. Optional parameters belong inside an `Additional Fields` or `Options` collection so the default view shows only what the operation requires.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const visited = new Set<TSESTree.Node>();
		const visitedExports = new Map<SourceModule, Set<string>>();
		const currentModule = describeModule(path.resolve(context.filename), context.sourceCode.ast);
		const modules = new Map<string, SourceModule | null>([[currentModule.filename, currentModule]]);
		let packageJson: string | null | undefined;

		function getPackageJson() {
			if (packageJson === undefined) packageJson = findPackageJson(currentModule.filename);
			return packageJson;
		}

		function loadModule(filename: string): SourceModule | null {
			if (modules.has(filename)) return modules.get(filename) ?? null;
			const packagePath = getPackageJson();
			if (!packagePath || !isContainedWithin(path.dirname(packagePath), filename)) return null;

			try {
				const program = parse(readFileSync(filename, 'utf8'), { loc: true, range: true });
				const module = describeModule(filename, program);
				modules.set(filename, module);
				return module;
			} catch {
				// Skip source files that are unavailable or cannot be parsed.
				modules.set(filename, null);
				return null;
			}
		}

		function loadRelativeModule(module: SourceModule, source: string): SourceModule | null {
			if (!source.startsWith('.')) return null;

			const base = path.resolve(path.dirname(module.filename), source);
			const filename = [
				base.replace(/\.js$/, '.ts'),
				`${base}.ts`,
				path.join(base, 'index.ts'),
			].find((candidate) => candidate.endsWith('.ts') && existsSync(candidate));
			return filename ? loadModule(filename) : null;
		}

		function visitExportedBinding(module: SourceModule, name: string): void {
			const names = visitedExports.get(module) ?? new Set<string>();
			if (names.has(name)) return;
			names.add(name);
			visitedExports.set(module, names);

			const exported = module.exports.get(name);
			if (exported) {
				visit(exported, module);
				return;
			}

			const reExport = module.reExports.get(name);
			if (reExport) {
				const sourceModule = loadRelativeModule(module, reExport.source);
				if (sourceModule) visitExportedBinding(sourceModule, reExport.name);
				return;
			}

			if (name === 'default') return;
			for (const source of module.exportAllSources) {
				const sourceModule = loadRelativeModule(module, source);
				if (sourceModule) visitExportedBinding(sourceModule, name);
			}
		}

		function visitImportedBinding(module: SourceModule, name: string): void {
			const imported = module.imports.get(name);
			if (!imported) return;
			const importedModule = loadRelativeModule(module, imported.source);
			if (importedModule) {
				visitExportedBinding(importedModule, imported.name);
			}
		}

		function visit(node: TSESTree.Node | null, module = currentModule): void {
			if (!node || visited.has(node)) return;
			visited.add(node);

			switch (node.type) {
				case AST_NODE_TYPES.TSAsExpression:
				case AST_NODE_TYPES.TSSatisfiesExpression:
				case AST_NODE_TYPES.TSTypeAssertion:
				case AST_NODE_TYPES.TSNonNullExpression:
					visit(node.expression, module);
					break;
				case AST_NODE_TYPES.Identifier: {
					if (module === currentModule) {
						const variable = ASTUtils.findVariable(context.sourceCode.getScope(node), node);
						for (const definition of variable?.defs ?? []) {
							if (definition.node.type === AST_NODE_TYPES.VariableDeclarator) {
								visit(definition.node.init, module);
							}
							if (definition.node.type === AST_NODE_TYPES.ImportSpecifier) {
								visitImportedBinding(module, node.name);
							}
						}
					} else {
						visit(module.bindings.get(node.name) ?? null, module);
						visitImportedBinding(module, node.name);
					}
					break;
				}
				case AST_NODE_TYPES.SpreadElement:
					visit(node.argument, module);
					break;
				case AST_NODE_TYPES.ArrayExpression:
					for (const element of node.elements) visit(element, module);
					break;
				case AST_NODE_TYPES.ObjectExpression: {
					if (module !== currentModule) return;
					const name = getStringLiteralValue(findObjectProperty(node, 'name')?.value ?? null);
					const type = getStringLiteralValue(findObjectProperty(node, 'type')?.value ?? null);
					if (
						name === null ||
						type === null ||
						EXEMPT_NAMES.has(name) ||
						EXEMPT_TYPES.has(type) ||
						getBooleanLiteralValue(findObjectProperty(node, 'required')?.value ?? null) === true ||
						getBooleanLiteralValue(findObjectProperty(node, 'noDataExpression')?.value ?? null) ===
							true
					) {
						return;
					}

					context.report({ node, messageId: 'optionalField', data: { name } });
					break;
				}
			}
		}

		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) return;

				const description = findNodeDescriptionObject(node);
				if (!description) return;

				visit(findObjectProperty(description, 'properties')?.value ?? null);
			},
			'Program:exit'() {
				if (context.filename.endsWith('.node.ts')) return;
				if (
					![...currentModule.exports.values()].some(
						(value) =>
							value.type === AST_NODE_TYPES.ArrayExpression ||
							value.type === AST_NODE_TYPES.Identifier ||
							value.type === AST_NODE_TYPES.TSAsExpression ||
							value.type === AST_NODE_TYPES.TSSatisfiesExpression ||
							value.type === AST_NODE_TYPES.TSTypeAssertion,
					)
				) {
					return;
				}

				const packagePath = getPackageJson();
				if (!packagePath) return;
				// Start at consumers so exports used only inside collections stay exempt.
				for (const filename of findNodeSourceFilesOnDisk(packagePath)) {
					const module = loadModule(filename);
					if (!module) continue;
					simpleTraverse(module.program, {
						enter(node) {
							if (node.type !== AST_NODE_TYPES.ClassDeclaration || !isNodeTypeClass(node)) return;
							const description = findNodeDescriptionObject(node);
							if (description) {
								visit(findObjectProperty(description, 'properties')?.value ?? null, module);
							}
						},
					});
				}
			},
		};
	},
});
