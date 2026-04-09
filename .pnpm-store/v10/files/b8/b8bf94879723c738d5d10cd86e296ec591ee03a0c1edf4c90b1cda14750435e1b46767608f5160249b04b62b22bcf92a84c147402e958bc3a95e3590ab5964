'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_scope_attribute$1 = require('./syntaxes/scope-attribute.js');

//#region lib/rules/no-deprecated-scope-attribute.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_deprecated_scope_attribute = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const scopeAttribute = require_scope_attribute$1.default;
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow deprecated `scope` attribute (in Vue.js 2.5.0+)",
				categories: ["vue3-essential"],
				url: "https://eslint.vuejs.org/rules/no-deprecated-scope-attribute.html"
			},
			fixable: "code",
			schema: [],
			messages: { forbiddenScopeAttribute: "`scope` attributes are deprecated." }
		},
		create(context) {
			const templateBodyVisitor = scopeAttribute.createTemplateBodyVisitor(context);
			return utils.defineTemplateBodyVisitor(context, templateBodyVisitor);
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_deprecated_scope_attribute();
  }
});