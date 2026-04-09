'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/padding-line-between-tags.js
/**
* @author dev1437
* See LICENSE file in root directory for full license.
*/
var require_padding_line_between_tags = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	* Split the source code into multiple lines based on the line delimiters.
	* Copied from padding-line-between-blocks
	* @param {string} text Source code as a string.
	* @returns {string[]} Array of source code lines.
	*/
	function splitLines(text) {
		return text.split(/\r\n|[\r\n\u2028\u2029]/gu);
	}
	/**
	* @param {RuleContext} context
	* @param {VElement} tag
	* @param {VElement} sibling
	* @param {number} lineDifference
	*/
	function insertNewLine(context, tag, sibling, lineDifference) {
		const endTag = tag.endTag || tag.startTag;
		if (lineDifference === 1) context.report({
			messageId: "always",
			loc: sibling.loc,
			fix(fixer) {
				return fixer.insertTextAfter(tag, "\n");
			}
		});
		else if (lineDifference === 0) context.report({
			messageId: "always",
			loc: sibling.loc,
			fix(fixer) {
				const lastSpaces = /^\s*/.exec(context.sourceCode.lines[endTag.loc.start.line - 1])[0];
				return fixer.insertTextAfter(endTag, `\n\n${lastSpaces}`);
			}
		});
	}
	/**
	* @param {RuleContext} context
	* @param {VEndTag | VStartTag} endTag
	* @param {VElement} sibling
	* @param {number} lineDifference
	*/
	function removeExcessLines(context, endTag, sibling, lineDifference) {
		if (lineDifference > 1) {
			let hasOnlyTextBetween = true;
			for (let i = endTag.loc.start.line; i < sibling.loc.start.line - 1 && hasOnlyTextBetween; i++) hasOnlyTextBetween = !/^\s*$/.test(context.sourceCode.lines[i]);
			if (!hasOnlyTextBetween) context.report({
				messageId: "never",
				loc: sibling.loc,
				fix(fixer) {
					const start = endTag.range[1];
					const end = sibling.range[0];
					const textBetween = splitLines(context.sourceCode.text.slice(start, end));
					let newTextBetween = `\n${textBetween.pop()}`;
					for (let i = textBetween.length - 1; i >= 0; i--) if (!/^\s*$/.test(textBetween[i])) newTextBetween = `${i === 0 ? "" : "\n"}${textBetween[i]}${newTextBetween}`;
					return fixer.replaceTextRange([start, end], `${newTextBetween}`);
				}
			});
		}
	}
	/**
	* @param {RuleContext} context
	*/
	function checkNewline(context) {
		const reverseConfigureList = [...context.options[0] || [{
			blankLine: "always",
			prev: "*",
			next: "*"
		}]].reverse();
		/**
		* It has the style of the first `blankLine="consistent"`.
		* @type {Map<VElement, "always" | "never">}
		*/
		const firstConsistentBlankLines = /* @__PURE__ */ new Map();
		/**
		* @param {VElement} block
		*/
		return (block) => {
			if (!block.parent.parent) return;
			const endTag = block.endTag || block.startTag;
			const lowerSiblings = block.parent.children.filter((element) => element.type === "VElement" && element.range !== block.range).filter((sibling) => sibling.range[0] - endTag.range[1] >= 0);
			if (lowerSiblings.length === 0) return;
			const closestSibling = lowerSiblings[0];
			const configure = reverseConfigureList.find((configure$1) => (configure$1.prev === "*" || block.name === configure$1.prev) && (configure$1.next === "*" || closestSibling.name === configure$1.next));
			if (!configure) return;
			const lineDifference = closestSibling.loc.start.line - endTag.loc.end.line;
			let blankLine = configure.blankLine;
			if (blankLine === "consistent") {
				const firstConsistentBlankLine = firstConsistentBlankLines.get(block.parent);
				if (firstConsistentBlankLine == null) {
					firstConsistentBlankLines.set(block.parent, lineDifference > 1 ? "always" : "never");
					return;
				}
				blankLine = firstConsistentBlankLine;
			}
			if (blankLine === "always") insertNewLine(context, block, closestSibling, lineDifference);
			else removeExcessLines(context, endTag, closestSibling, lineDifference);
		};
	}
	module.exports = {
		meta: {
			type: "layout",
			docs: {
				description: "require or disallow newlines between sibling tags in template",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/padding-line-between-tags.html"
			},
			fixable: "whitespace",
			schema: [{
				type: "array",
				items: {
					type: "object",
					properties: {
						blankLine: { enum: [
							"always",
							"never",
							"consistent"
						] },
						prev: { type: "string" },
						next: { type: "string" }
					},
					additionalProperties: false,
					required: [
						"blankLine",
						"prev",
						"next"
					]
				}
			}],
			messages: {
				never: "Unexpected blank line before this tag.",
				always: "Expected blank line before this tag."
			}
		},
		create(context) {
			return utils.defineTemplateBodyVisitor(context, { VElement: checkNewline(context) });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_padding_line_between_tags();
  }
});