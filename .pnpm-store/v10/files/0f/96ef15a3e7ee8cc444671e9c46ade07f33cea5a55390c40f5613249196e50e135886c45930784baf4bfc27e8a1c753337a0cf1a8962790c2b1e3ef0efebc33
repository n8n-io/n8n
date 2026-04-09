'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/one-component-per-file.js
/**
* @fileoverview enforce that each component should be in its own file
* @author Armano
*/
var require_one_component_per_file = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const { getVueComponentDefinitionType } = require_index.default;
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "enforce that each component should be in its own file",
				categories: ["vue3-strongly-recommended", "vue2-strongly-recommended"],
				url: "https://eslint.vuejs.org/rules/one-component-per-file.html"
			},
			fixable: null,
			schema: [],
			messages: { toManyComponents: "There is more than one component in this file." }
		},
		create(context) {
			/** @type {ObjectExpression[]} */
			const components = [];
			return Object.assign({}, utils.executeOnVueComponent(context, (node, type) => {
				if (type === "definition") {
					if (getVueComponentDefinitionType(node) === "mixin") return;
				}
				components.push(node);
			}), { "Program:exit"() {
				if (components.length > 1) for (const node of components) context.report({
					node,
					messageId: "toManyComponents"
				});
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_one_component_per_file();
  }
});