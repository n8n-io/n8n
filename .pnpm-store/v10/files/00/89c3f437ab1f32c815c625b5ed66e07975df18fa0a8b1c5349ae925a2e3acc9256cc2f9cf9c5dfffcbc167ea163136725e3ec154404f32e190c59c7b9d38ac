'use strict';

const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.js');

//#region lib/rules/syntaxes/v-model-argument.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_v_model_argument = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	module.exports = {
		supported: ">=3.0.0",
		createTemplateBodyVisitor(context) {
			return { "VAttribute[directive=true] > VDirectiveKey[name.name='model'][argument!=null]"(node) {
				context.report({
					node: node.argument,
					messageId: "forbiddenVModelArgument"
				});
			} };
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_v_model_argument();
  }
});