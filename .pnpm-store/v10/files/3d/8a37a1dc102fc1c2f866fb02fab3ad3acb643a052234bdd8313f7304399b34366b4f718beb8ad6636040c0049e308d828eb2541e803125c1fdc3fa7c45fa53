'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-v-text.js
/**
* @author tyankatsu <https://github.com/tyankatsu0105>
* See LICENSE file in root directory for full license.
*/
var require_no_v_text = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow use of v-text",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/no-v-text.html"
			},
			fixable: null,
			schema: [],
			messages: { unexpected: "Don't use 'v-text'." }
		},
		create(context) {
			return utils.defineTemplateBodyVisitor(context, { "VAttribute[directive=true][key.name.name='text']"(node) {
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
    return require_no_v_text();
  }
});