'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/valid-v-for.js
/**
* @author Toru Nagashima
* @copyright 2017 Toru Nagashima. All rights reserved.
* See LICENSE file in root directory for full license.
*/
var require_valid_v_for = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	* Check whether the given attribute is using the variables which are defined by `v-for` directives.
	* @param {VDirective} vFor The attribute node of `v-for` to check.
	* @param {VDirective} vBindKey The attribute node of `v-bind:key` to check.
	* @returns {boolean} `true` if the node is using the variables which are defined by `v-for` directives.
	*/
	function isUsingIterationVar(vFor, vBindKey) {
		if (vBindKey.value == null) return false;
		const references = vBindKey.value.references;
		const variables = vFor.parent.parent.variables;
		return references.some((reference) => variables.some((variable) => variable.id.name === reference.id.name && variable.kind === "v-for"));
	}
	/**
	* Check the child element in tempalte v-for about `v-bind:key` attributes.
	* @param {RuleContext} context The rule context to report.
	* @param {VDirective} vFor The attribute node of `v-for` to check.
	* @param {VElement} child The child node to check.
	*/
	function checkChildKey(context, vFor, child) {
		const childFor = utils.getDirective(child, "for");
		if (childFor != null) {
			const childForRefs = childFor.value && childFor.value.references || [];
			const variables = vFor.parent.parent.variables;
			if (childForRefs.some((cref) => variables.some((variable) => cref.id.name === variable.id.name && variable.kind === "v-for"))) return;
		}
		checkKey(context, vFor, child);
	}
	/**
	* Check the given element about `v-bind:key` attributes.
	* @param {RuleContext} context The rule context to report.
	* @param {VDirective} vFor The attribute node of `v-for` to check.
	* @param {VElement} element The element node to check.
	*/
	function checkKey(context, vFor, element) {
		const vBindKey = utils.getDirective(element, "bind", "key");
		if (vBindKey == null && element.name === "template") {
			for (const child of element.children) if (child.type === "VElement") checkChildKey(context, vFor, child);
			return;
		}
		if (utils.isCustomComponent(element) && vBindKey == null) context.report({
			node: element.startTag,
			messageId: "requireKey"
		});
		if (vBindKey != null && !isUsingIterationVar(vFor, vBindKey)) context.report({
			node: vBindKey,
			messageId: "keyUseFVorVars"
		});
	}
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "enforce valid `v-for` directives",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/valid-v-for.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: { allowEmptyAlias: { type: "boolean" } },
				additionalProperties: false
			}],
			messages: {
				requireKey: "Custom elements in iteration require 'v-bind:key' directives.",
				keyUseFVorVars: "Expected 'v-bind:key' directive to use the variables which are defined by the 'v-for' directive.",
				unexpectedArgument: "'v-for' directives require no argument.",
				unexpectedModifier: "'v-for' directives require no modifier.",
				expectedValue: "'v-for' directives require that attribute value.",
				unexpectedExpression: "'v-for' directives require the special syntax '<alias> in <expression>'.",
				invalidEmptyAlias: "Invalid empty alias.",
				invalidAlias: "Invalid alias '{{text}}'."
			}
		},
		create(context) {
			const sourceCode = context.sourceCode;
			const allowEmptyAlias = (context.options[0] || {}).allowEmptyAlias === true;
			/**
			* @param {Pattern|null} alias
			* @returns {boolean}
			*/
			function isValidAlias(alias) {
				return alias ? alias.type === "Identifier" : allowEmptyAlias;
			}
			return utils.defineTemplateBodyVisitor(context, { "VAttribute[directive=true][key.name.name='for']"(node) {
				const element = node.parent.parent;
				checkKey(context, node, element);
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
				const expr = node.value.expression;
				if (expr == null) return;
				if (expr.type !== "VForExpression") {
					context.report({
						node: node.value,
						messageId: "unexpectedExpression"
					});
					return;
				}
				const lhs = expr.left;
				const value = lhs[0];
				const key = lhs[1];
				const index = lhs[2];
				if (value === null && !allowEmptyAlias) context.report({
					node: expr,
					messageId: "invalidEmptyAlias"
				});
				if (key !== void 0 && !isValidAlias(key)) {
					const isEmptyAlias = !key;
					context.report({
						node: key || expr,
						messageId: isEmptyAlias ? "invalidEmptyAlias" : "invalidAlias",
						data: isEmptyAlias ? {} : { text: sourceCode.getText(key) }
					});
				}
				if (index !== void 0 && !isValidAlias(index)) {
					const isEmptyAlias = !index;
					context.report({
						node: index || expr,
						messageId: isEmptyAlias ? "invalidEmptyAlias" : "invalidAlias",
						data: isEmptyAlias ? {} : { text: sourceCode.getText(index) }
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
    return require_valid_v_for();
  }
});