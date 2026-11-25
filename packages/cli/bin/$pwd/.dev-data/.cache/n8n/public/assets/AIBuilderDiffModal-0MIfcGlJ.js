import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Xf as unref, ff as openBlock, lf as onMounted } from "./vendor-Hx42-oQF.js";
import { Bu as useBuilderStore, Jg as useUIStore, KA as Dialog_default, SN as _plugin_vue_export_helper_default, WA as DialogBody_default, Yb as AI_BUILDER_DIFF_MODAL_KEY, hC as useTelemetry } from "./app-D5flEmb-.js";
import { t as WorkflowDiffView_default } from "./WorkflowDiffView-BDT5YKXW.js";
//#region src/features/ai/assistant/components/Agent/AIBuilderDiffModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var AIBuilderDiffModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "AIBuilderDiffModal",
	props: { data: {} },
	setup(__props) {
		const props = __props;
		const telemetry = useTelemetry();
		const builderStore = useBuilderStore();
		const uiStore = useUIStore();
		const modalOpen = computed(() => uiStore.modalsById[AI_BUILDER_DIFF_MODAL_KEY]?.open === true);
		onMounted(() => {
			telemetry.track("Workflow diff view opened", { source: "ai-builder-review" });
			builderStore.trackWorkflowBuilderJourney("user_opened_review_changes");
		});
		function handleBeforeClose() {
			telemetry.track("Workflow diff view closed", { source: "ai-builder-review" });
			builderStore.trackWorkflowBuilderJourney("user_closed_review_changes");
			return true;
		}
		function closeModal() {
			uiStore.closeModal(AI_BUILDER_DIFF_MODAL_KEY);
		}
		async function closeDialog() {
			if (uiStore.modalsById["aiBuilderDiff"]?.open !== true) return;
			if (await handleBeforeClose() === false) return;
			closeModal();
		}
		function onDialogOpenUpdate(open) {
			if (!open) closeDialog();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: modalOpen.value,
				size: "cover",
				stacked: "",
				"show-close-button": false,
				"container-class": _ctx.$style.dialog,
				"onUpdate:open": onDialogOpenUpdate
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [createVNode(WorkflowDiffView_default, {
						"source-workflow": props.data.sourceWorkflow,
						"target-workflow": props.data.targetWorkflow,
						"source-label": props.data.sourceLabel,
						"target-label": props.data.targetLabel,
						"show-back-button": true,
						onBack: closeModal
					}, null, 8, [
						"source-workflow",
						"target-workflow",
						"source-label",
						"target-label"
					])]),
					_: 1
				})]),
				_: 1
			}, 8, ["open", "container-class"]);
		};
	}
}), [["__cssModules", { "$style": { dialog: "_dialog_153h0_1" } }]]);
//#endregion
export { AIBuilderDiffModal_default as default };
