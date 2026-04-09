import { f as createRule, g as import_ast_utils, h as AST_TOKEN_TYPES, m as AST_NODE_TYPES } from "../utils.js";
const UNIONS = ["|", "&"];
var space_infix_ops_default = createRule({
	name: "space-infix-ops",
	meta: {
		type: "layout",
		docs: { description: "Require spacing around infix operators" },
		fixable: "whitespace",
		schema: [{
			type: "object",
			properties: {
				int32Hint: { type: "boolean" },
				ignoreTypes: { type: "boolean" }
			},
			additionalProperties: false
		}],
		defaultOptions: [{
			int32Hint: false,
			ignoreTypes: false
		}],
		messages: { missingSpace: "Operator '{{operator}}' must be spaced." }
	},
	create(context, [options]) {
		const { int32Hint, ignoreTypes } = options;
		const sourceCode = context.sourceCode;
		function report(node, operator) {
			context.report({
				node,
				loc: operator.loc,
				messageId: "missingSpace",
				data: { operator: operator.value },
				fix(fixer) {
					const previousToken = sourceCode.getTokenBefore(operator);
					const afterToken = sourceCode.getTokenAfter(operator);
					let fixString = "";
					if (operator.range[0] - previousToken.range[1] === 0) fixString = " ";
					fixString += operator.value;
					if (afterToken.range[0] - operator.range[1] === 0) fixString += " ";
					return fixer.replaceText(operator, fixString);
				}
			});
		}
		function getFirstNonSpacedToken(left, right, op) {
			const operator = sourceCode.getFirstTokenBetween(left, right, (token) => token.value === op);
			const prev = sourceCode.getTokenBefore(operator);
			const next = sourceCode.getTokenAfter(operator);
			if (!sourceCode.isSpaceBetween(prev, operator) || !sourceCode.isSpaceBetween(operator, next)) return operator;
			return null;
		}
		function checkBinary(node) {
			const leftNode = "typeAnnotation" in node.left && node.left.typeAnnotation ? node.left.typeAnnotation : node.left;
			const rightNode = node.right;
			const nonSpacedNode = getFirstNonSpacedToken(leftNode, rightNode, "operator" in node && node.operator ? node.operator : "=");
			if (nonSpacedNode) {
				if (!(int32Hint && sourceCode.getText(node).endsWith("|0"))) report(node, nonSpacedNode);
			}
		}
		function isSpaceChar(token) {
			return token.type === AST_TOKEN_TYPES.Punctuator && /^[=?:]$/.test(token.value);
		}
		function checkAndReportAssignmentSpace(node, leftNode, rightNode) {
			if (!rightNode || !leftNode) return;
			const operator = sourceCode.getFirstTokenBetween(leftNode, rightNode, isSpaceChar);
			const prev = sourceCode.getTokenBefore(operator);
			const next = sourceCode.getTokenAfter(operator);
			if (!sourceCode.isSpaceBetween(prev, operator) || !sourceCode.isSpaceBetween(operator, next)) report(node, operator);
		}
		function checkPropertyAssignment(node) {
			checkAndReportAssignmentSpace(node, node.optional && !node.typeAnnotation ? sourceCode.getTokenAfter(node.key) : node.typeAnnotation ?? node.key, node.value);
		}
		function checkTSBinary(typeAnnotation) {
			typeAnnotation.types.forEach((type) => {
				const skipFunctionParenthesis = type.type === AST_NODE_TYPES.TSFunctionType ? import_ast_utils.isNotOpeningParenToken : 0;
				const operator = sourceCode.getTokenBefore(type, skipFunctionParenthesis);
				if (!ignoreTypes && operator != null && UNIONS.includes(operator.value)) {
					const prev = sourceCode.getTokenBefore(operator);
					const next = sourceCode.getTokenAfter(operator);
					if (!sourceCode.isSpaceBetween(prev, operator) || !sourceCode.isSpaceBetween(operator, next)) report(typeAnnotation, operator);
				}
			});
		}
		return {
			AssignmentExpression: checkBinary,
			AssignmentPattern: checkBinary,
			BinaryExpression: checkBinary,
			LogicalExpression: checkBinary,
			ConditionalExpression(node) {
				checkAndReportAssignmentSpace(node, node.test, node.consequent);
				checkAndReportAssignmentSpace(node, node.consequent, node.alternate);
			},
			VariableDeclarator(node) {
				checkAndReportAssignmentSpace(node, node.id.typeAnnotation ?? node.id, node.init);
			},
			PropertyDefinition: checkPropertyAssignment,
			AccessorProperty: checkPropertyAssignment,
			TSEnumMember(node) {
				checkAndReportAssignmentSpace(node, node.id, node.initializer);
			},
			TSTypeAliasDeclaration(node) {
				checkAndReportAssignmentSpace(node, node.typeParameters ?? node.id, node.typeAnnotation);
			},
			TSUnionType: checkTSBinary,
			TSIntersectionType: checkTSBinary,
			TSConditionalType(node) {
				checkAndReportAssignmentSpace(node, node.extendsType, node.trueType);
				checkAndReportAssignmentSpace(node, node.trueType, node.falseType);
			}
		};
	}
});
export { space_infix_ops_default as t };
