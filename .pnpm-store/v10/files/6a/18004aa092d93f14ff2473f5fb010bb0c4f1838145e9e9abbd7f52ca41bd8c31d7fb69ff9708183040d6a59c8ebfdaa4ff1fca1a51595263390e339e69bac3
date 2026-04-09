'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/return-in-emits-validator.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_return_in_emits_validator = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	* @typedef {import('../utils').ComponentEmit} ComponentEmit
	* @typedef {import('../utils').ComponentObjectEmit} ComponentObjectEmit
	*/
	/**
	* Checks if the given node value is falsy.
	* @param {Expression} node The node to check
	* @returns {boolean} If `true`, the given node value is falsy.
	*/
	function isFalsy(node) {
		if (node.type === "Literal") {
			if (node.bigint) return node.bigint === "0";
			if (!node.value) return true;
		}
		return node.type === "Identifier" && (node.name === "undefined" || node.name === "NaN");
	}
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "enforce that a return statement is present in emits validator",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/return-in-emits-validator.html"
			},
			fixable: null,
			schema: [],
			messages: {
				expectedTrue: "Expected to return a true value in \"{{name}}\" emits validator.",
				expectedBoolean: "Expected to return a boolean value in \"{{name}}\" emits validator."
			}
		},
		create(context) {
			/** @type {ComponentObjectEmit[]} */
			const emitsValidators = [];
			/**
			* @typedef {object} ScopeStack
			* @property {ScopeStack | null} upper
			* @property {FunctionExpression | FunctionDeclaration | ArrowFunctionExpression} functionNode
			* @property {boolean} hasReturnValue
			* @property {boolean} possibleOfReturnTrue
			*/
			/**
			* @type {ScopeStack | null}
			*/
			let scopeStack = null;
			/**
			* @param {ComponentEmit[]} emits
			*/
			function processEmits(emits) {
				for (const emit of emits) {
					if (emit.type !== "object" || !emit.value) continue;
					if (emit.value.type !== "FunctionExpression" && emit.value.type !== "ArrowFunctionExpression") continue;
					emitsValidators.push(emit);
				}
			}
			return utils.compositingVisitors(utils.defineScriptSetupVisitor(context, { onDefineEmitsEnter(_node, emits) {
				processEmits(emits);
			} }), utils.defineVueVisitor(context, { onVueObjectEnter(obj) {
				processEmits(utils.getComponentEmitsFromOptions(obj));
			} }), {
				":function"(node) {
					scopeStack = {
						upper: scopeStack,
						functionNode: node,
						hasReturnValue: false,
						possibleOfReturnTrue: false
					};
					if (node.type === "ArrowFunctionExpression" && node.expression) {
						scopeStack.hasReturnValue = true;
						if (!isFalsy(node.body)) scopeStack.possibleOfReturnTrue = true;
					}
				},
				ReturnStatement(node) {
					if (!scopeStack) return;
					if (node.argument) {
						scopeStack.hasReturnValue = true;
						if (!isFalsy(node.argument)) scopeStack.possibleOfReturnTrue = true;
					}
				},
				":function:exit"(node) {
					if (scopeStack && !scopeStack.possibleOfReturnTrue) {
						const emits = emitsValidators.find((e) => e.value === node);
						if (emits) context.report({
							node,
							messageId: scopeStack.hasReturnValue ? "expectedTrue" : "expectedBoolean",
							data: { name: emits.emitName || "Unknown" }
						});
					}
					scopeStack = scopeStack && scopeStack.upper;
				}
			});
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_return_in_emits_validator();
  }
});