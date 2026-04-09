'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_regexp$1 = require('../utils/regexp.js');

//#region lib/rules/no-restricted-block.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_restricted_block = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const regexp = require_regexp$1.default;
	/**
	* @typedef {object} ParsedOption
	* @property { (block: VElement) => boolean } test
	* @property {string} [message]
	*/
	/**
	* @param {any} option
	* @returns {ParsedOption}
	*/
	function parseOption(option) {
		if (typeof option === "string") {
			const matcher = regexp.toRegExp(option, { remove: "g" });
			return { test(block) {
				return matcher.test(block.rawName);
			} };
		}
		const parsed = parseOption(option.element);
		parsed.message = option.message;
		return parsed;
	}
	/**
	* @param {VElement} block
	*/
	function defaultMessage(block) {
		return `Using \`<${block.rawName}>\` is not allowed.`;
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow specific block",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/no-restricted-block.html"
			},
			fixable: null,
			schema: {
				type: "array",
				items: { oneOf: [{ type: "string" }, {
					type: "object",
					properties: {
						element: { type: "string" },
						message: {
							type: "string",
							minLength: 1
						}
					},
					required: ["element"],
					additionalProperties: false
				}] },
				uniqueItems: true,
				minItems: 0
			},
			messages: { restrictedBlock: "{{message}}" }
		},
		create(context) {
			/** @type {ParsedOption[]} */
			const options = context.options.map(parseOption);
			const sourceCode = context.sourceCode;
			const documentFragment = sourceCode.parserServices.getDocumentFragment && sourceCode.parserServices.getDocumentFragment();
			function getTopLevelHTMLElements() {
				if (documentFragment) return documentFragment.children.filter(utils.isVElement);
				return [];
			}
			return { Program(node) {
				if (utils.hasInvalidEOF(node)) return;
				for (const block of getTopLevelHTMLElements()) for (const option of options) if (option.test(block)) {
					const message = option.message || defaultMessage(block);
					context.report({
						node: block.startTag,
						messageId: "restrictedBlock",
						data: { message }
					});
					break;
				}
			} };
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_restricted_block();
  }
});