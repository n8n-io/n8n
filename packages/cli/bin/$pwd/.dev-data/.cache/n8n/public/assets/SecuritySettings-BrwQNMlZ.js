import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Du as useAsyncState, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, bd as I18nT, ff as openBlock, gf as resolveComponent, ip as init_shared_esm_bundler, mf as renderList, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Bj as SettingsRow_default, By as EXECUTION_DATA_REDACTION_ENFORCEMENT_DOCS_URL, EM as Select_default, Fw as makeRestApiRequest, GA as DialogDescription_default, GS as EnterpriseEditionFeature, Gy as SECURITY_POLICIES_DOCS_URL, HA as AlertDialog_default, Hj as SettingsPageHeader_default, Ij as SettingsRowGroup_default, KA as Dialog_default, Kj as N8nNotice_default, Lj as SettingsRowConfigure_default, OC as getSecuritySettings, Pj as SettingsSection_default, Rj as SettingsEnableRow_default, Ru as usePageRedirectionHelper, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, Uj as SettingsLayout_default, Uy as PUBLIC_API_RATE_LIMITS_DOCS_URL, WA as DialogBody_default, Zj as PreviewBadge_default, _C as useUsersStore, _N as N8nText_default, bC as useRootStore, cN as Input_default, dC as useToast, dM as N8nSwitch_default, ep as usePolicyAdminAccess, fC as VIEWS, fN as N8nTooltip_default, hM as N8nLink_default, jN as useI18n, kC as updateSecuritySettings, nN as N8nBadge_default, v as useTypePoliciesSettingsFlag, vy as usePostHog, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as EnterpriseEdition_ee_default } from "./EnterpriseEdition.ee-Bv-_EZth.js";
//#region src/features/settings/security/DataRedactionSection.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var TOOLTIP_KEY = "settings.security.dataRedaction.unlicensed_tooltip";
//#endregion
//#region src/features/settings/security/DataRedactionSection.vue
var DataRedactionSection_default = /* @__PURE__ */ defineComponent({
	__name: "DataRedactionSection",
	props: {
		initialFloor: {},
		managedByEnv: { type: Boolean }
	},
	setup(__props) {
		const FLOOR_TO_LEGACY_KEY = {
			production: "non-manual",
			all: "all"
		};
		const props = __props;
		const rootStore = useRootStore();
		const settingsStore = useSettingsStore();
		const i18n = useI18n();
		const { showToast, showError } = useToast();
		const pageRedirectionHelper = usePageRedirectionHelper();
		const floor = ref(props.initialFloor);
		const showEnableDialog = ref(false);
		const showDisableDialog = ref(false);
		const isSaving = ref(false);
		const isLicensed = computed(() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.DataRedaction]);
		const enforced = computed({
			get: () => floor.value !== "off",
			set: (value) => {
				if (value) {
					showEnableDialog.value = true;
					return;
				}
				showDisableDialog.value = true;
			}
		});
		const dropdownFloor = computed(() => floor.value === "off" ? "production" : floor.value);
		const floorOptions = computed(() => ["production", "all"].map((value) => ({
			value,
			label: i18n.baseText(`settings.security.dataRedaction.scope.option.${FLOOR_TO_LEGACY_KEY[value]}`)
		})));
		const affectedScopeText = computed(() => {
			if (floor.value === "off") return i18n.baseText("settings.security.dataRedaction.affectedScope.none");
			return i18n.baseText(`settings.security.dataRedaction.affectedScope.${FLOOR_TO_LEGACY_KEY[floor.value]}`);
		});
		async function persist(nextFloor, successKey, errorKey) {
			const previousFloor = floor.value;
			floor.value = nextFloor;
			isSaving.value = true;
			try {
				await updateSecuritySettings(rootStore.restApiContext, { redactionEnforcement: { floor: nextFloor } });
				showToast({
					type: "success",
					title: i18n.baseText(successKey),
					message: ""
				});
				return true;
			} catch (error) {
				floor.value = previousFloor;
				showError(error, i18n.baseText(errorKey));
				return false;
			} finally {
				isSaving.value = false;
			}
		}
		async function confirmEnable() {
			if (await persist("production", "settings.security.dataRedaction.enforce.success.enabled", "settings.security.dataRedaction.enforce.error")) showEnableDialog.value = false;
		}
		async function confirmDisable() {
			if (await persist("off", "settings.security.dataRedaction.enforce.success.disabled", "settings.security.dataRedaction.enforce.error")) showDisableDialog.value = false;
		}
		function onSelectFloor(value) {
			if (!value) return;
			const next = value;
			if (next === dropdownFloor.value) return;
			persist(next, "settings.security.dataRedaction.scope.success", "settings.security.dataRedaction.scope.error");
		}
		function goToUpgrade() {
			pageRedirectionHelper.goToUpgrade("data-redaction", "upgrade-data-redaction");
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SettingsSection_default), {
				title: unref(i18n).baseText("settings.security.dataRedaction.title"),
				"data-test-id": "security-data-redaction-section"
			}, {
				default: withCtx(() => [
					createVNode(unref(SettingsRowGroup_default), null, {
						default: withCtx(() => [
							createVNode(unref(SettingsRow_default), null, {
								info: withCtx(() => [createVNode(unref(N8nText_default), { bold: true }, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.security.dataRedaction.enforce.title")) + " ", 1), !isLicensed.value ? (openBlock(), createBlock(unref(N8nBadge_default), {
										key: 0,
										class: "ml-4xs"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.upgrade")), 1)]),
										_: 1
									})) : createCommentVNode("", true)]),
									_: 1
								}), createVNode(unref(N8nText_default), {
									size: "small",
									color: "text-light"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.security.dataRedaction.enforce.message")) + " ", 1), createVNode(unref(N8nLink_default), {
										to: unref(EXECUTION_DATA_REDACTION_ENFORCEMENT_DOCS_URL),
										size: "small",
										"new-window": "",
										"data-test-id": "redaction-enforcement-docs-link"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.learnMore")), 1)]),
										_: 1
									}, 8, ["to"])]),
									_: 1
								})]),
								action: withCtx(() => [createVNode(EnterpriseEdition_ee_default, { features: [unref(EnterpriseEditionFeature).DataRedaction] }, {
									fallback: withCtx(() => [createVNode(unref(N8nTooltip_default), null, {
										content: withCtx(() => [createVNode(unref(I18nT), {
											keypath: TOOLTIP_KEY,
											tag: "span",
											scope: "global"
										}, {
											action: withCtx(() => [createBaseVNode("a", { onClick: goToUpgrade }, toDisplayString(unref(i18n).baseText("settings.security.dataRedaction.unlicensed_tooltip.link")), 1)]),
											_: 1
										})]),
										default: withCtx(() => [createVNode(unref(N8nSwitch_default), {
											"model-value": enforced.value,
											size: "large",
											disabled: true,
											"data-test-id": "enable-redaction-enforcement"
										}, null, 8, ["model-value"])]),
										_: 1
									})]),
									default: withCtx(() => [createVNode(unref(N8nSwitch_default), {
										modelValue: enforced.value,
										"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => enforced.value = $event),
										size: "large",
										disabled: props.managedByEnv || isSaving.value,
										"data-test-id": "enable-redaction-enforcement"
									}, null, 8, ["modelValue", "disabled"])]),
									_: 1
								}, 8, ["features"])]),
								_: 1
							}),
							!isLicensed.value || enforced.value ? (openBlock(), createBlock(unref(SettingsRow_default), {
								key: 0,
								"data-test-id": "redaction-enforcement-scope-row"
							}, {
								info: withCtx(() => [createVNode(unref(N8nText_default), { bold: true }, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.security.dataRedaction.scope.title")) + " ", 1), !isLicensed.value ? (openBlock(), createBlock(unref(N8nBadge_default), {
										key: 0,
										class: "ml-4xs"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.upgrade")), 1)]),
										_: 1
									})) : createCommentVNode("", true)]),
									_: 1
								})]),
								action: withCtx(() => [createVNode(EnterpriseEdition_ee_default, { features: [unref(EnterpriseEditionFeature).DataRedaction] }, {
									fallback: withCtx(() => [createVNode(unref(N8nTooltip_default), null, {
										content: withCtx(() => [createVNode(unref(I18nT), {
											keypath: TOOLTIP_KEY,
											tag: "span",
											scope: "global"
										}, {
											action: withCtx(() => [createBaseVNode("a", { onClick: goToUpgrade }, toDisplayString(unref(i18n).baseText("settings.security.dataRedaction.unlicensed_tooltip.link")), 1)]),
											_: 1
										})]),
										default: withCtx(() => [createVNode(unref(Select_default), {
											"model-value": dropdownFloor.value,
											items: floorOptions.value,
											size: "medium",
											disabled: true,
											"data-test-id": "redaction-enforcement-scope-select"
										}, null, 8, ["model-value", "items"])]),
										_: 1
									})]),
									default: withCtx(() => [createVNode(unref(Select_default), {
										"model-value": dropdownFloor.value,
										items: floorOptions.value,
										size: "medium",
										disabled: props.managedByEnv || isSaving.value,
										"data-test-id": "redaction-enforcement-scope-select",
										"onUpdate:modelValue": onSelectFloor
									}, null, 8, [
										"model-value",
										"items",
										"disabled"
									])]),
									_: 1
								}, 8, ["features"])]),
								_: 1
							})) : createCommentVNode("", true),
							createVNode(unref(SettingsRow_default), {
								title: unref(i18n).baseText("settings.security.dataRedaction.affectedScope.label"),
								"data-test-id": "redaction-enforcement-summary"
							}, {
								action: withCtx(() => [createVNode(unref(N8nText_default), {
									size: "small",
									color: "text-light"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(affectedScopeText.value), 1)]),
									_: 1
								})]),
								_: 1
							}, 8, ["title"])
						]),
						_: 1
					}),
					createVNode(unref(AlertDialog_default), {
						open: showEnableDialog.value,
						title: unref(i18n).baseText("settings.security.dataRedaction.enforce.confirmEnable.headline"),
						description: unref(i18n).baseText("settings.security.dataRedaction.enforce.confirmEnable.message"),
						"action-label": unref(i18n).baseText("settings.security.dataRedaction.enforce.confirmEnable.action"),
						loading: isSaving.value,
						size: "medium",
						"data-test-id": "redaction-enforcement-enable-confirm",
						onAction: confirmEnable,
						onCancel: _cache[1] || (_cache[1] = ($event) => showEnableDialog.value = false),
						"onUpdate:open": _cache[2] || (_cache[2] = ($event) => showEnableDialog.value = $event)
					}, null, 8, [
						"open",
						"title",
						"description",
						"action-label",
						"loading"
					]),
					createVNode(unref(AlertDialog_default), {
						open: showDisableDialog.value,
						title: unref(i18n).baseText("settings.security.dataRedaction.enforce.confirmDisable.headline"),
						description: unref(i18n).baseText("settings.security.dataRedaction.enforce.confirmDisable.message"),
						"action-label": unref(i18n).baseText("settings.security.dataRedaction.enforce.confirmDisable.action"),
						loading: isSaving.value,
						size: "medium",
						"data-test-id": "redaction-enforcement-disable-confirm",
						onAction: confirmDisable,
						onCancel: _cache[3] || (_cache[3] = ($event) => showDisableDialog.value = false),
						"onUpdate:open": _cache[4] || (_cache[4] = ($event) => showDisableDialog.value = $event)
					}, null, 8, [
						"open",
						"title",
						"description",
						"action-label",
						"loading"
					])
				]),
				_: 1
			}, 8, ["title"]);
		};
	}
});
//#endregion
//#region src/features/settings/security/WorkflowReviewsSection.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/settings/security/WorkflowReviewsSection.vue
var WorkflowReviewsSection_default = /* @__PURE__ */ defineComponent({
	__name: "WorkflowReviewsSection",
	props: {
		initialEnabled: { type: Boolean },
		initialAlwaysRequired: { type: Boolean },
		managedByEnv: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const rootStore = useRootStore();
		const settingsStore = useSettingsStore();
		const i18n = useI18n();
		const { showToast, showError } = useToast();
		const enabled = ref(props.initialEnabled);
		const alwaysRequired = ref(props.initialAlwaysRequired);
		const showDisableDialog = ref(false);
		const isSaving = ref(false);
		function onToggle(value) {
			if (!value) {
				showDisableDialog.value = true;
				return;
			}
			persist(true);
		}
		async function persist(value) {
			const previousValue = enabled.value;
			enabled.value = value;
			isSaving.value = true;
			try {
				const response = await updateSecuritySettings(rootStore.restApiContext, { workflowReviews: { enabled: value } });
				if (response.workflowReviews) {
					enabled.value = response.workflowReviews.enabled;
					alwaysRequired.value = response.workflowReviews.alwaysRequired === true;
					settingsStore.setWorkflowReviewsPolicy(response.workflowReviews);
				}
				showToast({
					type: "success",
					title: i18n.baseText(`settings.security.workflowReviews.success.${enabled.value ? "enabled" : "disabled"}`),
					message: ""
				});
			} catch (error) {
				enabled.value = previousValue;
				showError(error, i18n.baseText("settings.security.workflowReviews.error"));
			} finally {
				isSaving.value = false;
			}
		}
		const requireApprovalOptions = computed(() => [{
			value: "whenConfigured",
			label: i18n.baseText("settings.security.workflowReviews.requireApproval.option.whenConfigured")
		}, {
			value: "always",
			label: i18n.baseText("settings.security.workflowReviews.requireApproval.option.always")
		}]);
		const requireApproval = computed(() => alwaysRequired.value ? "always" : "whenConfigured");
		async function persistAlwaysRequired(selected) {
			const value = selected === "always";
			if (value === alwaysRequired.value) return;
			const previousValue = alwaysRequired.value;
			alwaysRequired.value = value;
			isSaving.value = true;
			try {
				const response = await updateSecuritySettings(rootStore.restApiContext, { workflowReviews: { alwaysRequired: value } });
				if (response.workflowReviews) {
					enabled.value = response.workflowReviews.enabled;
					alwaysRequired.value = response.workflowReviews.alwaysRequired === true;
					settingsStore.setWorkflowReviewsPolicy(response.workflowReviews);
				}
				showToast({
					type: "success",
					title: i18n.baseText("settings.security.workflowReviews.requireApproval.success"),
					message: ""
				});
			} catch (error) {
				alwaysRequired.value = previousValue;
				showError(error, i18n.baseText("settings.security.workflowReviews.error"));
			} finally {
				isSaving.value = false;
			}
		}
		function confirmDisable() {
			showDisableDialog.value = false;
			persist(false);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [createVNode(unref(SettingsRowGroup_default), null, {
				default: withCtx(() => [createVNode(unref(SettingsEnableRow_default), {
					title: unref(i18n).baseText("settings.security.workflowReviews.enable.title"),
					description: unref(i18n).baseText("settings.security.workflowReviews.enable.description"),
					enabled: enabled.value,
					disabled: __props.managedByEnv || isSaving.value,
					"show-preview-badge": "",
					"switch-test-id": "security-workflow-reviews-toggle",
					"onUpdate:enabled": onToggle
				}, null, 8, [
					"title",
					"description",
					"enabled",
					"disabled"
				]), enabled.value ? (openBlock(), createBlock(unref(SettingsRow_default), {
					key: 0,
					title: unref(i18n).baseText("settings.security.workflowReviews.requireApproval.title"),
					"data-test-id": "security-workflow-reviews-require-approval-row"
				}, {
					action: withCtx(() => [createVNode(unref(Select_default), {
						"model-value": requireApproval.value,
						items: requireApprovalOptions.value,
						size: "medium",
						disabled: __props.managedByEnv || isSaving.value,
						"aria-label": unref(i18n).baseText("settings.security.workflowReviews.requireApproval.title"),
						"data-test-id": "security-workflow-reviews-require-approval-select",
						"data-attr": "security-workflow-reviews-require-approval-select",
						"onUpdate:modelValue": persistAlwaysRequired
					}, null, 8, [
						"model-value",
						"items",
						"disabled",
						"aria-label"
					])]),
					_: 1
				}, 8, ["title"])) : createCommentVNode("", true)]),
				_: 1
			}), createVNode(unref(AlertDialog_default), {
				open: showDisableDialog.value,
				title: unref(i18n).baseText("settings.security.workflowReviews.confirmDisable.headline"),
				description: unref(i18n).baseText("settings.security.workflowReviews.confirmDisable.message"),
				onAction: confirmDisable,
				onCancel: _cache[0] || (_cache[0] = ($event) => showDisableDialog.value = false),
				"onUpdate:open": _cache[1] || (_cache[1] = ($event) => showDisableDialog.value = $event)
			}, null, 8, [
				"open",
				"title",
				"description"
			])]);
		};
	}
});
//#endregion
//#region ../@n8n/rest-api-client/src/api/public-api-rate-limit-settings.ts
async function getPublicApiRateLimitSettings(context) {
	return await makeRestApiRequest(context, "GET", "/settings/policies/rate-limits");
}
async function updatePublicApiRateLimitSettings(context, data) {
	return await makeRestApiRequest(context, "PUT", "/settings/policies/rate-limits", data);
}
//#endregion
//#region src/features/settings/security/rateLimits/rateLimits.ts
var PUBLIC_API_RATE_LIMIT_SETTINGS_FLAG = "131_public_api_rate_limit_settings";
var RATE_LIMIT_ROW_KEYS = [
	"globalRead",
	"globalWrite",
	"endpointRead",
	"endpointWrite"
];
var RATE_LIMIT_GROUP_KEYS = ["allEndpoints", "individualEndpoints"];
var RATE_LIMIT_GROUPS = {
	allEndpoints: {
		read: "globalRead",
		write: "globalWrite"
	},
	individualEndpoints: {
		read: "endpointRead",
		write: "endpointWrite"
	}
};
var WHOLE_NUMBER = /^\d+$/;
var limitField = (key) => `${key}Limit`;
var windowField = (key) => `${key}WindowSeconds`;
var parseLimit = (limit) => limit.trim() === "" ? 0 : Number(limit.trim());
var parseWindow = (window) => {
	const value = window.trim();
	return WHOLE_NUMBER.test(value) && Number(value) >= 1 ? Number(value) : void 0;
};
function toInputs(settings) {
	const row = (key) => {
		const limit = settings[limitField(key)];
		return {
			limit: limit === 0 ? "" : String(limit),
			window: String(settings[windowField(key)])
		};
	};
	return {
		globalRead: row("globalRead"),
		globalWrite: row("globalWrite"),
		endpointRead: row("endpointRead"),
		endpointWrite: row("endpointWrite")
	};
}
function parseInputs(inputs, stored) {
	const settings = { ...stored };
	for (const key of RATE_LIMIT_ROW_KEYS) {
		settings[limitField(key)] = parseLimit(inputs[key].limit);
		settings[windowField(key)] = parseWindow(inputs[key].window) ?? stored[windowField(key)];
	}
	return settings;
}
function getRowError(row) {
	const limit = row.limit.trim();
	if (limit !== "" && !WHOLE_NUMBER.test(limit)) return "limit";
	if (parseLimit(limit) === 0) return void 0;
	if (parseWindow(row.window) === void 0) return "window";
}
function hasNoLimits(inputs) {
	return RATE_LIMIT_ROW_KEYS.every((key) => parseLimit(inputs[key].limit) === 0);
}
/**
* A per-endpoint limit never applies when it is higher than the all-endpoints limit and its window
* is not longer. A longer window lets the endpoint count grow across several all-endpoints windows.
*/
function exceedsAllEndpointsLimit(inputs, key) {
	const endpoint = inputs[key];
	const global = inputs[key === "endpointRead" ? "globalRead" : "globalWrite"];
	if (getRowError(endpoint) !== void 0 || getRowError(global) !== void 0) return false;
	const endpointLimit = parseLimit(endpoint.limit);
	const globalLimit = parseLimit(global.limit);
	if (endpointLimit === 0 || globalLimit === 0) return false;
	return endpointLimit > globalLimit && Number(endpoint.window) <= Number(global.window);
}
function summarizeLimits(settings, group, i18n) {
	const { read, write } = RATE_LIMIT_GROUPS[group];
	const plural = (key, count) => i18n.baseText(`settings.security.rateLimits.summary.${key}`, {
		adjustToNumber: count,
		interpolate: { count: count.toLocaleString() }
	});
	const readLimit = settings[limitField(read)];
	const writeLimit = settings[limitField(write)];
	const readWindow = settings[windowField(read)];
	const writeWindow = settings[windowField(write)];
	const reads = plural("reads", readLimit);
	const writes = plural("writes", writeLimit);
	if (readLimit === 0 && writeLimit === 0) return i18n.baseText("settings.security.rateLimits.summary.noLimit");
	if (writeLimit === 0) return i18n.baseText("settings.security.rateLimits.summary.readsOnly", { interpolate: {
		reads,
		window: plural("window", readWindow)
	} });
	if (readLimit === 0) return i18n.baseText("settings.security.rateLimits.summary.writesOnly", { interpolate: {
		writes,
		window: plural("window", writeWindow)
	} });
	if (readWindow === writeWindow) return i18n.baseText("settings.security.rateLimits.summary.sameWindow", { interpolate: {
		reads,
		writes,
		window: plural("window", readWindow)
	} });
	return i18n.baseText("settings.security.rateLimits.summary.differentWindows", { interpolate: {
		reads,
		readWindow: plural("window", readWindow),
		writes,
		writeWindow: plural("window", writeWindow)
	} });
}
//#endregion
//#region src/features/settings/security/rateLimits/ApiKeyRateLimitsDialog.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ApiKeyRateLimitsDialog_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ApiKeyRateLimitsDialog",
	props: {
		open: { type: Boolean },
		mode: {},
		settings: {},
		defaults: {},
		envManagedFields: {},
		saving: { type: Boolean }
	},
	emits: ["update:open", "save"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const inputs = ref(toInputs(props.settings));
		const touchedRows = ref(/* @__PURE__ */ new Set());
		const submitted = ref(false);
		watch(() => props.open, (open) => {
			if (!open) return;
			inputs.value = toInputs(props.settings);
			touchedRows.value = /* @__PURE__ */ new Set();
			submitted.value = false;
		});
		const groups = RATE_LIMIT_GROUP_KEYS.map((group) => ({
			group,
			rows: RATE_LIMIT_GROUPS[group]
		}));
		const isLimitLocked = (key) => props.envManagedFields.includes(`${key}Limit`);
		const isWindowLocked = (key) => props.envManagedFields.includes(`${key}WindowSeconds`);
		function rowErrorText(key) {
			if (!submitted.value && !touchedRows.value.has(key)) return void 0;
			const error = getRowError(inputs.value[key]);
			return error && i18n.baseText(`settings.security.rateLimits.dialog.error.${error}`);
		}
		function fieldLabel(field, group, kind) {
			return i18n.baseText(`settings.security.rateLimits.dialog.${field}.label`, { interpolate: {
				group: i18n.baseText(`settings.security.rateLimits.group.${group}`),
				kind: i18n.baseText(`settings.security.rateLimits.dialog.${kind}`)
			} });
		}
		const rowWarning = (key) => (key === "endpointRead" || key === "endpointWrite") && exceedsAllEndpointsLimit(inputs.value, key);
		const defaultInputs = computed(() => toInputs(props.defaults));
		const canReset = (key) => !isLimitLocked(key) && inputs.value[key].limit !== defaultInputs.value[key].limit || !isWindowLocked(key) && inputs.value[key].window !== defaultInputs.value[key].window;
		const hasErrors = computed(() => RATE_LIMIT_ROW_KEYS.some((key) => getRowError(inputs.value[key]) !== void 0));
		const isEmpty = computed(() => hasNoLimits(inputs.value));
		const showFixMessage = computed(() => submitted.value && hasErrors.value);
		const isEnabledLocked = computed(() => props.envManagedFields.includes("enabled"));
		const canDisable = computed(() => props.mode === "edit" && !isEnabledLocked.value);
		const willDisable = computed(() => canDisable.value && isEmpty.value && !hasErrors.value);
		const title = computed(() => props.mode === "enable" ? i18n.baseText("settings.security.rateLimits.dialog.enable.title") : i18n.baseText("settings.security.rateLimits.dialog.edit.title"));
		const primaryLabel = computed(() => {
			if (props.mode === "enable") return i18n.baseText("settings.security.rateLimits.dialog.enable.button");
			return willDisable.value ? i18n.baseText("settings.security.rateLimits.dialog.disable") : i18n.baseText("settings.security.rateLimits.dialog.save");
		});
		const isPrimaryDisabled = computed(() => !canDisable.value && isEmpty.value && !hasErrors.value);
		function resetText(key) {
			const limit = Number(isLimitLocked(key) ? inputs.value[key].limit : defaultInputs.value[key].limit);
			if (!limit) return i18n.baseText("settings.security.rateLimits.dialog.noLimit");
			const window = Number(isWindowLocked(key) ? inputs.value[key].window : defaultInputs.value[key].window);
			return i18n.baseText("settings.security.rateLimits.dialog.defaultValue", { interpolate: {
				limit: limit.toLocaleString(),
				window: window.toLocaleString()
			} });
		}
		function resetRow(key) {
			if (!isLimitLocked(key)) inputs.value[key].limit = defaultInputs.value[key].limit;
			if (!isWindowLocked(key)) inputs.value[key].window = defaultInputs.value[key].window;
		}
		function resetAll() {
			for (const key of RATE_LIMIT_ROW_KEYS) if (canReset(key)) resetRow(key);
		}
		function save() {
			submitted.value = true;
			if (hasErrors.value) return;
			emit("save", {
				...parseInputs(inputs.value, props.settings),
				enabled: !isEmpty.value
			});
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: __props.open,
				header: title.value,
				size: "medium",
				"data-test-id": "rate-limits-dialog",
				"onUpdate:open": _cache[1] || (_cache[1] = ($event) => emit("update:open", $event))
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [createVNode(unref(DialogDescription_default), null, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.security.rateLimits.dialog.description")), 1)]),
						_: 1
					}), createBaseVNode("div", { class: normalizeClass(_ctx.$style.groups) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(groups), ({ group, rows }) => {
						return openBlock(), createElementBlock("div", {
							key: group,
							class: normalizeClass(_ctx.$style.group)
						}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.groupTitle) }, [createVNode(unref(N8nText_default), { bold: true }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(`settings.security.rateLimits.group.${group}`)), 1)]),
							_: 2
						}, 1024), createVNode(unref(N8nTooltip_default), { content: unref(i18n).baseText(`settings.security.rateLimits.group.${group}.tooltip`) }, {
							default: withCtx(() => [createVNode(unref(N8nIcon_default), {
								icon: "info",
								size: "small",
								color: "text-light"
							})]),
							_: 1
						}, 8, ["content"])], 2), (openBlock(), createElementBlock(Fragment, null, renderList(["read", "write"], (kind) => {
							return createBaseVNode("div", {
								key: kind,
								class: normalizeClass(_ctx.$style.rowWrapper)
							}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.row) }, [
								createVNode(unref(N8nText_default), { class: normalizeClass(_ctx.$style.rowLabel) }, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(`settings.security.rateLimits.dialog.${kind}`)), 1)]),
									_: 2
								}, 1032, ["class"]),
								createBaseVNode("div", { class: normalizeClass(_ctx.$style.field) }, [createVNode(unref(N8nTooltip_default), {
									disabled: !isLimitLocked(rows[kind]),
									content: unref(i18n).baseText("settings.security.rateLimits.envLocked.field")
								}, {
									default: withCtx(() => [createVNode(unref(Input_default), {
										modelValue: inputs.value[rows[kind]].limit,
										"onUpdate:modelValue": ($event) => inputs.value[rows[kind]].limit = $event,
										size: "medium",
										inputmode: "numeric",
										placeholder: unref(i18n).baseText("settings.security.rateLimits.dialog.noLimit"),
										"aria-label": fieldLabel("limit", group, kind),
										disabled: isLimitLocked(rows[kind]),
										"data-test-id": `rate-limits-limit-${rows[kind]}`,
										onBlur: ($event) => touchedRows.value.add(rows[kind])
									}, null, 8, [
										"modelValue",
										"onUpdate:modelValue",
										"placeholder",
										"aria-label",
										"disabled",
										"data-test-id",
										"onBlur"
									])]),
									_: 2
								}, 1032, ["disabled", "content"])], 2),
								createVNode(unref(N8nText_default), {
									color: "text-light",
									size: "small",
									class: normalizeClass(_ctx.$style.requestsPer)
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.security.rateLimits.dialog.requestsPer")), 1)]),
									_: 1
								}, 8, ["class"]),
								createBaseVNode("div", { class: normalizeClass(_ctx.$style.field) }, [createVNode(unref(N8nTooltip_default), {
									disabled: !isWindowLocked(rows[kind]),
									content: unref(i18n).baseText("settings.security.rateLimits.envLocked.field")
								}, {
									default: withCtx(() => [createVNode(unref(Input_default), {
										modelValue: inputs.value[rows[kind]].window,
										"onUpdate:modelValue": ($event) => inputs.value[rows[kind]].window = $event,
										size: "medium",
										inputmode: "numeric",
										"aria-label": fieldLabel("window", group, kind),
										disabled: isWindowLocked(rows[kind]),
										"data-test-id": `rate-limits-window-${rows[kind]}`,
										onBlur: ($event) => touchedRows.value.add(rows[kind])
									}, {
										suffix: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.security.rateLimits.dialog.seconds")), 1)]),
										_: 1
									}, 8, [
										"modelValue",
										"onUpdate:modelValue",
										"aria-label",
										"disabled",
										"data-test-id",
										"onBlur"
									])]),
									_: 2
								}, 1032, ["disabled", "content"])], 2),
								createBaseVNode("div", { class: normalizeClass(_ctx.$style.resetSlot) }, [canReset(rows[kind]) ? (openBlock(), createBlock(unref(N8nTooltip_default), {
									key: 0,
									content: unref(i18n).baseText("settings.security.rateLimits.dialog.reset", { interpolate: { value: resetText(rows[kind]) } })
								}, {
									default: withCtx(() => [createVNode(unref(N8nButton_default), {
										variant: "ghost",
										size: "small",
										"icon-only": "",
										"aria-label": unref(i18n).baseText("settings.security.rateLimits.dialog.reset", { interpolate: { value: resetText(rows[kind]) } }),
										"data-test-id": `rate-limits-reset-${rows[kind]}`,
										onClick: ($event) => resetRow(rows[kind])
									}, {
										default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "undo-2" })]),
										_: 1
									}, 8, [
										"aria-label",
										"data-test-id",
										"onClick"
									])]),
									_: 2
								}, 1032, ["content"])) : createCommentVNode("", true)], 2)
							], 2), rowErrorText(rows[kind]) ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 0,
								size: "small",
								color: "danger",
								class: normalizeClass(_ctx.$style.message),
								"data-test-id": `rate-limits-error-${rows[kind]}`
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(rowErrorText(rows[kind])), 1)]),
								_: 2
							}, 1032, ["class", "data-test-id"])) : rowWarning(rows[kind]) ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 1,
								size: "small",
								color: "warning",
								class: normalizeClass(_ctx.$style.message),
								"data-test-id": `rate-limits-warning-${rows[kind]}`
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.security.rateLimits.dialog.warning.neverApplies")), 1)]),
								_: 1
							}, 8, ["class", "data-test-id"])) : createCommentVNode("", true)], 2);
						}), 64))], 2);
					}), 128))], 2)]),
					_: 1
				}), createVNode(unref(DialogFooter_default), null, {
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.footerStart) }, [unref(RATE_LIMIT_ROW_KEYS).some(canReset) ? (openBlock(), createBlock(unref(N8nButton_default), {
							key: 0,
							variant: "ghost",
							size: "small",
							icon: "undo-2",
							label: unref(i18n).baseText("settings.security.rateLimits.dialog.resetAll"),
							"data-test-id": "rate-limits-reset-all",
							onClick: resetAll
						}, null, 8, ["label"])) : createCommentVNode("", true), showFixMessage.value ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 1,
							size: "small",
							color: "danger"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.security.rateLimits.dialog.error.fix")), 1)]),
							_: 1
						})) : willDisable.value ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 2,
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.security.rateLimits.dialog.disableNote")), 1)]),
							_: 1
						})) : createCommentVNode("", true)], 2),
						createVNode(unref(N8nButton_default), {
							variant: "outline",
							label: unref(i18n).baseText("settings.security.rateLimits.dialog.cancel"),
							"data-test-id": "rate-limits-cancel",
							onClick: _cache[0] || (_cache[0] = ($event) => emit("update:open", false))
						}, null, 8, ["label"]),
						createVNode(unref(N8nTooltip_default), {
							disabled: !isPrimaryDisabled.value,
							content: unref(i18n).baseText("settings.security.rateLimits.dialog.enableTooltip")
						}, {
							default: withCtx(() => [createVNode(unref(N8nButton_default), {
								label: primaryLabel.value,
								disabled: isPrimaryDisabled.value,
								loading: __props.saving,
								"data-test-id": "rate-limits-save",
								onClick: save
							}, null, 8, [
								"label",
								"disabled",
								"loading"
							])]),
							_: 1
						}, 8, ["disabled", "content"])
					], 2)]),
					_: 1
				})]),
				_: 1
			}, 8, ["open", "header"]);
		};
	}
}), [["__cssModules", { "$style": {
	groups: "_groups_ltqgu_1",
	group: "_group_ltqgu_1",
	groupTitle: "_groupTitle_ltqgu_14",
	rowWrapper: "_rowWrapper_ltqgu_20",
	row: "_row_ltqgu_20",
	rowLabel: "_rowLabel_ltqgu_33",
	requestsPer: "_requestsPer_ltqgu_34",
	field: "_field_ltqgu_38",
	resetSlot: "_resetSlot_ltqgu_45",
	message: "_message_ltqgu_50",
	footer: "_footer_ltqgu_54",
	footerStart: "_footerStart_ltqgu_61"
} }]]);
//#endregion
//#region src/features/settings/security/rateLimits/ApiKeyRateLimitsSection.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = ["href"];
var ApiKeyRateLimitsSection_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ApiKeyRateLimitsSection",
	setup(__props) {
		const rootStore = useRootStore();
		const settingsStore = useSettingsStore();
		const i18n = useI18n();
		const { showToast, showError } = useToast();
		const isSaving = ref(false);
		const dialogOpen = ref(false);
		const dialogMode = ref("enable");
		const { state } = useAsyncState(async () => {
			try {
				return await getPublicApiRateLimitSettings(rootStore.restApiContext);
			} catch (error) {
				showError(error, i18n.baseText("settings.security.rateLimits.error.load"));
				return;
			}
		}, void 0);
		const settings = computed(() => {
			if (!state.value) return void 0;
			const { defaults: _defaults, envManagedFields: _envManagedFields, ...values } = state.value;
			return values;
		});
		const areApiKeysDisabled = computed(() => !settingsStore.isPublicApiEnabled);
		const isEnabledEnvManaged = computed(() => state.value?.envManagedFields.includes("enabled") ?? false);
		const isToggleLocked = computed(() => areApiKeysDisabled.value || isEnabledEnvManaged.value);
		const toggleLockedReason = computed(() => areApiKeysDisabled.value ? i18n.baseText("settings.security.rateLimits.apiKeysDisabled") : i18n.baseText("settings.security.rateLimits.envLocked.toggle"));
		const toggleValue = computed({
			get: () => settings.value?.enabled ?? false,
			set: (value) => {
				if (!settings.value) return;
				if (value) {
					openDialog("enable");
					return;
				}
				save({
					...settings.value,
					enabled: false
				});
			}
		});
		function openDialog(mode) {
			dialogMode.value = mode;
			dialogOpen.value = true;
		}
		function successMessage(before, after) {
			if (before === after) return i18n.baseText("settings.security.rateLimits.success.saved");
			return after ? i18n.baseText("settings.security.rateLimits.success.enabled") : i18n.baseText("settings.security.rateLimits.success.disabled");
		}
		async function save(next) {
			const wasEnabled = settings.value?.enabled ?? false;
			isSaving.value = true;
			try {
				const response = await updatePublicApiRateLimitSettings(rootStore.restApiContext, next);
				state.value = response;
				dialogOpen.value = false;
				showToast({
					type: "success",
					title: successMessage(wasEnabled, response.enabled),
					message: ""
				});
			} catch (error) {
				showError(error, i18n.baseText("settings.security.rateLimits.error.save"));
			} finally {
				isSaving.value = false;
			}
		}
		return (_ctx, _cache) => {
			const _component_RouterLink = resolveComponent("RouterLink");
			return unref(state) && settings.value ? (openBlock(), createBlock(unref(SettingsSection_default), {
				key: 0,
				title: unref(i18n).baseText("settings.security.rateLimits.title"),
				"data-test-id": "rate-limits-section"
			}, {
				default: withCtx(() => [createVNode(unref(SettingsRowGroup_default), null, {
					default: withCtx(() => [createVNode(unref(SettingsRow_default), {
						"model-value": settings.value.enabled,
						expandable: "",
						disclosure: false
					}, {
						info: withCtx(() => [createVNode(unref(N8nText_default), { bold: true }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.security.rateLimits.enable.title")), 1)]),
							_: 1
						}), createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-light",
							"data-test-id": "rate-limits-description"
						}, {
							default: withCtx(() => [createVNode(unref(I18nT), {
								keypath: "settings.security.rateLimits.enable.description",
								tag: "span",
								scope: "global"
							}, {
								apiKeys: withCtx(() => [createVNode(_component_RouterLink, {
									to: { name: unref(VIEWS).API_SETTINGS },
									"data-test-id": "rate-limits-api-keys-link"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.security.rateLimits.enable.description.apiKeys")), 1)]),
									_: 1
								}, 8, ["to"])]),
								rateLimits: withCtx(() => [createBaseVNode("a", {
									href: unref(PUBLIC_API_RATE_LIMITS_DOCS_URL),
									target: "_blank",
									rel: "noopener noreferrer",
									class: normalizeClass(_ctx.$style.docsLink)
								}, [createTextVNode(toDisplayString(unref(i18n).baseText("settings.security.rateLimits.enable.description.rateLimits")) + " ", 1), createVNode(unref(N8nIcon_default), {
									icon: "arrow-up-right",
									size: "xsmall"
								})], 10, _hoisted_1)]),
								_: 1
							})]),
							_: 1
						})]),
						action: withCtx(() => [createVNode(unref(N8nTooltip_default), {
							disabled: !isToggleLocked.value,
							content: toggleLockedReason.value
						}, {
							default: withCtx(() => [createVNode(unref(N8nSwitch_default), {
								modelValue: toggleValue.value,
								"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => toggleValue.value = $event),
								size: "large",
								"aria-label": unref(i18n).baseText("settings.security.rateLimits.enable.title"),
								disabled: isToggleLocked.value || isSaving.value,
								"data-test-id": "rate-limits-toggle"
							}, null, 8, [
								"modelValue",
								"aria-label",
								"disabled"
							])]),
							_: 1
						}, 8, ["disabled", "content"])]),
						expanded: withCtx(() => [settings.value.enabled ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: normalizeClass(_ctx.$style.summary)
						}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.summaryLines) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(RATE_LIMIT_GROUP_KEYS), (group) => {
							return openBlock(), createElementBlock("div", {
								key: group,
								class: normalizeClass(_ctx.$style.summaryLine)
							}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.summaryLabel) }, [createVNode(unref(N8nText_default), { size: "small" }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(`settings.security.rateLimits.group.${group}`)), 1)]),
								_: 2
							}, 1024), createVNode(unref(N8nTooltip_default), { content: unref(i18n).baseText(`settings.security.rateLimits.group.${group}.tooltip`) }, {
								default: withCtx(() => [createVNode(unref(N8nIcon_default), {
									icon: "info",
									size: "small",
									color: "text-light"
								})]),
								_: 1
							}, 8, ["content"])], 2), createVNode(unref(N8nText_default), {
								size: "small",
								class: normalizeClass(_ctx.$style.summaryValue),
								"data-test-id": `rate-limits-summary-${group}`
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(summarizeLimits)(settings.value, group, unref(i18n))), 1)]),
								_: 2
							}, 1032, ["class", "data-test-id"])], 2);
						}), 128))], 2), createVNode(unref(N8nTooltip_default), { content: unref(i18n).baseText("settings.security.rateLimits.edit") }, {
							default: withCtx(() => [createVNode(unref(N8nButton_default), {
								variant: "ghost",
								size: "small",
								"icon-only": "",
								"aria-label": unref(i18n).baseText("settings.security.rateLimits.edit"),
								disabled: areApiKeysDisabled.value,
								"data-test-id": "rate-limits-edit",
								onClick: _cache[1] || (_cache[1] = ($event) => openDialog("edit"))
							}, {
								default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "pencil" })]),
								_: 1
							}, 8, ["aria-label", "disabled"])]),
							_: 1
						}, 8, ["content"])], 2)) : createCommentVNode("", true)]),
						_: 1
					}, 8, ["model-value"])]),
					_: 1
				}), createVNode(ApiKeyRateLimitsDialog_default, {
					open: dialogOpen.value,
					"onUpdate:open": _cache[2] || (_cache[2] = ($event) => dialogOpen.value = $event),
					mode: dialogMode.value,
					settings: settings.value,
					defaults: unref(state).defaults,
					"env-managed-fields": unref(state).envManagedFields,
					saving: isSaving.value,
					onSave: save
				}, null, 8, [
					"open",
					"mode",
					"settings",
					"defaults",
					"env-managed-fields",
					"saving"
				])]),
				_: 1
			}, 8, ["title"])) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	docsLink: "_docsLink_14eco_1",
	summary: "_summary_14eco_7",
	summaryLines: "_summaryLines_14eco_14",
	summaryLine: "_summaryLine_14eco_14",
	summaryLabel: "_summaryLabel_14eco_27",
	summaryValue: "_summaryValue_14eco_35"
} }]]);
//#endregion
//#region src/features/settings/security/SecuritySettings.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var mfaTooltipKey = "settings.personal.mfa.enforce.unlicensed_tooltip";
var personalSpaceTooltipKey = "settings.security.personalSpace.unlicensed_tooltip";
var SecuritySettings_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SecuritySettings",
	setup(__props) {
		const router = useRouter();
		const rootStore = useRootStore();
		const settingsStore = useSettingsStore();
		const usersStore = useUsersStore();
		const i18n = useI18n();
		const { showToast, showError } = useToast();
		const pageRedirectionHelper = usePageRedirectionHelper();
		const posthogStore = usePostHog();
		const { canManagePolicies: canManageTypePolicies, entryRouteName: typePoliciesRouteName } = usePolicyAdminAccess();
		const { isEnabled: isTypePoliciesSettingsEnabled } = useTypePoliciesSettingsFlag();
		function openTypePolicies() {
			router.push({ name: typePoliciesRouteName.value });
		}
		const isRateLimitSettingsEnabled = computed(() => posthogStore.isFeatureEnabled(PUBLIC_API_RATE_LIMIT_SETTINGS_FLAG));
		const showPublishingDialog = ref(false);
		const showSharingDialog = ref(false);
		const isEnforceMFAEnabled = computed(() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.EnforceMFA]);
		const isPersonalSpacePolicyLicensed = computed(() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.PersonalSpacePolicy]);
		async function onUpdateMfaEnforced(value) {
			const boolValue = typeof value === "boolean" ? value : Boolean(value);
			try {
				await usersStore.updateEnforceMfa(boolValue);
				showToast({
					type: "success",
					title: boolValue ? i18n.baseText("settings.personal.mfa.enforce.enabled.title") : i18n.baseText("settings.personal.mfa.enforce.disabled.title"),
					message: boolValue ? i18n.baseText("settings.personal.mfa.enforce.enabled.message") : i18n.baseText("settings.personal.mfa.enforce.disabled.message")
				});
			} catch (error) {
				showError(error, i18n.baseText("settings.personal.mfa.enforce.error"));
			}
		}
		function goToUpgrade() {
			pageRedirectionHelper.goToUpgrade("settings-users", "upgrade-users");
		}
		const { state, isReady, error } = useAsyncState(async () => {
			const settings = await getSecuritySettings(rootStore.restApiContext);
			return {
				personalSpacePublishing: settings.personalSpacePublishing,
				personalSpaceSharing: settings.personalSpaceSharing,
				publishedPersonalWorkflowsCount: settings.publishedPersonalWorkflowsCount,
				sharedPersonalWorkflowsCount: settings.sharedPersonalWorkflowsCount,
				sharedPersonalCredentialsCount: settings.sharedPersonalCredentialsCount,
				managedByEnv: settings.managedByEnv,
				initialRedactionFloor: settings.redactionEnforcement?.floor ?? "off",
				workflowReviews: settings.workflowReviews
			};
		}, void 0);
		const isManagedByEnv = computed(() => state.value?.managedByEnv ?? false);
		const isSecuritySettingsSettled = computed(() => isReady.value || error.value !== void 0);
		async function updatePersonalSpaceSetting(key, value, toastNamespace) {
			try {
				await updateSecuritySettings(rootStore.restApiContext, { [key]: value });
				showToast({
					type: "success",
					title: value ? i18n.baseText(`settings.security.personalSpace.${toastNamespace}.success.enabled`) : i18n.baseText(`settings.security.personalSpace.${toastNamespace}.success.disabled`),
					message: ""
				});
			} catch (error) {
				if (state.value) state.value = {
					...state.value,
					[key]: !value
				};
				showError(error, i18n.baseText(`settings.security.personalSpace.${toastNamespace}.error`));
			}
		}
		const personalSpacePublishing = computed({
			get: () => state.value?.personalSpacePublishing ?? false,
			set: (value) => {
				if (!value) {
					showPublishingDialog.value = true;
					return;
				}
				if (state.value) state.value = {
					...state.value,
					personalSpacePublishing: value
				};
				updatePersonalSpaceSetting("personalSpacePublishing", value, "publishing");
			}
		});
		function confirmDisablePublishing() {
			showPublishingDialog.value = false;
			if (state.value) state.value = {
				...state.value,
				personalSpacePublishing: false
			};
			updatePersonalSpaceSetting("personalSpacePublishing", false, "publishing");
		}
		const personalSpaceSharing = computed({
			get: () => state.value?.personalSpaceSharing ?? false,
			set: (value) => {
				if (!value) {
					showSharingDialog.value = true;
					return;
				}
				if (state.value) state.value = {
					...state.value,
					personalSpaceSharing: value
				};
				updatePersonalSpaceSetting("personalSpaceSharing", value, "sharing");
			}
		});
		function confirmDisableSharing() {
			showSharingDialog.value = false;
			if (state.value) state.value = {
				...state.value,
				personalSpaceSharing: false
			};
			updatePersonalSpaceSetting("personalSpaceSharing", false, "sharing");
		}
		const sharingCountText = computed(() => {
			const workflows = state.value?.sharedPersonalWorkflowsCount ?? 0;
			const credentials = state.value?.sharedPersonalCredentialsCount ?? 0;
			return i18n.baseText("settings.security.personalSpace.sharing.existingCount.value", { interpolate: {
				workflowCount: String(workflows),
				credentialCount: String(credentials)
			} });
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SettingsLayout_default), { class: normalizeClass(_ctx.$style.layout) }, {
				default: withCtx(() => [
					createVNode(unref(SettingsPageHeader_default), {
						title: unref(i18n).baseText("settings.security"),
						description: unref(i18n).baseText("settings.security.description"),
						"docs-url": unref(SECURITY_POLICIES_DOCS_URL),
						"data-test-id": "security-settings-header"
					}, null, 8, [
						"title",
						"description",
						"docs-url"
					]),
					isManagedByEnv.value ? (openBlock(), createBlock(unref(N8nNotice_default), {
						key: 0,
						content: unref(i18n).baseText("settings.security.managedByEnv"),
						"data-test-id": "security-managed-by-env-notice"
					}, null, 8, ["content"])) : createCommentVNode("", true),
					createVNode(unref(SettingsSection_default), {
						title: unref(i18n).baseText("settings.personal.mfa.enforce.message"),
						"data-test-id": "security-mfa-section"
					}, {
						default: withCtx(() => [createVNode(unref(SettingsRowGroup_default), null, {
							default: withCtx(() => [createVNode(unref(SettingsRow_default), null, {
								info: withCtx(() => [createVNode(unref(N8nText_default), { bold: true }, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.personal.mfa.enforce.title")) + " ", 1), !isEnforceMFAEnabled.value ? (openBlock(), createBlock(unref(N8nBadge_default), {
										key: 0,
										class: "ml-4xs"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.upgrade")), 1)]),
										_: 1
									})) : createCommentVNode("", true)]),
									_: 1
								}), createVNode(unref(N8nText_default), {
									size: "small",
									color: "text-light"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.personal.mfa.enforce.description")), 1)]),
									_: 1
								})]),
								action: withCtx(() => [createVNode(EnterpriseEdition_ee_default, { features: [unref(EnterpriseEditionFeature).EnforceMFA] }, {
									fallback: withCtx(() => [createVNode(unref(N8nTooltip_default), null, {
										content: withCtx(() => [createVNode(unref(I18nT), {
											keypath: mfaTooltipKey,
											tag: "span",
											scope: "global"
										}, {
											action: withCtx(() => [createBaseVNode("a", { onClick: goToUpgrade }, toDisplayString(unref(i18n).baseText("settings.personal.mfa.enforce.unlicensed_tooltip.link")), 1)]),
											_: 1
										})]),
										default: withCtx(() => [createVNode(unref(N8nSwitch_default), {
											"model-value": unref(settingsStore).isMFAEnforced,
											size: "large",
											disabled: true
										}, null, 8, ["model-value"])]),
										_: 1
									})]),
									default: withCtx(() => [createVNode(unref(N8nSwitch_default), {
										"model-value": unref(settingsStore).isMFAEnforced,
										size: "large",
										disabled: isManagedByEnv.value,
										"data-test-id": "enable-force-mfa",
										"onUpdate:modelValue": onUpdateMfaEnforced
									}, null, 8, ["model-value", "disabled"])]),
									_: 1
								}, 8, ["features"])]),
								_: 1
							})]),
							_: 1
						})]),
						_: 1
					}, 8, ["title"]),
					isSecuritySettingsSettled.value ? (openBlock(), createBlock(DataRedactionSection_default, {
						key: 1,
						"initial-floor": unref(state)?.initialRedactionFloor ?? "off",
						"managed-by-env": isManagedByEnv.value
					}, null, 8, ["initial-floor", "managed-by-env"])) : createCommentVNode("", true),
					createVNode(unref(SettingsSection_default), {
						title: unref(i18n).baseText("settings.security.personalSpace.title"),
						"data-test-id": "security-personal-space-section"
					}, {
						default: withCtx(() => [createVNode(unref(SettingsRowGroup_default), null, {
							default: withCtx(() => [createVNode(unref(SettingsRow_default), null, {
								info: withCtx(() => [createVNode(unref(N8nText_default), { bold: true }, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.security.personalSpace.sharing.title")) + " ", 1), !isPersonalSpacePolicyLicensed.value ? (openBlock(), createBlock(unref(N8nBadge_default), {
										key: 0,
										class: "ml-4xs"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.upgrade")), 1)]),
										_: 1
									})) : createCommentVNode("", true)]),
									_: 1
								}), createVNode(unref(N8nText_default), {
									size: "small",
									color: "text-light"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.security.personalSpace.sharing.description")), 1)]),
									_: 1
								})]),
								action: withCtx(() => [createVNode(EnterpriseEdition_ee_default, { features: [unref(EnterpriseEditionFeature).PersonalSpacePolicy] }, {
									fallback: withCtx(() => [createVNode(unref(N8nTooltip_default), null, {
										content: withCtx(() => [createVNode(unref(I18nT), {
											keypath: personalSpaceTooltipKey,
											tag: "span",
											scope: "global"
										}, {
											action: withCtx(() => [createBaseVNode("a", { onClick: goToUpgrade }, toDisplayString(unref(i18n).baseText("settings.security.personalSpace.unlicensed_tooltip.link")), 1)]),
											_: 1
										})]),
										default: withCtx(() => [unref(state) !== void 0 ? (openBlock(), createBlock(unref(N8nSwitch_default), {
											key: 0,
											"model-value": personalSpaceSharing.value,
											size: "large",
											disabled: true,
											"data-test-id": "security-personal-space-sharing-toggle"
										}, null, 8, ["model-value"])) : createCommentVNode("", true)]),
										_: 1
									})]),
									default: withCtx(() => [unref(state) !== void 0 ? (openBlock(), createBlock(unref(N8nSwitch_default), {
										key: 0,
										modelValue: personalSpaceSharing.value,
										"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => personalSpaceSharing.value = $event),
										size: "large",
										disabled: isManagedByEnv.value,
										"data-test-id": "security-personal-space-sharing-toggle"
									}, null, 8, ["modelValue", "disabled"])) : createCommentVNode("", true)]),
									_: 1
								}, 8, ["features"])]),
								_: 1
							}), createVNode(unref(SettingsRow_default), {
								title: unref(i18n).baseText("settings.security.personalSpace.sharing.existingCount.label"),
								"data-test-id": "security-sharing-count"
							}, {
								action: withCtx(() => [createVNode(unref(N8nText_default), {
									size: "small",
									color: "text-light"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(sharingCountText.value), 1)]),
									_: 1
								})]),
								_: 1
							}, 8, ["title"])]),
							_: 1
						}), createVNode(unref(SettingsRowGroup_default), null, {
							default: withCtx(() => [createVNode(unref(SettingsRow_default), null, {
								info: withCtx(() => [createVNode(unref(N8nText_default), { bold: true }, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.security.personalSpace.publishing.title")) + " ", 1), !isPersonalSpacePolicyLicensed.value ? (openBlock(), createBlock(unref(N8nBadge_default), {
										key: 0,
										class: "ml-4xs"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.upgrade")), 1)]),
										_: 1
									})) : createCommentVNode("", true)]),
									_: 1
								}), createVNode(unref(N8nText_default), {
									size: "small",
									color: "text-light"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.security.personalSpace.publishing.description")), 1)]),
									_: 1
								})]),
								action: withCtx(() => [createVNode(EnterpriseEdition_ee_default, { features: [unref(EnterpriseEditionFeature).PersonalSpacePolicy] }, {
									fallback: withCtx(() => [createVNode(unref(N8nTooltip_default), null, {
										content: withCtx(() => [createVNode(unref(I18nT), {
											keypath: personalSpaceTooltipKey,
											tag: "span",
											scope: "global"
										}, {
											action: withCtx(() => [createBaseVNode("a", { onClick: goToUpgrade }, toDisplayString(unref(i18n).baseText("settings.security.personalSpace.unlicensed_tooltip.link")), 1)]),
											_: 1
										})]),
										default: withCtx(() => [unref(state) !== void 0 ? (openBlock(), createBlock(unref(N8nSwitch_default), {
											key: 0,
											"model-value": personalSpacePublishing.value,
											size: "large",
											disabled: true,
											"data-test-id": "security-personal-space-publishing-toggle"
										}, null, 8, ["model-value"])) : createCommentVNode("", true)]),
										_: 1
									})]),
									default: withCtx(() => [unref(state) !== void 0 ? (openBlock(), createBlock(unref(N8nSwitch_default), {
										key: 0,
										modelValue: personalSpacePublishing.value,
										"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => personalSpacePublishing.value = $event),
										size: "large",
										disabled: isManagedByEnv.value,
										"data-test-id": "security-personal-space-publishing-toggle"
									}, null, 8, ["modelValue", "disabled"])) : createCommentVNode("", true)]),
									_: 1
								}, 8, ["features"])]),
								_: 1
							}), createVNode(unref(SettingsRow_default), {
								title: unref(i18n).baseText("settings.security.personalSpace.publishing.existingCount.label"),
								"data-test-id": "security-publishing-count"
							}, {
								action: withCtx(() => [createVNode(unref(N8nText_default), {
									size: "small",
									color: "text-light"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.security.personalSpace.publishing.existingCount.value", { interpolate: { count: String(unref(state)?.publishedPersonalWorkflowsCount ?? 0) } })), 1)]),
									_: 1
								})]),
								_: 1
							}, 8, ["title"])]),
							_: 1
						})]),
						_: 1
					}, 8, ["title"]),
					unref(canManageTypePolicies) && unref(isTypePoliciesSettingsEnabled) ? (openBlock(), createBlock(unref(SettingsSection_default), {
						key: 2,
						title: unref(i18n).baseText("settings.security.nodeAndCredentialPolicies.section"),
						"data-test-id": "security-type-policies-section"
					}, {
						default: withCtx(() => [createVNode(unref(SettingsRowGroup_default), null, {
							default: withCtx(() => [createVNode(unref(SettingsRow_default), {
								clickable: "",
								"data-test-id": "security-type-policies-row",
								"data-attr": "security-type-policies-row",
								onClick: openTypePolicies
							}, {
								info: withCtx(() => [createVNode(unref(N8nText_default), { bold: true }, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.security.nodeAndCredentialPolicies.title")) + " ", 1), createVNode(unref(PreviewBadge_default), {
										class: "ml-4xs",
										"data-test-id": "security-type-policies-preview-badge"
									})]),
									_: 1
								}), createVNode(unref(N8nText_default), {
									size: "small",
									color: "text-light"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.security.nodeAndCredentialPolicies.description")), 1)]),
									_: 1
								})]),
								action: withCtx(() => [createVNode(unref(SettingsRowConfigure_default), { value: unref(i18n).baseText("generic.configure") }, null, 8, ["value"])]),
								_: 1
							})]),
							_: 1
						})]),
						_: 1
					}, 8, ["title"])) : createCommentVNode("", true),
					unref(state)?.workflowReviews ? (openBlock(), createBlock(unref(SettingsSection_default), {
						key: 3,
						title: unref(i18n).baseText("settings.security.workflowReviews.title"),
						description: unref(i18n).baseText("settings.security.workflowReviews.description"),
						"data-test-id": "security-workflow-reviews-section"
					}, {
						default: withCtx(() => [createVNode(WorkflowReviewsSection_default, {
							"initial-enabled": unref(state).workflowReviews.enabled,
							"initial-always-required": unref(state).workflowReviews.alwaysRequired === true,
							"managed-by-env": isManagedByEnv.value
						}, null, 8, [
							"initial-enabled",
							"initial-always-required",
							"managed-by-env"
						])]),
						_: 1
					}, 8, ["title", "description"])) : createCommentVNode("", true),
					isRateLimitSettingsEnabled.value ? (openBlock(), createBlock(ApiKeyRateLimitsSection_default, { key: 4 })) : createCommentVNode("", true),
					createVNode(unref(AlertDialog_default), {
						open: showPublishingDialog.value,
						title: unref(i18n).baseText("settings.security.personalSpace.publishing.confirmMessage.disable.headline"),
						description: unref(i18n).baseText("settings.security.personalSpace.publishing.confirmMessage.disable.message"),
						onAction: confirmDisablePublishing,
						onCancel: _cache[2] || (_cache[2] = ($event) => showPublishingDialog.value = false),
						"onUpdate:open": _cache[3] || (_cache[3] = ($event) => showPublishingDialog.value = $event)
					}, null, 8, [
						"open",
						"title",
						"description"
					]),
					createVNode(unref(AlertDialog_default), {
						open: showSharingDialog.value,
						title: unref(i18n).baseText("settings.security.personalSpace.sharing.confirmMessage.disable.headline"),
						description: unref(i18n).baseText("settings.security.personalSpace.sharing.confirmMessage.disable.message"),
						size: "medium",
						onAction: confirmDisableSharing,
						onCancel: _cache[4] || (_cache[4] = ($event) => showSharingDialog.value = false),
						"onUpdate:open": _cache[5] || (_cache[5] = ($event) => showSharingDialog.value = $event)
					}, null, 8, [
						"open",
						"title",
						"description"
					])
				]),
				_: 1
			}, 8, ["class"]);
		};
	}
}), [["__cssModules", { "$style": { layout: "_layout_1u06y_1" } }]]);
//#endregion
export { SecuritySettings_default as default };
