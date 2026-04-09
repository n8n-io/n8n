'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-multiple-objects-in-class.js
/**
* @author tyankatsu <https://github.com/tyankatsu0105>
* See LICENSE file in root directory for full license.
*/
var require_no_multiple_objects_in_class = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { defineTemplateBodyVisitor } = require_index.default;
	/**
	* count ObjectExpression element
	* @param {VDirective & {value: VExpressionContainer & {expression: ArrayExpression}}} node
	* @return {number}
	*/
	function countObjectExpression(node) {
		return node.value.expression.elements.filter((element) => element && element.type === "ObjectExpression").length;
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow passing multiple objects in an array to class",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/no-multiple-objects-in-class.html"
			},
			fixable: null,
			schema: [],
			messages: { unexpected: "Unexpected multiple objects. Merge objects." }
		},
		create(context) {
			return defineTemplateBodyVisitor(context, { "VAttribute[directive=true][key.argument.name=\"class\"][key.name.name=\"bind\"][value.expression.type=\"ArrayExpression\"]"(node) {
				if (countObjectExpression(node) > 1) context.report({
					node,
					loc: node.loc,
					messageId: "unexpected"
				});
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_multiple_objects_in_class();
  }
});