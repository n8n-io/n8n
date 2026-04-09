'use strict';

const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.js');

//#region lib/rules/syntaxes/v-bind-attr-modifier.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_v_bind_attr_modifier = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	module.exports = {
		supported: ">=3.2.0",
		createTemplateBodyVisitor(context) {
			/**
			* Reports `v-bind.attr` node
			* @param { VIdentifier } mod node of `v-bind.attr`
			* @returns {void}
			*/
			function report(mod) {
				context.report({
					node: mod,
					messageId: "forbiddenVBindAttrModifier"
				});
			}
			return { "VAttribute[directive=true][key.name.name='bind']"(node) {
				const attrMod = node.key.modifiers.find((m) => m.name === "attr");
				if (attrMod) report(attrMod);
			} };
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_v_bind_attr_modifier();
  }
});