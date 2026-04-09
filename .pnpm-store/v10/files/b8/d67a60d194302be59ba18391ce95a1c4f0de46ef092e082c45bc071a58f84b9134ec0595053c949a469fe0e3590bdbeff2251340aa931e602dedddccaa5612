'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-deprecated-vue-config-keycodes.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_deprecated_vue_config_keycodes = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow using deprecated `Vue.config.keyCodes` (in Vue.js 3.0.0+)",
				categories: ["vue3-essential"],
				url: "https://eslint.vuejs.org/rules/no-deprecated-vue-config-keycodes.html"
			},
			fixable: null,
			schema: [],
			messages: { unexpected: "`Vue.config.keyCodes` are deprecated." }
		},
		create(context) {
			return { "MemberExpression[property.type='Identifier'][property.name='keyCodes']"(node) {
				const config = utils.skipChainExpression(node.object);
				if (config.type !== "MemberExpression" || config.property.type !== "Identifier" || config.property.name !== "config" || config.object.type !== "Identifier" || config.object.name !== "Vue") return;
				context.report({
					node,
					messageId: "unexpected"
				});
			} };
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_deprecated_vue_config_keycodes();
  }
});