'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_casing$1 = require('../utils/casing.js');

//#region lib/rules/slot-name-casing.js
/**
* @author Wayne Zhang
* See LICENSE file in root directory for full license.
*/
var require_slot_name_casing = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const casing = require_casing$1.default;
	/**
	* @typedef { 'camelCase' | 'kebab-case' | 'singleword' } OptionType
	* @typedef { (str: string) => boolean } CheckerType
	*/
	/**
	* Checks whether the given string is a single word.
	* @param {string} str
	* @return {boolean}
	*/
	function isSingleWord(str) {
		return /^[a-z]+$/u.test(str);
	}
	/** @type {OptionType[]} */
	const allowedCaseOptions = [
		"camelCase",
		"kebab-case",
		"singleword"
	];
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "enforce specific casing for slot names",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/slot-name-casing.html"
			},
			fixable: null,
			schema: [{ enum: allowedCaseOptions }],
			messages: { invalidCase: "Slot name \"{{name}}\" is not {{caseType}}." }
		},
		create(context) {
			const option = context.options[0];
			/** @type {OptionType} */
			const caseType = allowedCaseOptions.includes(option) ? option : "camelCase";
			/** @type {CheckerType} */
			const checker = caseType === "singleword" ? isSingleWord : casing.getChecker(caseType);
			/** @param {VAttribute} node */
			function processSlotNode(node) {
				const name = node.value?.value;
				if (name && !checker(name)) context.report({
					node,
					loc: node.loc,
					messageId: "invalidCase",
					data: {
						name,
						caseType
					}
				});
			}
			return utils.defineTemplateBodyVisitor(context, { "VElement[name='slot']"(node) {
				const slotName = utils.getAttribute(node, "name");
				if (slotName) processSlotNode(slotName);
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_slot_name_casing();
  }
});