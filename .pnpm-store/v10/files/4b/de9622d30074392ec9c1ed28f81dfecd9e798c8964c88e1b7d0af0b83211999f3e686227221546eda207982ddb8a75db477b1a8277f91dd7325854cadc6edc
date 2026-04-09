'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_casing$1 = require('../utils/casing.js');

//#region lib/rules/no-unused-components.js
/**
* @fileoverview Report used components
* @author Michał Sajnóg
*/
var require_no_unused_components = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const casing = require_casing$1.default;
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow registering components that are not used inside templates",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/no-unused-components.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: { ignoreWhenBindingPresent: { type: "boolean" } },
				additionalProperties: false
			}],
			messages: { unused: "The \"{{name}}\" component has been registered but not used." }
		},
		create(context) {
			const options = context.options[0] || {};
			const ignoreWhenBindingPresent = options.ignoreWhenBindingPresent === void 0 ? true : options.ignoreWhenBindingPresent;
			const usedComponents = /* @__PURE__ */ new Set();
			/** @type { { node: Property, name: string }[] } */
			let registeredComponents = [];
			let ignoreReporting = false;
			/** @type {Position} */
			let templateLocation;
			return utils.defineTemplateBodyVisitor(context, {
				VElement(node) {
					if (!utils.isHtmlElementNode(node) && !utils.isSvgElementNode(node) && !utils.isMathElementNode(node) || utils.isHtmlWellKnownElementName(node.rawName) || utils.isSvgWellKnownElementName(node.rawName) || utils.isMathWellKnownElementName(node.rawName)) return;
					usedComponents.add(node.rawName);
				},
				"VAttribute[directive=true][key.name.name='bind'][key.argument.name='is'], VAttribute[directive=true][key.name.name='is']"(node) {
					if (!node.value || node.value.type !== "VExpressionContainer" || !node.value.expression) return;
					if (node.value.expression.type === "Literal") usedComponents.add(node.value.expression.value);
					else if (ignoreWhenBindingPresent) ignoreReporting = true;
				},
				"VAttribute[directive=false][key.name='is']"(node) {
					if (!node.value) return;
					const value = node.value.value.startsWith("vue:") ? node.value.value.slice(4) : node.value.value;
					usedComponents.add(value);
				},
				"VElement[name='template']"(node) {
					templateLocation = templateLocation || node.loc.start;
				},
				"VElement[name='template']:exit"(node) {
					if (node.loc.start !== templateLocation || ignoreReporting || utils.hasAttribute(node, "src")) return;
					for (const { node: node$1, name } of registeredComponents) {
						if (casing.isPascalCase(name) || casing.isCamelCase(name)) {
							if ([...usedComponents].some((n) => !n.includes("_") && (name === casing.pascalCase(n) || name === casing.camelCase(n)))) continue;
						} else if (usedComponents.has(name)) continue;
						context.report({
							node: node$1,
							messageId: "unused",
							data: { name }
						});
					}
				}
			}, utils.executeOnVue(context, (obj) => {
				registeredComponents = utils.getRegisteredComponents(obj);
			}));
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_unused_components();
  }
});