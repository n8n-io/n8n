'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_html_elements$1 = require('../utils/html-elements.js');
const require_svg_elements$1 = require('../utils/svg-elements.js');
const require_vue2_builtin_components$1 = require('../utils/vue2-builtin-components.js');
const require_vue3_builtin_components$1 = require('../utils/vue3-builtin-components.js');
const require_index = require('../utils/index.js');
const require_regexp$1 = require('../utils/regexp.js');
const require_deprecated_html_elements$1 = require('../utils/deprecated-html-elements.js');

//#region lib/rules/restricted-component-names.js
/**
* @author Wayne Zhang
* See LICENSE file in root directory for full license.
*/
var require_restricted_component_names = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const { toRegExpGroupMatcher } = require_regexp$1.default;
	const htmlElements = require_html_elements$1.default;
	const deprecatedHtmlElements = require_deprecated_html_elements$1.default;
	const svgElements = require_svg_elements$1.default;
	const vue2builtinComponents = require_vue2_builtin_components$1.default;
	const vue3builtinComponents = require_vue3_builtin_components$1.default;
	const reservedNames = new Set([
		...htmlElements,
		...deprecatedHtmlElements,
		...svgElements,
		...vue2builtinComponents,
		...vue3builtinComponents
	]);
	module.exports = {
		meta: {
			type: "problem",
			docs: {
				description: "enforce using only specific component names",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/restricted-component-names.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				additionalProperties: false,
				properties: { allow: {
					type: "array",
					items: { type: "string" },
					uniqueItems: true,
					additionalItems: false
				} }
			}],
			messages: { invalidName: "Component name \"{{name}}\" is not allowed." }
		},
		create(context) {
			const isAllowed = toRegExpGroupMatcher((context.options[0] || {}).allow);
			/** @param {string} name  */
			function isAllowedTarget(name) {
				return reservedNames.has(name) || isAllowed(name);
			}
			return utils.defineTemplateBodyVisitor(context, { VElement(node) {
				const name = node.rawName;
				if (isAllowedTarget(name)) return;
				context.report({
					node,
					loc: node.loc,
					messageId: "invalidName",
					data: { name }
				});
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_restricted_component_names();
  }
});