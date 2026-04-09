'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/return-in-computed-property.js
/**
* @fileoverview Enforces that a return statement is present in computed property (return-in-computed-property)
* @author Armano
*/
var require_return_in_computed_property = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { ReferenceTracker } = require("@eslint-community/eslint-utils");
	const utils = require_index.default;
	/**
	* @typedef {import('../utils').ComponentComputedProperty} ComponentComputedProperty
	*/
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "enforce that a return statement is present in computed property",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/return-in-computed-property.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: { treatUndefinedAsUnspecified: { type: "boolean" } },
				additionalProperties: false
			}],
			messages: {
				expectedReturnInFunction: "Expected to return a value in computed function.",
				expectedReturnInProperty: "Expected to return a value in \"{{name}}\" computed property."
			}
		},
		create(context) {
			const treatUndefinedAsUnspecified = !((context.options[0] || {}).treatUndefinedAsUnspecified === false);
			/**
			* @type {Set<ComponentComputedProperty>}
			*/
			const computedProperties = /* @__PURE__ */ new Set();
			/** @type {(FunctionExpression | ArrowFunctionExpression)[]} */
			const computedFunctionNodes = [];
			return Object.assign({ Program(program) {
				const tracker = new ReferenceTracker(utils.getScope(context, program));
				const map = { computed: { [ReferenceTracker.CALL]: true } };
				for (const { node } of utils.iterateReferencesTraceMap(tracker, map)) {
					if (node.type !== "CallExpression") continue;
					const getter = utils.getGetterBodyFromComputedFunction(node);
					if (getter) computedFunctionNodes.push(getter);
				}
			} }, utils.defineVueVisitor(context, { onVueObjectEnter(obj) {
				for (const computedProperty of utils.getComputedProperties(obj)) computedProperties.add(computedProperty);
			} }), utils.executeOnFunctionsWithoutReturn(treatUndefinedAsUnspecified, (node) => {
				for (const cp of computedProperties) if (cp.value && cp.value.parent === node) context.report({
					node,
					messageId: "expectedReturnInProperty",
					data: { name: cp.key || "Unknown" }
				});
				for (const cf of computedFunctionNodes) if (cf === node) context.report({
					node,
					messageId: "expectedReturnInFunction"
				});
			}));
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_return_in_computed_property();
  }
});