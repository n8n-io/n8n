'use strict';

const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.js');

//#region lib/rules/syntaxes/v-model-custom-modifiers.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_v_model_custom_modifiers = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const BUILTIN_MODIFIERS = new Set([
		"lazy",
		"number",
		"trim"
	]);
	module.exports = {
		supported: ">=3.0.0",
		createTemplateBodyVisitor(context) {
			return { "VAttribute[directive=true] > VDirectiveKey[name.name='model'][modifiers.length>0]"(node) {
				for (const modifier of node.modifiers) if (!BUILTIN_MODIFIERS.has(modifier.name)) context.report({
					node: modifier,
					messageId: "forbiddenVModelCustomModifiers"
				});
			} };
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_v_model_custom_modifiers();
  }
});