import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Md as withKeys, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, hf as renderSlot, ip as init_shared_esm_bundler, lf as onMounted, lo as defineStore, mf as renderList, qo as onBeforeRouteLeave, rf as mergeProps, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { A as OTEL_FIELD_ENV_VARS, Bj as SettingsRow_default, Fj as SettingsSaveBar_default, Fw as makeRestApiRequest, GA as DialogDescription_default, Hj as SettingsPageHeader_default, Ij as SettingsRowGroup_default, KA as Dialog_default, M as OTEL_TEST_SPAN_NAME, Pj as SettingsSection_default, Rj as SettingsEnableRow_default, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, Uj as SettingsLayout_default, WA as DialogBody_default, YA as DialogClose_default, _M as Checkbox_default, _N as N8nText_default, bC as useRootStore, cN as Input_default, dC as useToast, dE as OTLP_PROTOCOLS, fN as N8nTooltip_default, gM as N8nInputLabel_default, hC as useTelemetry, j as OTEL_STORE, jN as useI18n, mM as N8nOption_default, pM as N8nSelect_default, qd as useDocumentTitle, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
//#region ../../modules/otel/frontend/src/otel.api.ts
async function getOtelSettings(context) {
	return await makeRestApiRequest(context, "GET", "/otel/settings");
}
async function updateOtelSettings(context, settings) {
	return await makeRestApiRequest(context, "PUT", "/otel/settings", settings);
}
async function sendOtelTestTrace(context, connection) {
	return await makeRestApiRequest(context, "POST", "/otel/test-trace", connection);
}
//#endregion
//#region ../../modules/otel/frontend/src/otel.store.ts
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
function headersStringToPairs(str) {
	if (!str.trim()) return [];
	return str.split(",").map((pair) => {
		const idx = pair.indexOf("=");
		if (idx === -1) return {
			key: pair.trim(),
			value: ""
		};
		return {
			key: pair.slice(0, idx).trim(),
			value: pair.slice(idx + 1).trim()
		};
	}).filter((p) => p.key);
}
function headersPairsToString(pairs) {
	return pairs.filter((p) => p.key.trim()).map((p) => `${p.key}=${p.value}`).join(",");
}
var defaultSettings = {
	enabled: false,
	exporterProtocol: "http/protobuf",
	exporterEndpoint: "http://localhost:4318",
	exporterTracingPath: "/v1/traces",
	exporterServiceName: "n8n",
	exporterHeaders: "",
	tracesSampleRate: 1,
	startupConnectivityTimeoutMs: 2e3,
	includeNodeSpans: true,
	emitWorkflowStartSpan: false,
	emitNodeStartSpan: false,
	injectOutbound: true,
	productionExecutionsOnly: true
};
function extractSettings(response) {
	const { envManagedFields: _, ...settings } = response;
	return settings;
}
var useOtelStore = defineStore(OTEL_STORE, () => {
	const rootStore = useRootStore();
	const settings = ref({ ...defaultSettings });
	const savedSettings = ref({ ...defaultSettings });
	const envManagedFields = ref([]);
	const loading = ref(true);
	const saving = ref(false);
	const testState = ref("idle");
	const testError = ref("");
	const testTimestamp = ref("");
	const isDirty = computed(() => JSON.stringify(settings.value) !== JSON.stringify(savedSettings.value));
	async function fetchSettings() {
		loading.value = true;
		try {
			const fetched = await getOtelSettings(rootStore.restApiContext);
			settings.value = extractSettings(fetched);
			savedSettings.value = extractSettings(fetched);
			envManagedFields.value = fetched.envManagedFields;
		} finally {
			loading.value = false;
		}
	}
	async function saveSettings() {
		saving.value = true;
		try {
			const updated = await updateOtelSettings(rootStore.restApiContext, settings.value);
			settings.value = extractSettings(updated);
			savedSettings.value = extractSettings(updated);
			envManagedFields.value = updated.envManagedFields;
		} finally {
			saving.value = false;
		}
	}
	async function saveEnabled(enabled) {
		const updated = await updateOtelSettings(rootStore.restApiContext, {
			...savedSettings.value,
			enabled
		});
		savedSettings.value = extractSettings(updated);
		settings.value = {
			...settings.value,
			enabled: updated.enabled
		};
		envManagedFields.value = updated.envManagedFields;
	}
	function discardChanges() {
		settings.value = { ...savedSettings.value };
	}
	let currentTestRun = 0;
	function resetTestState() {
		currentTestRun++;
		testState.value = "idle";
		testError.value = "";
		testTimestamp.value = "";
	}
	async function sendTestTrace() {
		const runId = ++currentTestRun;
		testState.value = "sending";
		testError.value = "";
		try {
			const result = await sendOtelTestTrace(rootStore.restApiContext, {
				exporterProtocol: settings.value.exporterProtocol,
				exporterEndpoint: settings.value.exporterEndpoint,
				exporterTracingPath: settings.value.exporterTracingPath,
				exporterServiceName: settings.value.exporterServiceName,
				exporterHeaders: settings.value.exporterHeaders,
				startupConnectivityTimeoutMs: settings.value.startupConnectivityTimeoutMs
			});
			if (runId !== currentTestRun) return;
			if (result.success) {
				testTimestamp.value = (/* @__PURE__ */ new Date()).toLocaleTimeString();
				testState.value = "sent";
			} else {
				testError.value = result.error;
				testState.value = "error";
			}
		} catch (error) {
			if (runId !== currentTestRun) return;
			testError.value = error instanceof Error ? error.message : String(error);
			testState.value = "error";
		}
	}
	return {
		settings,
		savedSettings,
		envManagedFields,
		loading,
		saving,
		isDirty,
		testState,
		testError,
		testTimestamp,
		fetchSettings,
		saveSettings,
		saveEnabled,
		discardChanges,
		sendTestTrace,
		resetTestState
	};
});
//#endregion
//#region ../../modules/otel/frontend/src/otel.utils.ts
function isOtlpProtocol(value) {
	return OTLP_PROTOCOLS.some((protocol) => protocol === value);
}
/**
* Locale-aware formatting and parsing for the traces sample rate (0..1).
*
* The parser inverts the formatter: the locale's digits are mapped back to
* ASCII and its decimal separator is accepted alongside '.' and ',', so any
* value the formatter renders (or a user types) parses back to the same number.
*/
function createSampleRateFormat(locale) {
	const formatter = new Intl.NumberFormat(locale, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 4
	});
	const decimalSeparator = formatter.formatToParts(1.1).find((part) => part.type === "decimal")?.value ?? ".";
	const digitFormatter = new Intl.NumberFormat(locale);
	const asciiDigits = new Map(Array.from({ length: 10 }, (_, digit) => [digitFormatter.format(digit), String(digit)]));
	/** Parse a rate in this locale; null when not a number (incl. empty). Clamps to [0, 1]. */
	function parse(text) {
		const trimmed = text.replace(/[\u200e\u200f\u061c]/gu, "").trim();
		if (!trimmed) return null;
		const normalized = [...trimmed].map((char) => asciiDigits.get(char) ?? char).join("").replace(decimalSeparator, ".").replace(",", ".");
		const parsed = Number(normalized);
		return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : null;
	}
	return {
		format: (value) => formatter.format(value),
		parse
	};
}
//#endregion
//#region ../../modules/otel/frontend/src/OtelSettingsRow.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1 = ["aria-label"];
var OtelSettingsRow_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "OtelSettingsRow",
	props: {
		title: {},
		description: {},
		envTooltip: { default: void 0 },
		layout: { default: "horizontal" },
		actionFill: {
			type: Boolean,
			default: false
		},
		actionMaxWidth: {
			type: [String, Boolean],
			default: "50%"
		},
		descriptionError: {
			type: Boolean,
			default: false
		}
	},
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SettingsRow_default), mergeProps(_ctx.$attrs, {
				layout: __props.layout,
				"action-fill": __props.actionFill,
				"action-max-width": __props.actionMaxWidth
			}), {
				info: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.info) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.title) }, [createVNode(unref(N8nText_default), {
					bold: "",
					size: "medium",
					color: "text-dark"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.title), 1)]),
					_: 1
				}), __props.envTooltip ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 0,
					content: __props.envTooltip,
					placement: "top"
				}, {
					default: withCtx(() => [createBaseVNode("span", {
						class: normalizeClass(_ctx.$style.envInfo),
						role: "img",
						tabindex: "0",
						"aria-label": __props.envTooltip
					}, [createVNode(unref(N8nIcon_default), {
						icon: "circle-help",
						size: "small"
					})], 10, _hoisted_1)]),
					_: 1
				}, 8, ["content"])) : createCommentVNode("", true)], 2), createVNode(unref(N8nText_default), {
					size: "small",
					color: __props.descriptionError ? "danger" : "text-light",
					"data-test-id": __props.descriptionError ? "otel-settings-row-error" : void 0
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.description), 1)]),
					_: 1
				}, 8, ["color", "data-test-id"])], 2)]),
				action: withCtx(() => [renderSlot(_ctx.$slots, "action")]),
				_: 3
			}, 16, [
				"layout",
				"action-fill",
				"action-max-width"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	info: "_info_1hro9_1",
	title: "_title_1hro9_8",
	envInfo: "_envInfo_1hro9_14"
} }]]);
//#endregion
//#region ../../modules/otel/frontend/src/SettingsOpenTelemetryView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var OTEL_DOCS_URL = "https://docs.n8n.io/hosting/logging-monitoring/opentelemetry/";
var SettingsOpenTelemetryView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SettingsOpenTelemetryView",
	setup(__props) {
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const toast = useToast();
		const settingsStore = useSettingsStore();
		const documentTitle = useDocumentTitle({ releaseChannel: settingsStore.settings.releaseChannel });
		const otelStore = useOtelStore();
		const headerPairs = ref([]);
		const showUnsavedChangesDialog = ref(false);
		const pendingNext = ref(null);
		function syncHeaderPairsFromStore() {
			headerPairs.value = headerPairsFromStore();
		}
		function syncHeaderPairsToStore() {
			otelStore.settings.exporterHeaders = headersPairsToString(headerPairs.value);
		}
		function addHeader() {
			headerPairs.value.push({
				key: "",
				value: ""
			});
			syncHeaderPairsToStore();
		}
		function removeHeader(index) {
			headerPairs.value.splice(index, 1);
			syncHeaderPairsToStore();
		}
		function onHeaderChange(index, field, value) {
			headerPairs.value = headerPairs.value.map((pair, i) => i === index ? {
				...pair,
				[field]: value
			} : pair);
			syncHeaderPairsToStore();
		}
		function isEnvManaged(field) {
			return otelStore.envManagedFields.includes(field);
		}
		function headerPairsFromStore() {
			return headersStringToPairs(otelStore.settings.exporterHeaders ?? "");
		}
		function headerValueDisplay(pair) {
			return pair.value === "__n8n_BLANK_VALUE_e5362baf-c777-4d57-a609-6eaf1f9e87f6" ? "" : pair.value;
		}
		function headerValuePlaceholder(pair) {
			return pair.value === "__n8n_BLANK_VALUE_e5362baf-c777-4d57-a609-6eaf1f9e87f6" ? i18n.baseText("settings.opentelemetry.exporterHeaders.hiddenValuePlaceholder") : i18n.baseText("settings.opentelemetry.exporterHeaders.valuePlaceholder");
		}
		const pendingStatus = ref(null);
		const statusSaving = computed(() => pendingStatus.value !== null);
		const displayedEnabled = computed(() => pendingStatus.value ?? otelStore.settings.enabled);
		const statusDescription = computed(() => displayedEnabled.value ? i18n.baseText("settings.opentelemetry.status.enabledDescription") : i18n.baseText("settings.opentelemetry.status.disabledDescription"));
		const isGrpc = computed(() => otelStore.settings.exporterProtocol === "grpc");
		const endpointDescription = computed(() => i18n.baseText(isGrpc.value ? "settings.opentelemetry.exporterEndpoint.grpcDescription" : "settings.opentelemetry.exporterEndpoint.description"));
		const endpointPlaceholder = computed(() => i18n.baseText(isGrpc.value ? "settings.opentelemetry.exporterEndpoint.grpcPlaceholder" : "settings.opentelemetry.exporterEndpoint.placeholder"));
		const headersDescription = computed(() => i18n.baseText(isGrpc.value ? "settings.opentelemetry.exporterHeaders.grpcDescription" : "settings.opentelemetry.exporterHeaders.description"));
		function onProtocolChange(value) {
			if (isOtlpProtocol(value)) otelStore.settings.exporterProtocol = value;
		}
		function envTooltip(field) {
			const envVariable = i18n.baseText("settings.opentelemetry.envVarTooltip", { interpolate: { envVar: OTEL_FIELD_ENV_VARS[field] } });
			return isEnvManaged(field) ? `${i18n.baseText("settings.opentelemetry.envVarManagedTooltip")}. ${envVariable}` : envVariable;
		}
		async function save() {
			if (statusSaving.value) return false;
			try {
				const wasEnabled = otelStore.savedSettings.enabled;
				await otelStore.saveSettings();
				const isNowEnabled = otelStore.settings.enabled;
				if (!wasEnabled && isNowEnabled) telemetry.track("Activated otel via UI", {
					protocol: otelStore.settings.exporterProtocol,
					includeNodeSpans: otelStore.settings.includeNodeSpans,
					productionExecutionsOnly: otelStore.settings.productionExecutionsOnly,
					tracesSampleRate: otelStore.settings.tracesSampleRate,
					injectOutbound: otelStore.settings.injectOutbound
				});
				else if (wasEnabled && !isNowEnabled) telemetry.track("Disabled otel via UI");
				else telemetry.track("Updated otel via UI", {
					enabled: isNowEnabled,
					protocol: otelStore.settings.exporterProtocol,
					includeNodeSpans: otelStore.settings.includeNodeSpans,
					productionExecutionsOnly: otelStore.settings.productionExecutionsOnly,
					tracesSampleRate: otelStore.settings.tracesSampleRate,
					injectOutbound: otelStore.settings.injectOutbound
				});
				toast.showMessage({
					title: i18n.baseText("settings.opentelemetry.savedSuccess"),
					type: "success"
				});
				return true;
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.opentelemetry.savedError"));
				return false;
			}
		}
		function discard() {
			otelStore.discardChanges();
			syncHeaderPairsFromStore();
		}
		async function onToggleEnabled(enabled) {
			if (otelStore.saving || statusSaving.value) return;
			pendingStatus.value = enabled;
			try {
				await otelStore.saveEnabled(enabled);
				if (enabled) telemetry.track("Activated otel via UI", {
					protocol: otelStore.savedSettings.exporterProtocol,
					includeNodeSpans: otelStore.savedSettings.includeNodeSpans,
					productionExecutionsOnly: otelStore.savedSettings.productionExecutionsOnly,
					tracesSampleRate: otelStore.savedSettings.tracesSampleRate,
					injectOutbound: otelStore.savedSettings.injectOutbound
				});
				else telemetry.track("Disabled otel via UI");
				toast.showMessage({
					title: i18n.baseText("settings.opentelemetry.savedSuccess"),
					type: "success"
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.opentelemetry.savedError"));
			} finally {
				pendingStatus.value = null;
			}
		}
		function onLeaveWithoutSaving() {
			showUnsavedChangesDialog.value = false;
			pendingNext.value?.();
			pendingNext.value = null;
		}
		async function onSaveAndLeave() {
			if (!await save()) return;
			showUnsavedChangesDialog.value = false;
			pendingNext.value?.();
			pendingNext.value = null;
		}
		function onKeepEditing() {
			showUnsavedChangesDialog.value = false;
			pendingNext.value?.(false);
			pendingNext.value = null;
		}
		onBeforeRouteLeave((_to, _from, next) => {
			if (!otelStore.isDirty) {
				next();
				return;
			}
			pendingNext.value = next;
			showUnsavedChangesDialog.value = true;
		});
		onMounted(async () => {
			documentTitle.set(i18n.baseText("settings.opentelemetry.title"));
			await otelStore.fetchSettings();
			syncHeaderPairsFromStore();
			syncSampleRateInput();
			syncConnectivityTimeoutInput();
		});
		watch(() => otelStore.settings?.exporterHeaders, (newVal) => {
			if (newVal !== headersPairsToString(headerPairs.value)) headerPairs.value = headerPairsFromStore();
		});
		const canTestTrace = computed(() => !!otelStore.settings.exporterEndpoint && otelStore.testState !== "sending");
		const { format: formatSampleRate, parse: parseSampleRate } = createSampleRateFormat();
		const sampleRateMax = formatSampleRate(1);
		const sampleRateInput = ref("");
		const connectivityTimeoutInput = ref("");
		function syncSampleRateInput() {
			sampleRateInput.value = formatSampleRate(otelStore.settings.tracesSampleRate);
		}
		function syncConnectivityTimeoutInput() {
			connectivityTimeoutInput.value = String(otelStore.settings.startupConnectivityTimeoutMs);
		}
		function parseConnectivityTimeout(text) {
			const trimmed = text.trim();
			if (!trimmed) return null;
			const parsed = Number(trimmed);
			return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : null;
		}
		function commitSampleRate() {
			const parsed = parseSampleRate(sampleRateInput.value);
			if (parsed !== null) otelStore.settings.tracesSampleRate = parsed;
			syncSampleRateInput();
		}
		function commitConnectivityTimeout() {
			const parsed = parseConnectivityTimeout(connectivityTimeoutInput.value);
			if (parsed !== null) otelStore.settings.startupConnectivityTimeoutMs = parsed;
			syncConnectivityTimeoutInput();
		}
		function stepSampleRate(direction) {
			const current = parseSampleRate(sampleRateInput.value) ?? otelStore.settings.tracesSampleRate;
			const next = Math.min(1, Math.max(0, Math.round((current + direction * .01) * 100) / 100));
			otelStore.settings.tracesSampleRate = next;
			syncSampleRateInput();
		}
		function stepConnectivityTimeout(direction) {
			const current = parseConnectivityTimeout(connectivityTimeoutInput.value) ?? otelStore.settings.startupConnectivityTimeoutMs;
			otelStore.settings.startupConnectivityTimeoutMs = Math.max(0, current + direction * 100);
			syncConnectivityTimeoutInput();
		}
		watch(sampleRateInput, (text) => {
			const parsed = parseSampleRate(text);
			if (parsed !== null) otelStore.settings.tracesSampleRate = parsed;
		});
		watch(connectivityTimeoutInput, (text) => {
			const parsed = parseConnectivityTimeout(text);
			if (parsed !== null) otelStore.settings.startupConnectivityTimeoutMs = parsed;
		});
		watch(() => otelStore.settings.tracesSampleRate, (value) => {
			if (parseSampleRate(sampleRateInput.value) !== value) syncSampleRateInput();
		});
		watch(() => otelStore.settings.startupConnectivityTimeoutMs, (value) => {
			if (parseConnectivityTimeout(connectivityTimeoutInput.value) !== value) syncConnectivityTimeoutInput();
		});
		const testTraceSubtitle = computed(() => {
			if (otelStore.testState === "sent") return i18n.baseText("settings.opentelemetry.testTrace.success", { interpolate: {
				spanName: OTEL_TEST_SPAN_NAME,
				time: otelStore.testTimestamp
			} });
			if (otelStore.testState === "error") return i18n.baseText("settings.opentelemetry.testTrace.error", { interpolate: { error: otelStore.testError } });
			return i18n.baseText("settings.opentelemetry.testTrace.description");
		});
		async function onSendTestTrace() {
			await otelStore.sendTestTrace();
		}
		watch(() => [
			otelStore.settings.exporterProtocol,
			otelStore.settings.exporterEndpoint,
			otelStore.settings.exporterTracingPath,
			otelStore.settings.exporterServiceName,
			otelStore.settings.exporterHeaders,
			otelStore.settings.startupConnectivityTimeoutMs
		], () => {
			if (otelStore.testState !== "idle") otelStore.resetTestState();
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SettingsLayout_default), { class: normalizeClass(_ctx.$style.layout) }, {
				default: withCtx(() => [
					createVNode(unref(SettingsPageHeader_default), {
						title: unref(i18n).baseText("settings.opentelemetry.title"),
						description: unref(i18n).baseText("settings.opentelemetry.description"),
						"docs-url": OTEL_DOCS_URL
					}, null, 8, ["title", "description"]),
					unref(otelStore).loading ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.loading),
						"data-test-id": "otel-loading"
					}, [createVNode(unref(N8nIcon_default), {
						icon: "spinner",
						spin: ""
					})], 2)) : (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass(_ctx.$style.settingsContent)
					}, [
						createVNode(unref(SettingsSection_default), null, {
							default: withCtx(() => [createVNode(unref(SettingsRowGroup_default), null, {
								default: withCtx(() => [createVNode(unref(SettingsEnableRow_default), {
									title: unref(i18n).baseText("settings.opentelemetry.status.label"),
									description: statusDescription.value,
									enabled: displayedEnabled.value,
									disabled: isEnvManaged("enabled") || unref(otelStore).saving || statusSaving.value,
									"switch-test-id": "otel-enabled-toggle",
									"onUpdate:enabled": onToggleEnabled
								}, null, 8, [
									"title",
									"description",
									"enabled",
									"disabled"
								])]),
								_: 1
							})]),
							_: 1
						}),
						displayedEnabled.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(SettingsSection_default), { title: unref(i18n).baseText("settings.opentelemetry.collectorConnection.title") }, {
							default: withCtx(() => [createVNode(unref(SettingsRowGroup_default), null, {
								default: withCtx(() => [
									createVNode(OtelSettingsRow_default, {
										title: unref(i18n).baseText("settings.opentelemetry.exporterProtocol.label"),
										description: unref(i18n).baseText("settings.opentelemetry.exporterProtocol.description"),
										"env-tooltip": envTooltip("exporterProtocol"),
										"action-fill": ""
									}, {
										action: withCtx(() => [createVNode(unref(N8nSelect_default), {
											class: normalizeClass(_ctx.$style.control),
											"model-value": unref(otelStore).settings.exporterProtocol,
											disabled: isEnvManaged("exporterProtocol"),
											"aria-label": unref(i18n).baseText("settings.opentelemetry.exporterProtocol.label"),
											"data-test-id": "otel-exporter-protocol",
											"onUpdate:modelValue": onProtocolChange
										}, {
											default: withCtx(() => [createVNode(unref(N8nOption_default), {
												value: "http/protobuf",
												label: unref(i18n).baseText("settings.opentelemetry.exporterProtocol.option.httpProtobuf")
											}, null, 8, ["label"]), createVNode(unref(N8nOption_default), {
												value: "grpc",
												label: unref(i18n).baseText("settings.opentelemetry.exporterProtocol.option.grpc")
											}, null, 8, ["label"])]),
											_: 1
										}, 8, [
											"class",
											"model-value",
											"disabled",
											"aria-label"
										])]),
										_: 1
									}, 8, [
										"title",
										"description",
										"env-tooltip"
									]),
									createVNode(OtelSettingsRow_default, {
										title: unref(i18n).baseText("settings.opentelemetry.exporterEndpoint.label"),
										description: endpointDescription.value,
										"env-tooltip": envTooltip("exporterEndpoint"),
										"action-fill": ""
									}, {
										action: withCtx(() => [createVNode(unref(Input_default), {
											modelValue: unref(otelStore).settings.exporterEndpoint,
											"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => unref(otelStore).settings.exporterEndpoint = $event),
											class: normalizeClass(_ctx.$style.control),
											placeholder: endpointPlaceholder.value,
											disabled: isEnvManaged("exporterEndpoint"),
											"data-test-id": "otel-exporter-endpoint"
										}, null, 8, [
											"modelValue",
											"class",
											"placeholder",
											"disabled"
										])]),
										_: 1
									}, 8, [
										"title",
										"description",
										"env-tooltip"
									]),
									createVNode(OtelSettingsRow_default, {
										title: unref(i18n).baseText("settings.opentelemetry.exporterServiceName.label"),
										description: unref(i18n).baseText("settings.opentelemetry.exporterServiceName.description"),
										"env-tooltip": envTooltip("exporterServiceName"),
										"action-fill": ""
									}, {
										action: withCtx(() => [createVNode(unref(Input_default), {
											modelValue: unref(otelStore).settings.exporterServiceName,
											"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => unref(otelStore).settings.exporterServiceName = $event),
											class: normalizeClass(_ctx.$style.control),
											placeholder: unref(i18n).baseText("settings.opentelemetry.exporterServiceName.placeholder"),
											disabled: isEnvManaged("exporterServiceName"),
											"data-test-id": "otel-service-name"
										}, null, 8, [
											"modelValue",
											"class",
											"placeholder",
											"disabled"
										])]),
										_: 1
									}, 8, [
										"title",
										"description",
										"env-tooltip"
									]),
									createVNode(OtelSettingsRow_default, {
										title: unref(i18n).baseText("settings.opentelemetry.exporterHeaders.label"),
										description: headersDescription.value,
										"env-tooltip": envTooltip("exporterHeaders"),
										layout: "vertical",
										"action-fill": "",
										"action-max-width": false
									}, {
										action: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.headersBlock) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(headerPairs.value, (pair, index) => {
											return openBlock(), createElementBlock("div", {
												key: index,
												class: normalizeClass(_ctx.$style.headerRow)
											}, [
												createVNode(unref(N8nInputLabel_default), {
													label: index === 0 ? unref(i18n).baseText("settings.opentelemetry.exporterHeaders.keyLabel") : void 0,
													size: "small"
												}, {
													default: withCtx(() => [createVNode(unref(Input_default), {
														"model-value": pair.key,
														placeholder: unref(i18n).baseText("settings.opentelemetry.exporterHeaders.keyPlaceholder"),
														disabled: isEnvManaged("exporterHeaders"),
														"data-test-id": "otel-header-key",
														"onUpdate:modelValue": (v) => onHeaderChange(index, "key", v)
													}, null, 8, [
														"model-value",
														"placeholder",
														"disabled",
														"onUpdate:modelValue"
													])]),
													_: 2
												}, 1032, ["label"]),
												createVNode(unref(N8nInputLabel_default), {
													label: index === 0 ? unref(i18n).baseText("settings.opentelemetry.exporterHeaders.valueLabel") : void 0,
													size: "small"
												}, {
													default: withCtx(() => [createVNode(unref(Input_default), {
														"model-value": headerValueDisplay(pair),
														placeholder: headerValuePlaceholder(pair),
														disabled: isEnvManaged("exporterHeaders"),
														"data-test-id": "otel-header-value",
														"onUpdate:modelValue": (v) => onHeaderChange(index, "value", v)
													}, null, 8, [
														"model-value",
														"placeholder",
														"disabled",
														"onUpdate:modelValue"
													])]),
													_: 2
												}, 1032, ["label"]),
												createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerRemove) }, [createVNode(unref(N8nButton_default), {
													icon: "trash-2",
													variant: "ghost",
													size: "small",
													"native-type": "button",
													disabled: isEnvManaged("exporterHeaders"),
													"aria-label": unref(i18n).baseText("settings.opentelemetry.exporterHeaders.remove"),
													"data-test-id": "otel-header-remove",
													onClick: withModifiers(($event) => removeHeader(index), ["stop", "prevent"])
												}, null, 8, [
													"disabled",
													"aria-label",
													"onClick"
												])], 2)
											], 2);
										}), 128)), createVNode(unref(N8nButton_default), {
											icon: "plus",
											variant: "outline",
											size: "small",
											"native-type": "button",
											disabled: isEnvManaged("exporterHeaders"),
											class: normalizeClass(_ctx.$style.addHeaderButton),
											"data-test-id": "otel-header-add",
											onClick: withModifiers(addHeader, ["stop", "prevent"])
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.opentelemetry.exporterHeaders.addHeader")), 1)]),
											_: 1
										}, 8, ["disabled", "class"])], 2)]),
										_: 1
									}, 8, [
										"title",
										"description",
										"env-tooltip"
									]),
									!isGrpc.value ? (openBlock(), createBlock(OtelSettingsRow_default, {
										key: 0,
										title: unref(i18n).baseText("settings.opentelemetry.exporterTracingPath.label"),
										description: unref(i18n).baseText("settings.opentelemetry.exporterTracingPath.description"),
										"env-tooltip": envTooltip("exporterTracingPath"),
										"action-fill": ""
									}, {
										action: withCtx(() => [createVNode(unref(Input_default), {
											modelValue: unref(otelStore).settings.exporterTracingPath,
											"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => unref(otelStore).settings.exporterTracingPath = $event),
											class: normalizeClass(_ctx.$style.control),
											placeholder: unref(i18n).baseText("settings.opentelemetry.exporterTracingPath.placeholder"),
											disabled: isEnvManaged("exporterTracingPath"),
											"data-test-id": "otel-tracing-path"
										}, null, 8, [
											"modelValue",
											"class",
											"placeholder",
											"disabled"
										])]),
										_: 1
									}, 8, [
										"title",
										"description",
										"env-tooltip"
									])) : createCommentVNode("", true),
									createVNode(OtelSettingsRow_default, {
										title: unref(i18n).baseText("settings.opentelemetry.startupConnectivityTimeoutMs.label"),
										description: unref(i18n).baseText("settings.opentelemetry.startupConnectivityTimeoutMs.description"),
										"env-tooltip": envTooltip("startupConnectivityTimeoutMs")
									}, {
										action: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.inputWithSlug) }, [createVNode(unref(Input_default), {
											modelValue: connectivityTimeoutInput.value,
											"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => connectivityTimeoutInput.value = $event),
											disabled: isEnvManaged("startupConnectivityTimeoutMs"),
											"aria-label": unref(i18n).baseText("settings.opentelemetry.startupConnectivityTimeoutMs.label"),
											"data-test-id": "otel-connectivity-timeout",
											onBlur: commitConnectivityTimeout,
											onKeydown: [
												withKeys(commitConnectivityTimeout, ["enter"]),
												_cache[4] || (_cache[4] = withKeys(withModifiers(($event) => stepConnectivityTimeout(1), ["prevent"]), ["up"])),
												_cache[5] || (_cache[5] = withKeys(withModifiers(($event) => stepConnectivityTimeout(-1), ["prevent"]), ["down"]))
											]
										}, null, 8, [
											"modelValue",
											"disabled",
											"aria-label"
										]), createBaseVNode("span", { class: normalizeClass(_ctx.$style.slug) }, toDisplayString(unref(i18n).baseText("settings.opentelemetry.startupConnectivityTimeoutMs.slug")), 3)], 2)]),
										_: 1
									}, 8, [
										"title",
										"description",
										"env-tooltip"
									]),
									createVNode(OtelSettingsRow_default, {
										title: unref(i18n).baseText("settings.opentelemetry.testTrace.label"),
										description: testTraceSubtitle.value,
										"description-error": unref(otelStore).testState === "error"
									}, {
										action: withCtx(() => [unref(otelStore).testState === "sent" ? (openBlock(), createBlock(unref(N8nButton_default), {
											key: 0,
											variant: "outline",
											icon: "check",
											"native-type": "button",
											"data-test-id": "otel-test-trace-button",
											onClick: withModifiers(onSendTestTrace, ["stop", "prevent"])
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.opentelemetry.testTrace.sent")), 1)]),
											_: 1
										})) : (openBlock(), createBlock(unref(N8nButton_default), {
											key: 1,
											variant: "outline",
											loading: unref(otelStore).testState === "sending",
											disabled: !canTestTrace.value,
											"native-type": "button",
											"data-test-id": "otel-test-trace-button",
											onClick: withModifiers(onSendTestTrace, ["stop", "prevent"])
										}, {
											default: withCtx(() => [createTextVNode(toDisplayString(unref(otelStore).testState === "sending" ? unref(i18n).baseText("settings.opentelemetry.testTrace.sending") : unref(i18n).baseText("settings.opentelemetry.testTrace.send")), 1)]),
											_: 1
										}, 8, ["loading", "disabled"]))]),
										_: 1
									}, 8, [
										"title",
										"description",
										"description-error"
									])
								]),
								_: 1
							})]),
							_: 1
						}, 8, ["title"]), createVNode(unref(SettingsSection_default), { title: unref(i18n).baseText("settings.opentelemetry.tracing.title") }, {
							default: withCtx(() => [createVNode(unref(SettingsRowGroup_default), null, {
								default: withCtx(() => [
									createVNode(OtelSettingsRow_default, {
										title: unref(i18n).baseText("settings.opentelemetry.tracesSampleRate.label"),
										description: unref(i18n).baseText("settings.opentelemetry.tracesSampleRate.description", { interpolate: { max: unref(sampleRateMax) } }),
										"env-tooltip": envTooltip("tracesSampleRate")
									}, {
										action: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.inputWithSlug) }, [createVNode(unref(Input_default), {
											modelValue: sampleRateInput.value,
											"onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => sampleRateInput.value = $event),
											disabled: isEnvManaged("tracesSampleRate"),
											"aria-label": unref(i18n).baseText("settings.opentelemetry.tracesSampleRate.label"),
											"data-test-id": "otel-sample-rate",
											onBlur: commitSampleRate,
											onKeydown: [
												withKeys(commitSampleRate, ["enter"]),
												_cache[7] || (_cache[7] = withKeys(withModifiers(($event) => stepSampleRate(1), ["prevent"]), ["up"])),
												_cache[8] || (_cache[8] = withKeys(withModifiers(($event) => stepSampleRate(-1), ["prevent"]), ["down"]))
											]
										}, null, 8, [
											"modelValue",
											"disabled",
											"aria-label"
										]), createBaseVNode("span", { class: normalizeClass(_ctx.$style.slug) }, toDisplayString(unref(i18n).baseText("settings.opentelemetry.tracesSampleRate.slug", { interpolate: { max: unref(sampleRateMax) } })), 3)], 2)]),
										_: 1
									}, 8, [
										"title",
										"description",
										"env-tooltip"
									]),
									createVNode(OtelSettingsRow_default, {
										title: unref(i18n).baseText("settings.opentelemetry.includeNodeSpans.label"),
										description: unref(i18n).baseText("settings.opentelemetry.includeNodeSpans.description"),
										"env-tooltip": envTooltip("includeNodeSpans")
									}, {
										action: withCtx(() => [createVNode(unref(Checkbox_default), {
											"model-value": unref(otelStore).settings.includeNodeSpans,
											disabled: isEnvManaged("includeNodeSpans"),
											"data-test-id": "otel-include-node-spans",
											"onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => unref(otelStore).settings.includeNodeSpans = Boolean($event))
										}, null, 8, ["model-value", "disabled"])]),
										_: 1
									}, 8, [
										"title",
										"description",
										"env-tooltip"
									]),
									createVNode(OtelSettingsRow_default, {
										title: unref(i18n).baseText("settings.opentelemetry.emitWorkflowStartSpan.label"),
										description: unref(i18n).baseText("settings.opentelemetry.emitWorkflowStartSpan.description"),
										"env-tooltip": envTooltip("emitWorkflowStartSpan")
									}, {
										action: withCtx(() => [createVNode(unref(Checkbox_default), {
											"model-value": unref(otelStore).settings.emitWorkflowStartSpan,
											disabled: isEnvManaged("emitWorkflowStartSpan"),
											"data-test-id": "otel-emit-workflow-start-span",
											"onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => unref(otelStore).settings.emitWorkflowStartSpan = Boolean($event))
										}, null, 8, ["model-value", "disabled"])]),
										_: 1
									}, 8, [
										"title",
										"description",
										"env-tooltip"
									]),
									createVNode(OtelSettingsRow_default, {
										title: unref(i18n).baseText("settings.opentelemetry.emitNodeStartSpan.label"),
										description: unref(i18n).baseText("settings.opentelemetry.emitNodeStartSpan.description"),
										"env-tooltip": envTooltip("emitNodeStartSpan")
									}, {
										action: withCtx(() => [createVNode(unref(Checkbox_default), {
											"model-value": unref(otelStore).settings.emitNodeStartSpan,
											disabled: isEnvManaged("emitNodeStartSpan") || !unref(otelStore).settings.includeNodeSpans,
											"data-test-id": "otel-emit-node-start-span",
											"onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => unref(otelStore).settings.emitNodeStartSpan = Boolean($event))
										}, null, 8, ["model-value", "disabled"])]),
										_: 1
									}, 8, [
										"title",
										"description",
										"env-tooltip"
									]),
									createVNode(OtelSettingsRow_default, {
										title: unref(i18n).baseText("settings.opentelemetry.injectOutbound.label"),
										description: unref(i18n).baseText("settings.opentelemetry.injectOutbound.description"),
										"env-tooltip": envTooltip("injectOutbound")
									}, {
										action: withCtx(() => [createVNode(unref(Checkbox_default), {
											"model-value": unref(otelStore).settings.injectOutbound,
											disabled: isEnvManaged("injectOutbound"),
											"data-test-id": "otel-inject-outbound",
											"onUpdate:modelValue": _cache[12] || (_cache[12] = ($event) => unref(otelStore).settings.injectOutbound = Boolean($event))
										}, null, 8, ["model-value", "disabled"])]),
										_: 1
									}, 8, [
										"title",
										"description",
										"env-tooltip"
									]),
									createVNode(OtelSettingsRow_default, {
										title: unref(i18n).baseText("settings.opentelemetry.productionExecutionsOnly.label"),
										description: unref(i18n).baseText("settings.opentelemetry.productionExecutionsOnly.description"),
										"env-tooltip": envTooltip("productionExecutionsOnly")
									}, {
										action: withCtx(() => [createVNode(unref(Checkbox_default), {
											"model-value": unref(otelStore).settings.productionExecutionsOnly,
											disabled: isEnvManaged("productionExecutionsOnly"),
											"data-test-id": "otel-production-only",
											"onUpdate:modelValue": _cache[13] || (_cache[13] = ($event) => unref(otelStore).settings.productionExecutionsOnly = Boolean($event))
										}, null, 8, ["model-value", "disabled"])]),
										_: 1
									}, 8, [
										"title",
										"description",
										"env-tooltip"
									])
								]),
								_: 1
							})]),
							_: 1
						}, 8, ["title"])], 64)) : createCommentVNode("", true),
						createVNode(unref(SettingsSaveBar_default), {
							class: normalizeClass(_ctx.$style.saveBar),
							visible: unref(otelStore).isDirty,
							message: unref(i18n).baseText("settings.opentelemetry.unsavedChanges.title"),
							"save-label": unref(i18n).baseText("settings.opentelemetry.save"),
							"discard-label": unref(i18n).baseText("settings.opentelemetry.discard"),
							saving: unref(otelStore).saving,
							"save-disabled": statusSaving.value,
							floating: "",
							onSave: save,
							onDiscard: discard
						}, null, 8, [
							"class",
							"visible",
							"message",
							"save-label",
							"discard-label",
							"saving",
							"save-disabled"
						])
					], 2)),
					createVNode(unref(Dialog_default), {
						open: showUnsavedChangesDialog.value,
						"onUpdate:open": _cache[14] || (_cache[14] = ($event) => showUnsavedChangesDialog.value = $event),
						header: unref(i18n).baseText("settings.opentelemetry.unsavedChanges.title"),
						size: "medium"
					}, {
						default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
							default: withCtx(() => [createVNode(unref(DialogDescription_default), null, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.opentelemetry.unsavedChanges.message")), 1)]),
								_: 1
							})]),
							_: 1
						}), createVNode(unref(DialogFooter_default), { "data-test-id": "otel-unsaved-changes-dialog" }, {
							default: withCtx(() => [
								createVNode(unref(DialogClose_default), { "as-child": "" }, {
									default: withCtx(() => [createVNode(unref(N8nButton_default), {
										variant: "outline",
										label: unref(i18n).baseText("settings.opentelemetry.unsavedChanges.cancel"),
										onClick: onKeepEditing
									}, null, 8, ["label"])]),
									_: 1
								}),
								createVNode(unref(N8nButton_default), {
									variant: "outline",
									label: unref(i18n).baseText("settings.opentelemetry.unsavedChanges.leaveWithoutSaving"),
									onClick: onLeaveWithoutSaving
								}, null, 8, ["label"]),
								createVNode(unref(N8nButton_default), {
									variant: "solid",
									label: unref(i18n).baseText("settings.opentelemetry.unsavedChanges.saveAndLeave"),
									loading: unref(otelStore).saving,
									onClick: onSaveAndLeave
								}, null, 8, ["label", "loading"])
							]),
							_: 1
						})]),
						_: 1
					}, 8, ["open", "header"])
				]),
				_: 1
			}, 8, ["class"]);
		};
	}
}), [["__cssModules", { "$style": {
	layout: "_layout_1cv17_1",
	settingsContent: "_settingsContent_1cv17_5",
	saveBar: "_saveBar_1cv17_11",
	loading: "_loading_1cv17_19",
	control: "_control_1cv17_27",
	headersBlock: "_headersBlock_1cv17_31",
	headerRow: "_headerRow_1cv17_39",
	headerRemove: "_headerRemove_1cv17_50",
	addHeaderButton: "_addHeaderButton_1cv17_58",
	inputWithSlug: "_inputWithSlug_1cv17_62",
	slug: "_slug_1cv17_73"
} }]]);
//#endregion
export { SettingsOpenTelemetryView_default as default };
