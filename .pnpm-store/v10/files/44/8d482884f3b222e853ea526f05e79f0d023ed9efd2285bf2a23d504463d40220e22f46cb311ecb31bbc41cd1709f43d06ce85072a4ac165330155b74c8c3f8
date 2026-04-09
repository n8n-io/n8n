'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/valid-v-bind-sync.js
/**
* @fileoverview enforce valid `.sync` modifier on `v-bind` directives
* @author Yosuke Ota
*/
var require_valid_v_bind_sync = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	* Check whether the given node is valid or not.
	* @param {VElement} node The element node to check.
	* @returns {boolean} `true` if the node is valid.
	*/
	function isValidElement(node) {
		if (!utils.isCustomComponent(node)) return false;
		return true;
	}
	/**
	* Check whether the given node is a MemberExpression containing an optional chaining.
	* e.g.
	* - `a?.b`
	* - `a?.b.c`
	* @param {ASTNode} node The node to check.
	* @returns {boolean} `true` if the node is a MemberExpression containing an optional chaining.
	*/
	function isOptionalChainingMemberExpression(node) {
		return node.type === "ChainExpression" && node.expression.type === "MemberExpression";
	}
	/**
	* Check whether the given node can be LHS (left-hand side).
	* @param {ASTNode} node The node to check.
	* @returns {boolean} `true` if the node can be LHS.
	*/
	function isLhs(node) {
		return node.type === "Identifier" || node.type === "MemberExpression";
	}
	/**
	* Check whether the given node is a MemberExpression of a possibly null object.
	* e.g.
	* - `(a?.b).c`
	* - `(null).foo`
	* @param {ASTNode} node The node to check.
	* @returns {boolean} `true` if the node is a MemberExpression of a possibly null object.
	*/
	function maybeNullObjectMemberExpression(node) {
		if (node.type !== "MemberExpression") return false;
		const { object } = node;
		if (object.type === "ChainExpression") return true;
		if (object.type === "Literal" && object.value === null && !object.bigint) return true;
		if (object.type === "MemberExpression") return maybeNullObjectMemberExpression(object);
		return false;
	}
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "enforce valid `.sync` modifier on `v-bind` directives",
				categories: ["vue2-essential"],
				url: "https://eslint.vuejs.org/rules/valid-v-bind-sync.html"
			},
			fixable: null,
			deprecated: true,
			schema: [],
			messages: {
				unexpectedInvalidElement: "'.sync' modifiers aren't supported on <{{name}}> non Vue-components.",
				unexpectedOptionalChaining: "Optional chaining cannot appear in 'v-bind' with '.sync' modifiers.",
				unexpectedNonLhsExpression: "'.sync' modifiers require the attribute value which is valid as LHS.",
				unexpectedNullObject: "'.sync' modifier has potential null object property access.",
				unexpectedUpdateIterationVariable: "'.sync' modifiers cannot update the iteration variable '{{varName}}' itself."
			}
		},
		create(context) {
			return utils.defineTemplateBodyVisitor(context, { "VAttribute[directive=true][key.name.name='bind']"(node) {
				if (!node.key.modifiers.map((mod) => mod.name).includes("sync")) return;
				const element = node.parent.parent;
				const name = element.name;
				if (!isValidElement(element)) context.report({
					node,
					messageId: "unexpectedInvalidElement",
					data: { name }
				});
				if (!node.value) return;
				const expression = node.value.expression;
				if (!expression) return;
				if (isOptionalChainingMemberExpression(expression)) context.report({
					node: expression,
					messageId: "unexpectedOptionalChaining"
				});
				else if (!isLhs(expression)) context.report({
					node: expression,
					messageId: "unexpectedNonLhsExpression"
				});
				else if (maybeNullObjectMemberExpression(expression)) context.report({
					node: expression,
					messageId: "unexpectedNullObject"
				});
				for (const reference of node.value.references) {
					const id = reference.id;
					if (id.parent.type !== "VExpressionContainer") continue;
					if (reference.variable) context.report({
						node: expression,
						messageId: "unexpectedUpdateIterationVariable",
						data: { varName: id.name }
					});
				}
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_valid_v_bind_sync();
  }
});