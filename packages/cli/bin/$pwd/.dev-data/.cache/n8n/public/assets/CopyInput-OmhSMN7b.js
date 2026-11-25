import { $d as init_runtime_core_esm_bundler, Df as withCtx, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Sp as toDisplayString, Vd as createCommentVNode, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { SN as _plugin_vue_export_helper_default, Vr as useClipboard, dC as useToast, gM as N8nInputLabel_default, jN as useI18n } from "./app-D5flEmb-.js";
//#region src/app/components/CopyInput.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var CopyInput_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "CopyInput",
	props: {
		label: { default: "" },
		hint: { default: "" },
		value: { default: "" },
		copyButtonText: { default: useI18n().baseText("generic.copy") },
		toastTitle: { default: useI18n().baseText("generic.copiedToClipboard") },
		toastMessage: {},
		size: { default: "medium" },
		collapse: { type: Boolean },
		redactValue: { type: Boolean },
		disableCopy: {
			type: Boolean,
			default: false
		},
		truncate: { default: "end" }
	},
	emits: ["copy"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const clipboard = useClipboard();
		const { showMessage } = useToast();
		function copy() {
			if (props.disableCopy) return;
			emit("copy");
			clipboard.copy(props.value ?? "");
			showMessage({
				title: props.toastTitle,
				message: props.toastMessage,
				type: "success"
			});
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [createVNode(unref(N8nInputLabel_default), { label: __props.label }, {
				default: withCtx(() => [createBaseVNode("div", {
					class: normalizeClass({
						[_ctx.$style.copyText]: true,
						[_ctx.$style[__props.size]]: true,
						[_ctx.$style.collapsed]: __props.collapse,
						[_ctx.$style.truncateStart]: __props.truncate === "start",
						[_ctx.$style.noHover]: __props.disableCopy,
						"ph-no-capture": __props.redactValue
					}),
					"data-test-id": "copy-input",
					onClick: copy
				}, [createBaseVNode("span", { ref: "copyInputValue" }, toDisplayString(__props.value), 513), !__props.disableCopy ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.copyButton)
				}, [createBaseVNode("span", null, toDisplayString(__props.copyButtonText), 1)], 2)) : createCommentVNode("", true)], 2)]),
				_: 1
			}, 8, ["label"]), __props.hint ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.hint)
			}, toDisplayString(__props.hint), 3)) : createCommentVNode("", true)]);
		};
	}
});
var CopyInput_default = /*#__PURE__*/ _plugin_vue_export_helper_default(CopyInput_vue_vue_type_script_setup_true_lang_default, [["__cssModules", { "$style": {
	copyText: "_copyText_deyf7_1",
	noHover: "_noHover_deyf7_21",
	large: "_large_deyf7_25",
	medium: "_medium_deyf7_30",
	collapsed: "_collapsed_deyf7_35",
	truncateStart: "_truncateStart_deyf7_40",
	copyButton: "_copyButton_deyf7_52",
	hint: "_hint_deyf7_68"
} }]]);
//#endregion
export { CopyInput_default as t };
