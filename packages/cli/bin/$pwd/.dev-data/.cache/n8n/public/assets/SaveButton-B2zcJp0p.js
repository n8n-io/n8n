import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler } from "./vendor-Hx42-oQF.js";
import { SN as _plugin_vue_export_helper_default, jN as useI18n, ln as KeyboardShortcutTooltip_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
//#region src/app/components/SaveButton.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var SaveButton_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SaveButton",
	props: {
		saved: { type: Boolean },
		isSaving: {
			type: Boolean,
			default: false
		},
		disabled: {
			type: Boolean,
			default: false
		},
		variant: { default: "solid" },
		withShortcut: {
			type: Boolean,
			default: false
		},
		shortcutTooltip: {},
		savingLabel: {}
	},
	emits: ["click"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const props = __props;
		const i18n = useI18n();
		const saveButtonLabel = computed(() => {
			return props.isSaving ? props.savingLabel ?? i18n.baseText("saveButton.saving") : i18n.baseText("saveButton.save");
		});
		const shortcutTooltipLabel = computed(() => {
			return props.shortcutTooltip ?? i18n.baseText("saveButton.save");
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("span", {
				class: normalizeClass(_ctx.$style.container),
				"data-test-id": "save-button"
			}, [__props.saved ? (openBlock(), createElementBlock("span", {
				key: 0,
				class: normalizeClass(_ctx.$style.saved),
				onClick: _cache[0] || (_cache[0] = withModifiers(() => {}, ["prevent", "stop"]))
			}, toDisplayString(unref(i18n).baseText("saveButton.saved")), 3)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [__props.withShortcut ? (openBlock(), createBlock(KeyboardShortcutTooltip_default, {
				key: 0,
				label: shortcutTooltipLabel.value,
				shortcut: {
					keys: ["s"],
					metaKey: true
				},
				placement: "bottom"
			}, {
				default: withCtx(() => [createVNode(unref(N8nButton_default), {
					label: saveButtonLabel.value,
					loading: __props.isSaving,
					disabled: __props.disabled,
					variant: __props.variant,
					onClick: _cache[1] || (_cache[1] = ($event) => emit("click"))
				}, null, 8, [
					"label",
					"loading",
					"disabled",
					"variant"
				])]),
				_: 1
			}, 8, ["label"])) : (openBlock(), createBlock(unref(N8nButton_default), {
				key: 1,
				label: saveButtonLabel.value,
				loading: __props.isSaving,
				disabled: __props.disabled,
				variant: __props.variant,
				onClick: _cache[2] || (_cache[2] = ($event) => emit("click"))
			}, null, 8, [
				"label",
				"loading",
				"disabled",
				"variant"
			]))], 64))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_163o3_1",
	saved: "_saved_163o3_7"
} }]]);
//#endregion
export { SaveButton_default as t };
