import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Du as useAsyncState, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, bd as I18nT, ff as openBlock, gf as resolveComponent, hf as renderSlot, ip as init_shared_esm_bundler, mf as renderList, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $d as injectWorkflowDocumentStore, LM as N8nCallout_default, Od as useWorkflowsStore, Ru as usePageRedirectionHelper, Ry as EVALUATIONS_DOCS_URL, SN as _plugin_vue_export_helper_default, _N as N8nText_default, bm as useSourceControlStore, dC as useToast, fC as VIEWS, ff as useEvaluationStore, hC as useTelemetry, hM as N8nLink_default, jN as useI18n, nN as N8nBadge_default, uf as useNodeTypesStore, xN as N8nIcon_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as useWorkflowEvaluationState } from "./useWorkflowEvaluationState-C2nc66cR.js";
import { n as useEvaluationsWizardSidepanelExperiment, t as EvaluationsPaywall_default } from "./EvaluationsPaywall-DgFwmTY8.js";
import { t as useUsageStore } from "./usage.store-CqGOGqOI.js";
import { t as useEvaluationsLicense } from "./useEvaluationsLicense-TMlhIo0m.js";
//#region src/features/ai/evaluation.ee/components/shared/StepIndicator.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var StepIndicator_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "StepIndicator",
	props: {
		stepNumber: {},
		isCompleted: { type: Boolean },
		isActive: { type: Boolean }
	},
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass([
				_ctx.$style.stepIndicator,
				__props.isCompleted && _ctx.$style.completed,
				__props.isActive && _ctx.$style.active,
				!__props.isActive && !__props.isCompleted && _ctx.$style.inactive
			]) }, [__props.isCompleted ? (openBlock(), createBlock(unref(N8nIcon_default), {
				key: 0,
				icon: "check",
				size: "xsmall"
			})) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createTextVNode(toDisplayString(__props.stepNumber), 1)], 64))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	stepIndicator: "_stepIndicator_5d1a0_1",
	active: "_active_5d1a0_15",
	completed: "_completed_5d1a0_19",
	inactive: "_inactive_5d1a0_24"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/components/shared/StepHeader.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var StepHeader_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "StepHeader",
	props: {
		stepNumber: {},
		title: {},
		isCompleted: { type: Boolean },
		isActive: { type: Boolean },
		isOptional: { type: Boolean }
	},
	emits: ["click"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const locale = useI18n();
		const handleClick = (event) => {
			if (!event.target.closest("button") && !event.target.closest("a") && !event.target.closest("input") && !event.target.closest("select")) emit("click");
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.stepHeader),
				onClick: handleClick
			}, [
				createVNode(StepIndicator_default, {
					"step-number": __props.stepNumber,
					"is-completed": __props.isCompleted,
					"is-active": __props.isActive
				}, null, 8, [
					"step-number",
					"is-completed",
					"is-active"
				]),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.titleSlot) }, [renderSlot(_ctx.$slots, "default", {}, () => [createVNode(unref(N8nText_default), {
					size: "medium",
					color: __props.isActive || __props.isCompleted ? "text-dark" : "text-light",
					tag: "span",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.title), 1)]),
					_: 1
				}, 8, ["color"])])], 2),
				__props.isOptional ? (openBlock(), createBlock(unref(N8nBadge_default), {
					key: 0,
					style: {
						"background-color": "var(--color--background)",
						"border": "none"
					}
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("evaluations.setupWizard.stepHeader.optional")), 1)]),
					_: 1
				})) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": { stepHeader: "_stepHeader_z5d0p_1" } }]]);
