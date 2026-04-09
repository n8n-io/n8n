'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/define-emits-declaration.js
/**
* @author Amorites
* See LICENSE file in root directory for full license.
*/
var require_define_emits_declaration = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	* @typedef {import('@typescript-eslint/types').TSESTree.TypeNode} TypeNode
	*
	*/
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "enforce declaration style of `defineEmits`",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/define-emits-declaration.html"
			},
			fixable: null,
			schema: [{ enum: [
				"type-based",
				"type-literal",
				"runtime"
			] }],
			messages: {
				hasArg: "Use type based declaration instead of runtime declaration.",
				hasTypeArg: "Use runtime declaration instead of type based declaration.",
				hasTypeCallArg: "Use new type literal declaration instead of the old call signature declaration."
			}
		},
		create(context) {
			const scriptSetup = utils.getScriptSetupElement(context);
			if (!scriptSetup || !utils.hasAttribute(scriptSetup, "lang", "ts")) return {};
			const defineType = context.options[0] || "type-based";
			return utils.defineScriptSetupVisitor(context, { onDefineEmitsEnter(node) {
				switch (defineType) {
					case "type-based":
						if (node.arguments.length > 0) context.report({
							node,
							messageId: "hasArg"
						});
						break;
					case "type-literal":
						verifyTypeLiteral(node);
						break;
					case "runtime": {
						const typeArguments = "typeArguments" in node ? node.typeArguments : node.typeParameters;
						if (typeArguments && typeArguments.params.length > 0) context.report({
							node,
							messageId: "hasTypeArg"
						});
						break;
					}
				}
			} });
			/** @param {CallExpression} node */
			function verifyTypeLiteral(node) {
				if (node.arguments.length > 0) {
					context.report({
						node,
						messageId: "hasArg"
					});
					return;
				}
				const param = (node.typeArguments || node.typeParameters)?.params[0];
				if (!param) return;
				if (param.type === "TSTypeLiteral") {
					for (const memberNode of param.members) if (memberNode.type !== "TSPropertySignature") context.report({
						node: memberNode,
						messageId: "hasTypeCallArg"
					});
				} else if (param.type === "TSFunctionType") context.report({
					node: param,
					messageId: "hasTypeCallArg"
				});
			}
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_define_emits_declaration();
  }
});