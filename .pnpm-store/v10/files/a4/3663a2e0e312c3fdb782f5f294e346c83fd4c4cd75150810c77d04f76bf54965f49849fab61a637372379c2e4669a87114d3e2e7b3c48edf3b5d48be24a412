'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/define-props-destructuring.js
/**
* @author Wayne Zhang
* See LICENSE file in root directory for full license.
*/
var require_define_props_destructuring = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "enforce consistent style for props destructuring",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/define-props-destructuring.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: { destructure: { enum: [
					"only-when-assigned",
					"always",
					"never"
				] } },
				additionalProperties: false
			}],
			messages: {
				preferDestructuring: "Prefer destructuring from `defineProps` directly.",
				avoidDestructuring: "Avoid destructuring from `defineProps`.",
				avoidWithDefaults: "Avoid using `withDefaults` with destructuring."
			}
		},
		create(context) {
			const destructurePreference = (context.options[0] || {}).destructure || "only-when-assigned";
			return utils.compositingVisitors(utils.defineScriptSetupVisitor(context, { onDefinePropsEnter(node, props) {
				if (!props.some((prop) => prop.propName || prop.type === "unknown" && prop.node)) return;
				const hasDestructure = utils.isUsingPropsDestructure(node);
				const hasWithDefaults = utils.hasWithDefaults(node);
				const hasAssigned = !!utils.getLeftOfDefineProps(node);
				if (destructurePreference === "never") {
					if (hasDestructure) context.report({
						node,
						messageId: "avoidDestructuring"
					});
					return;
				}
				if (!hasDestructure && (destructurePreference === "always" || hasAssigned)) {
					context.report({
						node,
						messageId: "preferDestructuring"
					});
					return;
				}
				if (hasWithDefaults) context.report({
					node: node.parent.callee,
					messageId: "avoidWithDefaults"
				});
			} }));
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_define_props_destructuring();
  }
});