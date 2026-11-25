import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Jg as useUIStore, SN as _plugin_vue_export_helper_default, _N as N8nText_default, cN as Input_default, jN as useI18n, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as AgentModal_default } from "./AgentModal-DCnB4PUf.js";
//#region src/features/agents/components/AgentDuplicateModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentDuplicateModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentDuplicateModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const uiStore = useUIStore();
		const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);
		const name = ref("");
		const submitting = ref(false);
		const submitted = ref(false);
		const trimmedName = computed(() => name.value.trim());
		const isNameTaken = computed(() => trimmedName.value.length > 0 && props.data.existingNames.includes(trimmedName.value));
		const canConfirm = computed(() => trimmedName.value.length > 0 && !isNameTaken.value && !submitting.value);
		const nameError = computed(() => {
			if (!trimmedName.value) return i18n.baseText("agents.duplicate.modal.nameRequired");
			if (isNameTaken.value) return i18n.baseText("agents.duplicate.modal.button.nameTaken");
			return "";
		});
		const visibleNameError = computed(() => submitted.value || isNameTaken.value ? nameError.value : "");
		watch(() => props.data.agentId, () => {
			name.value = `${props.data.name} (copy)`;
		}, { immediate: true });
		function closeModal() {
			uiStore.closeModal(props.modalName);
		}
		async function onConfirm() {
			submitted.value = true;
			if (!canConfirm.value) return;
			submitting.value = true;
			try {
				await props.data.onConfirm(trimmedName.value);
				closeModal();
			} catch {} finally {
				submitting.value = false;
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AgentModal_default, {
				open: modalOpen.value,
				title: unref(i18n).baseText("agents.duplicate.modal.name"),
				busy: submitting.value,
				size: "medium",
				"data-testid": "agent-duplicate-modal",
				"onUpdate:open": _cache[1] || (_cache[1] = ($event) => !$event && closeModal())
			}, {
				footerActions: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "solid",
					disabled: submitting.value,
					loading: submitting.value,
					"data-testid": "agent-duplicate-confirm",
					onClick: onConfirm
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.duplicate.modal.button.confirm")), 1)]),
					_: 1
				}, 8, ["disabled", "loading"])]),
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [createVNode(unref(Input_default), {
					modelValue: name.value,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => name.value = $event),
					placeholder: unref(i18n).baseText("agents.duplicate.modal.enterName"),
					label: unref(i18n).baseText("agents.duplicate.modal.enterName"),
					required: true,
					"data-testid": "agent-duplicate-name-input",
					onEnter: onConfirm
				}, null, 8, [
					"modelValue",
					"placeholder",
					"label"
				]), visibleNameError.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					class: normalizeClass(_ctx.$style.error),
					size: "small"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(visibleNameError.value), 1)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true)], 2)]),
				_: 1
			}, 8, [
				"open",
				"title",
				"busy"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	content: "_content_1vzk7_1",
	error: "_error_1vzk7_7"
} }]]);
//#endregion
export { AgentDuplicateModal_default as default };
