'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/comma-style.js
/**
* @author Yosuke Ota
*/
var require_comma_style = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { wrapStylisticOrCoreRule } = require_index.default;
	module.exports = wrapStylisticOrCoreRule("comma-style", { create(_context, { baseHandlers }) {
		return { VSlotScopeExpression(node) {
			if (baseHandlers.FunctionExpression) baseHandlers.FunctionExpression(node);
		} };
	} });
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_comma_style();
  }
});