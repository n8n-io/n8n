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

const isApplyCallWithPush = (node: TSESTree.CallExpression): boolean =>
	node.callee.type === 'MemberExpression' &&
	node.callee.property.type === 'Identifier' &&
	node.callee.property.name === 'apply' &&
	node.callee.object.type === 'MemberExpression' &&
	node.callee.object.property.type === 'Identifier' &&
	node.callee.object.property.name === 'push';

const isPushApplyCall = (
	node: TSESTree.CallExpression,
): node is TSESTree.CallExpression & { callee: TSESTree.MemberExpression } =>
	isApplyCallWithPush(node);

const isArrayPrototypePushApplyCall = (
	node: TSESTree.CallExpression,
): node is TSESTree.CallExpression & { callee: TSESTree.MemberExpression } => {
	if (!isApplyCallWithPush(node)) return false;
	const pushMember = (node.callee as TSESTree.MemberExpression).object as TSESTree.MemberExpression;
	return (
		pushMember.object.type === 'MemberExpression' &&
		pushMember.object.property.type === 'Identifier' &&
		pushMember.object.property.name === 'prototype' &&
		pushMember.object.object.type === 'Identifier' &&
		pushMember.object.object.name === 'Array'
	);
};

type PatternType = 'spread' | 'apply' | 'prototype-apply';

interface PatternInfo {
	type: PatternType;
	arrayNode: TSESTree.Node;
	// Cache spread index to avoid recalculating in canAutoFix
	firstSpreadIndex?: number;
}

