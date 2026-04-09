'use strict';

const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.js');

//#region lib/rules/syntaxes/v-bind-prop-modifier-shorthand.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_v_bind_prop_modifier_shorthand = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	module.exports = {
		supported: ">=3.2.0 || >=2.6.0-beta.1 <=2.6.0-beta.3",
		createTemplateBodyVisitor(context) {
			/**
			* Reports `.prop` shorthand node
			* @param { VDirectiveKey & { argument: VIdentifier } } bindPropKey node of `.prop` shorthand
			* @returns {void}
			*/
			function reportPropModifierShorthand(bindPropKey) {
				context.report({
					node: bindPropKey,
					messageId: "forbiddenVBindPropModifierShorthand",
					fix: (fixer) => fixer.replaceText(bindPropKey, `:${bindPropKey.argument.rawName}.prop`)
				});
			}
			return { "VAttribute[directive=true] > VDirectiveKey[name.name='bind'][name.rawName='.']": reportPropModifierShorthand };
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_v_bind_prop_modifier_shorthand();
  }
});