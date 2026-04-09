'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/require-render-return.js
/**
* @fileoverview Enforces render function to always return value.
* @author Armano
*/
var require_require_render_return = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "enforce render function to always return value",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/require-render-return.html"
			},
			fixable: null,
			schema: [],
			messages: { expectedReturn: "Expected to return a value in render function." }
		},
		create(context) {
			/** @type {Map<ESNode, Property['key']>} */
			const renderFunctions = /* @__PURE__ */ new Map();
			return utils.compositingVisitors(utils.defineVueVisitor(context, { onRenderFunctionEnter(node) {
				renderFunctions.set(node, node.parent.key);
			} }), utils.executeOnFunctionsWithoutReturn(true, (node) => {
				const key = renderFunctions.get(node);
				if (key) context.report({
					node: key,
					messageId: "expectedReturn"
				});
			}));
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_require_render_return();
  }
});