'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-textarea-mustache.js
/**
* @author Toru Nagashima
* @copyright 2017 Toru Nagashima. All rights reserved.
* See LICENSE file in root directory for full license.
*/
var require_no_textarea_mustache = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow mustaches in `<textarea>`",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/no-textarea-mustache.html"
			},
			fixable: null,
			schema: [],
			messages: { unexpected: "Unexpected mustache. Use 'v-model' instead." }
		},
		create(context) {
			return utils.defineTemplateBodyVisitor(context, { "VElement[rawName='textarea'] VExpressionContainer"(node) {
				if (node.parent.type !== "VElement") return;
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
    return require_no_textarea_mustache();
  }
});