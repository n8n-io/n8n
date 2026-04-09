'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/no-lifecycle-after-await.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_lifecycle_after_await = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { ReferenceTracker } = require("@eslint-community/eslint-utils");
	const utils = require_index.default;
	/**
	* @typedef {import('@eslint-community/eslint-utils').TYPES.TraceMap} TraceMap
	*/
	const LIFECYCLE_HOOKS = [
		"onBeforeMount",
		"onBeforeUnmount",
		"onBeforeUpdate",
		"onErrorCaptured",
		"onMounted",
		"onRenderTracked",
		"onRenderTriggered",
		"onUnmounted",
		"onUpdated",
		"onActivated",
		"onDeactivated"
	];
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow asynchronously registered lifecycle hooks",
				categories: ["vue3-essential"],
				url: "https://eslint.vuejs.org/rules/no-lifecycle-after-await.html"
			},
			fixable: null,
			schema: [],
			messages: { forbidden: "Lifecycle hooks are forbidden after an `await` expression." }
		},
		create(context) {
			/**
			* @typedef {object} SetupScopeData
			* @property {boolean} afterAwait
			* @property {[number,number]} range
			*/
			/**
			* @typedef {object} ScopeStack
			* @property {ScopeStack | null} upper
			* @property {FunctionDeclaration | FunctionExpression | ArrowFunctionExpression} scopeNode
			*/
			/** @type {Set<ESNode>} */
			const lifecycleHookCallNodes = /* @__PURE__ */ new Set();
			/** @type {Map<FunctionDeclaration | FunctionExpression | ArrowFunctionExpression, SetupScopeData>} */
			const setupScopes = /* @__PURE__ */ new Map();
			/** @type {ScopeStack | null} */
			let scopeStack = null;
			return utils.compositingVisitors({ Program(program) {
				const tracker = new ReferenceTracker(utils.getScope(context, program));
				/** @type {TraceMap} */
				const traceMap = {};
				for (const lifecycleHook of LIFECYCLE_HOOKS) traceMap[lifecycleHook] = { [ReferenceTracker.CALL]: true };
				for (const { node } of utils.iterateReferencesTraceMap(tracker, traceMap)) lifecycleHookCallNodes.add(node);
			} }, utils.defineVueVisitor(context, {
				onSetupFunctionEnter(node) {
					setupScopes.set(node, {
						afterAwait: false,
						range: node.range
					});
				},
				":function"(node) {
					scopeStack = {
						upper: scopeStack,
						scopeNode: node
					};
				},
				":function:exit"() {
					scopeStack = scopeStack && scopeStack.upper;
				},
				AwaitExpression(node) {
					if (!scopeStack) return;
					const setupScope = setupScopes.get(scopeStack.scopeNode);
					if (!setupScope || !utils.inRange(setupScope.range, node)) return;
					setupScope.afterAwait = true;
				},
				CallExpression(node) {
					if (!scopeStack) return;
					const setupScope = setupScopes.get(scopeStack.scopeNode);
					if (!setupScope || !setupScope.afterAwait || !utils.inRange(setupScope.range, node)) return;
					if (lifecycleHookCallNodes.has(node)) {
						if (node.arguments.length >= 2) return;
						context.report({
							node,
							messageId: "forbidden"
						});
					}
				},
				onSetupFunctionExit(node) {
					setupScopes.delete(node);
				}
			}));
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_lifecycle_after_await();
  }
});