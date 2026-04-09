'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-useless-template-attributes.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_useless_template_attributes = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
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
	/**
	* @param {VAttribute | VDirective} attr
	*/
	function isFragmentTemplateAttribute(attr) {
		if (attr.directive) {
			const directiveName = attr.key.name.name;
			if (SPECIAL_TEMPLATE_DIRECTIVES.has(directiveName)) return true;
			if (directiveName === "slot-scope") return true;
			if (directiveName === "scope") return true;
		}
		if (getKeyName(attr) === "slot") return true;
		return false;
	}
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow useless attribute on `<template>`",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/no-useless-template-attributes.html"
			},
			fixable: null,
			schema: [],
			messages: {
				unexpectedAttr: "Unexpected useless attribute on `<template>`.",
				unexpectedDir: "Unexpected useless directive on `<template>`."
			}
		},
		create(context) {
			return utils.defineTemplateBodyVisitor(context, { "VElement[name='template'][parent.type='VElement'] > VStartTag"(node) {
				if (!node.attributes.some(isFragmentTemplateAttribute)) return;
				for (const attr of node.attributes) {
					if (isFragmentTemplateAttribute(attr)) continue;
					if (getKeyName(attr) === "key") continue;
					context.report({
						node: attr,
						messageId: attr.directive ? "unexpectedDir" : "unexpectedAttr"
					});
				}
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_useless_template_attributes();
  }
});