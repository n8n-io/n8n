'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_regexp$1 = require('../utils/regexp.js');

//#region lib/rules/no-restricted-static-attribute.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_restricted_static_attribute = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const regexp = require_regexp$1.default;
	/**
	* @typedef {object} ParsedOption
	* @property { (key: VAttribute) => boolean } test
	* @property {boolean} [useValue]
	* @property {boolean} [useElement]
	* @property {string} [message]
	*/
	/**
	* @param {any} option
	* @returns {ParsedOption}
	*/
	function parseOption(option) {
		if (typeof option === "string") {
			const matcher = regexp.toRegExp(option, { remove: "g" });
			return { test({ key }) {
				return matcher.test(key.rawName);
			} };
		}
		const parsed = parseOption(option.key);
		if (option.value) {
			const keyTest = parsed.test;
			if (option.value === true) parsed.test = (node) => {
				if (!keyTest(node)) return false;
				return node.value == null || node.value.value === node.key.rawName;
			};
			else {
				const valueMatcher = regexp.toRegExp(option.value, { remove: "g" });
				parsed.test = (node) => {
					if (!keyTest(node)) return false;
					return node.value != null && valueMatcher.test(node.value.value);
				};
			}
			parsed.useValue = true;
		}
		if (option.element) {
			const argTest = parsed.test;
			const tagMatcher = regexp.toRegExp(option.element, { remove: "g" });
			parsed.test = (node) => {
				if (!argTest(node)) return false;
				const element = node.parent.parent;
				return tagMatcher.test(element.rawName);
			};
			parsed.useElement = true;
		}
		parsed.message = option.message;
		return parsed;
	}
	/**
	* @param {VAttribute} node
	* @param {ParsedOption} option
	*/
	function defaultMessage(node, option) {
		const key = node.key.rawName;
		let value = "";
		if (option.useValue) value = node.value == null ? "` set to `true" : `="${node.value.value}"`;
		let on = "";
		if (option.useElement) on = ` on \`<${node.parent.parent.rawName}>\``;
		return `Using \`${key + value}\`${on} is not allowed.`;
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow specific attribute",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/no-restricted-static-attribute.html"
			},
			fixable: null,
			schema: {
				type: "array",
				items: { oneOf: [{ type: "string" }, {
					type: "object",
					properties: {
						key: { type: "string" },
						value: { oneOf: [{ type: "string" }, { enum: [true] }] },
						element: { type: "string" },
						message: {
							type: "string",
							minLength: 1
						}
					},
					required: ["key"],
					additionalProperties: false
				}] },
				uniqueItems: true,
				minItems: 0
			},
			messages: { restrictedAttr: "{{message}}" }
		},
		create(context) {
			if (context.options.length === 0) return {};
			/** @type {ParsedOption[]} */
			const options = context.options.map(parseOption);
			return utils.defineTemplateBodyVisitor(context, { "VAttribute[directive=false]"(node) {
				for (const option of options) if (option.test(node)) {
					const message = option.message || defaultMessage(node, option);
					context.report({
						node,
						messageId: "restrictedAttr",
						data: { message }
					});
					return;
				}
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_restricted_static_attribute();
  }
});