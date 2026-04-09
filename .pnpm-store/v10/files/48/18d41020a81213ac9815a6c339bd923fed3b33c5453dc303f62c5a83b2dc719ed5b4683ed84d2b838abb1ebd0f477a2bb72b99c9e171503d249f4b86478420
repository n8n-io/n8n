'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/html-closing-bracket-spacing.js
/**
* @author Toru Nagashima <https://github.com/mysticatea>
*/
var require_html_closing_bracket_spacing = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	* @typedef { {startTag?:"always"|"never",endTag?:"always"|"never",selfClosingTag?:"always"|"never"} } Options
	*/
	/**
	* Normalize options.
	* @param {Options} options The options user configured.
	* @param {ParserServices.TokenStore} tokens The token store of template body.
	* @returns {Options & { detectType: (node: VStartTag | VEndTag) => 'never' | 'always' | null }} The normalized options.
	*/
	function parseOptions(options, tokens) {
		const opts = Object.assign({
			startTag: "never",
			endTag: "never",
			selfClosingTag: "always"
		}, options);
		return Object.assign(opts, { detectType(node) {
			const openType = tokens.getFirstToken(node).type;
			const closeType = tokens.getLastToken(node).type;
			if (openType === "HTMLEndTagOpen" && closeType === "HTMLTagClose") return opts.endTag;
			if (openType === "HTMLTagOpen" && closeType === "HTMLTagClose") return opts.startTag;
			if (openType === "HTMLTagOpen" && closeType === "HTMLSelfClosingTagClose") return opts.selfClosingTag;
			return null;
		} });
	}
	module.exports = {
		meta: {
			type: "layout",
			docs: {
				description: "require or disallow a space before tag's closing brackets",
				categories: ["vue3-strongly-recommended", "vue2-strongly-recommended"],
				url: "https://eslint.vuejs.org/rules/html-closing-bracket-spacing.html"
			},
			fixable: "whitespace",
			schema: [{
				type: "object",
				properties: {
					startTag: { enum: ["always", "never"] },
					endTag: { enum: ["always", "never"] },
					selfClosingTag: { enum: ["always", "never"] }
				},
				additionalProperties: false
			}],
			messages: {
				missing: "Expected a space before '{{bracket}}', but not found.",
				unexpected: "Expected no space before '{{bracket}}', but found."
			}
		},
		create(context) {
			const sourceCode = context.sourceCode;
			const tokens = sourceCode.parserServices.getTemplateBodyTokenStore && sourceCode.parserServices.getTemplateBodyTokenStore();
			const options = parseOptions(context.options[0], tokens);
			return utils.defineDocumentVisitor(context, { "VStartTag, VEndTag"(node) {
				const type = options.detectType(node);
				const lastToken = tokens.getLastToken(node);
				const prevToken = tokens.getLastToken(node, 1);
				if (type == null || prevToken == null || prevToken.loc.end.line !== lastToken.loc.start.line) return;
				const hasSpace = prevToken.range[1] !== lastToken.range[0];
				if (type === "always" && !hasSpace) context.report({
					node,
					loc: lastToken.loc,
					messageId: "missing",
					data: { bracket: sourceCode.getText(lastToken) },
					fix: (fixer) => fixer.insertTextBefore(lastToken, " ")
				});
				else if (type === "never" && hasSpace) context.report({
					node,
					loc: {
						start: prevToken.loc.end,
						end: lastToken.loc.end
					},
					messageId: "unexpected",
					data: { bracket: sourceCode.getText(lastToken) },
					fix: (fixer) => fixer.removeRange([prevToken.range[1], lastToken.range[0]])
				});
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_html_closing_bracket_spacing();
  }
});