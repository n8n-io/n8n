'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-deprecated-inline-template.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_deprecated_inline_template = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow using deprecated `inline-template` attribute (in Vue.js 3.0.0+)",
				categories: ["vue3-essential"],
				url: "https://eslint.vuejs.org/rules/no-deprecated-inline-template.html"
			},
			fixable: null,
			schema: [],
			messages: { unexpected: "`inline-template` are deprecated." }
		},
		create(context) {
			return utils.defineTemplateBodyVisitor(context, { "VAttribute[directive=false] > VIdentifier[rawName='inline-template']"(node) {
				context.report({
					node,
					loc: node.loc,
					messageId: "unexpected"
				});
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_deprecated_inline_template();
  }
});