'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/enforce-style-attribute.js
/**
* @author Mussin Benarbia
* See LICENSE file in root directory for full license.
*/
var require_enforce_style_attribute = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { isVElement } = require_index.default;
	/**
	* check whether a tag has the `scoped` attribute
	* @param {VElement} componentBlock
	*/
	function isScoped(componentBlock) {
		return componentBlock.startTag.attributes.some((attribute) => !attribute.directive && attribute.key.name === "scoped");
	}
	/**
	* check whether a tag has the `module` attribute
	* @param {VElement} componentBlock
	*/
	function isModule(componentBlock) {
		return componentBlock.startTag.attributes.some((attribute) => !attribute.directive && attribute.key.name === "module");
	}
	/**
	* check if a tag doesn't have either the `scoped` nor `module` attribute
	* @param {VElement} componentBlock
	*/
	function isPlain(componentBlock) {
		return !isScoped(componentBlock) && !isModule(componentBlock);
	}
	/** @param {RuleContext} context */
	function getUserDefinedAllowedAttrs(context) {
		if (context.options[0] && context.options[0].allow) return context.options[0].allow;
		return [];
	}
	const defaultAllowedAttrs = ["scoped"];
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "enforce or forbid the use of the `scoped` and `module` attributes in SFC top level style tags",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/enforce-style-attribute.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: { allow: {
					type: "array",
					minItems: 1,
					uniqueItems: true,
					items: {
						type: "string",
						enum: [
							"plain",
							"scoped",
							"module"
						]
					}
				} },
				additionalProperties: false
			}],
			messages: {
				notAllowedScoped: "The scoped attribute is not allowed. Allowed: {{ allowedAttrsString }}.",
				notAllowedModule: "The module attribute is not allowed. Allowed: {{ allowedAttrsString }}.",
				notAllowedPlain: "Plain <style> tags are not allowed. Allowed: {{ allowedAttrsString }}."
			}
		},
		create(context) {
			const sourceCode = context.sourceCode;
			if (!sourceCode.parserServices.getDocumentFragment) return {};
			const documentFragment = sourceCode.parserServices.getDocumentFragment();
			if (!documentFragment) return {};
			const topLevelStyleTags = documentFragment.children.filter(
				/** @returns {element is VElement} */
				(element) => isVElement(element) && element.rawName === "style"
			);
			if (topLevelStyleTags.length === 0) return {};
			const userDefinedAllowedAttrs = getUserDefinedAllowedAttrs(context);
			const allowedAttrs = userDefinedAllowedAttrs.length > 0 ? userDefinedAllowedAttrs : defaultAllowedAttrs;
			const allowsPlain = allowedAttrs.includes("plain");
			const allowsScoped = allowedAttrs.includes("scoped");
			const allowsModule = allowedAttrs.includes("module");
			const allowedAttrsString = [...allowedAttrs].sort().join(", ");
			return { Program() {
				for (const styleTag of topLevelStyleTags) {
					if (!allowsPlain && isPlain(styleTag)) {
						context.report({
							node: styleTag,
							messageId: "notAllowedPlain",
							data: { allowedAttrsString }
						});
						return;
					}
					if (!allowsScoped && isScoped(styleTag)) {
						context.report({
							node: styleTag,
							messageId: "notAllowedScoped",
							data: { allowedAttrsString }
						});
						return;
					}
					if (!allowsModule && isModule(styleTag)) {
						context.report({
							node: styleTag,
							messageId: "notAllowedModule",
							data: { allowedAttrsString }
						});
						return;
					}
				}
			} };
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_enforce_style_attribute();
  }
});