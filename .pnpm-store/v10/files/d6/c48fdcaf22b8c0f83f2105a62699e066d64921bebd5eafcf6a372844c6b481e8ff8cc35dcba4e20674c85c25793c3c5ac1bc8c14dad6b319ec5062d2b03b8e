'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/valid-next-tick.js
/**
* @fileoverview enforce valid `nextTick` function calls
* @author Flo Edelmann
* @copyright 2021 Flo Edelmann. All rights reserved.
* See LICENSE file in root directory for full license.
*/
var require_valid_next_tick = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const { findVariable } = require("@eslint-community/eslint-utils");
	/**
	* @param {Identifier} identifier
	* @param {RuleContext} context
	* @returns {ASTNode|undefined}
	*/
	function getVueNextTickNode(identifier, context) {
		if (identifier.name === "$nextTick" && identifier.parent.type === "MemberExpression" && utils.isThis(identifier.parent.object, context)) return identifier.parent;
		if (identifier.name === "nextTick" && identifier.parent.type === "MemberExpression" && identifier.parent.object.type === "Identifier" && identifier.parent.object.name === "Vue") return identifier.parent;
		const variable = findVariable(utils.getScope(context, identifier), identifier);
		if (variable != null && variable.defs.length === 1) {
			const def = variable.defs[0];
			if (def.type === "ImportBinding" && def.node.type === "ImportSpecifier" && def.node.imported.type === "Identifier" && def.node.imported.name === "nextTick" && def.node.parent.type === "ImportDeclaration" && def.node.parent.source.value === "vue") return identifier;
		}
	}
	/**
	* @param {CallExpression} callExpression
	* @returns {boolean}
	*/
	function isAwaitedPromise(callExpression) {
		if (callExpression.parent.type === "AwaitExpression") return true;
		if (callExpression.parent.type === "ReturnStatement") return true;
		if (callExpression.parent.type === "ArrowFunctionExpression" && callExpression.parent.body === callExpression) return true;
		if (callExpression.parent.type === "MemberExpression" && callExpression.parent.property.type === "Identifier" && callExpression.parent.property.name === "then") return true;
		if (callExpression.parent.type === "VariableDeclarator" || callExpression.parent.type === "AssignmentExpression") return true;
		if (callExpression.parent.type === "ArrayExpression" && callExpression.parent.parent.type === "CallExpression" && callExpression.parent.parent.callee.type === "MemberExpression" && callExpression.parent.parent.callee.object.type === "Identifier" && callExpression.parent.parent.callee.object.name === "Promise" && callExpression.parent.parent.callee.property.type === "Identifier") return true;
		return false;
	}
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "enforce valid `nextTick` function calls",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/valid-next-tick.html"
			},
			fixable: "code",
			hasSuggestions: true,
			schema: [],
			messages: {
				shouldBeFunction: "`nextTick` is a function.",
				missingCallbackOrAwait: "Await the Promise returned by `nextTick` or pass a callback function.",
				addAwait: "Add missing `await` statement.",
				tooManyParameters: "`nextTick` expects zero or one parameters.",
				eitherAwaitOrCallback: "Either await the Promise or pass a callback function to `nextTick`."
			}
		},
		create(context) {
			return utils.defineVueVisitor(context, { Identifier(node) {
				const nextTickNode = getVueNextTickNode(node, context);
				if (!nextTickNode || !nextTickNode.parent) return;
				let parentNode = nextTickNode.parent;
				if (parentNode.type === "ConditionalExpression") parentNode = parentNode.parent;
				if (parentNode.type === "CallExpression" && parentNode.callee !== nextTickNode) return;
				if (parentNode.type === "VariableDeclarator" || parentNode.type === "AssignmentExpression") return;
				if (parentNode.type !== "CallExpression") {
					context.report({
						node,
						messageId: "shouldBeFunction",
						fix(fixer) {
							return fixer.insertTextAfter(node, "()");
						}
					});
					return;
				}
				if (parentNode.arguments.length === 0) {
					if (!isAwaitedPromise(parentNode)) context.report({
						node,
						messageId: "missingCallbackOrAwait",
						suggest: [{
							messageId: "addAwait",
							fix(fixer) {
								return fixer.insertTextBefore(parentNode, "await ");
							}
						}]
					});
					return;
				}
				if (parentNode.arguments.length > 1) {
					context.report({
						node,
						messageId: "tooManyParameters"
					});
					return;
				}
				if (isAwaitedPromise(parentNode)) context.report({
					node,
					messageId: "eitherAwaitOrCallback"
				});
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_valid_next_tick();
  }
});