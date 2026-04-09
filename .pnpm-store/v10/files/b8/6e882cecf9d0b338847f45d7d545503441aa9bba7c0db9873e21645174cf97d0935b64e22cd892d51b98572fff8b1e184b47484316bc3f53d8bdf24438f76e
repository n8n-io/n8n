'use strict';

const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.js');

//#region lib/rules/syntaxes/v-memo.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_v_memo = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	module.exports = {
		supported: ">=3.2.0",
		createTemplateBodyVisitor(context) {
			/**
			* Reports `v-is` node
			* @param {VDirective} vMemoAttr node of `v-is`
			* @returns {void}
			*/
			function reportVMemo(vMemoAttr) {
				context.report({
					node: vMemoAttr.key,
					messageId: "forbiddenVMemo"
				});
			}
			return { "VAttribute[directive=true][key.name.name='memo']": reportVMemo };
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_v_memo();
  }
});