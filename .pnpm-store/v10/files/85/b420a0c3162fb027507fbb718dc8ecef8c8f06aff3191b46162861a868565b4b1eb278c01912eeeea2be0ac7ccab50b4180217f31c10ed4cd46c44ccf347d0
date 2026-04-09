'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/require-prop-types.js
/**
* @fileoverview Prop definitions should be detailed
* @author Armano
*/
var require_require_prop_types = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	* @typedef {import('../utils').ComponentProp} ComponentProp
	*/
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "require type definitions in props",
				categories: ["vue3-strongly-recommended", "vue2-strongly-recommended"],
				url: "https://eslint.vuejs.org/rules/require-prop-types.html"
			},
			fixable: null,
			schema: [],
			messages: { requireType: "Prop \"{{name}}\" should define at least its type." }
		},
		create(context) {
			/**
			* @param {Expression} node
			* @returns {boolean|null}
			*/
			function optionHasType(node) {
				switch (node.type) {
					case "ObjectExpression": return objectHasType(node);
					case "ArrayExpression": return node.elements.length > 0;
					case "FunctionExpression":
					case "ArrowFunctionExpression": return false;
				}
				return null;
			}
			/**
			* @param {ObjectExpression} node
			* @returns {boolean}
			*/
			function objectHasType(node) {
				const typeProperty = node.properties.find((p) => p.type === "Property" && utils.getStaticPropertyName(p) === "type" && (p.value.type !== "ArrayExpression" || p.value.elements.length > 0));
				const validatorProperty = node.properties.find((p) => p.type === "Property" && utils.getStaticPropertyName(p) === "validator");
				return Boolean(typeProperty || validatorProperty);
			}
			/**
			* @param {ComponentProp} prop
			*/
			function checkProperty(prop) {
				if (prop.type !== "object" && prop.type !== "array") return;
				if (!(prop.type === "array" ? false : optionHasType(prop.value) ?? true)) {
					const { node, propName } = prop;
					const name = propName || node.type === "Identifier" && node.name || "Unknown prop";
					context.report({
						node,
						messageId: "requireType",
						data: { name }
					});
				}
			}
			return utils.compositingVisitors(utils.defineScriptSetupVisitor(context, {
				onDefinePropsEnter(_node, props) {
					for (const prop of props) checkProperty(prop);
				},
				onDefineModelEnter(node, model) {
					if (model.typeNode) return;
					if (model.options && (optionHasType(model.options) ?? true)) return;
					context.report({
						node: model.options || node,
						messageId: "requireType",
						data: { name: model.name.modelName }
					});
				}
			}), utils.executeOnVue(context, (obj) => {
				const props = utils.getComponentPropsFromOptions(obj);
				for (const prop of props) checkProperty(prop);
			}));
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_require_prop_types();
  }
});