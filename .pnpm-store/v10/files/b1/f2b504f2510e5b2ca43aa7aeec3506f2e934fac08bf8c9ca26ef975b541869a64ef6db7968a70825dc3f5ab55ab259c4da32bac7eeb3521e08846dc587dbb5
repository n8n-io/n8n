'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_v_is$1 = require('./syntaxes/v-is.js');

//#region lib/rules/no-deprecated-v-is.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_deprecated_v_is = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const vIs = require_v_is$1.default;
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow deprecated `v-is` directive (in Vue.js 3.1.0+)",
				categories: ["vue3-essential"],
				url: "https://eslint.vuejs.org/rules/no-deprecated-v-is.html"
			},
			fixable: null,
			schema: [],
			messages: { forbiddenVIs: "`v-is` directive is deprecated." }
		},
		create(context) {
			const templateBodyVisitor = vIs.createTemplateBodyVisitor(context);
			return utils.defineTemplateBodyVisitor(context, templateBodyVisitor);
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_deprecated_v_is();
  }
});