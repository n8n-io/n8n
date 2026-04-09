'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/first-attribute-linebreak.js
/**
* @fileoverview Enforce the location of first attribute
* @author Yosuke Ota
*/
var require_first_attribute_linebreak = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "layout",
			docs: {
				description: "enforce the location of first attribute",
				categories: ["vue3-strongly-recommended", "vue2-strongly-recommended"],
				url: "https://eslint.vuejs.org/rules/first-attribute-linebreak.html"
			},
			fixable: "whitespace",
			schema: [{
				type: "object",
				properties: {
					multiline: { enum: [
						"below",
						"beside",
						"ignore"
					] },
					singleline: { enum: [
						"below",
						"beside",
						"ignore"
					] }
				},
				additionalProperties: false
			}],
			messages: {
				expected: "Expected a linebreak before this attribute.",
				unexpected: "Expected no linebreak before this attribute."
			}
		},
		create(context) {
			/** @type {"below" | "beside" | "ignore"} */
			const singleline = context.options[0] && context.options[0].singleline || "ignore";
			/** @type {"below" | "beside" | "ignore"} */
			const multiline = context.options[0] && context.options[0].multiline || "below";
			const sourceCode = context.sourceCode;
			const template = sourceCode.parserServices.getTemplateBodyTokenStore && sourceCode.parserServices.getTemplateBodyTokenStore();
			/**
			* Report attribute
			* @param {VAttribute | VDirective} firstAttribute
			* @param { "below" | "beside"} location
			*/
			function report(firstAttribute, location) {
				context.report({
					node: firstAttribute,
					messageId: location === "beside" ? "unexpected" : "expected",
					fix(fixer) {
						const prevToken = template.getTokenBefore(firstAttribute, { includeComments: true });
						return fixer.replaceTextRange([prevToken.range[1], firstAttribute.range[0]], location === "beside" ? " " : "\n");
					}
				});
			}
			return utils.defineTemplateBodyVisitor(context, { VStartTag(node) {
				const firstAttribute = node.attributes[0];
				const lastAttribute = node.attributes.at(-1);
				if (!firstAttribute || !lastAttribute) return;
				const location = firstAttribute.loc.start.line === lastAttribute.loc.end.line ? singleline : multiline;
				if (location === "ignore") return;
				if (location === "beside") {
					if (node.loc.start.line === firstAttribute.loc.start.line) return;
				} else if (node.loc.start.line < firstAttribute.loc.start.line) return;
				report(firstAttribute, location);
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_first_attribute_linebreak();
  }
});