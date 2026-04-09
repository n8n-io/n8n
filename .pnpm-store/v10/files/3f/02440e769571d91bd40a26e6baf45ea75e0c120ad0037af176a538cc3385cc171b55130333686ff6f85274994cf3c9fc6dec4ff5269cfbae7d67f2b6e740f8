'use strict';

const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.js');

//#region lib/rules/syntaxes/scope-attribute.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_scope_attribute = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	module.exports = {
		deprecated: "2.5.0",
		supported: "<3.0.0",
		createTemplateBodyVisitor(context) {
			/**
			* Reports `scope` node
			* @param {VDirectiveKey} scopeKey node of `scope`
			* @returns {void}
			*/
			function reportScope(scopeKey) {
				context.report({
					node: scopeKey,
					messageId: "forbiddenScopeAttribute",
					fix: (fixer) => fixer.replaceText(scopeKey, "slot-scope")
				});
			}
			return { "VAttribute[directive=true] > VDirectiveKey[name.name='scope']": reportScope };
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_scope_attribute();
  }
});