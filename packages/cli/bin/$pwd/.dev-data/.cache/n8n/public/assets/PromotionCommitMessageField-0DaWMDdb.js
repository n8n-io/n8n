import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Sp as toDisplayString, Vd as createCommentVNode, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, nf as mergeModels, xf as useModel } from "./vendor-Hx42-oQF.js";
import { SN as _plugin_vue_export_helper_default, _N as N8nText_default, cN as Input_default, gM as N8nInputLabel_default, jN as useI18n, uE as PROMOTION_COMMIT_MESSAGE_MAX_LENGTH } from "./app-D5flEmb-.js";
//#region ../../modules/promotions/frontend/src/components/PromotionCharacterCount.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var PromotionCharacterCount_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PromotionCharacterCount",
	props: {
		value: {},
		max: {},
		showWhenEmpty: { type: Boolean }
	},
	setup(__props) {
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return __props.value || __props.showWhenEmpty ? (openBlock(), createBlock(unref(N8nText_default), {
				key: 0,
				size: "xsmall",
				color: "text-light",
				class: normalizeClass(_ctx.$style.characterCount)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.characterCount", { interpolate: {
					count: String(__props.value.length),
					max: String(__props.max)
				} })), 1)]),
				_: 1
			}, 8, ["class"])) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": { characterCount: "_characterCount_alw37_1" } }]]);
//#endregion
//#region ../../modules/promotions/frontend/src/components/PromotionCommitMessageField.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region ../../modules/promotions/frontend/src/components/PromotionCommitMessageField.vue
var PromotionCommitMessageField_default = /* @__PURE__ */ defineComponent({
	__name: "PromotionCommitMessageField",
	props: /*@__PURE__*/ mergeModels({ disabled: { type: Boolean } }, {
		"modelValue": { required: true },
		"modelModifiers": {}
	}),
	emits: ["update:modelValue"],
	setup(__props, { expose: __expose }) {
		/** Optional. The backend generates the message when the trimmed value is empty. */
		const commitMessage = useModel(__props, "modelValue");
		const i18n = useI18n();
		const input = useTemplateRef("input");
		__expose({ focus: () => input.value?.focus() });
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nInputLabel_default), {
				"input-name": "promote-commit-message",
				label: unref(i18n).baseText("promotions.commitMessage.label")
			}, {
				default: withCtx(() => [createVNode(unref(Input_default), {
					id: "promote-commit-message",
					ref_key: "input",
					ref: input,
					modelValue: commitMessage.value,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => commitMessage.value = $event),
					type: "textarea",
					rows: 3,
					maxlength: unref(PROMOTION_COMMIT_MESSAGE_MAX_LENGTH),
					disabled: __props.disabled,
					placeholder: unref(i18n).baseText("promotions.commitMessage.placeholder"),
					"data-test-id": "promote-commit-message"
				}, null, 8, [
					"modelValue",
					"maxlength",
					"disabled",
					"placeholder"
				]), createVNode(PromotionCharacterCount_default, {
					value: commitMessage.value,
					max: unref(PROMOTION_COMMIT_MESSAGE_MAX_LENGTH),
					"data-test-id": "promote-commit-message-character-count"
				}, null, 8, ["value", "max"])]),
				_: 1
			}, 8, ["label"]);
		};
	}
});
//#endregion
export { PromotionCommitMessageField_default as t };
