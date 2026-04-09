'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/valid-template-root.js
/**
* @author Toru Nagashima
* @copyright 2017 Toru Nagashima. All rights reserved.
* See LICENSE file in root directory for full license.
*/
var require_valid_template_root = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "enforce valid template root",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/valid-template-root.html"
			},
			fixable: null,
			schema: [],
			messages: {
				emptySrc: "The template root with 'src' attribute is required to be empty.",
				noChild: "The template requires child element."
			}
		},
		create(context) {
			const sourceCode = context.sourceCode;
			return { Program(program) {
				const element = program.templateBody;
				if (element == null) return;
				const hasSrc = utils.hasAttribute(element, "src");
				const rootElements = [];
				for (const child of element.children) if (sourceCode.getText(child).trim() !== "") rootElements.push(child);
				if (hasSrc && rootElements.length > 0) for (const element$1 of rootElements) context.report({
					node: element$1,
					loc: element$1.loc,
					messageId: "emptySrc"
				});
				else if (rootElements.length === 0 && !hasSrc) context.report({
					node: element,
					loc: element.loc,
					messageId: "noChild"
				});
			} };
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_valid_template_root();
  }
});