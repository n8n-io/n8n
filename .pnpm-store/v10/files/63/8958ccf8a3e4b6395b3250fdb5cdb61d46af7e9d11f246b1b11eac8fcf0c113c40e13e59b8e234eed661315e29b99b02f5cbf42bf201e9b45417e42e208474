'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/max-lines-per-block.js
/**
* @author lsdsjy
* @fileoverview Rule for checking the maximum number of lines in Vue SFC blocks.
*/
var require_max_lines_per_block = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { SourceCode } = require("eslint");
	const utils = require_index.default;
	/**
	* @param {string} text
	*/
	function isEmptyLine(text) {
		return !text.trim();
	}
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "enforce maximum number of lines in Vue SFC blocks",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/max-lines-per-block.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: {
					style: {
						type: "integer",
						minimum: 1
					},
					template: {
						type: "integer",
						minimum: 1
					},
					script: {
						type: "integer",
						minimum: 1
					},
					skipBlankLines: {
						type: "boolean",
						minimum: 0
					}
				},
				additionalProperties: false
			}],
			messages: { tooManyLines: "Block has too many lines ({{lineCount}}). Maximum allowed is {{limit}}." }
		},
		create(context) {
			const option = context.options[0] || {};
			/**
			* @type {Record<string, number>}
			*/
			const limits = {
				template: option.template,
				script: option.script,
				style: option.style
			};
			const sourceCode = context.sourceCode;
			const documentFragment = sourceCode.parserServices.getDocumentFragment && sourceCode.parserServices.getDocumentFragment();
			function getTopLevelHTMLElements() {
				if (documentFragment) return documentFragment.children.filter(utils.isVElement);
				return [];
			}
			return { Program(node) {
				if (utils.hasInvalidEOF(node)) return;
				for (const block of getTopLevelHTMLElements()) if (limits[block.name]) {
					let lineCount = block.loc.end.line - block.loc.start.line - 1;
					if (option.skipBlankLines) {
						const lines = SourceCode.splitLines(sourceCode.getText(block));
						lineCount -= lines.filter(isEmptyLine).length;
					}
					if (lineCount > limits[block.name]) context.report({
						node: block,
						messageId: "tooManyLines",
						data: {
							limit: limits[block.name],
							lineCount
						}
					});
				}
			} };
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_max_lines_per_block();
  }
});