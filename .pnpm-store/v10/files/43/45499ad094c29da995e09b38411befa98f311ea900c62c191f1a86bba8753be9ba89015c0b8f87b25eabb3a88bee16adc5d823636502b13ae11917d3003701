'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/max-props.js
/**
* @author kevsommer Kevin Sommer
* See LICENSE file in root directory for full license.
*/
var require_max_props = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "enforce maximum number of props in Vue component",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/max-props.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: { maxProps: {
					type: "integer",
					minimum: 1
				} },
				additionalProperties: false,
				minProperties: 1
			}],
			messages: { tooManyProps: "Component has too many props ({{propCount}}). Maximum allowed is {{limit}}." }
		},
		create(context) {
			/** @type {Record<string, number>} */
			const option = context.options[0] || {};
			/**
			* @param {import('../utils').ComponentProp[]} props
			* @param {CallExpression | Property} node
			*/
			function checkMaxNumberOfProps(props, node) {
				const propCount = new Set(props.map((prop) => prop.propName)).size;
				if (propCount > option.maxProps && props[0].node) context.report({
					node,
					messageId: "tooManyProps",
					data: {
						propCount,
						limit: option.maxProps
					}
				});
			}
			return utils.compositingVisitors(utils.executeOnVue(context, (node) => {
				const propsNode = node.properties.find(
					/** @returns {p is Property} */
					(p) => p.type === "Property" && utils.getStaticPropertyName(p) === "props"
				);
				if (!propsNode) return;
				checkMaxNumberOfProps(utils.getComponentPropsFromOptions(node), propsNode);
			}), utils.defineScriptSetupVisitor(context, { onDefinePropsEnter(node, props) {
				checkMaxNumberOfProps(props, node);
			} }));
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_max_props();
  }
});