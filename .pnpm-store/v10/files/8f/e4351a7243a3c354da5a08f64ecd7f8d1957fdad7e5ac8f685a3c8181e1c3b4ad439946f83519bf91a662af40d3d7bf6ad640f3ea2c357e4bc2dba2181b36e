'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-deprecated-destroyed-lifecycle.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_deprecated_destroyed_lifecycle = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	* @param {RuleFixer} fixer
	* @param {Property} property
	* @param {string} newName
	*/
	function fix(fixer, property, newName) {
		if (property.computed) {
			if (property.key.type === "Literal" || property.key.type === "TemplateLiteral") return fixer.replaceTextRange([property.key.range[0] + 1, property.key.range[1] - 1], newName);
			return null;
		}
		if (property.shorthand) return fixer.insertTextBefore(property.key, `${newName}:`);
		return fixer.replaceText(property.key, newName);
	}
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow using deprecated `destroyed` and `beforeDestroy` lifecycle hooks (in Vue.js 3.0.0+)",
				categories: ["vue3-essential"],
				url: "https://eslint.vuejs.org/rules/no-deprecated-destroyed-lifecycle.html"
			},
			fixable: "code",
			schema: [],
			messages: {
				deprecatedDestroyed: "The `destroyed` lifecycle hook is deprecated. Use `unmounted` instead.",
				deprecatedBeforeDestroy: "The `beforeDestroy` lifecycle hook is deprecated. Use `beforeUnmount` instead."
			}
		},
		create(context) {
			return utils.executeOnVue(context, (obj) => {
				const destroyed = utils.findProperty(obj, "destroyed");
				if (destroyed) context.report({
					node: destroyed.key,
					messageId: "deprecatedDestroyed",
					fix(fixer) {
						return fix(fixer, destroyed, "unmounted");
					}
				});
				const beforeDestroy = utils.findProperty(obj, "beforeDestroy");
				if (beforeDestroy) context.report({
					node: beforeDestroy.key,
					messageId: "deprecatedBeforeDestroy",
					fix(fixer) {
						return fix(fixer, beforeDestroy, "beforeUnmount");
					}
				});
			});
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_deprecated_destroyed_lifecycle();
  }
});