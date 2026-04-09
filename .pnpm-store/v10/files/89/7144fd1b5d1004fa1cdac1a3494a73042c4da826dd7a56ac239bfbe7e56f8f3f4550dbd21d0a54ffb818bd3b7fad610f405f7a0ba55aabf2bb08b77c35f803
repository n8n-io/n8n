'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-literals-in-template.js
/**
* @author rzzf
* See LICENSE file in root directory for full license.
*/
var require_no_literals_in_template = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	* @type {Record<string, 'object' | 'array' | 'function' | 'arrow function' | undefined>}
	*/
	const EXPRESSION_TYPES = {
		ObjectExpression: "object",
		ArrayExpression: "array",
		FunctionExpression: "function",
		ArrowFunctionExpression: "arrow function"
	};
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow object, array, and function literals in template",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/no-literals-in-template.html"
			},
			fixable: null,
			schema: [],
			messages: { unexpected: "Unexpected {{type}} literal in template." }
		},
		create(context) {
			/** @type {Set<VElement>} */
			const upperElements = /* @__PURE__ */ new Set();
			/**
			* Checks whether the given node refers to a variable of the element.
			* @param {Expression | VForExpression | VOnExpression | VSlotScopeExpression | VFilterSequenceExpression} node
			*/
			function hasReferenceUpperElementVariable(node) {
				for (const element of upperElements) for (const variable of element.variables) for (const reference of variable.references) {
					const { range } = reference.id;
					if (node.range[0] <= range[0] && range[1] <= node.range[1]) return true;
				}
				return false;
			}
			return utils.defineTemplateBodyVisitor(context, {
				VElement(node) {
					upperElements.add(node);
				},
				"VElement:exit"(node) {
					upperElements.delete(node);
				},
				"VAttribute[directive=true][key.name.name='bind']"(node) {
					const expression = node.value?.expression;
					if (!expression || node.key.argument && node.key.argument.type === "VIdentifier" && (node.key.argument.name === "class" || node.key.argument.name === "style")) return;
					const type = EXPRESSION_TYPES[expression.type];
					if (type && !hasReferenceUpperElementVariable(expression)) context.report({
						node: expression,
						messageId: "unexpected",
						data: { type }
					});
				}
			});
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_literals_in_template();
  }
});