'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/func-call-spacing.js
/**
* @author Yosuke Ota
*/
var require_func_call_spacing = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { wrapStylisticOrCoreRule } = require_index.default;
	module.exports = wrapStylisticOrCoreRule({
		core: "func-call-spacing",
		stylistic: "function-call-spacing",
		vue: "func-call-spacing"
	}, {
		skipDynamicArguments: true,
		applyDocument: true
	});
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_func_call_spacing();
  }
});