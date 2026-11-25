import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Du as useAsyncState, Gd as createTextVNode, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Od as useCssModule, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, uf as onUnmounted } from "./vendor-Hx42-oQF.js";
import { SN as _plugin_vue_export_helper_default, Wp as useWorkflowsListStore, _N as N8nText_default, bC as useRootStore, bm as useSourceControlStore, dC as useToast, jN as useI18n, p as telemetry, uf as useNodeTypesStore, xN as N8nIcon_default, yx as WORKFLOW_DIFF_MODAL_KEY } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
import { t as WorkflowDiffView_default } from "./WorkflowDiffView-BDT5YKXW.js";
//#region src/features/workflows/workflowDiff/WorkflowDiffModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var WorkflowDiffModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowDiffModal",
	props: { data: {} },
	setup(__props) {
		const props = __props;
		const toast = useToast();
		const $style = useCssModule();
		const nodeTypesStore = useNodeTypesStore();
		const sourceControlStore = useSourceControlStore();
		const i18n = useI18n();
		const router = useRouter();
		const route = useRoute();
		const workflowsListStore = useWorkflowsListStore();
		const manualAsyncConfiguration = {
			resetOnExecute: true,
			shallow: false,
			immediate: false
		};
		const isClosed = ref(false);
		const handleBeforeClose = () => {
			if (isClosed.value) return;
			isClosed.value = true;
			if (window.history.length > 1) router.back();
			else {
				const newQuery = { ...route.query };
				delete newQuery.diff;
				delete newQuery.direction;
				router.replace({ query: newQuery });
			}
		};
		const handleEscapeKey = (event) => {
			if (event.key === "Escape") {
				event.preventDefault();
				event.stopPropagation();
				handleBeforeClose();
			}
		};
		const remote = useAsyncState(async () => {
			if (props.data.direction === "push" && props.data.workflowStatus === "created") return {
				workflow: void 0,
				remote: true
			};
			try {
				const { workflowId } = props.data;
				const { content: workflow } = await sourceControlStore.getRemoteWorkflow(workflowId);
				return {
					workflow,
					remote: true
				};
			} catch (error) {
				toast.showError(error, i18n.baseText("generic.error"));
				handleBeforeClose();
				return {
					workflow: void 0,
					remote: true
				};
			}
		}, void 0, manualAsyncConfiguration);
		const local = useAsyncState(async () => {
			try {
				const { workflowId } = props.data;
				return {
					workflow: await workflowsListStore.fetchWorkflow(workflowId),
					remote: false
				};
			} catch (error) {
				toast.showError(error, i18n.baseText("generic.error"));
				handleBeforeClose();
				return {
					workflow: void 0,
					remote: false
				};
			}
		}, void 0, manualAsyncConfiguration);
		const sourceWorkFlow = computed(() => props.data.direction === "push" ? remote : local);
		const targetWorkFlow = computed(() => props.data.direction === "push" ? local : remote);
		const sourceWorkflow = computed(() => sourceWorkFlow.value.state.value?.workflow);
		const targetWorkflow = computed(() => targetWorkFlow.value.state.value?.workflow);
		const isSourceWorkflowNew = computed(() => !sourceWorkflow.value && !!targetWorkflow.value);
		function getWorkflowLabel(isRemote) {
			return isRemote ? i18n.baseText("workflowDiff.remote", { interpolate: { branchName: sourceControlStore.preferences.branchName } }) : i18n.baseText("workflowDiff.local");
		}
		const sourceLabel = computed(() => getWorkflowLabel(sourceWorkFlow.value.state.value?.remote ?? false));
		const targetLabel = computed(() => getWorkflowLabel(targetWorkFlow.value.state.value?.remote ?? false));
		onMounted(async () => {
			document.addEventListener("keydown", handleEscapeKey, true);
			await nodeTypesStore.loadNodeTypesIfNotLoaded();
			remote.execute();
			local.execute();
			telemetry.track("user_clicks_compare_workflows", {
				instance_id: useRootStore().instanceId,
				workflow_id: props.data.workflowId,
				source: "push_pull_modal"
			});
		});
		onUnmounted(() => {
			document.removeEventListener("keydown", handleEscapeKey, true);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				"event-bus": __props.data.eventBus,
				name: unref(WORKFLOW_DIFF_MODAL_KEY),
				"custom-class": unref($style).workflowDiffModal,
				height: "100%",
				width: "100%",
				"max-width": "100%",
				"max-height": "100%",
				"close-on-press-escape": false,
				"show-close": false,
				onBeforeClose: handleBeforeClose
			}, {
				content: withCtx(() => [createVNode(WorkflowDiffView_default, {
					"source-workflow": sourceWorkflow.value,
					"target-workflow": targetWorkflow.value,
					"source-label": sourceLabel.value,
					"target-label": targetLabel.value,
					"show-back-button": true,
					source: "push_pull_modal",
					onBack: handleBeforeClose
				}, {
					sourceLabel: withCtx(() => [sourceWorkFlow.value.state.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						color: "text-dark",
						size: "small",
						class: normalizeClass(unref($style).sourceBadge)
					}, {
						default: withCtx(() => [sourceWorkFlow.value.state.value.remote ? (openBlock(), createBlock(unref(N8nIcon_default), {
							key: 0,
							icon: "git-branch"
						})) : createCommentVNode("", true), createTextVNode(" " + toDisplayString(sourceLabel.value), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true)]),
					sourceEmptyText: withCtx(() => [sourceWorkFlow.value.state.value?.remote ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						color: "text-base"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(isSourceWorkflowNew.value ? unref(i18n).baseText("workflowDiff.newWorkflow.remote") : unref(i18n).baseText("workflowDiff.deletedWorkflow.remote")), 1)]),
						_: 1
					})) : (openBlock(), createBlock(unref(N8nText_default), {
						key: 1,
						color: "text-base"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(isSourceWorkflowNew.value ? unref(i18n).baseText("workflowDiff.newWorkflow.database") : unref(i18n).baseText("workflowDiff.deletedWorkflow.database")), 1)]),
						_: 1
					}))]),
					targetLabel: withCtx(() => [targetWorkFlow.value.state.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						color: "text-dark",
						size: "small",
						class: normalizeClass(unref($style).sourceBadge)
					}, {
						default: withCtx(() => [targetWorkFlow.value.state.value.remote ? (openBlock(), createBlock(unref(N8nIcon_default), {
							key: 0,
							icon: "git-branch"
						})) : createCommentVNode("", true), createTextVNode(" " + toDisplayString(targetLabel.value), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true)]),
					targetEmptyText: withCtx(() => [targetWorkFlow.value.state.value?.remote ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						color: "text-base"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowDiff.deletedWorkflow.remote")), 1)]),
						_: 1
					})) : (openBlock(), createBlock(unref(N8nText_default), {
						key: 1,
						color: "text-base"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowDiff.deletedWorkflow.database")), 1)]),
						_: 1
					}))]),
					_: 1
				}, 8, [
					"source-workflow",
					"target-workflow",
					"source-label",
					"target-label"
				])]),
				_: 1
			}, 8, [
				"event-bus",
				"name",
				"custom-class"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	workflowDiffModal: "_workflowDiffModal_fzbmb_1",
	sourceBadge: "_sourceBadge_fzbmb_17 _sourceBadge_pmpky_3"
} }]]);
//#endregion
export { WorkflowDiffModal_default as default };
