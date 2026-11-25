import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, ff as openBlock, ip as init_shared_esm_bundler } from "./vendor-Hx42-oQF.js";
import { Jg as useUIStore, YE as WORKFLOW_VERSION_DESCRIPTION_MAX_LENGTH, _N as N8nText_default, jN as useI18n, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as generateVersionLabelFromId } from "./useWorkflowVersionLabel-cYv19BC7.js";
import { t as WorkflowVersionForm_default } from "./WorkflowVersionForm-irlaPXZc.js";
import { t as AgentModal_default } from "./AgentModal-DCnB4PUf.js";
//#region src/features/agents/components/AgentVersionMetadataModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/agents/components/AgentVersionMetadataModal.vue
var AgentVersionMetadataModal_default = /* @__PURE__ */ defineComponent({
	__name: "AgentVersionMetadataModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const uiStore = useUIStore();
		const open = computed(() => uiStore.modalsById[props.modalName]?.open === true);
		const versionForm = useTemplateRef("versionForm");
		const name = ref(props.data.name?.trim() ? props.data.name : generateVersionLabelFromId(props.data.versionId));
		const description = ref(props.data.description ?? "");
		const submitting = ref(false);
		const error = ref("");
		const isSubmitDisabled = computed(() => submitting.value || name.value.trim().length === 0);
		const title = computed(() => i18n.baseText(props.data.mode === "publish" ? "agents.versionHistory.metadata.publishTitle" : "agents.versionHistory.metadata.editTitle"));
		function close() {
			if (submitting.value) return;
			uiStore.closeModal(props.modalName);
			props.data.onClose(false);
		}
		async function submit() {
			if (isSubmitDisabled.value) return;
			error.value = "";
			if (name.value.length > 128 || description.value.length > 2048) {
				error.value = i18n.baseText("agents.versionHistory.metadata.tooLong", { interpolate: {
					nameMax: 128,
					descriptionMax: WORKFLOW_VERSION_DESCRIPTION_MAX_LENGTH
				} });
				return;
			}
			submitting.value = true;
			try {
				if (await props.data.onSubmit({
					name: name.value.trim(),
					description: description.value || null
				})) {
					uiStore.closeModal(props.modalName);
					props.data.onClose(true);
				}
			} finally {
				submitting.value = false;
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AgentModal_default, {
				open: open.value,
				title: title.value,
				busy: submitting.value,
				size: "large",
				"data-testid": "agent-version-metadata-modal",
				"onUpdate:open": _cache[3] || (_cache[3] = ($event) => !$event && close())
			}, {
				footerActions: withCtx(() => [createVNode(unref(N8nButton_default), {
					loading: submitting.value,
					disabled: isSubmitDisabled.value,
					"data-testid": "agent-version-metadata-submit",
					onClick: submit
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(__props.data.mode === "publish" ? "agents.publish.button.publish" : "generic.save")), 1)]),
					_: 1
				}, 8, ["loading", "disabled"])]),
				default: withCtx(() => [createVNode(WorkflowVersionForm_default, {
					ref_key: "versionForm",
					ref: versionForm,
					"version-name": name.value,
					"onUpdate:versionName": _cache[0] || (_cache[0] = ($event) => name.value = $event),
					description: description.value,
					"onUpdate:description": _cache[1] || (_cache[1] = ($event) => description.value = $event),
					"name-required": true,
					disabled: submitting.value,
					"version-name-test-id": "agent-version-name",
					"description-test-id": "agent-version-description",
					onFocusinOnce: _cache[2] || (_cache[2] = ($event) => versionForm.value?.focusInput()),
					onSubmit: submit
				}, null, 8, [
					"version-name",
					"description",
					"disabled"
				]), error.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					color: "danger",
					role: "alert"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(error.value), 1)]),
					_: 1
				})) : createCommentVNode("", true)]),
				_: 1
			}, 8, [
				"open",
				"title",
				"busy"
			]);
		};
	}
});
//#endregion
export { AgentVersionMetadataModal_default as default };
