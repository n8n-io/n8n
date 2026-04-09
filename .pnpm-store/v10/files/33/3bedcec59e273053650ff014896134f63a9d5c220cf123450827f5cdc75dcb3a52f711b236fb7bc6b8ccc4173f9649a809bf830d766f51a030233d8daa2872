'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-multiple-template-root.js
/**
* @fileoverview disallow adding multiple root nodes to the template
* @author Przemyslaw Falowski (@przemkow)
*/
var require_no_multiple_template_root = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow adding multiple root nodes to the template",
				categories: ["vue2-essential"],
				url: "https://eslint.vuejs.org/rules/no-multiple-template-root.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: { disallowComments: { type: "boolean" } },
				additionalProperties: false
			}],
			messages: {
				commentRoot: "The template root disallows comments.",
				multipleRoot: "The template root requires exactly one element.",
				textRoot: "The template root requires an element rather than texts.",
				disallowedElement: "The template root disallows '<{{name}}>' elements.",
				disallowedDirective: "The template root disallows 'v-for' directives."
			}
		},
		create(context) {
			const disallowComments = (context.options[0] || {}).disallowComments;
			const sourceCode = context.sourceCode;
			return { Program(program) {
				const element = program.templateBody;
				if (element == null) return;
				const reportComments = element.comments.filter((comment) => utils.inRange(element, comment) && !element.children.some((child) => utils.inRange(child, comment)));
				if (disallowComments) for (const comment of reportComments) context.report({
					node: comment,
					loc: comment.loc,
					messageId: "commentRoot"
				});
				const rootElements = [];
				let extraText = null;
				let extraElement = null;
				let vIf = false;
				for (const child of element.children) if (child.type === "VElement") if (rootElements.length === 0) {
					rootElements.push(child);
					vIf = utils.hasDirective(child, "if");
				} else if (vIf && utils.hasDirective(child, "else-if")) rootElements.push(child);
				else if (vIf && utils.hasDirective(child, "else")) {
					rootElements.push(child);
					vIf = false;
				} else extraElement = child;
				else if (sourceCode.getText(child).trim() !== "") extraText = child;
				if (extraText != null) context.report({
					node: extraText,
					loc: extraText.loc,
					messageId: "textRoot"
				});
				else if (extraElement == null) for (const element$1 of rootElements) {
					const tag = element$1.startTag;
					const name = element$1.name;
					if (name === "template" || name === "slot") context.report({
						node: tag,
						loc: tag.loc,
						messageId: "disallowedElement",
						data: { name }
					});
					if (utils.hasDirective(element$1, "for")) context.report({
						node: tag,
						loc: tag.loc,
						messageId: "disallowedDirective"
					});
				}
				else context.report({
					node: extraElement,
					loc: extraElement.loc,
					messageId: "multipleRoot"
				});
			} };
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_multiple_template_root();
  }
});