'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_casing$1 = require('../utils/casing.js');

//#region lib/rules/no-v-text-v-html-on-component.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_v_text_v_html_on_component = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const casing = require_casing$1.default;
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "disallow v-text / v-html on component",
				categories: ["vue2-essential", "vue3-essential"],
				url: "https://eslint.vuejs.org/rules/no-v-text-v-html-on-component.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: {
					allow: {
						type: "array",
						items: { type: "string" },
						uniqueItems: true
					},
					ignoreElementNamespaces: { type: "boolean" }
				},
				additionalProperties: false
			}],
			messages: { disallow: "Using {{directiveName}} on component may break component's content." }
		},
		create(context) {
			const options = context.options[0] || {};
			/** @type {Set<string>} */
			const allow = new Set(options.allow);
			/** @type {boolean} */
			const ignoreElementNamespaces = options.ignoreElementNamespaces === true;
			/**
			* Check whether the given node is an allowed component or not.
			* @param {VElement} node The start tag node to check.
			* @returns {boolean} `true` if the node is an allowed component.
			*/
			function isAllowedComponent(node) {
				const componentName = node.rawName;
				return allow.has(componentName) || allow.has(casing.pascalCase(componentName)) || allow.has(casing.kebabCase(componentName));
			}
			/**
			* Verify for v-text and v-html directive
			* @param {VDirective} node
			*/
			function verify(node) {
				const element = node.parent.parent;
				if (utils.isCustomComponent(element, ignoreElementNamespaces) && !isAllowedComponent(element)) context.report({
					node,
					loc: node.loc,
					messageId: "disallow",
					data: { directiveName: `v-${node.key.name.name}` }
				});
			}
			return utils.defineTemplateBodyVisitor(context, {
				"VAttribute[directive=true][key.name.name='text']": verify,
				"VAttribute[directive=true][key.name.name='html']": verify
			});
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_v_text_v_html_on_component();
  }
});