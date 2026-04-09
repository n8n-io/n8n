'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/valid-attribute-name.js
/**
* @author Doug Wade <douglas.b.wade@gmail.com>
* See LICENSE file in root directory for full license.
*/
var require_valid_attribute_name = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const xnv = require("xml-name-validator");
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "require valid attribute names",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/valid-attribute-name.html"
			},
			fixable: null,
			schema: [],
			messages: { attribute: "Attribute name {{name}} is not valid." }
		},
		create(context) {
			/**
			* @param {string | VIdentifier} key
			* @return {string}
			*/
			const getName = (key) => typeof key === "string" ? key : key.name;
			return utils.defineTemplateBodyVisitor(context, { VAttribute(node) {
				if (utils.isCustomComponent(node.parent.parent)) return;
				const name = getName(node.key.name);
				if (node.directive && name === "bind" && node.key.argument && node.key.argument.type === "VIdentifier" && !xnv.name(node.key.argument.name)) context.report({
					node,
					messageId: "attribute",
					data: { name: node.key.argument.name }
				});
				if (!node.directive && !xnv.name(name)) context.report({
					node,
					messageId: "attribute",
					data: { name }
				});
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_valid_attribute_name();
  }
});