import { K as isSingleLine, f as createRule, g as import_ast_utils } from "../utils.js";
var multiline_ternary_default = createRule({
	name: "multiline-ternary",
	meta: {
		type: "layout",
		docs: { description: "Enforce newlines between operands of ternary expressions" },
		fixable: "whitespace",
		schema: [{
			type: "string",
			enum: [
				"always",
				"always-multiline",
				"never"
			]
		}, {
			type: "object",
			properties: { ignoreJSX: { type: "boolean" } },
			additionalProperties: false
		}],
		defaultOptions: ["always"],
		messages: {
			expectedTestCons: "Expected newline between test and consequent of ternary expression.",
			expectedConsAlt: "Expected newline between consequent and alternate of ternary expression.",
			unexpectedTestCons: "Unexpected newline between test and consequent of ternary expression.",
			unexpectedConsAlt: "Unexpected newline between consequent and alternate of ternary expression."
		}
	},
	create(context, [style, options = {}]) {
		const multiline = style !== "never";
		const allowSingleLine = style === "always-multiline";
		const { ignoreJSX } = options;
		const sourceCode = context.sourceCode;
		return { ConditionalExpression(node) {
			const questionToken = sourceCode.getTokenAfter(node.test, import_ast_utils.isNotClosingParenToken);
			const colonToken = sourceCode.getTokenAfter(node.consequent, import_ast_utils.isNotClosingParenToken);
			const firstTokenOfTest = sourceCode.getFirstToken(node);
			const lastTokenOfTest = sourceCode.getTokenBefore(questionToken);
			const firstTokenOfConsequent = sourceCode.getTokenAfter(questionToken);
			const lastTokenOfConsequent = sourceCode.getTokenBefore(colonToken);
			const firstTokenOfAlternate = sourceCode.getTokenAfter(colonToken);
			const areTestAndConsequentOnSameLine = (0, import_ast_utils.isTokenOnSameLine)(lastTokenOfTest, firstTokenOfConsequent);
			const areConsequentAndAlternateOnSameLine = (0, import_ast_utils.isTokenOnSameLine)(lastTokenOfConsequent, firstTokenOfAlternate);
			const hasComments = !!sourceCode.getCommentsInside(node).length;
			if (ignoreJSX) {
				if (node.parent.type === "JSXElement" || node.parent.type === "JSXFragment" || node.parent.type === "JSXExpressionContainer") return null;
			}
			if (!multiline) {
				if (!areTestAndConsequentOnSameLine) context.report({
					node: node.test,
					loc: {
						start: firstTokenOfTest.loc.start,
						end: lastTokenOfTest.loc.end
					},
					messageId: "unexpectedTestCons",
					fix(fixer) {
						if (hasComments) return null;
						const fixers = [];
						const areTestAndQuestionOnSameLine = (0, import_ast_utils.isTokenOnSameLine)(lastTokenOfTest, questionToken);
						const areQuestionAndConsOnSameLine = (0, import_ast_utils.isTokenOnSameLine)(questionToken, firstTokenOfConsequent);
						if (!areTestAndQuestionOnSameLine) fixers.push(fixer.removeRange([lastTokenOfTest.range[1], questionToken.range[0]]));
						if (!areQuestionAndConsOnSameLine) fixers.push(fixer.removeRange([questionToken.range[1], firstTokenOfConsequent.range[0]]));
						return fixers;
					}
				});
				if (!areConsequentAndAlternateOnSameLine) context.report({
					node: node.consequent,
					loc: {
						start: firstTokenOfConsequent.loc.start,
						end: lastTokenOfConsequent.loc.end
					},
					messageId: "unexpectedConsAlt",
					fix(fixer) {
						if (hasComments) return null;
						const fixers = [];
						const areConsAndColonOnSameLine = (0, import_ast_utils.isTokenOnSameLine)(lastTokenOfConsequent, colonToken);
						const areColonAndAltOnSameLine = (0, import_ast_utils.isTokenOnSameLine)(colonToken, firstTokenOfAlternate);
						if (!areConsAndColonOnSameLine) fixers.push(fixer.removeRange([lastTokenOfConsequent.range[1], colonToken.range[0]]));
						if (!areColonAndAltOnSameLine) fixers.push(fixer.removeRange([colonToken.range[1], firstTokenOfAlternate.range[0]]));
						return fixers;
					}
				});
			} else {
				if (allowSingleLine && isSingleLine(node)) return;
				if (areTestAndConsequentOnSameLine) context.report({
					node: node.test,
					loc: {
						start: firstTokenOfTest.loc.start,
						end: lastTokenOfTest.loc.end
					},
					messageId: "expectedTestCons",
					fix: (fixer) => hasComments ? null : fixer.replaceTextRange([lastTokenOfTest.range[1], questionToken.range[0]], "\n")
				});
				if (areConsequentAndAlternateOnSameLine) context.report({
					node: node.consequent,
					loc: {
						start: firstTokenOfConsequent.loc.start,
						end: lastTokenOfConsequent.loc.end
					},
					messageId: "expectedConsAlt",
					fix: (fixer) => hasComments ? null : fixer.replaceTextRange([lastTokenOfConsequent.range[1], colonToken.range[0]], "\n")
				});
			}
		} };
	}
});
export { multiline_ternary_default as t };
