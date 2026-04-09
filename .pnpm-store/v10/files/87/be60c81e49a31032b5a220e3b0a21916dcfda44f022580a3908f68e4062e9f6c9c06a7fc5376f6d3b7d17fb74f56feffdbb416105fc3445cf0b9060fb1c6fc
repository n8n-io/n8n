'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_slot_scope_attribute$1 = require('./syntaxes/slot-scope-attribute.js');
const require_v_is$1 = require('./syntaxes/v-is.js');
const require_dynamic_directive_arguments$1 = require('./syntaxes/dynamic-directive-arguments.js');
const require_v_slot$1 = require('./syntaxes/v-slot.js');
const require_script_setup$1 = require('./syntaxes/script-setup.js');
const require_style_css_vars_injection$1 = require('./syntaxes/style-css-vars-injection.js');
const require_v_model_argument$1 = require('./syntaxes/v-model-argument.js');
const require_v_model_custom_modifiers$1 = require('./syntaxes/v-model-custom-modifiers.js');
const require_is_attribute_with_vue_prefix$1 = require('./syntaxes/is-attribute-with-vue-prefix.js');
const require_v_memo$1 = require('./syntaxes/v-memo.js');
const require_v_bind_prop_modifier_shorthand$1 = require('./syntaxes/v-bind-prop-modifier-shorthand.js');
const require_v_bind_attr_modifier$1 = require('./syntaxes/v-bind-attr-modifier.js');
const require_define_options$1 = require('./syntaxes/define-options.js');
const require_define_slots$1 = require('./syntaxes/define-slots.js');
const require_define_model$1 = require('./syntaxes/define-model.js');
const require_v_bind_same_name_shorthand$1 = require('./syntaxes/v-bind-same-name-shorthand.js');

//#region lib/rules/no-unsupported-features.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_unsupported_features = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const semver = require("semver");
	const utils = require_index.default;
	/**
	* @typedef {object} SyntaxRule
	* @property {string} supported
	* @property { (context: RuleContext) => TemplateListener } [createTemplateBodyVisitor]
	* @property { (context: RuleContext) => RuleListener } [createScriptVisitor]
	*/
	const FEATURES = {
		"slot-scope-attribute": require_slot_scope_attribute$1.default,
		"dynamic-directive-arguments": require_dynamic_directive_arguments$1.default,
		"v-slot": require_v_slot$1.default,
		"script-setup": require_script_setup$1.default,
		"style-css-vars-injection": require_style_css_vars_injection$1.default,
		"v-model-argument": require_v_model_argument$1.default,
		"v-model-custom-modifiers": require_v_model_custom_modifiers$1.default,
		"v-is": require_v_is$1.default,
		"is-attribute-with-vue-prefix": require_is_attribute_with_vue_prefix$1.default,
		"v-memo": require_v_memo$1.default,
		"v-bind-prop-modifier-shorthand": require_v_bind_prop_modifier_shorthand$1.default,
		"v-bind-attr-modifier": require_v_bind_attr_modifier$1.default,
		"define-options": require_define_options$1.default,
		"define-slots": require_define_slots$1.default,
		"define-model": require_define_model$1.default,
		"v-bind-same-name-shorthand": require_v_bind_same_name_shorthand$1.default
	};
	const SYNTAX_NAMES = Object.keys(FEATURES);
	const cache = /* @__PURE__ */ new Map();
	/**
	* Get the `semver.Range` object of a given range text.
	* @param {string} x The text expression for a semver range.
	* @returns {semver.Range} The range object of a given range text.
	* It's null if the `x` is not a valid range text.
	*/
	function getSemverRange(x) {
		const s = String(x);
		let ret = cache.get(s) || null;
		if (!ret) {
			try {
				ret = new semver.Range(s);
			} catch {}
			cache.set(s, ret);
		}
		return ret;
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow unsupported Vue.js syntax on the specified version",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/no-unsupported-features.html"
			},
			fixable: "code",
			schema: [{
				type: "object",
				properties: {
					version: { type: "string" },
					ignores: {
						type: "array",
						items: { enum: SYNTAX_NAMES },
						uniqueItems: true
					}
				},
				additionalProperties: false
			}],
			messages: {
				forbiddenSlotScopeAttribute: "`slot-scope` are not supported except Vue.js \">=2.5.0 <3.0.0\".",
				forbiddenDynamicDirectiveArguments: "Dynamic arguments are not supported until Vue.js \"2.6.0\".",
				forbiddenVSlot: "`v-slot` are not supported until Vue.js \"2.6.0\".",
				forbiddenScriptSetup: "`<script setup>` is not supported until Vue.js \"2.7.0\".",
				forbiddenStyleCssVarsInjection: "SFC CSS variable injection is not supported until Vue.js \">=3.0.3 || >=2.7.0 <3.0.0\".",
				forbiddenVModelArgument: "Argument on `v-model` is not supported until Vue.js \"3.0.0\".",
				forbiddenVModelCustomModifiers: "Custom modifiers on `v-model` are not supported until Vue.js \"3.0.0\".",
				forbiddenVIs: "`v-is` are not supported until Vue.js \"3.0.0\".",
				forbiddenIsAttributeWithVuePrefix: "`is=\"vue:\"` are not supported until Vue.js \"3.1.0\".",
				forbiddenVMemo: "`v-memo` are not supported until Vue.js \"3.2.0\".",
				forbiddenVBindPropModifierShorthand: "`.prop` shorthand are not supported until Vue.js \"3.2.0\".",
				forbiddenVBindAttrModifier: "`.attr` modifiers on `v-bind` are not supported until Vue.js \"3.2.0\".",
				forbiddenDefineOptions: "`defineOptions()` macros are not supported until Vue.js \"3.3.0\".",
				forbiddenDefineSlots: "`defineSlots()` macros are not supported until Vue.js \"3.3.0\".",
				forbiddenDefineModel: "`defineModel()` macros are not supported until Vue.js \"3.4.0\".",
				forbiddenVBindSameNameShorthand: "`v-bind` same-name shorthand is not supported until Vue.js \"3.4.0\"."
			}
		},
		create(context) {
			const { version, ignores } = Object.assign({
				version: null,
				ignores: []
			}, context.options[0] || {});
			if (!version) return {};
			const versionRange = getSemverRange(version);
			/**
			* Check whether a given case object is full-supported on the configured node version.
			* @param {SyntaxRule} aCase The case object to check.
			* @returns {boolean} `true` if it's supporting.
			*/
			function isNotSupportingVersion(aCase) {
				return !semver.subset(versionRange, getSemverRange(aCase.supported));
			}
			/** @type {TemplateListener} */
			let templateBodyVisitor = {};
			/** @type {RuleListener} */
			let scriptVisitor = {};
			for (const syntaxName of SYNTAX_NAMES) {
				/** @type {SyntaxRule} */
				const syntax = FEATURES[syntaxName];
				if (ignores.includes(syntaxName) || !isNotSupportingVersion(syntax)) continue;
				if (syntax.createTemplateBodyVisitor) {
					const visitor = syntax.createTemplateBodyVisitor(context);
					templateBodyVisitor = utils.compositingVisitors(templateBodyVisitor, visitor);
				}
				if (syntax.createScriptVisitor) {
					const visitor = syntax.createScriptVisitor(context);
					scriptVisitor = utils.compositingVisitors(scriptVisitor, visitor);
				}
			}
			return utils.defineTemplateBodyVisitor(context, templateBodyVisitor, scriptVisitor);
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_unsupported_features();
  }
});