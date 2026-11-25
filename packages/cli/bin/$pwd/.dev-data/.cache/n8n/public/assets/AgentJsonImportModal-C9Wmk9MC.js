import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { ID as AgentJsonConfigSchema, Jg as useUIStore, LM as N8nCallout_default, SN as _plugin_vue_export_helper_default, _N as N8nText_default, jN as useI18n, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as AgentModal_default } from "./AgentModal-DCnB4PUf.js";
//#region src/features/agents/components/AgentJsonImportModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentJsonImportModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentJsonImportModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const uiStore = useUIStore();
		const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);
		const parsedConfig = ref(null);
		const errorMessage = ref("");
		const importing = ref(false);
		const fileInput = useTemplateRef("fileInput");
		function resetImportState() {
			parsedConfig.value = null;
			errorMessage.value = "";
			if (fileInput.value) fileInput.value.value = "";
		}
		function closeModal() {
			resetImportState();
			uiStore.closeModal(props.modalName);
		}
		async function onFileChange(event) {
			const input = event.target;
			if (!(input instanceof HTMLInputElement)) return;
			const file = input.files?.[0];
			parsedConfig.value = null;
			errorMessage.value = "";
			if (!file) return;
			try {
				const parsed = JSON.parse(await file.text());
				const result = AgentJsonConfigSchema.safeParse(parsed);
				if (!result.success) throw new Error("Invalid agent JSON");
				parsedConfig.value = result.data;
			} catch {
				errorMessage.value = i18n.baseText("agents.builder.importJsonModal.invalidJson");
			}
		}
		async function onConfirm() {
			if (!parsedConfig.value || importing.value) return;
			importing.value = true;
			try {
				await props.data.onConfirm(parsedConfig.value);
				closeModal();
			} finally {
				importing.value = false;
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AgentModal_default, {
				open: modalOpen.value,
				title: unref(i18n).baseText("agents.builder.importJsonModal.title"),
				busy: importing.value,
				size: "large",
				"data-testid": "agent-json-import-modal",
				"onUpdate:open": _cache[0] || (_cache[0] = ($event) => !$event && closeModal())
			}, {
				footerActions: withCtx(() => [createVNode(unref(N8nButton_default), {
					label: unref(i18n).baseText("agents.builder.importJsonModal.import"),
					disabled: !parsedConfig.value || importing.value,
					loading: importing.value,
					"data-testid": "agent-json-import-confirm",
					onClick: onConfirm
				}, null, 8, [
					"label",
					"disabled",
					"loading"
				])]),
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [
					createVNode(unref(N8nText_default), {
						size: "small",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.importJsonModal.description")), 1)]),
						_: 1
					}),
					createBaseVNode("label", { class: normalizeClass(_ctx.$style.fileField) }, [createVNode(unref(N8nText_default), {
						size: "small",
						bold: true
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.importJsonModal.fileLabel")), 1)]),
						_: 1
					}), createBaseVNode("input", {
						ref_key: "fileInput",
						ref: fileInput,
						type: "file",
						accept: "application/json,.json",
						"data-testid": "agent-json-import-file-input",
						onChange: onFileChange
					}, null, 544)], 2),
					errorMessage.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 0,
						theme: "danger",
						"data-testid": "agent-json-import-error"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(errorMessage.value), 1)]),
						_: 1
					})) : createCommentVNode("", true)
				], 2)]),
				_: 1
			}, 8, [
				"open",
				"title",
				"busy"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	content: "_content_u7zyb_1",
	fileField: "_fileField_u7zyb_7"
} }]]);
//#endregion
export { AgentJsonImportModal_default as default };
