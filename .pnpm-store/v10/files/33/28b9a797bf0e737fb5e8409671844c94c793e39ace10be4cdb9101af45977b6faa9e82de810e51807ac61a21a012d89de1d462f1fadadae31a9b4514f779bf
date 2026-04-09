'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/component-api-style.js
/**
* @author Yosuke Ota <https://github.com/ota-meshi>
* See LICENSE file in root directory for full license.
*/
var require_component_api_style = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	/**
	* @typedef { 'script-setup' | 'composition' | 'composition-vue2' | 'options' } PreferOption
	*
	* @typedef {PreferOption[]} UserPreferOption
	*
	* @typedef {object} NormalizeOptions
	* @property {object} allowsSFC
	* @property {boolean} [allowsSFC.scriptSetup]
	* @property {boolean} [allowsSFC.composition]
	* @property {boolean} [allowsSFC.compositionVue2]
	* @property {boolean} [allowsSFC.options]
	* @property {object} allowsOther
	* @property {boolean} [allowsOther.composition]
	* @property {boolean} [allowsOther.compositionVue2]
	* @property {boolean} [allowsOther.options]
	*/
	/** @type {PreferOption[]} */
	const STYLE_OPTIONS = [
		"script-setup",
		"composition",
		"composition-vue2",
		"options"
	];
	/**
	* Normalize options.
	* @param {any[]} options The options user configured.
	* @returns {NormalizeOptions} The normalized options.
	*/
	function parseOptions(options) {
		/** @type {NormalizeOptions} */
		const opts = {
			allowsSFC: {},
			allowsOther: {}
		};
		/** @type {UserPreferOption} */
		const preferOptions = options[0] || ["script-setup", "composition"];
		for (const prefer of preferOptions) switch (prefer) {
			case "script-setup":
				opts.allowsSFC.scriptSetup = true;
				break;
			case "composition":
				opts.allowsSFC.composition = true;
				opts.allowsOther.composition = true;
				break;
			case "composition-vue2":
				opts.allowsSFC.compositionVue2 = true;
				opts.allowsOther.compositionVue2 = true;
				break;
			case "options":
				opts.allowsSFC.options = true;
				opts.allowsOther.options = true;
				break;
		}
		if (!opts.allowsOther.composition && !opts.allowsOther.compositionVue2 && !opts.allowsOther.options) {
			opts.allowsOther.composition = true;
			opts.allowsOther.compositionVue2 = true;
			opts.allowsOther.options = true;
		}
		return opts;
	}
	const OPTIONS_API_OPTIONS = new Set([
		"mixins",
		"extends",
		"data",
		"computed",
		"methods",
		"watch",
		"provide",
		"inject",
		"beforeCreate",
		"created",
		"beforeMount",
		"mounted",
		"beforeUpdate",
		"updated",
		"activated",
		"deactivated",
		"beforeDestroy",
		"beforeUnmount",
		"destroyed",
		"unmounted",
		"render",
		"renderTracked",
		"renderTriggered",
		"errorCaptured",
		"expose"
	]);
	const COMPOSITION_API_OPTIONS = new Set(["setup"]);
	const COMPOSITION_API_VUE2_OPTIONS = new Set([
		"setup",
		"render",
		"renderTracked",
		"renderTriggered"
	]);
	const LIFECYCLE_HOOK_OPTIONS = new Set([
		"beforeCreate",
		"created",
		"beforeMount",
		"mounted",
		"beforeUpdate",
		"updated",
		"activated",
		"deactivated",
		"beforeDestroy",
		"beforeUnmount",
		"destroyed",
		"unmounted",
		"renderTracked",
		"renderTriggered",
		"errorCaptured"
	]);
	/**
	* @typedef { 'script-setup' | 'composition' | 'options' } ApiStyle
	*/
	/**
	* @param {object} allowsOpt
	* @param {boolean} [allowsOpt.scriptSetup]
	* @param {boolean} [allowsOpt.composition]
	* @param {boolean} [allowsOpt.compositionVue2]
	* @param {boolean} [allowsOpt.options]
	*/
	function buildAllowedPhrase(allowsOpt) {
		const phrases = [];
		if (allowsOpt.scriptSetup) phrases.push("`<script setup>`");
		if (allowsOpt.composition) phrases.push("Composition API");
		if (allowsOpt.compositionVue2) phrases.push("Composition API (Vue 2)");
		if (allowsOpt.options) phrases.push("Options API");
		return phrases.length > 2 ? `${phrases.slice(0, -1).join(", ")} or ${phrases.at(-1)}` : phrases.join(" or ");
	}
	/**
	* @param {object} allowsOpt
	* @param {boolean} [allowsOpt.scriptSetup]
	* @param {boolean} [allowsOpt.composition]
	* @param {boolean} [allowsOpt.compositionVue2]
	* @param {boolean} [allowsOpt.options]
	*/
	function isPreferScriptSetup(allowsOpt) {
		if (!allowsOpt.scriptSetup || allowsOpt.composition || allowsOpt.compositionVue2 || allowsOpt.options) return false;
		return true;
	}
	/**
	* @param {string} name
	*/
	function buildOptionPhrase(name) {
		if (LIFECYCLE_HOOK_OPTIONS.has(name)) return `\`${name}\` lifecycle hook`;
		return name === "setup" || name === "render" ? `\`${name}\` function` : `\`${name}\` option`;
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "enforce component API style",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/component-api-style.html"
			},
			fixable: null,
			schema: [{
				type: "array",
				items: {
					enum: STYLE_OPTIONS,
					uniqueItems: true,
					additionalItems: false
				},
				minItems: 1
			}],
			messages: {
				disallowScriptSetup: "`<script setup>` is not allowed in your project. Use {{allowedApis}} instead.",
				disallowComponentOption: "{{disallowedApi}} is not allowed in your project. {{optionPhrase}} is part of the {{disallowedApi}}. Use {{allowedApis}} instead.",
				disallowComponentOptionPreferScriptSetup: "{{disallowedApi}} is not allowed in your project. Use `<script setup>` instead."
			}
		},
		create(context) {
			const options = parseOptions(context.options);
			return utils.compositingVisitors({ Program() {
				if (options.allowsSFC.scriptSetup) return;
				const scriptSetup = utils.getScriptSetupElement(context);
				if (scriptSetup) context.report({
					node: scriptSetup.startTag,
					messageId: "disallowScriptSetup",
					data: { allowedApis: buildAllowedPhrase(options.allowsSFC) }
				});
			} }, utils.defineVueVisitor(context, { onVueObjectEnter(node) {
				const allows = utils.isSFCObject(context, node) ? options.allowsSFC : options.allowsOther;
				if ((allows.composition || allows.compositionVue2) && allows.options) return;
				const apis = [
					{
						allow: allows.composition,
						options: COMPOSITION_API_OPTIONS,
						apiName: "Composition API"
					},
					{
						allow: allows.options,
						options: OPTIONS_API_OPTIONS,
						apiName: "Options API"
					},
					{
						allow: allows.compositionVue2,
						options: COMPOSITION_API_VUE2_OPTIONS,
						apiName: "Composition API (Vue 2)"
					}
				];
				for (const prop of node.properties) {
					if (prop.type !== "Property") continue;
					const name = utils.getStaticPropertyName(prop);
					if (!name) continue;
					const disallowApi = !apis.some((api) => api.allow && api.options.has(name)) && apis.find((api) => !api.allow && api.options.has(name));
					if (disallowApi) context.report({
						node: prop.key,
						messageId: isPreferScriptSetup(allows) ? "disallowComponentOptionPreferScriptSetup" : "disallowComponentOption",
						data: {
							disallowedApi: disallowApi.apiName,
							optionPhrase: buildOptionPhrase(name),
							allowedApis: buildAllowedPhrase(allows)
						}
					});
				}
			} }));
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_component_api_style();
  }
});