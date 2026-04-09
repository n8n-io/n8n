'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/valid-define-emits.js
/**
* @author Yosuke Ota <https://github.com/ota-meshi>
* See LICENSE file in root directory for full license.
*/
var require_valid_define_emits = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { findVariable } = require("@eslint-community/eslint-utils");
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "enforce valid `defineEmits` compiler macro",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/valid-define-emits.html"
			},
			fixable: null,
			schema: [],
			messages: {
				hasTypeAndArg: "`defineEmits` has both a type-only emit and an argument.",
				referencingLocally: "`defineEmits` is referencing locally declared variables.",
				multiple: "`defineEmits` has been called multiple times.",
				notDefined: "Custom events are not defined.",
				definedInBoth: "Custom events are defined in both `defineEmits` and `export default {}`."
			}
		},
		create(context) {
			const scriptSetup = utils.getScriptSetupElement(context);
			if (!scriptSetup) return {};
			/** @type {Set<Expression | SpreadElement>} */
			const emitsDefExpressions = /* @__PURE__ */ new Set();
			let hasDefaultExport = false;
			/** @type {CallExpression[]} */
			const defineEmitsNodes = [];
			/** @type {CallExpression | null} */
			let emptyDefineEmits = null;
			return utils.compositingVisitors(utils.defineScriptSetupVisitor(context, {
				onDefineEmitsEnter(node) {
					defineEmitsNodes.push(node);
					const typeArguments = "typeArguments" in node ? node.typeArguments : node.typeParameters;
					if (node.arguments.length > 0) {
						if (typeArguments && typeArguments.params.length > 0) {
							context.report({
								node,
								messageId: "hasTypeAndArg"
							});
							return;
						}
						emitsDefExpressions.add(node.arguments[0]);
					} else if (!typeArguments || typeArguments.params.length === 0) emptyDefineEmits = node;
				},
				Identifier(node) {
					for (const defineEmits of emitsDefExpressions) if (utils.inRange(defineEmits.range, node)) {
						const variable = findVariable(utils.getScope(context, node), node);
						if (variable && variable.references.some((ref) => ref.identifier === node) && variable.defs.length > 0 && variable.defs.every((def) => def.type !== "ImportBinding" && utils.inRange(scriptSetup.range, def.name) && !utils.inRange(defineEmits.range, def.name))) {
							if (utils.withinTypeNode(node)) continue;
							context.report({
								node,
								messageId: "referencingLocally"
							});
						}
					}
				}
			}), utils.defineVueVisitor(context, { onVueObjectEnter(node, { type }) {
				if (type !== "export" || utils.inRange(scriptSetup.range, node)) return;
				hasDefaultExport = Boolean(utils.findProperty(node, "emits"));
			} }), { "Program:exit"() {
				if (defineEmitsNodes.length === 0) return;
				if (defineEmitsNodes.length > 1) {
					for (const node of defineEmitsNodes) context.report({
						node,
						messageId: "multiple"
					});
					return;
				}
				if (emptyDefineEmits) {
					if (!hasDefaultExport) context.report({
						node: emptyDefineEmits,
						messageId: "notDefined"
					});
				} else if (hasDefaultExport) for (const node of defineEmitsNodes) context.report({
					node,
					messageId: "definedInBoth"
				});
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_valid_define_emits();
  }
});