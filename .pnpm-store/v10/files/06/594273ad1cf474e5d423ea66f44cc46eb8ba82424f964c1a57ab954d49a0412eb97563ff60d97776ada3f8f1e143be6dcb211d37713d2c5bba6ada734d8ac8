'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_regexp$1 = require('../utils/regexp.js');

//#region lib/rules/no-restricted-v-bind.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_restricted_v_bind = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const regexp = require_regexp$1.default;
	/**
	* @typedef {object} ParsedOption
	* @property { (key: VDirectiveKey) => boolean } test
	* @property {string[]} modifiers
	* @property {boolean} [useElement]
	* @property {string} [message]
	*/
	const DEFAULT_OPTIONS = [{
		argument: "/^v-/",
		message: "Using `:v-xxx` is not allowed. Instead, remove `:` and use it as directive."
	}];
	/**
	* @param {any} option
	* @returns {ParsedOption}
	*/
	function parseOption(option) {
		if (typeof option === "string") {
			const matcher = regexp.toRegExp(option, { remove: "g" });
			return {
				test(key) {
					return Boolean(key.argument && key.argument.type === "VIdentifier" && matcher.test(key.argument.rawName));
				},
				modifiers: []
			};
		}
		if (option === null) return {
			test(key) {
				return key.argument === null;
			},
			modifiers: []
		};
		const parsed = parseOption(option.argument);
		if (option.modifiers) {
			const argTest = parsed.test;
			parsed.test = (key) => {
				if (!argTest(key)) return false;
				return option.modifiers.every((modName) => key.modifiers.some((mid) => mid.name === modName));
			};
			parsed.modifiers = option.modifiers;
		}
		if (option.element) {
			const argTest = parsed.test;
			const tagMatcher = regexp.toRegExp(option.element, { remove: "g" });
			parsed.test = (key) => {
				if (!argTest(key)) return false;
				const element = key.parent.parent.parent;
				return tagMatcher.test(element.rawName);
			};
			parsed.useElement = true;
		}
		parsed.message = option.message;
		return parsed;
	}
	/**
	* @param {VDirectiveKey} key
	* @param {ParsedOption} option
	*/
	function defaultMessage(key, option) {
		const vbind = key.name.rawName === ":" ? "" : "v-bind";
		const arg = key.argument != null && key.argument.type === "VIdentifier" ? `:${key.argument.rawName}` : "";
		const mod = option.modifiers.length > 0 ? `.${option.modifiers.join(".")}` : "";
		let on = "";
		if (option.useElement) on = ` on \`<${key.parent.parent.parent.rawName}>\``;
		return `Using \`${vbind + arg + mod}\`${on} is not allowed.`;
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow specific argument in `v-bind`",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/no-restricted-v-bind.html"
			},
			fixable: null,
			schema: {
				type: "array",
				items: { oneOf: [{ type: ["string", "null"] }, {
					type: "object",
					properties: {
						argument: { type: ["string", "null"] },
						modifiers: {
							type: "array",
							items: {
								type: "string",
								enum: [
									"prop",
									"camel",
									"sync",
									"attr"
								]
							},
							uniqueItems: true
						},
						element: { type: "string" },
						message: {
							type: "string",
							minLength: 1
						}
					},
					required: ["argument"],
					additionalProperties: false
				}] },
				uniqueItems: true,
				minItems: 0
			},
			messages: { restrictedVBind: "{{message}}" }
		},
		create(context) {
			/** @type {ParsedOption[]} */
			const options = (context.options.length === 0 ? DEFAULT_OPTIONS : context.options).map(parseOption);
			return utils.defineTemplateBodyVisitor(context, { "VAttribute[directive=true][key.name.name='bind'] > VDirectiveKey"(node) {
				for (const option of options) if (option.test(node)) {
					const message = option.message || defaultMessage(node, option);
					context.report({
						node,
						messageId: "restrictedVBind",
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
    return require_no_restricted_v_bind();
  }
});