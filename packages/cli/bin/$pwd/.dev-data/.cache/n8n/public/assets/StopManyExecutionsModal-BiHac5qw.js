import "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, fu as ElRow, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Hl as useExecutionsStore, LM as N8nCallout_default, SN as _plugin_vue_export_helper_default, _N as N8nText_default, dC as useToast, hC as useTelemetry, jM as createEventBus, jN as useI18n, uM as N8nFormInput_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
//#region src/features/execution/executions/components/StopManyExecutionsModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var StopManyExecutionsModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "StopManyExecutionsModal",
	props: { modalName: {} },
	setup(__props) {
		const props = __props;
		const isLoading = ref(false);
		const executionsStore = useExecutionsStore();
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const checkRunning = ref(true);
		const checkQueued = ref(true);
		const checkWaiting = ref(true);
		const activeFilterHint = computed(() => {
			const { startedBefore, startedAfter } = executionsStore.executionsFilters;
			if (startedBefore && startedAfter) return i18n.baseText("executionStopManyModal.dateHint.startEnd", { interpolate: {
				startedBefore,
				startedAfter
			} });
			else if (startedAfter) return i18n.baseText("executionStopManyModal.dateHint.startOnly", { interpolate: { startedAfter } });
			else if (startedBefore) return i18n.baseText("executionStopManyModal.dateHint.endOnly", { interpolate: { startedBefore } });
			return "";
		});
		const allWorkflowsHint = computed(() => {
			if (executionsStore.filters.workflowId === "all") return i18n.baseText("executionStopManyModal.allWorkflowsHint");
			return "";
		});
		const toast = useToast();
		const modalBus = createEventBus();
		const onSubmit = async () => {
			try {
				const status = [
					checkWaiting.value ? ["waiting"] : [],
					checkRunning.value ? ["running"] : [],
					checkQueued.value ? ["new"] : []
				].flat();
				const { startedBefore, startedAfter } = executionsStore.executionsFilters;
				isLoading.value = true;
				const { stopped: count } = await executionsStore.stopManyExecutions({
					status,
					startedBefore,
					startedAfter
				});
				isLoading.value = false;
				toast.showMessage({
					title: i18n.baseText("executionStopManyModal.success", { interpolate: { count } }),
					type: count > 0 ? "success" : "info"
				});
				telemetry.track("User confirmed stop many executions", {
					waitingExecutions: checkWaiting.value,
					runningExecutions: checkRunning.value,
					queuedExecutions: checkQueued.value,
					stoppedCount: count
				});
			} catch (e) {
				toast.showError(e, i18n.baseText("executionStopManyModal.error.failure"));
			} finally {
				modalBus.emit("close");
			}
		};
		function closeModal() {
			modalBus.emit("close");
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				"max-width": "540px",
				title: unref(i18n).baseText("executionStopManyModal.title"),
				"event-bus": unref(modalBus),
				name: props.modalName,
				center: true
			}, {
				content: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.container) }, [
					activeFilterHint.value ? (openBlock(), createBlock(unref(ElRow), {
						key: 0,
						class: normalizeClass(_ctx.$style.vertPadding)
					}, {
						default: withCtx(() => [createVNode(unref(N8nCallout_default), { theme: "info" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(activeFilterHint.value), 1)]),
							_: 1
						})]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true),
					allWorkflowsHint.value ? (openBlock(), createBlock(unref(ElRow), {
						key: 1,
						class: normalizeClass(_ctx.$style.vertPadding)
					}, {
						default: withCtx(() => [createVNode(unref(N8nCallout_default), { theme: "warning" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(allWorkflowsHint.value), 1)]),
							_: 1
						})]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true),
					createVNode(unref(ElRow), { class: normalizeClass(_ctx.$style.vertPadding) }, {
						default: withCtx(() => [createVNode(unref(N8nText_default), { color: "text-base" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("executionStopManyModal.description")), 1)]),
							_: 1
						})]),
						_: 1
					}, 8, ["class"]),
					createVNode(unref(ElRow), null, {
						default: withCtx(() => [createVNode(unref(N8nFormInput_default), {
							modelValue: checkQueued.value,
							"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => checkQueued.value = $event),
							type: "checkbox",
							disabled: isLoading.value,
							label: unref(i18n).baseText("executionStopManyModal.queued"),
							"data-test-id": "sme-check-queued"
						}, null, 8, [
							"modelValue",
							"disabled",
							"label"
						])]),
						_: 1
					}),
					createVNode(unref(ElRow), null, {
						default: withCtx(() => [createVNode(unref(N8nFormInput_default), {
							modelValue: checkRunning.value,
							"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => checkRunning.value = $event),
							type: "checkbox",
							disabled: isLoading.value,
							label: unref(i18n).baseText("executionStopManyModal.running"),
							"data-test-id": "sme-check-running"
						}, null, 8, [
							"modelValue",
							"disabled",
							"label"
						])]),
						_: 1
					}),
					createVNode(unref(ElRow), null, {
						default: withCtx(() => [createVNode(unref(N8nFormInput_default), {
							modelValue: checkWaiting.value,
							"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => checkWaiting.value = $event),
							type: "checkbox",
							disabled: isLoading.value,
							label: unref(i18n).baseText("executionStopManyModal.waiting"),
							"data-test-id": "sme-check-waiting"
						}, null, 8, [
							"modelValue",
							"disabled",
							"label"
						])]),
						_: 1
					})
				], 2)]),
				footer: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [createVNode(unref(N8nButton_default), {
					variant: "outline",
					label: unref(i18n).baseText("executionStopManyModal.button.close"),
					"data-test-id": "sme-close-button",
					onClick: closeModal
				}, null, 8, ["label"]), createVNode(unref(N8nButton_default), {
					disabled: !checkWaiting.value && !checkRunning.value && !checkQueued.value,
					label: unref(i18n).baseText("executionStopManyModal.button.submit"),
					loading: isLoading.value,
					"data-test-id": "sme-submit-button",
					onClick: onSubmit
				}, null, 8, [
					"disabled",
					"label",
					"loading"
				])], 2)]),
				_: 1
			}, 8, [
				"title",
				"event-bus",
				"name"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	form: "_form_qw3uu_1",
	footer: "_footer_qw3uu_7",
	container: "_container_qw3uu_15",
	vertPadding: "_vertPadding_qw3uu_22"
} }]]);
//#endregion
export { StopManyExecutionsModal_default as default };
