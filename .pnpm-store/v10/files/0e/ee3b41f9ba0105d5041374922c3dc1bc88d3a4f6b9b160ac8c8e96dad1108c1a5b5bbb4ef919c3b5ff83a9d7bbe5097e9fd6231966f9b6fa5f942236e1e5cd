'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-side-effects-in-computed-properties.js
/**
* @fileoverview Don't introduce side effects in computed properties
* @author Michał Sajnóg
*/
var require_no_side_effects_in_computed_properties = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { ReferenceTracker, findVariable } = require("@eslint-community/eslint-utils");
	const utils = require_index.default;
	/**
	* @typedef {import('../utils').VueObjectData} VueObjectData
	* @typedef {import('../utils').VueVisitor} VueVisitor
	* @typedef {import('../utils').ComponentComputedProperty} ComponentComputedProperty
	*/
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow side effects in computed properties",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/no-side-effects-in-computed-properties.html"
			},
			fixable: null,
			schema: [],
			messages: {
				unexpectedSideEffectInFunction: "Unexpected side effect in computed function.",
				unexpectedSideEffectInProperty: "Unexpected side effect in \"{{key}}\" computed property."
			}
		},
		create(context) {
			/** @type {Map<ObjectExpression, ComponentComputedProperty[]>} */
			const computedPropertiesMap = /* @__PURE__ */ new Map();
			/** @type {Array<FunctionExpression | ArrowFunctionExpression>} */
			const computedCallNodes = [];
			/** @type {[number, number][]} */
			const setupRanges = [];
			/**
			* @typedef {object} ScopeStack
			* @property {ScopeStack | null} upper
			* @property {BlockStatement | Expression | null} body
			*/
			/**
			* @type {ScopeStack | null}
			*/
			let scopeStack = null;
			/** @param {FunctionExpression | ArrowFunctionExpression | FunctionDeclaration} node */
			function onFunctionEnter(node) {
				scopeStack = {
					upper: scopeStack,
					body: node.body
				};
			}
			function onFunctionExit() {
				scopeStack = scopeStack && scopeStack.upper;
			}
			const nodeVisitor = {
				":function": onFunctionEnter,
				":function:exit": onFunctionExit,
				"MemberExpression > :matches(Identifier, ThisExpression)"(node, info) {
					if (!scopeStack) return;
					const targetBody = scopeStack.body;
					const computedProperty = (info ? computedPropertiesMap.get(info.node) || [] : []).find((cp) => cp.value && cp.value.range[0] <= node.range[0] && node.range[1] <= cp.value.range[1] && targetBody === cp.value);
					if (computedProperty) {
						const mem = node.parent;
						if (mem.object !== node) return;
						const isThis = utils.isThis(node, context);
						const isVue = node.type === "Identifier" && node.name === "Vue";
						const invalid$1 = mem.parent.type === "CallExpression" && mem.property.type === "Identifier" && (isThis && mem.property.name === "$set" || isVue && mem.property.name === "set") ? { node: mem.property } : isThis && utils.findMutating(mem);
						if (invalid$1) context.report({
							node: invalid$1.node,
							messageId: "unexpectedSideEffectInProperty",
							data: { key: computedProperty.key || "Unknown" }
						});
						return;
					}
					if (node.type === "ThisExpression") return;
					const computedFunction = computedCallNodes.find((c) => c.range[0] <= node.range[0] && node.range[1] <= c.range[1] && targetBody === c.body);
					if (!computedFunction) return;
					if (node.parent.object !== node) return;
					const variable = findVariable(utils.getScope(context, node), node);
					if (!variable || variable.defs.length !== 1) return;
					const def = variable.defs[0];
					if (def.type === "ImplicitGlobalVariable" || def.type === "TDZ" || def.type === "ImportBinding") return;
					if (!setupRanges.some(([start, end]) => start <= def.node.range[0] && def.node.range[1] <= end)) return;
					if (computedFunction.range[0] <= def.node.range[0] && def.node.range[1] <= computedFunction.range[1]) return;
					const invalid = utils.findMutating(node);
					if (invalid) context.report({
						node: invalid.node,
						messageId: "unexpectedSideEffectInFunction"
					});
				}
			};
			const scriptSetupNode = utils.getScriptSetupElement(context);
			if (scriptSetupNode) setupRanges.push(scriptSetupNode.range);
			return utils.compositingVisitors({ Program(program) {
				const tracker = new ReferenceTracker(utils.getScope(context, program));
				for (const { node } of utils.iterateReferencesTraceMap(tracker, { computed: { [ReferenceTracker.CALL]: true } })) {
					if (node.type !== "CallExpression") continue;
					const getterBody = utils.getGetterBodyFromComputedFunction(node);
					if (getterBody) computedCallNodes.push(getterBody);
				}
			} }, scriptSetupNode ? utils.defineScriptSetupVisitor(context, nodeVisitor) : utils.defineVueVisitor(context, {
				onVueObjectEnter(node) {
					computedPropertiesMap.set(node, utils.getComputedProperties(node));
				},
				onSetupFunctionEnter(node) {
					setupRanges.push(node.body.range);
				},
				...nodeVisitor
			}));
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_side_effects_in_computed_properties();
  }
});