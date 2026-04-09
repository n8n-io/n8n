'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/require-slots-as-functions.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_require_slots_as_functions = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const { findVariable } = require("@eslint-community/eslint-utils");
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "enforce properties of `$slots` to be used as a function",
				categories: ["vue3-essential"],
				url: "https://eslint.vuejs.org/rules/require-slots-as-functions.html"
			},
			fixable: null,
			schema: [],
			messages: { unexpected: "Property in `$slots` should be used as function." }
		},
		create(context) {
			/**
			* Verify the given node
			* @param {MemberExpression | Identifier | ChainExpression} node The node to verify
			* @param {Expression} reportNode The node to report
			*/
			function verify(node, reportNode) {
				const parent = node.parent;
				if (parent.type === "VariableDeclarator" && parent.id.type === "Identifier") {
					verifyReferences(parent.id, reportNode);
					return;
				}
				if (parent.type === "AssignmentExpression" && parent.right === node && parent.left.type === "Identifier") {
					verifyReferences(parent.left, reportNode);
					return;
				}
				if (parent.type === "ChainExpression") {
					verify(parent, reportNode);
					return;
				}
				if (parent.type === "MemberExpression" || parent.type === "VariableDeclarator" || parent.type === "SpreadElement" || parent.type === "ArrayExpression") context.report({
					node: reportNode,
					messageId: "unexpected"
				});
			}
			/**
			* Verify the references of the given node.
			* @param {Identifier} node The node to verify
			* @param {Expression} reportNode The node to report
			*/
			function verifyReferences(node, reportNode) {
				const variable = findVariable(utils.getScope(context, node), node);
				if (!variable) return;
				for (const reference of variable.references) {
					if (!reference.isRead()) continue;
					/** @type {Identifier} */
					const id = reference.identifier;
					verify(id, reportNode);
				}
			}
			return utils.defineVueVisitor(context, { MemberExpression(node) {
				const object = utils.skipChainExpression(node.object);
				if (object.type !== "MemberExpression") return;
				if (utils.getStaticPropertyName(object) !== "$slots") return;
				if (!utils.isThis(object.object, context)) return;
				if (node.property.type === "PrivateIdentifier") return;
				verify(node, node.property);
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_require_slots_as_functions();
  }
});