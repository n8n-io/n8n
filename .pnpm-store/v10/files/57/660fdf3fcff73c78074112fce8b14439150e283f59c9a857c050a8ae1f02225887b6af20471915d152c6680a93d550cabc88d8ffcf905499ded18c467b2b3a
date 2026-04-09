'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_slot_attribute$1 = require('./syntaxes/slot-attribute.js');

//#region lib/rules/no-deprecated-slot-attribute.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_deprecated_slot_attribute = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const slotAttribute = require_slot_attribute$1.default;
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow deprecated `slot` attribute (in Vue.js 2.6.0+)",
				categories: ["vue3-essential"],
				url: "https://eslint.vuejs.org/rules/no-deprecated-slot-attribute.html"
			},
			fixable: "code",
			schema: [{
				type: "object",
				properties: {
					ignore: {
						type: "array",
						items: { type: "string" },
						uniqueItems: true
					},
					ignoreParents: {
						type: "array",
						items: { type: "string" },
						uniqueItems: true
					}
				},
				additionalProperties: false
			}],
			messages: { forbiddenSlotAttribute: "`slot` attributes are deprecated." }
		},
		create(context) {
			const templateBodyVisitor = slotAttribute.createTemplateBodyVisitor(context);
			return utils.defineTemplateBodyVisitor(context, templateBodyVisitor);
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_deprecated_slot_attribute();
  }
});