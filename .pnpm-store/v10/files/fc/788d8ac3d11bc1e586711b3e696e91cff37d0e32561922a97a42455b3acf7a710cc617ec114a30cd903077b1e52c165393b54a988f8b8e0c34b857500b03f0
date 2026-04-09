import { Q as warnDeprecatedOptions, f as createRule, g as import_ast_utils, v as COMMENTS_IGNORE_PATTERN } from "../utils.js";
var line_comment_position_default = createRule({
	name: "line-comment-position",
	meta: {
		type: "layout",
		docs: { description: "Enforce position of line comments" },
		schema: [{ oneOf: [{
			type: "string",
			enum: ["above", "beside"]
		}, {
			type: "object",
			properties: {
				position: {
					type: "string",
					enum: ["above", "beside"]
				},
				ignorePattern: { type: "string" },
				applyDefaultPatterns: { type: "boolean" },
				applyDefaultIgnorePatterns: { type: "boolean" }
			},
			additionalProperties: false
		}] }],
		defaultOptions: ["above"],
		messages: {
			above: "Expected comment to be above code.",
			beside: "Expected comment to be beside code."
		}
	},
	create(context, [options]) {
		if (typeof options !== "string") warnDeprecatedOptions(options, "applyDefaultPatterns", "applyDefaultIgnorePatterns", "line-comment-position");
		const { position = "above", ignorePattern, applyDefaultPatterns = true, applyDefaultIgnorePatterns = applyDefaultPatterns } = typeof options === "string" ? { position: options } : options;
		const above = position === "above";
		const customIgnoreRegExp = ignorePattern ? new RegExp(ignorePattern, "u") : null;
		const defaultIgnoreRegExp = COMMENTS_IGNORE_PATTERN;
		const fallThroughRegExp = /^\s*falls?\s?through/u;
		const sourceCode = context.sourceCode;
		return { Program() {
			sourceCode.getAllComments().forEach((node) => {
				if (node.type !== "Line") return;
				if (applyDefaultIgnorePatterns && (defaultIgnoreRegExp.test(node.value) || fallThroughRegExp.test(node.value))) return;
				if (customIgnoreRegExp?.test(node.value)) return;
				const previous = sourceCode.getTokenBefore(node, { includeComments: true });
				const isOnSameLine = previous && (0, import_ast_utils.isTokenOnSameLine)(previous, node);
				if (above) {
					if (isOnSameLine) context.report({
						node,
						messageId: "above"
					});
				} else if (!isOnSameLine) context.report({
					node,
					messageId: "beside"
				});
			});
		} };
	}
});
export { line_comment_position_default as t };
