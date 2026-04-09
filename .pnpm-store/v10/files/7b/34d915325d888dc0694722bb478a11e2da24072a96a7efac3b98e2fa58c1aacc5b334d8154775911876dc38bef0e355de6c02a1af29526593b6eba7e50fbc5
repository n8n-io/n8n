'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/require-direct-export.js
/**
* @fileoverview require the component to be directly exported
* @author Hiroki Osame <hiroki.osame@gmail.com>
*/
var require_require_direct_export = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "require the component to be directly exported",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/require-direct-export.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: { disallowFunctionalComponentFunction: { type: "boolean" } },
				additionalProperties: false
			}],
			messages: { expectedDirectExport: "Expected the component literal to be directly exported." }
		},
		create(context) {
			const filePath = context.filename;
			if (!utils.isVueFile(filePath)) return {};
			const disallowFunctional = (context.options[0] || {}).disallowFunctionalComponentFunction;
			/**
			* @typedef {object} ScopeStack
			* @property {ScopeStack | null} upper
			* @property {boolean} withinVue3FunctionalBody
			*/
			/** @type { { body: BlockStatement, hasReturnArgument: boolean } } */
			let maybeVue3Functional;
			/** @type {ScopeStack | null} */
			let scopeStack = null;
			return {
				"ExportDefaultDeclaration > *"(node) {
					if (node.type === "ObjectExpression") return;
					if (node.type === "CallExpression") {
						const { callee, arguments: [firstArg] } = node;
						if (firstArg && firstArg.type === "ObjectExpression" && (callee.type === "Identifier" && callee.name === "defineComponent" || callee.type === "MemberExpression" && callee.object.type === "Identifier" && callee.object.name === "Vue" && callee.property.type === "Identifier" && callee.property.name === "extend")) return;
					}
					if (!disallowFunctional) {
						if (node.type === "ArrowFunctionExpression") {
							if (node.body.type !== "BlockStatement") return;
							maybeVue3Functional = {
								body: node.body,
								hasReturnArgument: false
							};
							return;
						}
						if (node.type === "FunctionExpression" || node.type === "FunctionDeclaration") {
							maybeVue3Functional = {
								body: node.body,
								hasReturnArgument: false
							};
							return;
						}
					}
					context.report({
						node: node.parent,
						messageId: "expectedDirectExport"
					});
				},
				...disallowFunctional ? {} : {
					":function > BlockStatement"(node) {
						if (!maybeVue3Functional) return;
						scopeStack = {
							upper: scopeStack,
							withinVue3FunctionalBody: maybeVue3Functional.body === node
						};
					},
					ReturnStatement(node) {
						if (scopeStack && scopeStack.withinVue3FunctionalBody && node.argument) maybeVue3Functional.hasReturnArgument = true;
					},
					":function > BlockStatement:exit"() {
						scopeStack = scopeStack && scopeStack.upper;
					},
					"ExportDefaultDeclaration:exit"(node) {
						if (!maybeVue3Functional) return;
						if (!maybeVue3Functional.hasReturnArgument) context.report({
							node,
							messageId: "expectedDirectExport"
						});
					}
				}
			};
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_require_direct_export();
  }
});