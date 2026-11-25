import "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Oa as v4, Of as withDirectives, Pd as Fragment, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, Yd as getCurrentInstance, _f as resolveDirective, _p as normalizeClass, af as onBeforeMount, du as ElCol, ff as openBlock, fu as ElRow, if as nextTick, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $d as injectWorkflowDocumentStore, GO as defaultMessageEventBusDestinationOptions, GS as EnterpriseEditionFeature, Ik as deepCopy, Jg as useUIStore, Kd as useDocumentTitle, Kj as N8nNotice_default, Lw as assert, Mp as useCredentialsStore, NM as N8nCard_default, PA as useMessage, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, YM as N8nActionToggle_default, _N as N8nText_default, dC as useToast, dM as N8nSwitch_default, jM as createEventBus, jN as useI18n, tM as N8nInfoTip_default, xM as N8nEmptyState_default, xm as hasPermission, y as LOG_STREAM_MODAL_KEY, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as useLogStreamingStore } from "./logStreaming.store-83whA4Mu.js";
import { t as LogStreamingPaywall_default } from "./LogStreamingPaywall-D-UCfEs5.js";
//#region src/features/integrations/logStreaming.ee/components/EventDestinationCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var EventDestinationCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "EventDestinationCard",
	props: {
		eventBus: {},
		destination: { default: () => deepCopy(defaultMessageEventBusDestinationOptions) },
		readonly: { type: Boolean }
	},
	emits: ["edit", "remove"],
	setup(__props, { emit: __emit }) {
		const DESTINATION_LIST_ITEM_ACTIONS = {
			OPEN: "open",
			DELETE: "delete"
		};
		const { confirm } = useMessage();
		const { showError } = useToast();
		const isSaving = ref(false);
		const i18n = useI18n();
		const logStreamingStore = useLogStreamingStore();
		const nodeParameters = ref({});
		const cardActions = ref(null);
		const props = __props;
		const emit = __emit;
		onMounted(() => {
			nodeParameters.value = Object.assign(deepCopy(defaultMessageEventBusDestinationOptions), props.destination);
			props.eventBus?.on("destinationWasSaved", onDestinationWasSaved);
		});
		onBeforeMount(() => {
			props.eventBus?.off("destinationWasSaved", onDestinationWasSaved);
		});
		const actions = computed(() => {
			const actionList = [{
				label: i18n.baseText("workflows.item.open"),
				value: DESTINATION_LIST_ITEM_ACTIONS.OPEN
			}];
			if (!props.readonly) actionList.push({
				label: i18n.baseText("workflows.item.delete"),
				value: DESTINATION_LIST_ITEM_ACTIONS.DELETE
			});
			return actionList;
		});
		const typeLabelName = computed(() => {
			return `settings.log-streaming.${props.destination.__type}`;
		});
		function onDestinationWasSaved() {
			assert(props.destination.id);
			if (logStreamingStore.getDestination(props.destination.id)) nodeParameters.value = Object.assign(deepCopy(defaultMessageEventBusDestinationOptions), props.destination);
		}
		async function onClick(event) {
			const target = event.target;
			if (cardActions.value === target || cardActions.value?.contains(target) || target?.contains(cardActions.value)) return;
			emit("edit", props.destination.id);
		}
		async function onEnabledSwitched(state) {
			if (isSaving.value) return;
			const previousEnabled = nodeParameters.value.enabled;
			isSaving.value = true;
			try {
				if (await logStreamingStore.saveDestination({
					...nodeParameters.value,
					enabled: Boolean(state)
				})) nodeParameters.value.enabled = Boolean(state);
			} catch (error) {
				nodeParameters.value.enabled = previousEnabled;
				showError(error, i18n.baseText("settings.log-streaming.destinationSave.error"));
			} finally {
				isSaving.value = false;
			}
		}
		async function onAction(action) {
			if (action === DESTINATION_LIST_ITEM_ACTIONS.OPEN) emit("edit", props.destination.id);
			else if (action === DESTINATION_LIST_ITEM_ACTIONS.DELETE) {
				if (await confirm(i18n.baseText("settings.log-streaming.destinationDelete.message", { interpolate: { destinationName: props.destination.label ?? "" } }), i18n.baseText("settings.log-streaming.destinationDelete.headline"), {
					type: "warning",
					confirmButtonText: i18n.baseText("settings.log-streaming.destinationDelete.confirmButtonText"),
					cancelButtonText: i18n.baseText("settings.log-streaming.destinationDelete.cancelButtonText")
				}) !== "confirm") return;
				emit("remove", props.destination.id);
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nCard_default), {
				class: normalizeClass(_ctx.$style.cardLink),
				"data-test-id": "destination-card",
				onClick
			}, {
				header: withCtx(() => [createBaseVNode("div", null, [createVNode(unref(N8nHeading_default), {
					tag: "h2",
					bold: "",
					class: normalizeClass(_ctx.$style.cardHeading)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.destination.label), 1)]),
					_: 1
				}, 8, ["class"]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardDescription) }, [createVNode(unref(N8nText_default), {
					color: "text-light",
					size: "small"
				}, {
					default: withCtx(() => [createBaseVNode("span", null, toDisplayString(unref(i18n).baseText(typeLabelName.value)), 1)]),
					_: 1
				})], 2)])]),
				append: withCtx(() => [createBaseVNode("div", {
					ref_key: "cardActions",
					ref: cardActions,
					class: normalizeClass(_ctx.$style.cardActions)
				}, [
					createBaseVNode("div", {
						class: normalizeClass(_ctx.$style.activeStatusText),
						"data-test-id": "destination-activator-status"
					}, [nodeParameters.value.enabled ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						color: "success",
						size: "small",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowActivator.active")), 1)]),
						_: 1
					})) : (openBlock(), createBlock(unref(N8nText_default), {
						key: 1,
						color: "text-base",
						size: "small",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowActivator.inactive")), 1)]),
						_: 1
					}))], 2),
					createVNode(unref(N8nSwitch_default), {
						class: "mr-s",
						size: "large",
						disabled: __props.readonly || isSaving.value,
						"model-value": nodeParameters.value.enabled,
						title: nodeParameters.value.enabled ? unref(i18n).baseText("workflowActivator.deactivateWorkflow") : unref(i18n).baseText("workflowActivator.activateWorkflow"),
						"data-test-id": "workflow-activate-switch",
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => onEnabledSwitched($event))
					}, null, 8, [
						"disabled",
						"model-value",
						"title"
					]),
					createVNode(unref(N8nActionToggle_default), {
						actions: actions.value,
						theme: "dark",
						onAction
					}, null, 8, ["actions"])
				], 2)]),
				_: 1
			}, 8, ["class"]);
		};
	}
}), [["__cssModules", { "$style": {
	cardLink: "_cardLink_1a6h0_1",
	activeStatusText: "_activeStatusText_1a6h0_11",
	cardHeading: "_cardHeading_1a6h0_19",
	cardDescription: "_cardDescription_1a6h0_25",
	cardActions: "_cardActions_1a6h0_32"
} }]]);
//#endregion
//#region src/features/integrations/logStreaming.ee/views/SettingsLogStreamingView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { class: "mb-2xl" };
var _hoisted_2 = { class: "ml-m" };
var _hoisted_3 = { class: "mb-l" };
var _hoisted_4 = {
	key: 0,
	class: "mt-m text-right"
};
var _hoisted_5 = {
	key: 2,
	"data-test-id": "action-box-licensed"
};
var SettingsLogStreamingView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SettingsLogStreamingView",
	setup(__props) {
		const environment = "production";
		const settingsStore = useSettingsStore();
		const logStreamingStore = useLogStreamingStore();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const uiStore = useUIStore();
		const credentialsStore = useCredentialsStore();
		const documentTitle = useDocumentTitle();
		const i18n = useI18n();
		const eventBus = createEventBus();
		const disableLicense = ref(false);
		const allDestinations = ref([]);
		const sortedItemKeysByLabel = computed(() => {
			const sortedKeys = [];
			for (const [key, value] of Object.entries(logStreamingStore.items)) sortedKeys.push({
				key,
				label: value.destination?.label ?? "Destination"
			});
			return sortedKeys.sort((a, b) => a.label.localeCompare(b.label));
		});
		const isLicensed = computed(() => {
			if (disableLicense.value) return false;
			return settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.LogStreaming];
		});
		const canManageLogStreaming = computed(() => {
			return hasPermission(["rbac"], { rbac: { scope: "logStreaming:manage" } });
		});
		const isManagedByEnv = computed(() => {
			return settingsStore.settings.logStreaming?.managedByEnv ?? false;
		});
		const isReadonly = computed(() => isManagedByEnv.value || !canManageLogStreaming.value);
		onMounted(async () => {
			documentTitle.set(i18n.baseText("settings.log-streaming.heading"));
			if (!isLicensed.value) return;
			await credentialsStore.fetchCredentialTypes(false);
			await credentialsStore.fetchAllCredentials();
			uiStore.nodeViewInitialized = false;
			await getDestinationDataFromBackend();
			logStreamingStore.$onAction(({ name, after }) => {
				if (name === "removeDestination" || name === "updateDestination") after(async () => {
					forceUpdateInstance();
				});
			});
			eventBus.on("destinationWasSaved", onDestinationWasSaved);
			eventBus.on("remove", onRemove);
			eventBus.on("closing", onBusClosing);
		});
		onBeforeMount(() => {
			eventBus.off("destinationWasSaved", onDestinationWasSaved);
			eventBus.off("remove", onRemove);
			eventBus.off("closing", onBusClosing);
		});
		function onDestinationWasSaved() {
			forceUpdateInstance();
		}
		function forceUpdateInstance() {
			getCurrentInstance()?.proxy?.$forceUpdate();
		}
		function onBusClosing() {
			workflowDocumentStore.value.removeAllNodes();
			uiStore.markStateClean();
		}
		async function getDestinationDataFromBackend() {
			logStreamingStore.clearEventNames();
			logStreamingStore.clearDestinations();
			allDestinations.value = [];
			const eventNamesData = await logStreamingStore.fetchEventNames();
			if (eventNamesData) for (const eventName of eventNamesData) logStreamingStore.addEventName(eventName);
			const destinationData = await logStreamingStore.fetchDestinations();
			if (destinationData) for (const destination of destinationData) {
				logStreamingStore.addDestination(destination);
				allDestinations.value.push(destination);
			}
			forceUpdateInstance();
		}
		function storeHasItems() {
			return logStreamingStore.items && Object.keys(logStreamingStore.items).length > 0;
		}
		async function addDestination() {
			const newDestination = deepCopy(defaultMessageEventBusDestinationOptions);
			newDestination.id = v4();
			logStreamingStore.addDestination(newDestination);
			await nextTick();
			uiStore.openModalWithData({
				name: LOG_STREAM_MODAL_KEY,
				data: {
					destination: newDestination,
					isNew: true,
					eventBus
				}
			});
		}
		async function onRemove(destinationId) {
			if (!destinationId) return;
			await logStreamingStore.deleteDestination(destinationId);
			const foundNode = workflowDocumentStore.value.getNodeByName(destinationId);
			if (foundNode) workflowDocumentStore.value.removeNode(foundNode);
		}
		async function onEdit(destinationId) {
			if (!destinationId) return;
			const editDestination = logStreamingStore.getDestination(destinationId);
			if (editDestination) uiStore.openModalWithData({
				name: LOG_STREAM_MODAL_KEY,
				data: {
					destination: editDestination,
					isNew: false,
					eventBus
				}
			});
		}
		return (_ctx, _cache) => {
			const _directive_n8n_html = resolveDirective("n8n-html");
			return openBlock(), createElementBlock("div", null, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createBaseVNode("div", _hoisted_1, [createVNode(unref(N8nHeading_default), { size: "2xlarge" }, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(`settings.log-streaming.heading`)), 1)]),
				_: 1
			}), unref(environment) !== "production" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createBaseVNode("span", _hoisted_2, "Disable License (" + toDisplayString(unref(environment)) + ")\xA0", 1), createVNode(unref(N8nSwitch_default), {
				modelValue: disableLicense.value,
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => disableLicense.value = $event),
				size: "large",
				"data-test-id": "disable-license-toggle"
			}, null, 8, ["modelValue"])], 64)) : createCommentVNode("", true)])], 2), isLicensed.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
				createBaseVNode("div", _hoisted_3, [createVNode(unref(N8nInfoTip_default), {
					theme: "info",
					type: "note"
				}, {
					default: withCtx(() => [withDirectives(createBaseVNode("span", null, null, 512), [[_directive_n8n_html, unref(i18n).baseText("settings.log-streaming.infoText")]])]),
					_: 1
				})]),
				isManagedByEnv.value ? (openBlock(), createBlock(unref(N8nNotice_default), {
					key: 0,
					class: "mb-l",
					content: unref(i18n).baseText("settings.log-streaming.managedByEnv"),
					"data-test-id": "log-streaming-managed-by-env"
				}, null, 8, ["content"])) : createCommentVNode("", true),
				storeHasItems() ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [(openBlock(true), createElementBlock(Fragment, null, renderList(sortedItemKeysByLabel.value, (item) => {
					return openBlock(), createBlock(unref(ElRow), {
						key: item.key,
						gutter: 10,
						class: normalizeClass(_ctx.$style.destinationItem)
					}, {
						default: withCtx(() => [unref(logStreamingStore).items[item.key]?.destination ? (openBlock(), createBlock(unref(ElCol), { key: 0 }, {
							default: withCtx(() => [createVNode(EventDestinationCard_default, {
								destination: unref(logStreamingStore).items[item.key]?.destination,
								"event-bus": unref(eventBus),
								readonly: isReadonly.value,
								onRemove: ($event) => onRemove(unref(logStreamingStore).items[item.key]?.destination?.id),
								onEdit: ($event) => onEdit(unref(logStreamingStore).items[item.key]?.destination?.id)
							}, null, 8, [
								"destination",
								"event-bus",
								"readonly",
								"onRemove",
								"onEdit"
							])]),
							_: 2
						}, 1024)) : createCommentVNode("", true)]),
						_: 2
					}, 1032, ["class"]);
				}), 128)), !isReadonly.value ? (openBlock(), createElementBlock("div", _hoisted_4, [createVNode(unref(N8nButton_default), {
					size: "large",
					onClick: addDestination
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(`settings.log-streaming.add`)), 1)]),
					_: 1
				})])) : createCommentVNode("", true)], 64)) : !isManagedByEnv.value ? (openBlock(), createElementBlock("div", _hoisted_5, [createVNode(unref(N8nEmptyState_default), {
					"button-text": unref(i18n).baseText(`settings.log-streaming.add`),
					"onClick:button": addDestination
				}, {
					heading: withCtx(() => [withDirectives(createBaseVNode("span", null, null, 512), [[_directive_n8n_html, unref(i18n).baseText(`settings.log-streaming.addFirstTitle`)]])]),
					_: 1
				}, 8, ["button-text"])])) : createCommentVNode("", true)
			], 64)) : (openBlock(), createBlock(LogStreamingPaywall_default, { key: 1 }))]);
		};
	}
}), [["__cssModules", { "$style": {
	header: "_header_brzxt_1",
	destinationItem: "_destinationItem_brzxt_11"
} }]]);
//#endregion
export { SettingsLogStreamingView_default as default };
