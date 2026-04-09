'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/define-props-declaration.js
/**
* @author Amorites
* See LICENSE file in root directory for full license.
*/
var require_define_props_declaration = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "enforce declaration style of `defineProps`",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/define-props-declaration.html"
			},
			fixable: null,
			schema: [{ enum: ["type-based", "runtime"] }],
			messages: {
				hasArg: "Use type-based declaration instead of runtime declaration.",
				hasTypeArg: "Use runtime declaration instead of type-based declaration."
			}
		},
		create(context) {
			const scriptSetup = utils.getScriptSetupElement(context);
			if (!scriptSetup || !utils.hasAttribute(scriptSetup, "lang", "ts")) return {};
			const defineType = context.options[0] || "type-based";
			return utils.defineScriptSetupVisitor(context, { onDefinePropsEnter(node) {
				switch (defineType) {
					case "type-based":
						if (node.arguments.length > 0) context.report({
							node,
							messageId: "hasArg"
						});
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
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_define_props_declaration();
  }
});