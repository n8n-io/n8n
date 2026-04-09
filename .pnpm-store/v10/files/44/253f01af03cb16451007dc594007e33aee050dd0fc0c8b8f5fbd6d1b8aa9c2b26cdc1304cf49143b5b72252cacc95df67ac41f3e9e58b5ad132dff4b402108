'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-lone-template.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_lone_template = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const SPECIAL_TEMPLATE_DIRECTIVES = new Set([
		"if",
		"else",
		"else-if",
		"for",
		"slot"
	]);
	/**
	* @param {VAttribute | VDirective} attr
	*/
	function getKeyName(attr) {
		if (attr.directive) {
			if (attr.key.name.name !== "bind") return null;
			if (!attr.key.argument || attr.key.argument.type === "VExpressionContainer") return null;
			return attr.key.argument.name;
		}
		return attr.key.name;
	}
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow unnecessary `<template>`",
				categories: ["vue3-recommended", "vue2-recommended"],
				url: "https://eslint.vuejs.org/rules/no-lone-template.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: { ignoreAccessible: { type: "boolean" } },
				additionalProperties: false
			}],
			messages: { requireDirective: "`<template>` require directive." }
		},
		create(context) {
			const ignoreAccessible = (context.options[0] || {}).ignoreAccessible === true;
			return utils.defineTemplateBodyVisitor(context, { "VElement[name='template'][parent.type='VElement'] > VStartTag"(node) {
				if (node.attributes.some((attr) => {
					if (attr.directive) {
						const directiveName = attr.key.name.name;
						if (SPECIAL_TEMPLATE_DIRECTIVES.has(directiveName)) return true;
						if (directiveName === "slot-scope") return true;
						if (directiveName === "scope") return true;
					}
					if (getKeyName(attr) === "slot") return true;
					return false;
				})) return;
				if (ignoreAccessible && node.attributes.some((attr) => {
					const keyName = getKeyName(attr);
					return keyName === "id" || keyName === "ref";
				})) return;
				context.report({
					node,
					messageId: "requireDirective"
				});
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_lone_template();
  }
});