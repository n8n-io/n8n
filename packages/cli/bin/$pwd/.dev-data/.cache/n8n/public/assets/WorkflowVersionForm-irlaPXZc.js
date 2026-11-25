import { $d as init_runtime_core_esm_bundler, Cf as useTemplateRef, Df as withCtx, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Md as withKeys, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Td as init_runtime_dom_esm_bundler, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, nf as mergeModels, xf as useModel } from "./vendor-Hx42-oQF.js";
import { SN as _plugin_vue_export_helper_default, YE as WORKFLOW_VERSION_DESCRIPTION_MAX_LENGTH, cN as Input_default, gM as N8nInputLabel_default, jN as useI18n } from "./app-D5flEmb-.js";
import { t as CharacterCount_default } from "./CharacterCount-LwZS4Nnd.js";
//#region src/app/components/WorkflowVersionForm.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler(), init_shared_esm_bundler();
var WorkflowVersionForm_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowVersionForm",
	props: /*@__PURE__*/ mergeModels({
		disabled: { type: Boolean },
		nameRequired: { type: Boolean },
		versionNameTestId: {},
		descriptionTestId: {}
	}, {
		"versionName": { required: true },
		"versionNameModifiers": {},
		"description": { required: true },
		"descriptionModifiers": {}
	}),
	emits: /*@__PURE__*/ mergeModels(["submit"], ["update:versionName", "update:description"]),
	setup(__props, { expose: __expose, emit: __emit }) {
		const versionName = useModel(__props, "versionName");
		const description = useModel(__props, "description");
		const nameInputRef = useTemplateRef("nameInput");
		const i18n = useI18n();
		const emit = __emit;
		const focusInput = () => {
			nameInputRef.value?.select();
		};
		const handleEnterKey = () => {
			emit("submit");
		};
		__expose({ focusInput });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.formContainer) }, [createVNode(unref(N8nInputLabel_default), {
				"input-name": "workflow-version-name",
				label: unref(i18n).baseText("workflows.publishModal.versionNameLabel"),
				required: __props.nameRequired ?? true,
				class: normalizeClass(_ctx.$style.inputWrapper)
			}, {
				default: withCtx(() => [createVNode(unref(Input_default), {
					id: "workflow-version-name",
					ref: "nameInput",
					modelValue: versionName.value,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => versionName.value = $event),
					disabled: __props.disabled,
					size: "large",
					maxlength: unref(128),
					"data-test-id": __props.versionNameTestId,
					onKeydown: withKeys(withModifiers(handleEnterKey, ["prevent"]), ["enter"])
				}, null, 8, [
					"modelValue",
					"disabled",
					"maxlength",
					"data-test-id",
					"onKeydown"
				]), createVNode(CharacterCount_default, {
					value: versionName.value,
					max: unref(128),
					"data-test-id": "workflow-version-name-character-count"
				}, null, 8, ["value", "max"])]),
				_: 1
			}, 8, [
				"label",
				"required",
				"class"
			]), createVNode(unref(N8nInputLabel_default), {
				"input-name": "workflow-version-description",
				label: unref(i18n).baseText("workflows.publishModal.descriptionPlaceholder")
			}, {
				default: withCtx(() => [createVNode(unref(Input_default), {
					id: "workflow-version-description",
					modelValue: description.value,
					"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => description.value = $event),
					type: "textarea",
					rows: 4,
					disabled: __props.disabled,
					size: "large",
					maxlength: unref(WORKFLOW_VERSION_DESCRIPTION_MAX_LENGTH),
					"data-test-id": __props.descriptionTestId
				}, null, 8, [
					"modelValue",
					"disabled",
					"maxlength",
					"data-test-id"
				]), createVNode(CharacterCount_default, {
					value: description.value,
					max: unref(WORKFLOW_VERSION_DESCRIPTION_MAX_LENGTH),
					"data-test-id": "workflow-version-description-character-count"
				}, null, 8, ["value", "max"])]),
				_: 1
			}, 8, ["label"])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	formContainer: "_formContainer_1enki_1",
	inputWrapper: "_inputWrapper_1enki_7"
} }]]);
//#endregion
export { WorkflowVersionForm_default as t };
