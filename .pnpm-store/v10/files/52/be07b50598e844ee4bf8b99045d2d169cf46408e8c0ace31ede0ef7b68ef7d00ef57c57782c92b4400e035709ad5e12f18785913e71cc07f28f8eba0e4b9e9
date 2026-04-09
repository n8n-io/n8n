import { d as safeReplaceTextBetween, f as createRule, g as import_ast_utils } from "../utils.js";
const POSITION_SCHEMA = {
	type: "string",
	enum: [
		"beside",
		"below",
		"any"
	]
};
var nonblock_statement_body_position_default = createRule({
	name: "nonblock-statement-body-position",
	meta: {
		type: "layout",
		docs: { description: "Enforce the location of single-line statements" },
		fixable: "whitespace",
		schema: [POSITION_SCHEMA, {
			type: "object",
			properties: { overrides: {
				type: "object",
				properties: {
					if: POSITION_SCHEMA,
					else: POSITION_SCHEMA,
					while: POSITION_SCHEMA,
					do: POSITION_SCHEMA,
					for: POSITION_SCHEMA
				},
				additionalProperties: false
			} },
			additionalProperties: false
		}],
		defaultOptions: ["beside"],
		messages: {
			expectNoLinebreak: "Expected no linebreak before this statement.",
			expectLinebreak: "Expected a linebreak before this statement."
		}
	},
	create(context, [style, { overrides = {} } = {}]) {
		const sourceCode = context.sourceCode;
		function validateStatement(node, keywordName) {
			const option = overrides[keywordName] ?? style;
			if (node.type === "BlockStatement" || option === "any") return;
			const tokenBefore = sourceCode.getTokenBefore(node);
			const onSameLine = (0, import_ast_utils.isTokenOnSameLine)(tokenBefore, node);
			if (onSameLine && option === "below") context.report({
				node,
				messageId: "expectLinebreak",
				fix: (fixer) => fixer.insertTextBefore(node, "\n")
			});
			else if (!onSameLine && option === "beside") context.report({
				node,
				messageId: "expectNoLinebreak",
				fix: safeReplaceTextBetween(sourceCode, tokenBefore, node, " ")
			});
		}
		return {
			IfStatement(node) {
				validateStatement(node.consequent, "if");
				if (node.alternate && node.alternate.type !== "IfStatement") validateStatement(node.alternate, "else");
			},
			WhileStatement: (node) => validateStatement(node.body, "while"),
			DoWhileStatement: (node) => validateStatement(node.body, "do"),
			ForStatement: (node) => validateStatement(node.body, "for"),
			ForInStatement: (node) => validateStatement(node.body, "for"),
			ForOfStatement: (node) => validateStatement(node.body, "for")
		};
	}
});
export { nonblock_statement_body_position_default as t };
