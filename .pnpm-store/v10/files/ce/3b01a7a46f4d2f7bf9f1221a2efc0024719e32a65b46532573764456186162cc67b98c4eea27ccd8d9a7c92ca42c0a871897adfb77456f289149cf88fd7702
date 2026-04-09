'use strict';

const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.js');
const require_index = require('../../utils/index.js');

//#region lib/rules/syntaxes/define-model.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_define_model = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		supported: ">=3.4.0",
		createScriptVisitor(context) {
			return utils.defineScriptSetupVisitor(context, { onDefineModelEnter(node) {
				context.report({
					node,
					messageId: "forbiddenDefineModel"
				});
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_define_model();
  }
});