export const NoArrayPushSpreadRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Avoid using spread operator with array.push() or array.push.apply() for large arrays - can cause stack overflows. Use concat() instead.',
		},
		fixable: 'code',
		messages: {
			noArrayPushSpread:
				'Avoid using spread operator with array.push() for potentially large arrays. Use concat() instead to avoid stack overflows.',
			noArrayPushApply:
				'Avoid using array.push.apply() for potentially large arrays. Use concat() instead to avoid stack overflows.',
			noArrayPrototypePushApply:
				'Avoid using Array.prototype.push.apply() for potentially large arrays. Use concat() instead to avoid stack overflows.',
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

		const getPatternInfo = (node: TSESTree.CallExpression): PatternInfo | null => {
			// Early exit if not a member expression
			if (node.callee.type !== 'MemberExpression') return null;

			// Check array.push(...)
			if (isPushMethodCall(node)) {
				const firstSpreadIndex = node.arguments.findIndex(isSpreadElement);
				if (firstSpreadIndex !== -1) {
					return {
						type: 'spread',
						arrayNode: node.callee.object,
						firstSpreadIndex,
					};
				}
			}

			// Array.prototype.push.apply
			if (isArrayPrototypePushApplyCall(node)) {
				const arrayNode = node.arguments[0];
				if (arrayNode) {
					return { type: 'prototype-apply', arrayNode };
				}
			}

			// array.push.apply
			if (isPushApplyCall(node)) {
				const pushCall = node.callee.object as TSESTree.MemberExpression;
				return { type: 'apply', arrayNode: pushCall.object };
			}

			return null;
		};

		const shouldSkipInlineArrays = (
			node: TSESTree.CallExpression,
			patternType: PatternType,
		): boolean => {
			if (patternType === 'spread') {
				return node.arguments.some(
					(arg) => isSpreadElement(arg) && isArrayExpression(arg.argument),
				);
			}
			// Both apply patterns check if second argument is an inline array
			if (patternType === 'apply' || patternType === 'prototype-apply') {
				const secondArg = node.arguments[1];
				return secondArg && isArrayExpression(secondArg);
			}
			return false;
		};

		const isArrayNode = (node: TSESTree.Node): boolean => {
			// Check cheap syntactic checks first
			if (isArrayDeclaration(node)) return true;

			// Only use expensive type checking as last resort
			return isArrayFromTypeChecker(node);
		};

		const canAutoFix = (
			node: TSESTree.CallExpression & { callee: TSESTree.MemberExpression },
			patternInfo: PatternInfo,
		): boolean => {
			if (patternInfo.type === 'spread') {
				const firstSpreadIndex = patternInfo.firstSpreadIndex!;
				const firstSpreadArg = node.arguments[firstSpreadIndex] as TSESTree.SpreadElement;
				if (isArrayExpression(firstSpreadArg.argument)) return false;

				return node.arguments.slice(firstSpreadIndex).every(isSpreadElement);
			}

			if (patternInfo.type === 'apply' || patternInfo.type === 'prototype-apply') {
				if (node.arguments.length !== 2) return false;
				const secondArg = node.arguments[1];
				return !isArrayExpression(secondArg);
			}

			return false;
		};

		const getIdentifierFromObject = (objectNode: TSESTree.Node): TSESTree.Identifier | null => {
			if (objectNode.type === 'Identifier') {
				return objectNode;
			}
			if (objectNode.type === 'TSAsExpression' && objectNode.expression.type === 'Identifier') {
				return objectNode.expression;
			}
			return null;
		};

		const findConstDeclaration = (
			node: TSESTree.CallExpression & { callee: TSESTree.MemberExpression },
			patternInfo: PatternInfo,
		): TSESTree.VariableDeclaration | undefined => {
			if (!canAutoFix(node, patternInfo) || node.parent?.type !== 'ExpressionStatement') {
				return undefined;
			}

			const arrayNode = patternInfo.arrayNode;

			const identifier = getIdentifierFromObject(arrayNode);
			if (!identifier) return undefined;

			const variable = findVariableInScope(identifier, identifier.name);
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

		const wrapInParensIfNeeded = (text: string, node: TSESTree.Node): string => {
			return node.type === 'TSAsExpression' && !text.startsWith('(') ? `(${text})` : text;
		};

		const buildConcatExpression = (
			node: TSESTree.CallExpression & { callee: TSESTree.MemberExpression },
			source: TSESLint.SourceCode,
			patternInfo: PatternInfo,
		): string => {
			const arrayText = wrapInParensIfNeeded(
				source.getText(patternInfo.arrayNode),
				patternInfo.arrayNode,
			);

			if (patternInfo.type === 'spread') {
				const firstSpreadIndex = patternInfo.firstSpreadIndex!;
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
			}

			if (patternInfo.type === 'apply' || patternInfo.type === 'prototype-apply') {
				const itemsArg = source.getText(node.arguments[1]);
				return `${arrayText}.concat(${itemsArg})`;
			}

			return arrayText;
		};

		const getAssignmentTarget = (
			arrayNode: TSESTree.Node,
			source: TSESLint.SourceCode,
		): string | null => {
			if (arrayNode.type === 'TSAsExpression') {
				return source.getText(arrayNode.expression);
			}

			if (arrayNode.type === 'Identifier' || arrayNode.type === 'MemberExpression') {
				return source.getText(arrayNode);
			}

			return null;
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
				patternInfo: PatternInfo,
				constDeclaration?: TSESTree.VariableDeclaration,
			) =>
			(fixer: TSESLint.RuleFixer) => {
				const source = context.sourceCode;
				const fixes = [];

				let replacement = buildConcatExpression(node, source, patternInfo);

				if (isStandaloneStatement(node)) {
					const assignmentTarget = getAssignmentTarget(patternInfo.arrayNode, source);
					if (assignmentTarget) {
						replacement = `${assignmentTarget} = ${replacement}`;
					} else {
						// Fallback to original logic for complex cases
						const arrayText = source.getText(patternInfo.arrayNode);
						replacement = `${arrayText} = ${replacement}`;
					}

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
				const patternInfo = getPatternInfo(node);
				if (!patternInfo) return;

				if (shouldSkipInlineArrays(node, patternInfo.type)) return;

				if (!isArrayNode(patternInfo.arrayNode)) return;

				const typedNode = node as TSESTree.CallExpression & { callee: TSESTree.MemberExpression };
				const constDeclaration = findConstDeclaration(typedNode, patternInfo);

				const messageId =
					patternInfo.type === 'spread'
						? 'noArrayPushSpread'
						: patternInfo.type === 'prototype-apply'
							? 'noArrayPrototypePushApply'
							: 'noArrayPushApply';

				context.report({
					node,
					messageId,
					fix: canAutoFix(typedNode, patternInfo)
						? createConcatFix(typedNode, patternInfo, constDeclaration)
						: null,
				});
			},
		};
	},
});
