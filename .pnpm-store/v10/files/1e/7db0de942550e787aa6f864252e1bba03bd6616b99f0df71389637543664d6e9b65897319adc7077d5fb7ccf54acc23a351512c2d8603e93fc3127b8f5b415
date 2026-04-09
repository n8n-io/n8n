'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-deprecated-html-element-is.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_deprecated_html_element_is = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow using deprecated the `is` attribute on HTML elements (in Vue.js 3.0.0+)",
				categories: ["vue3-essential"],
				url: "https://eslint.vuejs.org/rules/no-deprecated-html-element-is.html"
			},
			fixable: null,
			schema: [],
			messages: { unexpected: "The `is` attribute on HTML element are deprecated." }
		},
		create(context) {
			/** @param {VElement} node */
			function isValidElement(node) {
				return !utils.isHtmlWellKnownElementName(node.rawName) && !utils.isSvgWellKnownElementName(node.rawName) && !utils.isMathWellKnownElementName(node.rawName);
			}
			return utils.defineTemplateBodyVisitor(context, {
				"VAttribute[directive=true][key.name.name='bind'][key.argument.name='is']"(node) {
					if (isValidElement(node.parent.parent)) return;
					context.report({
						node,
						loc: node.loc,
						messageId: "unexpected"
					});
				},
				"VAttribute[directive=false][key.name='is']"(node) {
					if (isValidElement(node.parent.parent)) return;
					if (node.value && node.value.value.startsWith("vue:")) return;
					context.report({
						node,
						loc: node.loc,
						messageId: "unexpected"
					});
				}
			});
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_deprecated_html_element_is();
  }
});