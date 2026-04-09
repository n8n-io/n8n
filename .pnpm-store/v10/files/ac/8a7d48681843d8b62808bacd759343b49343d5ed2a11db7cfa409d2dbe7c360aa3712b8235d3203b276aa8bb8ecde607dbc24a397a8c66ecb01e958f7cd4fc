'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-constant-condition.js
/**
* @author Flo Edelmann
*/
var require_no_constant_condition = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { wrapCoreRule } = require_index.default;
	const conditionalDirectiveNames = new Set([
		"v-show",
		"v-if",
		"v-else-if"
	]);
	module.exports = wrapCoreRule("no-constant-condition", { create(_context, { baseHandlers }) {
		return { VDirectiveKey(node) {
			if (conditionalDirectiveNames.has(`v-${node.name.name}`) && node.parent.value && node.parent.value.expression && baseHandlers.IfStatement) baseHandlers.IfStatement({ test: node.parent.value.expression });
		} };
	} });
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_constant_condition();
  }
});