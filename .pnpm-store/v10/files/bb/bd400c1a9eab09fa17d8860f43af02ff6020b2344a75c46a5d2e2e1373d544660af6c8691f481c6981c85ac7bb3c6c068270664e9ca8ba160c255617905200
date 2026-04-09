'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/valid-v-memo.js
/**
* @author Yosuke Ota <https://github.com/ota-meshi>
* See LICENSE file in root directory for full license.
*/
var require_valid_v_memo = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "enforce valid `v-memo` directives",
				categories: ["vue3-essential"],
				url: "https://eslint.vuejs.org/rules/valid-v-memo.html"
			},
			fixable: null,
			schema: [],
			messages: {
				unexpectedArgument: "'v-memo' directives require no argument.",
				unexpectedModifier: "'v-memo' directives require no modifier.",
				expectedValue: "'v-memo' directives require that attribute value.",
				expectedArray: "'v-memo' directives require the attribute value to be an array.",
				insideVFor: "'v-memo' directive does not work inside 'v-for'."
			}
		},
		create(context) {
			/** @type {VElement | null} */
			let vForElement = null;
			return utils.defineTemplateBodyVisitor(context, {
				VElement(node) {
					if (!vForElement && utils.hasDirective(node, "for")) vForElement = node;
				},
				"VElement:exit"(node) {
					if (vForElement === node) vForElement = null;
				},
				"VAttribute[directive=true][key.name.name='memo']"(node) {
					if (vForElement && vForElement !== node.parent.parent) context.report({
						node: node.key,
						messageId: "insideVFor"
					});
					if (node.key.argument) context.report({
						node: node.key.argument,
						messageId: "unexpectedArgument"
					});
					const lastModifier = node.key.modifiers.at(-1);
					if (lastModifier) context.report({
						node,
						loc: {
							start: node.key.modifiers[0].loc.start,
							end: lastModifier.loc.end
						},
						messageId: "unexpectedModifier"
					});
					if (!node.value || utils.isEmptyValueDirective(node, context)) {
						context.report({
							node,
							messageId: "expectedValue"
						});
						return;
					}
					if (!node.value.expression) return;
					const expressions = [node.value.expression];
					let expression;
					while (expression = expressions.pop()) switch (expression.type) {
						case "ObjectExpression":
						case "ClassExpression":
						case "ArrowFunctionExpression":
						case "FunctionExpression":
						case "Literal":
						case "TemplateLiteral":
						case "UnaryExpression":
						case "BinaryExpression":
						case "UpdateExpression":
							context.report({
								node: expression,
								messageId: "expectedArray"
							});
							break;
						case "AssignmentExpression":
							expressions.push(expression.right);
							break;
						case "TSAsExpression":
							expressions.push(expression.expression);
							break;
						case "SequenceExpression": {
							const lastExpression = expression.expressions.at(-1);
							if (lastExpression) expressions.push(lastExpression);
							break;
						}
						case "ConditionalExpression":
							expressions.push(expression.consequent, expression.alternate);
							break;
					}
				}
			});
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_valid_v_memo();
  }
});