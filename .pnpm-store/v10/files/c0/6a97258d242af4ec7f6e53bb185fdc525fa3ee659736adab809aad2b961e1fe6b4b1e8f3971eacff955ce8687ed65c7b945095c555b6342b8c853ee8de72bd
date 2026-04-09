'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_casing$1 = require('../utils/casing.js');
const require_regexp$1 = require('../utils/regexp.js');

//#region lib/rules/no-restricted-component-names.js
/**
* @author ItMaga <https://github.com/ItMaga>
* See LICENSE file in root directory for full license.
*/
var require_no_restricted_component_names = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const casing = require_casing$1.default;
	const { isRegExp, toRegExp } = require_regexp$1.default;
	/**
	* @typedef {object} OptionParsed
	* @property { (name: string) => boolean } test
	* @property {string|undefined} [message]
	* @property {string|undefined} [suggest]
	*/
	/**
	* @param {string} str
	* @returns {(str: string) => boolean}
	* @private
	*/
	function buildMatcher(str) {
		if (isRegExp(str)) {
			const regex = toRegExp(str, { remove: "g" });
			return (s) => regex.test(s);
		}
		return (s) => s === casing.pascalCase(str) || s === casing.kebabCase(str);
	}
	/**
	* @param {string|{name: string, message?: string, suggest?: string}} option
	* @returns {OptionParsed}
	* @private
	* */
	function parseOption(option) {
		if (typeof option === "string") return { test: buildMatcher(option) };
		const parsed = parseOption(option.name);
		parsed.message = option.message;
		parsed.suggest = option.suggest;
		return parsed;
	}
	/**
	* @param {Property | AssignmentProperty} property
	* @param {string | undefined} suggest
	* @returns {Rule.SuggestionReportDescriptor[]}
	* @private
	* */
	function createSuggest(property, suggest) {
		if (!suggest) return [];
		return [{
			fix(fixer) {
				return fixer.replaceText(property.value, JSON.stringify(suggest));
			},
			messageId: "suggest",
			data: { suggest }
		}];
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow specific component names",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/no-restricted-component-names.html"
			},
			fixable: null,
			hasSuggestions: true,
			schema: {
				type: "array",
				items: { oneOf: [{ type: "string" }, {
					type: "object",
					properties: {
						name: { type: "string" },
						message: {
							type: "string",
							minLength: 1
						},
						suggest: { type: "string" }
					},
					required: ["name"],
					additionalProperties: false
				}] },
				uniqueItems: true,
				minItems: 0
			},
			messages: {
				disallow: "{{message}}",
				suggest: "Instead, change to `{{suggest}}`."
			}
		},
		create(context) {
			/** @type {OptionParsed[]} */
			const options = context.options.map(parseOption);
			/**
			* @param {ObjectExpression} node
			*/
			function verify(node) {
				const property = utils.findProperty(node, "name");
				if (!property) return;
				if (utils.getStaticPropertyName(property) === "name" && property.value.type === "Literal") {
					const componentName = property.value.value?.toString();
					if (!componentName) return;
					for (const option of options) if (option.test(componentName)) context.report({
						node: property.value,
						messageId: "disallow",
						data: { message: option.message || `Using component name \`${componentName}\` is not allowed.` },
						suggest: createSuggest(property, option.suggest)
					});
				}
			}
			return utils.compositingVisitors(utils.defineVueVisitor(context, { onVueObjectEnter(node) {
				verify(node);
			} }), utils.defineScriptSetupVisitor(context, { onDefineOptionsEnter(node) {
				const expression = node.arguments[0];
				if (expression.type === "ObjectExpression") verify(expression);
			} }));
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_restricted_component_names();
  }
});