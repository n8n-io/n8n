'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/valid-define-props.js
/**
* @author Yosuke Ota <https://github.com/ota-meshi>
* See LICENSE file in root directory for full license.
*/
var require_valid_define_props = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { findVariable } = require("@eslint-community/eslint-utils");
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "enforce valid `defineProps` compiler macro",
				categories: ["vue3-essential", "vue2-essential"],
				url: "https://eslint.vuejs.org/rules/valid-define-props.html"
			},
			fixable: null,
			schema: [],
			messages: {
				hasTypeAndArg: "`defineProps` has both a type-only props and an argument.",
				referencingLocally: "`defineProps` is referencing locally declared variables.",
				multiple: "`defineProps` has been called multiple times.",
				notDefined: "Props are not defined.",
				definedInBoth: "Props are defined in both `defineProps` and `export default {}`."
			}
		},
		create(context) {
			const scriptSetup = utils.getScriptSetupElement(context);
			if (!scriptSetup) return {};
			/** @type {Set<Expression | SpreadElement>} */
			const propsDefExpressions = /* @__PURE__ */ new Set();
			let hasDefaultExport = false;
			/** @type {CallExpression[]} */
			const definePropsNodes = [];
			/** @type {CallExpression | null} */
			let emptyDefineProps = null;
			return utils.compositingVisitors(utils.defineScriptSetupVisitor(context, {
				onDefinePropsEnter(node) {
					definePropsNodes.push(node);
					const typeArguments = "typeArguments" in node ? node.typeArguments : node.typeParameters;
					if (node.arguments.length > 0) {
						if (typeArguments && typeArguments.params.length > 0) {
							context.report({
								node,
								messageId: "hasTypeAndArg"
							});
							return;
						}
						propsDefExpressions.add(node.arguments[0]);
					} else if (!typeArguments || typeArguments.params.length === 0) emptyDefineProps = node;
				},
				Identifier(node) {
					for (const defineProps of propsDefExpressions) if (utils.inRange(defineProps.range, node)) {
						const variable = findVariable(utils.getScope(context, node), node);
						if (variable && variable.references.some((ref) => ref.identifier === node) && variable.defs.length > 0 && variable.defs.every((def) => def.type !== "ImportBinding" && utils.inRange(scriptSetup.range, def.name) && !utils.inRange(defineProps.range, def.name))) {
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
				hasDefaultExport = Boolean(utils.findProperty(node, "props"));
			} }), { "Program:exit"() {
				if (definePropsNodes.length === 0) return;
				if (definePropsNodes.length > 1) {
					for (const node of definePropsNodes) context.report({
						node,
						messageId: "multiple"
					});
					return;
				}
				if (emptyDefineProps) {
					if (!hasDefaultExport) context.report({
						node: emptyDefineProps,
						messageId: "notDefined"
					});
				} else if (hasDefaultExport) for (const node of definePropsNodes) context.report({
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
    return require_valid_define_props();
  }
});