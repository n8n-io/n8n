'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-negated-v-if-condition.js
/**
* @author Wayne Zhang
* See LICENSE file in root directory for full license.
*/
var require_no_negated_v_if_condition = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	* @typedef { VDirective & { value: (VExpressionContainer & { expression: Expression | null } ) | null  } } VIfDirective
	*/
	/**
	* @param {Expression} expression
	* @returns {boolean}
	*/
	function isNegatedExpression(expression) {
		return expression.type === "UnaryExpression" && expression.operator === "!" || expression.type === "BinaryExpression" && (expression.operator === "!=" || expression.operator === "!==");
	}
	/**
	* @param {VElement} node
	* @returns {VElement|null}
	*/
	function getNextSibling(node) {
		if (!node.parent?.children) return null;
		const siblings = node.parent.children;
		const currentIndex = siblings.indexOf(node);
		for (let i = currentIndex + 1; i < siblings.length; i++) {
			const sibling = siblings[i];
			if (sibling.type === "VElement") return sibling;
		}
		return null;
	}
	/**
	* @param {VElement} element
	* @returns {boolean}
	*/
	function isDirectlyFollowedByElse(element) {
		const nextElement = getNextSibling(element);
		return nextElement ? utils.hasDirective(nextElement, "else") : false;
	}
	/**
	* @param {VElement} element
	*/
	function getDirective(element) {
		return element.startTag.attributes.find((attr) => attr.directive && attr.key.name && attr.key.name.name && [
			"if",
			"else-if",
			"else"
		].includes(attr.key.name.name));
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow negated conditions in v-if/v-else",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/no-negated-v-if-condition.html"
			},
			fixable: "code",
			schema: [],
			messages: { negatedCondition: "Unexpected negated condition in v-if with v-else." }
		},
		create(context) {
			const sourceCode = context.sourceCode;
			const processedPairs = /* @__PURE__ */ new Set();
			/**
			* @param {Expression} expression
			* @returns {string}
			*/
			function getConvertedCondition(expression) {
				if (expression.type === "UnaryExpression" && expression.operator === "!") return sourceCode.text.slice(expression.range[0] + 1, expression.range[1]);
				if (expression.type === "BinaryExpression") {
					const left = sourceCode.getText(expression.left);
					const right = sourceCode.getText(expression.right);
					if (expression.operator === "!=") return `${left} == ${right}`;
					else if (expression.operator === "!==") return `${left} === ${right}`;
				}
				return sourceCode.getText(expression);
			}
			/**
			* @param {VIfDirective} node
			*/
			function checkNegatedCondition(node) {
				if (!node.value?.expression) return;
				const expression = node.value.expression;
				const element = node.parent.parent;
				if (!isNegatedExpression(expression) || !isDirectlyFollowedByElse(element)) return;
				const elseElement = getNextSibling(element);
				if (!elseElement) return;
				const pairKey = `${element.range[0]}-${elseElement.range[0]}`;
				if (processedPairs.has(pairKey)) return;
				processedPairs.add(pairKey);
				context.report({
					node: expression,
					messageId: "negatedCondition",
					fix: (fixer) => swapElements(fixer, element, elseElement, expression)
				});
			}
			/**
			* @param {RuleFixer} fixer
			* @param {VElement} ifElement
			* @param {VElement} elseElement
			* @param {Expression} expression
			*/
			function* swapElements(fixer, ifElement, elseElement, expression) {
				const convertedCondition = getConvertedCondition(expression);
				const ifDir = getDirective(ifElement);
				const elseDir = getDirective(elseElement);
				if (!ifDir || !elseDir) return;
				const ifDirectiveName = ifDir.key.name.name;
				const ifText = sourceCode.text.slice(ifElement.range[0], ifElement.range[1]);
				const elseText = sourceCode.text.slice(elseElement.range[0], elseElement.range[1]);
				const newIfDirective = `v-${ifDirectiveName}="${convertedCondition}"`;
				const newIfText = elseText.slice(0, elseDir.range[0] - elseElement.range[0]) + newIfDirective + elseText.slice(elseDir.range[1] - elseElement.range[0]);
				const newElseText = ifText.slice(0, ifDir.range[0] - ifElement.range[0]) + "v-else" + ifText.slice(ifDir.range[1] - ifElement.range[0]);
				yield fixer.replaceTextRange(ifElement.range, newIfText);
				yield fixer.replaceTextRange(elseElement.range, newElseText);
			}
			return utils.defineTemplateBodyVisitor(context, {
				"VAttribute[directive=true][key.name.name='if']"(node) {
					checkNegatedCondition(node);
				},
				"VAttribute[directive=true][key.name.name='else-if']"(node) {
					checkNegatedCondition(node);
				}
			});
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_negated_v_if_condition();
  }
});