import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vf as ref, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $d as injectWorkflowDocumentStore, Ex as WORKFLOW_SETTINGS_MODAL_KEY, Jg as useUIStore, Ju as useWorkflowSaving, Od as useWorkflowsStore, SN as _plugin_vue_export_helper_default, Sd as useNpsSurveyStore, Ur as useInjectWorkflowId, fN as N8nTooltip_default, hM as N8nLink_default, jN as useI18n, nM as N8nInfoAccordion_default, yC as useSettingsStore } from "./app-D5flEmb-.js";
//#region src/features/execution/executions/components/workflow/WorkflowExecutionsInfoAccordion.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = { class: "mt-2xs" };
var WorkflowExecutionsInfoAccordion_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowExecutionsInfoAccordion",
	props: { initiallyExpanded: {
		type: Boolean,
		default: false
	} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const router = useRouter();
		const route = useRoute();
		const workflowSaving = useWorkflowSaving({ router });
		const locale = useI18n();
		const workflowId = useInjectWorkflowId();
		const settingsStore = useSettingsStore();
		const uiStore = useUIStore();
		const workflowsStore = useWorkflowsStore();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const npsSurveyStore = useNpsSurveyStore();
		const defaultValues = ref({
			saveFailedExecutions: "all",
			saveSuccessfulExecutions: "all",
			saveManualExecutions: false
		});
		const workflowSaveSettings = ref({
			saveFailedExecutions: false,
			saveSuccessfulExecutions: false,
			saveTestExecutions: false
		});
		const accordionItems = computed(() => [{
			id: "productionExecutions",
			label: locale.baseText("executionsLandingPage.emptyState.accordion.productionExecutions"),
			icon: productionExecutionsIcon.value.icon,
			iconColor: productionExecutionsIcon.value.color,
			tooltip: productionExecutionsStatus.value === "unknown" ? locale.baseText("executionsLandingPage.emptyState.accordion.productionExecutionsWarningTooltip") : null
		}, {
			id: "manualExecutions",
			label: locale.baseText("executionsLandingPage.emptyState.accordion.testExecutions"),
			icon: workflowSaveSettings.value.saveTestExecutions ? "check" : "x",
			iconColor: workflowSaveSettings.value.saveTestExecutions ? "success" : "danger"
		}]);
		const shouldExpandAccordion = computed(() => {
			if (!props.initiallyExpanded) return false;
			return !workflowSaveSettings.value.saveFailedExecutions || !workflowSaveSettings.value.saveSuccessfulExecutions || !workflowSaveSettings.value.saveTestExecutions;
		});
		const productionExecutionsIcon = computed(() => {
			if (productionExecutionsStatus.value === "saving") return {
				icon: "check",
				color: "success"
			};
			else if (productionExecutionsStatus.value === "not-saving") return {
				icon: "x",
				color: "danger"
			};
			return {
				icon: "triangle-alert",
				color: "warning"
			};
		});
		const productionExecutionsStatus = computed(() => {
			if (workflowSaveSettings.value.saveSuccessfulExecutions === workflowSaveSettings.value.saveFailedExecutions) {
				if (workflowSaveSettings.value.saveSuccessfulExecutions) return "saving";
				return "not-saving";
			} else return "unknown";
		});
		const workflowSettings = computed(() => workflowDocumentStore?.value?.getSettingsSnapshot() ?? {});
		const accordionIcon = computed(() => {
			if (!workflowSaveSettings.value.saveTestExecutions || productionExecutionsStatus.value !== "saving") return {
				icon: "triangle-alert",
				color: "warning"
			};
		});
		watch(workflowSettings, (newSettings) => {
			updateSettings(newSettings);
		});
		onMounted(() => {
			defaultValues.value.saveFailedExecutions = settingsStore.saveDataErrorExecution;
			defaultValues.value.saveSuccessfulExecutions = settingsStore.saveDataSuccessExecution;
			defaultValues.value.saveManualExecutions = settingsStore.saveManualExecutions;
			updateSettings(workflowSettings.value);
		});
		function updateSettings(wfSettings) {
			workflowSaveSettings.value.saveFailedExecutions = wfSettings.saveDataErrorExecution === void 0 ? defaultValues.value.saveFailedExecutions === "all" : wfSettings.saveDataErrorExecution === "all";
			workflowSaveSettings.value.saveSuccessfulExecutions = wfSettings.saveDataSuccessExecution === void 0 ? defaultValues.value.saveSuccessfulExecutions === "all" : wfSettings.saveDataSuccessExecution === "all";
			workflowSaveSettings.value.saveTestExecutions = wfSettings.saveManualExecutions === void 0 ? defaultValues.value.saveManualExecutions : wfSettings.saveManualExecutions;
		}
		function onAccordionClick(event) {
			if (event.target instanceof HTMLAnchorElement) {
				event.preventDefault();
				uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
			}
		}
		function onItemTooltipClick(item, event) {
			if (item === "productionExecutions" && event.target instanceof HTMLAnchorElement) {
				event.preventDefault();
				uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
			}
		}
		function openWorkflowSettings() {
			uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
		}
		async function onSaveWorkflowClick() {
			let currentId = void 0;
			if (workflowId.value) currentId = workflowId.value;
			else if (route.params.workflowId) {
				const routeName = route.params.workflowId;
				currentId = Array.isArray(routeName) ? routeName[0] : routeName;
			}
			if (!currentId) return;
			if (await workflowSaving.saveCurrentWorkflow({ id: currentId })) await npsSurveyStore.showNpsSurveyIfPossible();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nInfoAccordion_default), {
				class: normalizeClass([_ctx.$style.accordion, "mt-2xl"]),
				title: unref(i18n).baseText("executionsLandingPage.emptyState.accordion.title"),
				items: accordionItems.value,
				"initially-expanded": shouldExpandAccordion.value,
				"header-icon": accordionIcon.value,
				"onClick:body": onAccordionClick,
				onTooltipClick: onItemTooltipClick
			}, {
				customContent: withCtx(() => [createBaseVNode("footer", _hoisted_1, [createTextVNode(toDisplayString(unref(i18n).baseText("executionsLandingPage.emptyState.accordion.footer")) + " ", 1), createVNode(unref(N8nTooltip_default), { disabled: unref(workflowsStore).isWorkflowSaved[unref(workflowId)] }, {
					content: withCtx(() => [createBaseVNode("div", null, [createVNode(unref(N8nLink_default), { onClick: withModifiers(onSaveWorkflowClick, ["prevent"]) }, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("executionsLandingPage.emptyState.accordion.footer.tooltipLink")), 1)]),
						_: 1
					}), createTextVNode(" " + toDisplayString(unref(i18n).baseText("executionsLandingPage.emptyState.accordion.footer.tooltipText")), 1)])]),
					default: withCtx(() => [createVNode(unref(N8nLink_default), {
						class: normalizeClass({ [_ctx.$style.disabled]: !unref(workflowsStore).isWorkflowSaved[unref(workflowId)] }),
						size: "small",
						onClick: withModifiers(openWorkflowSettings, ["prevent"])
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("executionsLandingPage.emptyState.accordion.footer.settingsLink")), 1)]),
						_: 1
					}, 8, ["class"])]),
					_: 1
				}, 8, ["disabled"])])]),
				_: 1
			}, 8, [
				"class",
				"title",
				"items",
				"initially-expanded",
				"header-icon"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	accordion: "_accordion_ypmjz_1",
	disabled: "_disabled_ypmjz_29"
} }]]);
//#endregion
export { WorkflowExecutionsInfoAccordion_default as t };
