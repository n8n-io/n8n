'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_slot_scope_attribute$1 = require('./syntaxes/slot-scope-attribute.js');

//#region lib/rules/no-deprecated-slot-scope-attribute.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_deprecated_slot_scope_attribute = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const slotScopeAttribute = require_slot_scope_attribute$1.default;
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow deprecated `slot-scope` attribute (in Vue.js 2.6.0+)",
				categories: ["vue3-essential"],
				url: "https://eslint.vuejs.org/rules/no-deprecated-slot-scope-attribute.html"
			},
			fixable: "code",
			schema: [],
			messages: { forbiddenSlotScopeAttribute: "`slot-scope` are deprecated." }
		},
		create(context) {
			const templateBodyVisitor = slotScopeAttribute.createTemplateBodyVisitor(context, { fixToUpgrade: true });
			return utils.defineTemplateBodyVisitor(context, templateBodyVisitor);
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_deprecated_slot_scope_attribute();
  }
});