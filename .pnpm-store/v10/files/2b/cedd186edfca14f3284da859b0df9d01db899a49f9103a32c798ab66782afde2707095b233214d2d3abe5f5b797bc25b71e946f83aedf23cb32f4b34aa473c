import { K as isSingleLine, f as createRule, m as AST_NODE_TYPES, p as deepMerge } from "../utils.js";
function isLastTokenEndOfLine(token, line) {
	return token.loc.start.column === line.length - 1;
}
function isCommentsEndOfLine(token, comments, line) {
	if (!comments) return false;
	if (comments.loc.end.line > token.loc.end.line) return true;
	return comments.loc.end.column === line.length;
}
function makeFixFunction({ optsNone, optsSemi, lastToken, commentsAfterLastToken, missingDelimiter, lastTokenLine, isSingleLine }) {
	if (optsNone && !isLastTokenEndOfLine(lastToken, lastTokenLine) && !isCommentsEndOfLine(lastToken, commentsAfterLastToken, lastTokenLine) && !isSingleLine) return;
	return (fixer) => {
		if (optsNone) return fixer.remove(lastToken);
		const token = optsSemi ? ";" : ",";
		if (missingDelimiter) return fixer.insertTextAfter(lastToken, token);
		return fixer.replaceText(lastToken, token);
	};
}
const BASE_SCHEMA = {
	type: "object",
	properties: {
		multiline: {
			type: "object",
			properties: {
				delimiter: { $ref: "#/items/0/$defs/multiLineOption" },
				requireLast: { type: "boolean" }
			},
			additionalProperties: false
		},
		singleline: {
			type: "object",
			properties: {
				delimiter: { $ref: "#/items/0/$defs/singleLineOption" },
				requireLast: { type: "boolean" }
			},
			additionalProperties: false
		}
	},
	additionalProperties: false
};
var member_delimiter_style_default = createRule({
	name: "member-delimiter-style",
	meta: {
		type: "layout",
		docs: { description: "Require a specific member delimiter style for interfaces and type literals" },
		fixable: "whitespace",
		schema: [{
			$defs: {
				multiLineOption: {
					type: "string",
					enum: [
						"none",
						"semi",
						"comma"
					]
				},
				singleLineOption: {
					type: "string",
					enum: ["semi", "comma"]
				},
				delimiterConfig: BASE_SCHEMA
			},
			type: "object",
			properties: {
				...BASE_SCHEMA.properties,
				overrides: {
					type: "object",
					properties: {
						interface: { $ref: "#/items/0/$defs/delimiterConfig" },
						typeLiteral: { $ref: "#/items/0/$defs/delimiterConfig" }
					},
					additionalProperties: false
				},
				multilineDetection: {
					type: "string",
					enum: ["brackets", "last-member"]
				}
			},
			additionalProperties: false
		}],
		defaultOptions: [{
			multiline: {
				delimiter: "semi",
				requireLast: true
			},
			singleline: {
				delimiter: "semi",
				requireLast: false
			},
			multilineDetection: "brackets"
		}],
		messages: {
			unexpectedComma: "Unexpected separator (,).",
			unexpectedSemi: "Unexpected separator (;).",
			expectedComma: "Expected a comma.",
			expectedSemi: "Expected a semicolon."
		}
	},
	create(context, [options]) {
		const sourceCode = context.sourceCode;
		const baseOptions = options;
		const overrides = baseOptions.overrides ?? {};
		const interfaceOptions = deepMerge(baseOptions, overrides.interface);
		const typeLiteralOptions = deepMerge(baseOptions, overrides.typeLiteral);
		function checkLastToken(member, opts, isLast) {
			function getOption(type) {
				if (isLast && !opts.requireLast) return type === "none";
				return opts.delimiter === type;
			}
			let messageId = null;
			let missingDelimiter = false;
			const lastToken = sourceCode.getLastToken(member, { includeComments: false });
			if (!lastToken) return;
			const commentsAfterLastToken = sourceCode.getCommentsAfter(lastToken).pop();
			const lastTokenLine = sourceCode.getLines()[lastToken?.loc.start.line - 1];
			const optsSemi = getOption("semi");
			const optsComma = getOption("comma");
			const optsNone = getOption("none");
			if (lastToken.value === ";") {
				if (optsComma) messageId = "expectedComma";
				else if (optsNone) {
					missingDelimiter = true;
					messageId = "unexpectedSemi";
				}
			} else if (lastToken.value === ",") {
				if (optsSemi) messageId = "expectedSemi";
				else if (optsNone) {
					missingDelimiter = true;
					messageId = "unexpectedComma";
				}
			} else if (optsSemi) {
				missingDelimiter = true;
				messageId = "expectedSemi";
			} else if (optsComma) {
				missingDelimiter = true;
				messageId = "expectedComma";
			}
			if (messageId) context.report({
				node: lastToken,
				loc: {
					start: {
						line: lastToken.loc.end.line,
						column: lastToken.loc.end.column
					},
					end: {
						line: lastToken.loc.end.line,
						column: lastToken.loc.end.column
					}
				},
				messageId,
				fix: makeFixFunction({
					optsNone,
					optsSemi,
					lastToken,
					commentsAfterLastToken,
					missingDelimiter,
					lastTokenLine,
					isSingleLine: opts.type === "single-line"
				})
			});
		}
		function checkMemberSeparatorStyle(node) {
			const members = node.type === AST_NODE_TYPES.TSInterfaceBody ? node.body : node.members;
			let _isSingleLine = isSingleLine(node);
			if (options.multilineDetection === "last-member" && !_isSingleLine && members.length > 0) {
				if (members[members.length - 1].loc.end.line === node.loc.end.line) _isSingleLine = true;
			}
			const typeOpts = node.type === AST_NODE_TYPES.TSInterfaceBody ? interfaceOptions : typeLiteralOptions;
			const opts = _isSingleLine ? {
				...typeOpts.singleline,
				type: "single-line"
			} : {
				...typeOpts.multiline,
				type: "multi-line"
			};
			members.forEach((member, index) => {
				checkLastToken(member, opts ?? {}, index === members.length - 1);
			});
		}
		return {
			TSInterfaceBody: checkMemberSeparatorStyle,
			TSTypeLiteral: checkMemberSeparatorStyle
		};
	}
});
export { member_delimiter_style_default as t };
