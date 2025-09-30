import { ESLintUtils } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';

function isSpreadElement(arg: TSESTree.CallExpressionArgument): arg is TSESTree.SpreadElement {
	return arg.type === 'SpreadElement';
}

function isArrayExpression(node: TSESTree.Node): node is TSESTree.ArrayExpression {
	return node.type === 'ArrayExpression';
}

function isNewArrayExpression(node: TSESTree.Node): node is TSESTree.NewExpression {
	return (
		node.type === 'NewExpression' &&
		node.callee.type === 'Identifier' &&
		node.callee.name === 'Array'
	);
}

function isArrayDeclaration(node: TSESTree.Node): boolean {
	return isArrayExpression(node) || isNewArrayExpression(node);
}

function isMemberExpression(node: TSESTree.Node): node is TSESTree.MemberExpression {
	return node.type === 'MemberExpression';
}

function isIdentifier(node: TSESTree.Node): node is TSESTree.Identifier {
	return node.type === 'Identifier';
}

function isPushMethodCall(
	node: TSESTree.CallExpression,
): node is TSESTree.CallExpression & { callee: TSESTree.MemberExpression } {
	return (
		isMemberExpression(node.callee) &&
		isIdentifier(node.callee.property) &&
		node.callee.property.name === 'push'
	);
}

export const NoArrayPushSpreadRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Avoid using spread operator with array.push() for large arrays - can cause stack overflows. Use concat() instead.',
		},
		fixable: 'code',
		messages: {
			noArrayPushSpread:
				'Avoid using spread operator with array.push() for potentially large arrays. Use concat() instead to avoid stack overflows.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const constDeclarations = new Map<string, TSESTree.VariableDeclaration>();

		function findVariableInScope(
			scopeManager: any,
			startNode: TSESTree.Node,
			variableName: string,
		) {
			try {
				let currentScope = scopeManager?.acquire(startNode, true);

				while (currentScope) {
					const variable = currentScope.set.get(variableName);
					if (variable) return variable;
					currentScope = currentScope.upper;
				}
			} catch {}
			return null;
		}

		function isArrayPushCall(
			node: TSESTree.CallExpression,
		): node is TSESTree.CallExpression & { callee: TSESTree.MemberExpression } {
			if (!isPushMethodCall(node)) {
				return false;
			}

			const objectNode = node.callee.object;

			if (isArrayDeclaration(objectNode)) {
				return true;
			}

			if (isIdentifier(objectNode)) {
				const variable = findVariableInScope(
					context.sourceCode.scopeManager,
					objectNode,
					objectNode.name,
				);

				if (variable && variable.defs.length > 0) {
					const def = variable.defs[0];
					if (
						def.type === 'Variable' &&
						def.node.type === 'VariableDeclarator' &&
						def.node.init &&
						isArrayDeclaration(def.node.init)
					) {
						return true;
					}
				}
			}

			try {
				const services = ESLintUtils.getParserServices(context);
				if (services.program && services.esTreeNodeToTSNodeMap) {
					const checker = services.program.getTypeChecker();
					const tsNode = services.esTreeNodeToTSNodeMap.get(objectNode);
					if (tsNode) {
						const type = checker.getTypeAtLocation(tsNode);
						return checker.isArrayType(type) || checker.isTupleType(type);
					}
				}
			} catch {}

			return false;
		}

		function canAutoFix(node: TSESTree.CallExpression): boolean {
			const firstSpreadIndex = node.arguments.findIndex(isSpreadElement);
			if (firstSpreadIndex === -1) return false;

			const spreadArg = node.arguments[firstSpreadIndex] as TSESTree.SpreadElement;
			if (isArrayExpression(spreadArg.argument)) return false;

			return node.arguments.slice(firstSpreadIndex).every(isSpreadElement);
		}

		function createConcatFix(
			node: TSESTree.CallExpression & { callee: TSESTree.MemberExpression },
		) {
			return (fixer: any) => {
				const source = context.sourceCode;
				const callee = node.callee;
				const arrayText = source.getText(callee.object);

				const firstSpreadIndex = node.arguments.findIndex(isSpreadElement);
				const regularArgs = node.arguments.slice(0, firstSpreadIndex);
				const spreadArgs = node.arguments.slice(firstSpreadIndex).filter(isSpreadElement);

				let replacement = arrayText;

				if (regularArgs.length > 0) {
					const regularArgsText = regularArgs.map((arg) => source.getText(arg)).join(', ');
					replacement += `.concat([${regularArgsText}])`;
				}

				for (const spreadArg of spreadArgs) {
					const argText = source.getText(spreadArg.argument);
					replacement += `.concat(${argText})`;
				}

				const fixes = [];
				const isInAssignment =
					node.parent?.type === 'AssignmentExpression' ||
					node.parent?.type === 'VariableDeclarator';

				if (!isInAssignment) {
					let currentParent: TSESTree.Node | undefined = node.parent;
					while (currentParent && currentParent.type !== 'ExpressionStatement') {
						currentParent = currentParent.parent;
					}

					if (currentParent?.type === 'ExpressionStatement') {
						replacement = `${arrayText} = ${replacement}`;

						if (isIdentifier(callee.object)) {
							const constDeclaration = constDeclarations.get(callee.object.name);
							if (constDeclaration) {
								fixes.push(
									fixer.replaceText(
										constDeclaration,
										source.getText(constDeclaration).replace(/^const\b/, 'let'),
									),
								);
							}
						}
					}
				}

				fixes.push(fixer.replaceText(node, replacement));
				return fixes;
			};
		}

		return {
			VariableDeclaration(node) {
				if (node.kind === 'const') {
					for (const declarator of node.declarations) {
						if (isIdentifier(declarator.id)) {
							constDeclarations.set(declarator.id.name, node);
						}
					}
				}
			},
			CallExpression(node) {
				if (!isArrayPushCall(node)) return;

				const hasSpread = node.arguments.some(isSpreadElement);
				if (!hasSpread) return;

				const hasInlineArraySpread = node.arguments.some(
					(arg) => isSpreadElement(arg) && isArrayExpression(arg.argument),
				);
				if (hasInlineArraySpread) return;

				context.report({
					node,
					messageId: 'noArrayPushSpread',
					fix: canAutoFix(node) ? createConcatFix(node) : null,
				});
			},
		};
	},
});
