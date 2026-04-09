'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_js_reserved$1 = require('../utils/js-reserved.js');

//#region lib/rules/this-in-template.js
/**
* @fileoverview disallow usage of `this` in template.
* @author Armano
*/
var require_this_in_template = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const RESERVED_NAMES = new Set(require_js_reserved$1.default);
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow usage of `this` in template",
				categories: ["vue3-recommended", "vue2-recommended"],
				url: "https://eslint.vuejs.org/rules/this-in-template.html"
			},
			fixable: "code",
			schema: [{ enum: ["always", "never"] }],
			messages: {
				unexpected: "Unexpected usage of 'this'.",
				expected: "Expected 'this'."
			}
		},
		create(context) {
			const options = context.options[0] === "always" ? "always" : "never";
			/**
			* @typedef {object} ScopeStack
			* @property {ScopeStack | null} parent
			* @property {Identifier[]} nodes
			*/
			/** @type {ScopeStack | null} */
			let scopeStack = null;
			return utils.defineTemplateBodyVisitor(context, {
				VElement(node) {
					scopeStack = {
						parent: scopeStack,
						nodes: scopeStack ? [...scopeStack.nodes] : []
					};
					if (node.variables) for (const variable of node.variables) {
						const varNode = variable.id;
						const name = varNode.name;
						if (!scopeStack.nodes.some((node$1) => node$1.name === name)) scopeStack.nodes.push(varNode);
					}
				},
				"VElement:exit"() {
					scopeStack = scopeStack && scopeStack.parent;
				},
				...options === "never" ? { "VExpressionContainer MemberExpression > ThisExpression"(node) {
					if (!scopeStack) return;
					const propertyName = utils.getStaticPropertyName(node.parent);
					if (!propertyName || scopeStack.nodes.some((el) => el.name === propertyName) || RESERVED_NAMES.has(propertyName) || /^\d.*$|[^\w$]/.test(propertyName)) return;
					context.report({
						node,
						loc: node.loc,
						fix(fixer) {
							return fixer.replaceText(node.parent, propertyName);
						},
						messageId: "unexpected"
					});
				} } : { VExpressionContainer(node) {
					if (!scopeStack) return;
					if (node.parent.type === "VDirectiveKey") return;
					if (node.references) {
						for (const reference of node.references) if (!scopeStack.nodes.some((el) => el.name === reference.id.name)) context.report({
							node: reference.id,
							loc: reference.id.loc,
							messageId: "expected",
							fix(fixer) {
								return fixer.insertTextBefore(reference.id, "this.");
							}
						});
					}
				} }
			});
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_this_in_template();
  }
});