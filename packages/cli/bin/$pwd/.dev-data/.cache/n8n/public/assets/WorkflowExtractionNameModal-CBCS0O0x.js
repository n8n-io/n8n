import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { SN as _plugin_vue_export_helper_default, bx as WORKFLOW_EXTRACTION_NAME_MODAL_KEY, dC as useToast, jM as createEventBus, jN as useI18n, uM as N8nFormInput_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
import { t as useWorkflowExtraction } from "./useWorkflowExtraction-Bt0sooXw.js";
//#region src/features/workflows/components/WorkflowExtractionNameModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var DEFAULT_WORKFLOW_NAME = "My Sub-workflow";
var WorkflowExtractionNameModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowExtractionNameModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const toast = useToast();
		const modalBus = createEventBus();
		const workflowExtraction = useWorkflowExtraction();
		const workflowName = ref(DEFAULT_WORKFLOW_NAME);
		const initiatedExtraction = ref(false);
		const workflowNameOrDefault = computed(() => {
			if (workflowName.value) return workflowName.value;
			return DEFAULT_WORKFLOW_NAME;
		});
		const onSubmit = async () => {
			if (initiatedExtraction.value) return;
			initiatedExtraction.value = true;
			const { selection: extractionBoundary, subGraph } = props.data;
			try {
				await workflowExtraction.extractNodesIntoSubworkflow(extractionBoundary, subGraph, workflowNameOrDefault.value);
			} catch (e) {
				toast.showError(e, i18n.baseText("workflowExtraction.error.failure"));
			} finally {
				modalBus.emit("close");
			}
		};
		const inputRef = ref(null);
		onMounted(() => {
			setTimeout(() => {
				inputRef.value?.inputRef?.select();
				inputRef.value?.inputRef?.focus();
			});
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				"max-width": "540px",
				title: unref(i18n).baseText("workflowExtraction.modal.description", { adjustToNumber: props.data.subGraph.length }),
				"event-bus": unref(modalBus),
				name: unref(WORKFLOW_EXTRACTION_NAME_MODAL_KEY),
				center: true,
				"close-on-click-modal": false
			}, {
				content: withCtx(() => [createVNode(unref(N8nFormInput_default), {
					ref_key: "inputRef",
					ref: inputRef,
					modelValue: workflowName.value,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => workflowName.value = $event),
					name: "key",
					label: "",
					"max-length": "128",
					"focus-initially": "",
					onEnter: onSubmit
				}, null, 8, ["modelValue"])]),
				footer: withCtx(({ close }) => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [createVNode(unref(N8nButton_default), {
					variant: "outline",
					label: unref(i18n).baseText("generic.cancel"),
					float: "right",
					"data-test-id": "cancel-button",
					onClick: close
				}, null, 8, ["label", "onClick"]), createVNode(unref(N8nButton_default), {
					label: unref(i18n).baseText("generic.confirm"),
					float: "right",
					disabled: !workflowName.value,
					"data-test-id": "submit-button",
					onClick: onSubmit
				}, null, 8, ["label", "disabled"])], 2)]),
				_: 1
			}, 8, [
				"title",
				"event-bus",
				"name"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	row: "_row_3wpv8_1",
	container: "_container_3wpv8_5",
	description: "_description_3wpv8_9",
	footer: "_footer_3wpv8_14"
} }]]);
//#endregion
export { WorkflowExtractionNameModal_default as default };
