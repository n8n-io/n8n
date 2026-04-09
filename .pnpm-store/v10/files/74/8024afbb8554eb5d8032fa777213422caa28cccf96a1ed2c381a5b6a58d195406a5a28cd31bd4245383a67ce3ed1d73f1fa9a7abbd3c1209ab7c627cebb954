'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-async-in-computed-properties.js
/**
* @fileoverview Check if there are no asynchronous actions inside computed properties.
* @author Armano
*/
var require_no_async_in_computed_properties = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { ReferenceTracker } = require("@eslint-community/eslint-utils");
	const utils = require_index.default;
	/**
	* @typedef {import('../utils').VueObjectData} VueObjectData
	* @typedef {import('../utils').VueVisitor} VueVisitor
	* @typedef {import('../utils').ComponentComputedProperty} ComponentComputedProperty
	*/
	const PROMISE_FUNCTIONS = new Set([
		"then",
		"catch",
		"finally"
	]);
	const PROMISE_METHODS = new Set([
		"all",
		"allSettled",
		"any",
		"race",
		"reject",
		"resolve",
		"try",
		"withResolvers"
	]);
	const TIMED_FUNCTIONS = new Set([
		"setTimeout",
		"setInterval",
		"setImmediate",
		"requestAnimationFrame"
	]);
	/**
	* @param {CallExpression} node
	*/
	function isTimedFunction(node) {
		const callee = utils.skipChainExpression(node.callee);
		return (callee.type === "Identifier" && TIMED_FUNCTIONS.has(callee.name) || callee.type === "MemberExpression" && callee.object.type === "Identifier" && callee.object.name === "window" && TIMED_FUNCTIONS.has(utils.getStaticPropertyName(callee) || "")) && node.arguments.length > 0;
	}
	/**
	* @param {*} node
	* @returns {*}
	*/
	function skipWrapper(node) {
		while (node && node.expression) node = node.expression;
		return node;
	}
	/**
	* Get the root object name from a member expression chain
	* @param {MemberExpression} memberExpr
	* @returns {string|null}
	*/
	function getRootObjectName(memberExpr) {
		let current = skipWrapper(memberExpr.object);
		while (current) switch (current.type) {
			case "MemberExpression":
				current = skipWrapper(current.object);
				break;
			case "CallExpression": {
				const calleeExpr = skipWrapper(current.callee);
				if (calleeExpr.type === "MemberExpression") current = skipWrapper(calleeExpr.object);
				else if (calleeExpr.type === "Identifier") return calleeExpr.name;
				else return null;
				break;
			}
			case "Identifier": return current.name;
			default: return null;
		}
		return null;
	}
	/**
	* @param {string} name
	* @param {*} callee
	* @returns {boolean}
	*/
	function isPromiseMethod(name, callee) {
		return PROMISE_FUNCTIONS.has(name) || callee.object.type === "Identifier" && callee.object.name === "Promise" && PROMISE_METHODS.has(name);
	}
	/**
	* @param {CallExpression} node
	* @param {Set<string>} ignoredObjectNames
	*/
	function isPromise(node, ignoredObjectNames) {
		const callee = utils.skipChainExpression(node.callee);
		if (callee.type === "MemberExpression") {
			const name = utils.getStaticPropertyName(callee);
			if (!name || !isPromiseMethod(name, callee)) return false;
			const rootObjectName = getRootObjectName(callee);
			if (rootObjectName && ignoredObjectNames.has(rootObjectName)) return false;
			return true;
		}
		return false;
	}
	/**
	* @param {CallExpression} node
	* @param {RuleContext} context
	*/
	function isNextTick(node, context) {
		const callee = utils.skipChainExpression(node.callee);
		if (callee.type === "MemberExpression") {
			const name = utils.getStaticPropertyName(callee);
			return utils.isThis(callee.object, context) && name === "$nextTick" || callee.object.type === "Identifier" && callee.object.name === "Vue" && name === "nextTick";
		}
		return false;
	}
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow asynchronous actions in computed properties",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/no-async-in-computed-properties.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: { ignoredObjectNames: {
					type: "array",
					items: { type: "string" },
					uniqueItems: true,
					additionalItems: false
				} },
				additionalProperties: false
			}],
			messages: {
				unexpectedInFunction: "Unexpected {{expressionName}} in computed function.",
				unexpectedInProperty: "Unexpected {{expressionName}} in \"{{propertyName}}\" computed property."
			}
		},
		create(context) {
			const options = context.options[0] || {};
			const ignoredObjectNames = new Set(options.ignoredObjectNames || []);
			/** @type {Map<ObjectExpression, ComponentComputedProperty[]>} */
			const computedPropertiesMap = /* @__PURE__ */ new Map();
			/** @type {(FunctionExpression | ArrowFunctionExpression)[]} */
			const computedFunctionNodes = [];
			/**
			* @typedef {object} ScopeStack
			* @property {ScopeStack | null} upper
			* @property {BlockStatement | Expression} body
			*/
			/** @type {ScopeStack | null} */
			let scopeStack = null;
			const expressionTypes = {
				promise: "asynchronous action",
				nextTick: "asynchronous action",
				await: "await operator",
				async: "async function declaration",
				new: "Promise object",
				timed: "timed function"
			};
			/**
			* @param {FunctionExpression | FunctionDeclaration | ArrowFunctionExpression} node
			* @param {VueObjectData|undefined} [info]
			*/
			function onFunctionEnter(node, info) {
				if (node.async) verify(node, node.body, "async", info ? computedPropertiesMap.get(info.node) : null);
				scopeStack = {
					upper: scopeStack,
					body: node.body
				};
			}
			function onFunctionExit() {
				scopeStack = scopeStack && scopeStack.upper;
			}
			/**
			* @param {ESNode} node
			* @param {BlockStatement | Expression} targetBody
			* @param {keyof expressionTypes} type
			* @param {ComponentComputedProperty[]|undefined|null} computedProperties
			*/
			function verify(node, targetBody, type, computedProperties) {
				for (const cp of computedProperties || []) if (cp.value && node.loc.start.line >= cp.value.loc.start.line && node.loc.end.line <= cp.value.loc.end.line && targetBody === cp.value) {
					context.report({
						node,
						messageId: "unexpectedInProperty",
						data: {
							expressionName: expressionTypes[type],
							propertyName: cp.key || "unknown"
						}
					});
					return;
				}
				for (const cf of computedFunctionNodes) if (node.loc.start.line >= cf.body.loc.start.line && node.loc.end.line <= cf.body.loc.end.line && targetBody === cf.body) {
					context.report({
						node,
						messageId: "unexpectedInFunction",
						data: { expressionName: expressionTypes[type] }
					});
					return;
				}
			}
			const nodeVisitor = {
				":function": onFunctionEnter,
				":function:exit": onFunctionExit,
				NewExpression(node, info) {
					if (!scopeStack) return;
					if (node.callee.type === "Identifier" && node.callee.name === "Promise") verify(node, scopeStack.body, "new", info ? computedPropertiesMap.get(info.node) : null);
				},
				CallExpression(node, info) {
					if (!scopeStack) return;
					if (isPromise(node, ignoredObjectNames)) verify(node, scopeStack.body, "promise", info ? computedPropertiesMap.get(info.node) : null);
					else if (isTimedFunction(node)) verify(node, scopeStack.body, "timed", info ? computedPropertiesMap.get(info.node) : null);
					else if (isNextTick(node, context)) verify(node, scopeStack.body, "nextTick", info ? computedPropertiesMap.get(info.node) : null);
				},
				AwaitExpression(node, info) {
					if (!scopeStack) return;
					verify(node, scopeStack.body, "await", info ? computedPropertiesMap.get(info.node) : null);
				}
			};
			return utils.compositingVisitors({ Program(program) {
				const tracker = new ReferenceTracker(utils.getScope(context, program));
				for (const { node } of utils.iterateReferencesTraceMap(tracker, { computed: { [ReferenceTracker.CALL]: true } })) {
					if (node.type !== "CallExpression") continue;
					const getter = utils.getGetterBodyFromComputedFunction(node);
					if (getter) computedFunctionNodes.push(getter);
				}
			} }, utils.isScriptSetup(context) ? utils.defineScriptSetupVisitor(context, nodeVisitor) : utils.defineVueVisitor(context, {
				onVueObjectEnter(node) {
					computedPropertiesMap.set(node, utils.getComputedProperties(node));
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
    return require_no_async_in_computed_properties();
  }
});