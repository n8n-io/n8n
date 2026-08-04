import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

export const NoTypeOnlyImportInDiRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow type-only imports for constructor parameters in @Service() classes.',
		},
		fixable: 'code', // 1. Enable fixability
		messages: {
			noTypeOnlyImportInDi:
				'Constructor parameter "{{ paramName }}" uses type-only imported "{{ typeName }}" which is erased at runtime. Remove the `type` keyword to fix dependency injection.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const sourceCode = context.getSourceCode();
		// Track the specific node that needs fixing
		const typeOnlyImports = new Map<
			string,
			{
				isTypeOnly: boolean;
				node: TSESTree.ImportDeclaration | TSESTree.ImportSpecifier;
			}
		>();

		return {
			ImportDeclaration(node) {
				// Handle `import type { Foo } from 'bar'`
				if (node.importKind === 'type') {
					for (const specifier of node.specifiers) {
						if (
							specifier.type === 'ImportSpecifier' ||
							specifier.type === 'ImportDefaultSpecifier'
						) {
							typeOnlyImports.set(specifier.local.name, { isTypeOnly: true, node });
						}
					}
					return;
				}

				// Handle `import { type Foo } from 'bar'`
				for (const specifier of node.specifiers) {
					if (specifier.type === 'ImportSpecifier') {
						const isSpecifierTypeOnly = specifier.importKind === 'type';
						typeOnlyImports.set(specifier.local.name, {
							isTypeOnly: isSpecifierTypeOnly,
							node: specifier,
						});
					}
				}
			},

			ClassDeclaration(node) {
				const hasServiceDecorator = node.decorators?.some(
					(d) =>
						d.expression.type === 'CallExpression' &&
						d.expression.callee.type === 'Identifier' &&
						d.expression.callee.name === 'Service',
				);

				if (!hasServiceDecorator) return;

				const constructor = node.body.body.find(
					(m): m is TSESTree.MethodDefinition =>
						m.type === 'MethodDefinition' && m.kind === 'constructor',
				);

				if (!constructor || constructor.value.type !== 'FunctionExpression') return;

				for (const param of constructor.value.params) {
					const actualParam = param.type === 'TSParameterProperty' ? param.parameter : param;
					if (actualParam.type !== 'Identifier' || !actualParam.typeAnnotation) continue;

					const typeNode = actualParam.typeAnnotation.typeAnnotation;
					if (typeNode.type === 'TSTypeReference' && typeNode.typeName.type === 'Identifier') {
						const typeName = typeNode.typeName.name;
						const importInfo = typeOnlyImports.get(typeName);

						if (importInfo?.isTypeOnly) {
							context.report({
								node: actualParam,
								messageId: 'noTypeOnlyImportInDi',
								data: { paramName: actualParam.name, typeName },
								fix(fixer) {
									const targetNode = importInfo.node;

									// Scenario A: import type { Foo, Bar } from 'bar'
									if (targetNode.type === 'ImportDeclaration') {
										const fixes = [];

										// Find and remove the declaration-level 'type' keyword
										const typeToken = sourceCode.getFirstToken(
											targetNode,
											(t) => t.value === 'type',
										);
										if (!typeToken) return null;

										const nextToken = sourceCode.getTokenAfter(typeToken);
										if (!nextToken) return null;

										// Remove 'type' and any whitespace after it up to the next token
										fixes.push(fixer.removeRange([typeToken.range[0], nextToken.range[0]]));

										// Add 'type' inline for all specifiers except the one being used in DI
										for (const specifier of targetNode.specifiers) {
											if (
												specifier.type === 'ImportSpecifier' &&
												specifier.local.name !== typeName
											) {
												// Add 'type ' before this specifier
												fixes.push(fixer.insertTextBefore(specifier, 'type '));
											}
										}

										return fixes;
									}

									// Scenario B: import { type Foo } from 'bar'
									if (targetNode.type === 'ImportSpecifier') {
										const typeToken = sourceCode.getFirstToken(
											targetNode,
											(t) => t.value === 'type',
										);
										if (!typeToken) return null;

										const nextToken = sourceCode.getTokenAfter(typeToken);
										if (!nextToken) return null;

										// Remove 'type' and any whitespace after it up to the next token
										return fixer.removeRange([typeToken.range[0], nextToken.range[0]]);
									}

									return null;
								},
							});
						}
					}
				}
			},
		};
	},
});
