'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_ref_object_references$1 = require('../utils/ref-object-references.js');

//#region lib/rules/no-ref-object-reactivity-loss.js
/**
* @author Yosuke Ota <https://github.com/ota-meshi>
* See LICENSE file in root directory for full license.
*/
var require_no_ref_object_reactivity_loss = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const { extractRefObjectReferences, extractReactiveVariableReferences } = require_ref_object_references$1.default;
	/**
	* @typedef {import('../utils/ref-object-references').RefObjectReferences} RefObjectReferences
	* @typedef {import('../utils/ref-object-references').RefObjectReference} RefObjectReference
	*/
	/**
	* Checks whether writing assigns a value to the given pattern.
	* @param {Pattern | AssignmentProperty | Property} node
	* @returns {boolean}
	*/
	function isUpdate(node) {
		const parent = node.parent;
		if (parent.type === "UpdateExpression" && parent.argument === node) return true;
		if (parent.type === "AssignmentExpression" && parent.left === node) return true;
		if (parent.type === "Property" && parent.value === node || parent.type === "ArrayPattern" || parent.type === "ObjectPattern" && parent.properties.includes(node) || parent.type === "AssignmentPattern" && parent.left === node || parent.type === "RestElement" || parent.type === "MemberExpression" && parent.object === node) return isUpdate(parent);
		return false;
	}
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow usages of ref objects that can lead to loss of reactivity",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/no-ref-object-reactivity-loss.html"
			},
			fixable: null,
			schema: [],
			messages: {
				getValueInSameScope: "Getting a value from the ref object in the same scope will cause the value to lose reactivity.",
				getReactiveVariableInSameScope: "Getting a reactive variable in the same scope will cause the value to lose reactivity."
			}
		},
		create(context) {
			/**
			* @typedef {object} ScopeStack
			* @property {ScopeStack | null} upper
			* @property {Program | FunctionExpression | FunctionDeclaration | ArrowFunctionExpression} node
			*/
			/** @type {ScopeStack} */
			let scopeStack = {
				upper: null,
				node: context.sourceCode.ast
			};
			/** @type {Map<CallExpression, ScopeStack>} */
			const scopes = /* @__PURE__ */ new Map();
			const refObjectReferences = extractRefObjectReferences(context);
			const reactiveVariableReferences = extractReactiveVariableReferences(context);
			/**
			* Verify the given ref object value. `refObj = ref(); refObj.value;`
			* @param {Expression | Super | ObjectPattern} node
			*/
			function verifyRefObjectValue(node) {
				const ref = refObjectReferences.get(node);
				if (!ref) return;
				if (scopes.get(ref.define) !== scopeStack) return;
				context.report({
					node,
					messageId: "getValueInSameScope"
				});
			}
			/**
			* Verify the given reactive variable. `refVal = $ref(); refVal;`
			* @param {Identifier} node
			*/
			function verifyReactiveVariable(node) {
				const ref = reactiveVariableReferences.get(node);
				if (!ref || ref.escape) return;
				if (scopes.get(ref.define) !== scopeStack) return;
				context.report({
					node,
					messageId: "getReactiveVariableInSameScope"
				});
			}
			return {
				":function"(node) {
					scopeStack = {
						upper: scopeStack,
						node
					};
				},
				":function:exit"() {
					scopeStack = scopeStack.upper || scopeStack;
				},
				CallExpression(node) {
					scopes.set(node, scopeStack);
				},
				"MemberExpression:exit"(node) {
					if (isUpdate(node)) return;
					if (utils.getStaticPropertyName(node) !== "value") return;
					verifyRefObjectValue(node.object);
				},
				"ObjectPattern:exit"(node) {
					if (!utils.findAssignmentProperty(node, "value")) return;
					verifyRefObjectValue(node);
				},
				"Identifier:exit"(node) {
					if (isUpdate(node)) return;
					verifyReactiveVariable(node);
				}
			};
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_ref_object_reactivity_loss();
  }
});