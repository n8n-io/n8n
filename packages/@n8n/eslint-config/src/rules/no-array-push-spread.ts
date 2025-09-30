import { ESLintUtils } from '@typescript-eslint/utils';
import type { TSESTree, TSESLint } from '@typescript-eslint/utils';

const isSpreadElement = (arg: TSESTree.CallExpressionArgument): arg is TSESTree.SpreadElement =>
	arg.type === 'SpreadElement';

const isArrayExpression = (node: TSESTree.Node): node is TSESTree.ArrayExpression =>
	node.type === 'ArrayExpression';

const isNewArrayExpression = (node: TSESTree.Node): node is TSESTree.NewExpression =>
	node.type === 'NewExpression' &&
	node.callee.type === 'Identifier' &&
	node.callee.name === 'Array';

const isArrayDeclaration = (node: TSESTree.Node): boolean =>
	isArrayExpression(node) || isNewArrayExpression(node);

const isPushMethodCall = (
	node: TSESTree.CallExpression,
): node is TSESTree.CallExpression & { callee: TSESTree.MemberExpression } =>
	node.callee.type === 'MemberExpression' &&
	node.callee.property.type === 'Identifier' &&
	node.callee.property.name === 'push';

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
		const findVariableInScope = (startNode: TSESTree.Node, variableName: string) => {
			try {
				let currentScope: ReturnType<typeof context.sourceCode.getScope> | null =
					context.sourceCode.getScope(startNode);
				while (currentScope) {
					const variable = currentScope.set.get(variableName);
					if (variable) return variable;
					currentScope = currentScope.upper;
				}
			} catch {}
			return null;
		};

		const isArrayFromTypeChecker = (node: TSESTree.Node): boolean => {
			try {
				const services = ESLintUtils.getParserServices(context);
				const tsNode = services.esTreeNodeToTSNodeMap?.get(node);
				if (tsNode && services.program) {
					const checker = services.program.getTypeChecker();
					const type = checker.getTypeAtLocation(tsNode);
					return checker.isArrayType(type) || checker.isTupleType(type);
				}
			} catch {}
			return false;
		};

		const isArrayPushCall = (
			node: TSESTree.CallExpression,
		): node is TSESTree.CallExpression & { callee: TSESTree.MemberExpression } => {
			if (!isPushMethodCall(node)) return false;
			const objectNode = node.callee.object;
			return isArrayDeclaration(objectNode) || isArrayFromTypeChecker(objectNode);
		};

		const canAutoFix = (
			node: TSESTree.CallExpression & { callee: TSESTree.MemberExpression },
		): boolean => {
			const firstSpreadIndex = node.arguments.findIndex(isSpreadElement);
			if (firstSpreadIndex === -1) return false;

			const firstSpreadArg = node.arguments[firstSpreadIndex] as TSESTree.SpreadElement;
			if (isArrayExpression(firstSpreadArg.argument)) return false;

			return node.arguments.slice(firstSpreadIndex).every(isSpreadElement);
		};

		const findConstDeclaration = (
			node: TSESTree.CallExpression & { callee: TSESTree.MemberExpression },
		): TSESTree.VariableDeclaration | undefined => {
			if (
				!canAutoFix(node) ||
				node.parent?.type !== 'ExpressionStatement' ||
				node.callee.object.type !== 'Identifier'
			) {
				return undefined;
			}

			const variable = findVariableInScope(node.callee.object, node.callee.object.name);
			const def = variable?.defs[0];

			if (
				def?.type === 'Variable' &&
				def.node.type === 'VariableDeclarator' &&
				def.node.parent?.type === 'VariableDeclaration' &&
				def.node.parent.kind === 'const'
			) {
				return def.node.parent;
			}

			return undefined;
		};

		const buildConcatExpression = (
			node: TSESTree.CallExpression & { callee: TSESTree.MemberExpression },
			source: TSESLint.SourceCode,
		): string => {
			const arrayText = source.getText(node.callee.object);
			const firstSpreadIndex = node.arguments.findIndex(isSpreadElement);
			const regularArgs = node.arguments.slice(0, firstSpreadIndex);
			const spreadArgs = node.arguments.slice(firstSpreadIndex).filter(isSpreadElement);

			let expression = arrayText;

			if (regularArgs.length > 0) {
				const regularArgsText = regularArgs.map((arg) => source.getText(arg)).join(', ');
				expression += `.concat([${regularArgsText}])`;
			}

			for (const spreadArg of spreadArgs) {
				expression += `.concat(${source.getText(spreadArg.argument)})`;
			}

			return expression;
		};

		const isStandaloneStatement = (node: TSESTree.CallExpression): boolean => {
			const isInAssignment =
				node.parent?.type === 'AssignmentExpression' || node.parent?.type === 'VariableDeclarator';
			if (isInAssignment) return false;

			let currentParent: TSESTree.Node | undefined = node.parent;
			while (currentParent && currentParent.type !== 'ExpressionStatement') {
				currentParent = currentParent.parent;
			}

			return currentParent?.type === 'ExpressionStatement';
		};

		const createConcatFix =
			(
				node: TSESTree.CallExpression & { callee: TSESTree.MemberExpression },
				constDeclaration?: TSESTree.VariableDeclaration,
			) =>
			(fixer: TSESLint.RuleFixer) => {
				const source = context.sourceCode;
				const fixes = [];

				let replacement = buildConcatExpression(node, source);

				if (isStandaloneStatement(node)) {
					const arrayText = source.getText(node.callee.object);
					replacement = `${arrayText} = ${replacement}`;

					if (constDeclaration) {
						fixes.push(
							fixer.replaceText(
								constDeclaration,
								source.getText(constDeclaration).replace(/^const\b/, 'let'),
							),
						);
					}
				}

				fixes.push(fixer.replaceText(node, replacement));
				return fixes;
			};

		return {
			CallExpression(node) {
				if (!isArrayPushCall(node) || !node.arguments.some(isSpreadElement)) return;

				const hasInlineArraySpread = node.arguments.some(
					(arg) => isSpreadElement(arg) && isArrayExpression(arg.argument),
				);
				if (hasInlineArraySpread) return;

				const constDeclaration = findConstDeclaration(node);

				context.report({
					node,
					messageId: 'noArrayPushSpread',
					fix: canAutoFix(node) ? createConcatFix(node, constDeclaration) : null,
				});
			},
		};
	},
});