//#endregion
//#region src/features/ai/evaluation.ee/components/SetupWizard/SetupWizard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var SetupWizard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SetupWizard",
	emits: ["runTest"],
	setup(__props) {
		const router = useRouter();
		const locale = useI18n();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const evaluationStore = useEvaluationStore();
		const nodeTypesStore = useNodeTypesStore();
		const evaluationState = useWorkflowEvaluationState();
		const usageStore = useUsageStore();
		const pageRedirectionHelper = usePageRedirectionHelper();
		const hasRuns = computed(() => {
			return evaluationStore.testRunsByWorkflowId[workflowDocumentStore.value.workflowId]?.length > 0;
		});
		const evaluationsAvailable = computed(() => {
			return usageStore.workflowsWithEvaluationsLimit === -1 || usageStore.workflowsWithEvaluationsCount < usageStore.workflowsWithEvaluationsLimit;
		});
		const evaluationsQuotaExceeded = computed(() => {
			return usageStore.workflowsWithEvaluationsLimit !== -1 && usageStore.workflowsWithEvaluationsCount >= usageStore.workflowsWithEvaluationsLimit && !hasRuns.value;
		});
		const activeStepIndex = ref(0);
		const initializeActiveStep = () => {
			if (evaluationsQuotaExceeded.value) {
				activeStepIndex.value = 2;
				return;
			}
			if (evaluationState.evaluationTriggerExists.value && evaluationState.evaluationSetMetricsNodeExist.value) activeStepIndex.value = 3;
			else if (evaluationState.evaluationTriggerExists.value && evaluationState.evaluationSetOutputsNodeExist.value) activeStepIndex.value = 2;
			else if (evaluationState.evaluationTriggerExists.value) activeStepIndex.value = 1;
			else activeStepIndex.value = 0;
		};
		initializeActiveStep();
		const toggleStep = (index) => {
			activeStepIndex.value = index;
		};
		function navigateToWorkflow(action) {
			const routeWorkflowId = workflowDocumentStore.value.workflowId || "new";
			router.push({
				name: VIEWS.WORKFLOW,
				params: { workflowId: routeWorkflowId },
				query: action ? { action } : void 0
			});
		}
		function onSeePlans() {
			pageRedirectionHelper.goToUpgrade("evaluations", "upgrade-evaluations");
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.container),
				"data-test-id": "evaluation-setup-wizard"
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.steps) }, [
				createBaseVNode("div", { class: normalizeClass([_ctx.$style.step, _ctx.$style.completed]) }, [createVNode(StepHeader_default, {
					"step-number": 1,
					title: unref(locale).baseText("evaluations.setupWizard.step1.title"),
					"is-completed": unref(evaluationState).evaluationTriggerExists.value,
					"is-active": activeStepIndex.value === 0,
					onClick: _cache[0] || (_cache[0] = ($event) => toggleStep(0))
				}, null, 8, [
					"title",
					"is-completed",
					"is-active"
				]), activeStepIndex.value === 0 ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.stepContent)
				}, [createBaseVNode("ul", { class: normalizeClass(_ctx.$style.bulletPoints) }, [createBaseVNode("li", null, [createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-base"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("evaluations.setupWizard.step1.item1")), 1)]),
					_: 1
				})]), createBaseVNode("li", null, [createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-base"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("evaluations.setupWizard.step1.item2")), 1)]),
					_: 1
				})])], 2), !unref(nodeTypesStore).isNodeTypeUnavailable(unref("n8n-nodes-base.evaluationTrigger")) ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.actionButton)
				}, [createVNode(unref(N8nButton_default), {
					variant: "outline",
					size: "small",
					onClick: _cache[1] || (_cache[1] = ($event) => navigateToWorkflow("addEvaluationTrigger"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("evaluations.setupWizard.step1.button")), 1)]),
					_: 1
				})], 2)) : createCommentVNode("", true)], 2)) : createCommentVNode("", true)], 2),
				createBaseVNode("div", { class: normalizeClass([_ctx.$style.step, activeStepIndex.value === 1 ? _ctx.$style.active : ""]) }, [createVNode(StepHeader_default, {
					"step-number": 2,
					title: unref(locale).baseText("evaluations.setupWizard.step2.title"),
					"is-completed": unref(evaluationState).evaluationSetOutputsNodeExist.value,
					"is-active": activeStepIndex.value === 1,
					onClick: _cache[2] || (_cache[2] = ($event) => toggleStep(1))
				}, null, 8, [
					"title",
					"is-completed",
					"is-active"
				]), activeStepIndex.value === 1 ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.stepContent)
				}, [createBaseVNode("ul", { class: normalizeClass(_ctx.$style.bulletPoints) }, [createBaseVNode("li", null, [createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-base"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("evaluations.setupWizard.step2.item1")), 1)]),
					_: 1
				})])], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.actionButton) }, [createVNode(unref(N8nButton_default), {
					variant: "outline",
					size: "small",
					onClick: _cache[3] || (_cache[3] = ($event) => navigateToWorkflow("addEvaluationNode"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("evaluations.setupWizard.step2.button")), 1)]),
					_: 1
				})], 2)], 2)) : createCommentVNode("", true)], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.step) }, [createVNode(StepHeader_default, {
					"step-number": 3,
					title: unref(locale).baseText("evaluations.setupWizard.step3.title"),
					"is-completed": unref(evaluationState).evaluationSetMetricsNodeExist.value,
					"is-active": activeStepIndex.value === 2,
					"is-optional": true,
					onClick: _cache[4] || (_cache[4] = ($event) => toggleStep(2))
				}, null, 8, [
					"title",
					"is-completed",
					"is-active"
				]), activeStepIndex.value === 2 ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.stepContent)
				}, [
					!evaluationsQuotaExceeded.value ? (openBlock(), createElementBlock("ul", {
						key: 0,
						class: normalizeClass(_ctx.$style.bulletPoints)
					}, [createBaseVNode("li", null, [createVNode(unref(N8nText_default), {
						size: "small",
						color: "text-base"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("evaluations.setupWizard.step3.item1")), 1)]),
						_: 1
					})]), createBaseVNode("li", null, [createVNode(unref(N8nText_default), {
						size: "small",
						color: "text-base"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("evaluations.setupWizard.step3.item2")), 1)]),
						_: 1
					})])], 2)) : (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 1,
						theme: "warning",
						iconless: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("evaluations.setupWizard.limitReached")), 1)]),
						_: 1
					})),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.actionButton) }, [!evaluationsQuotaExceeded.value ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 0,
						variant: "outline",
						size: "small",
						onClick: _cache[5] || (_cache[5] = ($event) => navigateToWorkflow("addEvaluationNode"))
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("evaluations.setupWizard.step3.button")), 1)]),
						_: 1
					})) : (openBlock(), createBlock(unref(N8nButton_default), {
						key: 1,
						size: "small",
						onClick: onSeePlans
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("generic.seePlans")), 1)]),
						_: 1
					})), createVNode(unref(N8nButton_default), {
						variant: "ghost",
						size: "small",
						style: { "color": "var(--color--text--tint-1)" },
						onClick: _cache[6] || (_cache[6] = ($event) => toggleStep(3))
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("evaluations.setupWizard.step3.skip")), 1)]),
						_: 1
					})], 2),
					unref(usageStore).workflowsWithEvaluationsLimit !== -1 && evaluationsAvailable.value ? (openBlock(), createElementBlock("div", {
						key: 2,
						class: normalizeClass(_ctx.$style.quotaNote)
					}, [createVNode(unref(N8nText_default), {
						size: "xsmall",
						color: "text-base"
					}, {
						default: withCtx(() => [createVNode(unref(I18nT), {
							keypath: "evaluations.setupWizard.step3.notice",
							scope: "global"
						}, {
							link: withCtx(() => [createBaseVNode("a", {
								style: {
									"text-decoration": "underline",
									"color": "inherit"
								},
								onClick: onSeePlans
							}, toDisplayString(unref(locale).baseText("evaluations.setupWizard.step3.notice.link")), 1)]),
							_: 1
						})]),
						_: 1
					})], 2)) : createCommentVNode("", true)
				], 2)) : createCommentVNode("", true)], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.step) }, [createVNode(StepHeader_default, {
					"step-number": 4,
					title: unref(locale).baseText("evaluations.setupWizard.step4.title"),
					"is-completed": false,
					"is-active": activeStepIndex.value === 3,
					onClick: _cache[9] || (_cache[9] = ($event) => toggleStep(3))
				}, {
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass([_ctx.$style.actionButton, _ctx.$style.actionButtonInline]) }, [unref(evaluationState).evaluationSetMetricsNodeExist.value && !evaluationsQuotaExceeded.value ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 0,
						variant: "outline",
						size: "medium",
						disabled: !unref(evaluationState).evaluationTriggerExists.value || !unref(evaluationState).evaluationSetOutputsNodeExist.value && !unref(evaluationState).evaluationSetMetricsNodeExist.value,
						onClick: _cache[7] || (_cache[7] = ($event) => _ctx.$emit("runTest"))
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("evaluations.setupWizard.step4.button")), 1)]),
						_: 1
					}, 8, ["disabled"])) : (openBlock(), createBlock(unref(N8nButton_default), {
						key: 1,
						variant: "outline",
						size: "medium",
						disabled: !unref(evaluationState).evaluationTriggerExists.value || !unref(evaluationState).evaluationSetOutputsNodeExist.value && !unref(evaluationState).evaluationSetMetricsNodeExist.value,
						onClick: _cache[8] || (_cache[8] = ($event) => navigateToWorkflow("executeEvaluation"))
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("evaluations.setupWizard.step4.altButton")), 1)]),
						_: 1
					}, 8, ["disabled"]))], 2)]),
					_: 1
				}, 8, ["title", "is-active"])], 2)
			], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1cyk9_1",
	steps: "_steps_1cyk9_5",
	step: "_step_1cyk9_5",
	stepContent: "_stepContent_1cyk9_15",
	slideDown: "_slideDown_1cyk9_1",
	bulletPoints: "_bulletPoints_1cyk9_20",
	actionButton: "_actionButton_1cyk9_27",
	actionButtonInline: "_actionButtonInline_1cyk9_36",
	quotaNote: "_quotaNote_1cyk9_40"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/components/EvaluationsEmptyState/EvaluationsEmptyState.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var EvaluationsEmptyState_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "EvaluationsEmptyState",
	props: { disabled: { type: Boolean } },
	emits: ["getStarted"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const locale = useI18n();
		const features = [
			{
				icon: "bug",
				titleKey: "evaluations.emptyState.catchIssues.title",
				descriptionKey: "evaluations.emptyState.catchIssues.description"
			},
			{
				icon: "blocks",
				titleKey: "evaluations.emptyState.buildConfidence.title",
				descriptionKey: "evaluations.emptyState.buildConfidence.description"
			},
			{
				icon: "gauge",
				titleKey: "evaluations.emptyState.measurePerformance.title",
				descriptionKey: "evaluations.emptyState.measurePerformance.description"
			}
		];
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.wrapper),
				"data-test-id": "evaluations-empty-state"
			}, [
				createBaseVNode("header", { class: normalizeClass(_ctx.$style.header) }, [createVNode(unref(N8nText_default), {
					tag: "h2",
					size: "xlarge",
					color: "text-dark",
					bold: "",
					class: normalizeClass(_ctx.$style.title)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("evaluations.emptyState.title")), 1)]),
					_: 1
				}, 8, ["class"]), createVNode(unref(N8nText_default), {
					size: "medium",
					color: "text-base",
					class: normalizeClass(_ctx.$style.description)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("evaluations.emptyState.description")), 1)]),
					_: 1
				}, 8, ["class"])], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.featuresCard) }, [(openBlock(), createElementBlock(Fragment, null, renderList(features, (feature) => {
					return createBaseVNode("div", {
						key: feature.titleKey,
						class: normalizeClass(_ctx.$style.feature)
					}, [
						createVNode(unref(N8nIcon_default), {
							icon: feature.icon,
							size: 24,
							class: normalizeClass(_ctx.$style.featureIcon)
						}, null, 8, ["icon", "class"]),
						createVNode(unref(N8nText_default), {
							size: "medium",
							bold: "",
							color: "text-dark",
							class: normalizeClass(_ctx.$style.featureTitle)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText(feature.titleKey)), 1)]),
							_: 2
						}, 1032, ["class"]),
						createVNode(unref(N8nText_default), {
							size: "medium",
							color: "text-base"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText(feature.descriptionKey)), 1)]),
							_: 2
						}, 1024)
					], 2);
				}), 64))], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [createVNode(unref(N8nButton_default), {
					variant: "solid",
					size: "medium",
					type: "button",
					disabled: __props.disabled,
					"data-test-id": "evaluations-empty-state-get-started",
					onClick: _cache[0] || (_cache[0] = ($event) => emit("getStarted"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("evaluations.emptyState.getStarted")), 1)]),
					_: 1
				}, 8, ["disabled"])], 2)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	wrapper: "_wrapper_1m2b3_1",
	header: "_header_1m2b3_14",
	title: "_title_1m2b3_22",
	description: "_description_1m2b3_27",
	featuresCard: "_featuresCard_1m2b3_32",
	feature: "_feature_1m2b3_32",
	featureIcon: "_featureIcon_1m2b3_58",
	featureTitle: "_featureTitle_1m2b3_63",
	footer: "_footer_1m2b3_67"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/views/EvaluationsRootView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var EvaluationsRootView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "EvaluationsRootView",
	props: { workflowId: {} },
	setup(__props) {
		const props = __props;
		const usageStore = useUsageStore();
		const evaluationStore = useEvaluationStore();
		const evaluationState = useWorkflowEvaluationState();
		const workflowsStore = useWorkflowsStore();
		const telemetry = useTelemetry();
		const toast = useToast();
		const locale = useI18n();
		const sourceControlStore = useSourceControlStore();
		const router = useRouter();
		const { isFeatureEnabled: isEvaluationsWizardSidepanelEnabled } = useEvaluationsWizardSidepanelExperiment();
		const { isLicensed } = useEvaluationsLicense();
		const isProtectedEnvironment = computed(() => {
			return sourceControlStore.preferences.branchReadOnly;
		});
		const workflowIsSaved = computed(() => workflowsStore.isWorkflowSaved[props.workflowId] === true);
		const runs = computed(() => {
			return Object.values(evaluationStore.testRunsById ?? {}).filter(({ workflowId }) => workflowId === props.workflowId);
		});
		const hasRuns = computed(() => {
			return runs.value.length > 0;
		});
		const showWizard = computed(() => !hasRuns.value);
		async function runTest() {
			if (!workflowIsSaved.value) return;
			try {
				await evaluationStore.startTestRun(props.workflowId);
			} catch (error) {
				toast.showError(error, locale.baseText("evaluation.listRuns.error.cantStartTestRun"));
				return;
			}
			try {
				await evaluationStore.fetchTestRuns(props.workflowId);
			} catch (error) {
				toast.showError(error, locale.baseText("evaluation.listRuns.error.cantFetchTestRuns"));
			}
		}
		const evaluationsQuotaExceeded = computed(() => {
			return usageStore.workflowsWithEvaluationsLimit !== -1 && usageStore.workflowsWithEvaluationsCount >= usageStore.workflowsWithEvaluationsLimit && !hasRuns.value;
		});
		function openWizardOnCanvas() {
			router.push({
				name: VIEWS.WORKFLOW,
				params: { workflowId: props.workflowId },
				query: { action: "openEvaluationsWizard" }
			});
		}
		async function fetchTestRuns() {
			if (!workflowIsSaved.value) return;
			try {
				await evaluationStore.fetchTestRuns(props.workflowId);
			} catch (error) {
				toast.showError(error, locale.baseText("evaluation.listRuns.error.cantFetchTestRuns"));
			}
		}
		const { isReady } = useAsyncState(async () => {
			try {
				await usageStore.getLicenseInfo();
			} catch (error) {
				toast.showError(error, locale.baseText("evaluation.listRuns.error.cantFetchTestRuns"));
			}
			await fetchTestRuns();
		}, void 0);
		watch(workflowIsSaved, async (isSaved) => {
			if (isSaved) await fetchTestRuns();
		});
		watch(isReady, (ready) => {
			if (ready) {
				if (showWizard.value) telemetry.track("User viewed tests tab", {
					workflow_id: props.workflowId,
					test_type: "evaluation",
					view: "setup",
					trigger_set_up: evaluationState.evaluationTriggerExists.value,
					output_set_up: evaluationState.evaluationSetOutputsNodeExist.value,
					metrics_set_up: evaluationState.evaluationSetMetricsNodeExist.value,
					quota_reached: evaluationsQuotaExceeded.value
				});
				else telemetry.track("User viewed tests tab", {
					workflow_id: props.workflowId,
					test_type: "evaluation",
					view: "overview",
					run_count: runs.value.length
				});
			}
		}, { immediate: true });
		return (_ctx, _cache) => {
			const _component_RouterView = resolveComponent("RouterView");
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.evaluationsView) }, [unref(isReady) && showWizard.value && unref(isEvaluationsWizardSidepanelEnabled) ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [!unref(isLicensed) ? (openBlock(), createBlock(EvaluationsPaywall_default, { key: 0 })) : (openBlock(), createBlock(EvaluationsEmptyState_default, {
				key: 1,
				disabled: isProtectedEnvironment.value,
				onGetStarted: openWizardOnCanvas
			}, null, 8, ["disabled"]))], 64)) : unref(isReady) && showWizard.value ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.setupContent)
			}, [createBaseVNode("div", null, [createVNode(unref(N8nText_default), {
				size: "large",
				color: "text-dark",
				tag: "h3",
				bold: ""
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("evaluations.setupWizard.title")), 1)]),
				_: 1
			}), createVNode(unref(N8nText_default), {
				tag: "p",
				size: "small",
				color: "text-base",
				class: normalizeClass(_ctx.$style.description)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("evaluations.setupWizard.description")) + " ", 1), createVNode(unref(N8nLink_default), {
					size: "small",
					href: unref(EVALUATIONS_DOCS_URL)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("evaluations.setupWizard.moreInfo")), 1)]),
					_: 1
				}, 8, ["href"])]),
				_: 1
			}, 8, ["class"])]), isProtectedEnvironment.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
				key: 0,
				theme: "info",
				icon: "info"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("evaluations.readOnlyNotice")), 1)]),
				_: 1
			})) : (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.config)
			}, [_cache[0] || (_cache[0] = createBaseVNode("iframe", {
				style: { "min-width": "500px" },
				width: "500",
				height: "280",
				src: "https://www.youtube.com/embed/5LlF196PKaE",
				title: "n8n Evaluation quickstart",
				frameborder: "0",
				allow: "\n							accelerometer;\n							autoplay;\n							clipboard-write;\n							encrypted-media;\n							gyroscope;\n							picture-in-picture;\n							web-share;\n						",
				referrerpolicy: "strict-origin-when-cross-origin",
				allowfullscreen: ""
			}, null, -1)), unref(isLicensed) ? (openBlock(), createBlock(SetupWizard_default, {
				key: 0,
				onRunTest: runTest
			})) : (openBlock(), createBlock(EvaluationsPaywall_default, { key: 1 }))], 2))], 2)) : unref(isReady) ? (openBlock(), createBlock(_component_RouterView, { key: 2 })) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	evaluationsView: "_evaluationsView_s2wlx_1",
	setupContent: "_setupContent_s2wlx_9",
	description: "_description_s2wlx_18",
	config: "_config_s2wlx_23",
	setupDescription: "_setupDescription_s2wlx_29"
} }]]);
//#endregion
export { EvaluationsRootView_default as default };
