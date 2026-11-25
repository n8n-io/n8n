import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, bd as I18nT, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, yp as normalizeStyle, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { AN as i18n, GA as DialogDescription_default, Jg as useUIStore, KA as Dialog_default, Kd as useDocumentTitle, Kj as N8nNotice_default, Ru as usePageRedirectionHelper, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, WA as DialogBody_default, _C as useUsersStore, _M as Checkbox_default, _N as N8nText_default, cN as Input_default, dC as useToast, f as usePrefetchModals, fN as N8nTooltip_default, nD as getResourcePermissions, nN as N8nBadge_default, p as telemetry, tM as N8nInfoTip_default, v_ as COMMUNITY_PLUS_ENROLLMENT_MODAL, xm as hasPermission, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as useUsageStore } from "./usage.store-CqGOGqOI.js";
//#region src/features/settings/usage/components/EulaAcceptanceModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = ["href"];
var EulaAcceptanceModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "EulaAcceptanceModal",
	props: {
		modelValue: { type: Boolean },
		eulaUrl: {}
	},
	emits: [
		"update:modelValue",
		"accept",
		"cancel"
	],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const accepted = ref(false);
		const isAcceptDisabled = computed(() => !accepted.value);
		const onCancel = () => {
			accepted.value = false;
			emit("cancel");
		};
		const onAccept = () => {
			emit("accept");
		};
		const onDialogOpenUpdate = (open) => {
			if (open) return;
			emit("update:modelValue", false);
			onCancel();
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: __props.modelValue,
				size: "large",
				header: unref(i18n).baseText("settings.usageAndPlan.dialog.eula.title"),
				"data-test-id": "eula-acceptance-modal",
				"onUpdate:open": onDialogOpenUpdate
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [
						createVNode(unref(N8nText_default), {
							color: "text-base",
							size: "medium"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.usageAndPlan.dialog.eula.description")), 1)]),
							_: 1
						}),
						createVNode(unref(N8nText_default), {
							class: normalizeClass(_ctx.$style.auditNotice),
							color: "text-base",
							size: "medium",
							tag: "p"
						}, {
							default: withCtx(() => [createBaseVNode("em", null, toDisplayString(unref(i18n).baseText("settings.usageAndPlan.dialog.eula.audit.notice")), 1)]),
							_: 1
						}, 8, ["class"]),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.checkboxWrapper) }, [createVNode(unref(Checkbox_default), {
							modelValue: accepted.value,
							"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => accepted.value = $event),
							"data-test-id": "eula-checkbox"
						}, {
							label: withCtx(() => [createBaseVNode("span", null, [
								createTextVNode(toDisplayString(unref(i18n).baseText("settings.usageAndPlan.dialog.eula.checkbox.label")) + " " + toDisplayString(" ") + " ", 1),
								createBaseVNode("a", {
									href: __props.eulaUrl,
									target: "_blank",
									rel: "noopener noreferrer",
									"data-test-id": "eula-link"
								}, toDisplayString(unref(i18n).baseText("settings.usageAndPlan.dialog.eula.link.text")), 9, _hoisted_1$1),
								_cache[1] || (_cache[1] = createTextVNode(". ", -1))
							])]),
							_: 1
						}, 8, ["modelValue"])], 2)
					]),
					_: 1
				}), createVNode(unref(DialogFooter_default), null, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "outline",
						"data-test-id": "eula-cancel-button",
						onClick: onCancel
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.usageAndPlan.dialog.eula.button.cancel")), 1)]),
						_: 1
					}), createVNode(unref(N8nButton_default), {
						variant: "solid",
						disabled: isAcceptDisabled.value,
						"data-test-id": "eula-accept-button",
						onClick: onAccept
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.usageAndPlan.dialog.eula.button.accept")), 1)]),
						_: 1
					}, 8, ["disabled"])]),
					_: 1
				})]),
				_: 1
			}, 8, ["open", "header"]);
		};
	}
}), [["__cssModules", { "$style": {
	auditNotice: "_auditNotice_1r6cu_1",
	checkboxWrapper: "_checkboxWrapper_1r6cu_5"
} }]]);
//#endregion
//#region src/features/settings/usage/views/SettingsUsageAndPlan.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = { class: "settings-usage-and-plan" };
var _hoisted_2 = { key: 0 };
var _hoisted_3 = { key: 0 };
var _hoisted_4 = { key: 1 };
var _hoisted_5 = { key: 0 };
var _hoisted_6 = { key: 1 };
var _hoisted_7 = ["href"];
var _hoisted_8 = ["href"];
var SettingsUsageAndPlan_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SettingsUsageAndPlan",
	setup(__props) {
		const usageStore = useUsageStore();
		const route = useRoute();
		const router = useRouter();
		const uiStore = useUIStore();
		const usersStore = useUsersStore();
		const toast = useToast();
		const documentTitle = useDocumentTitle();
		const pageRedirectionHelper = usePageRedirectionHelper();
		const queryParamCallback = ref(`callback=${encodeURIComponent(`${window.location.origin}${window.location.pathname}`)}`);
		const viewPlansUrl = computed(() => `${usageStore.viewPlansUrl}&${queryParamCallback.value}&source=usage_page`);
		const managePlanUrl = computed(() => `${usageStore.managePlanUrl}&${queryParamCallback.value}`);
		const activationKeyModal = ref(false);
		const activationSuccessModal = ref(false);
		const activationKey = ref("");
		const eulaModal = ref(false);
		const eulaUrl = ref("");
		const activationFromUrl = ref(false);
		const canUserActivateLicense = computed(() => hasPermission(["rbac"], { rbac: { scope: "license:manage" } }));
		const badgedPlanName = computed(() => {
			const [badge, name] = usageStore.planName.split(" ");
			return {
				name,
				badge
			};
		});
		const isCommunity = computed(() => usageStore.planName.toLowerCase() === "community");
		const isCommunityEditionRegistered = computed(() => usageStore.planName.toLowerCase() === "registered community");
		const canUserRegisterCommunityPlus = computed(() => getResourcePermissions(usersStore.currentUser?.globalScopes).community.register);
		const showActivationSuccess = () => {
			activationSuccessModal.value = true;
		};
		const showActivationError = (error) => {
			toast.showError(error, i18n.baseText("settings.usageAndPlan.license.activation.error.title"));
		};
		const isEulaError = (error) => {
			const e = error;
			return e.httpStatusCode === 400 && !!e.meta?.eulaUrl;
		};
		const clearKeyFromUrl = async () => {
			if (!activationFromUrl.value) return;
			activationFromUrl.value = false;
			await router.replace({ query: {} });
		};
		const onLicenseActivation = async (eulaUri) => {
			try {
				await usageStore.activateLicense(activationKey.value.trim(), eulaUri?.trim());
				activationKeyModal.value = false;
				eulaModal.value = false;
				activationKey.value = "";
				await clearKeyFromUrl();
				showActivationSuccess();
			} catch (error) {
				if (isEulaError(error)) {
					eulaUrl.value = error.meta.eulaUrl;
					eulaModal.value = true;
					activationKeyModal.value = false;
					return;
				}
				showActivationError(error);
			}
		};
		const onEulaAccept = async () => {
			try {
				await onLicenseActivation(eulaUrl.value);
			} catch (error) {
				eulaModal.value = false;
				showActivationError(error);
			}
		};
		const onEulaCancel = async () => {
			eulaModal.value = false;
			eulaUrl.value = "";
			activationKey.value = "";
			await clearKeyFromUrl();
		};
		const onActivationCancel = () => {
			activationKeyModal.value = false;
			activationKey.value = "";
		};
		const onActivationModalClose = () => {
			if (!eulaModal.value) onActivationCancel();
		};
		onMounted(async () => {
			documentTitle.set(i18n.baseText("settings.usageAndPlan.title"));
			usageStore.setLoading(true);
			if (route.query.key) {
				const keyFromUrl = route.query.key;
				try {
					await usageStore.activateLicense(keyFromUrl);
					await router.replace({ query: {} });
					showActivationSuccess();
					usageStore.setLoading(false);
					return;
				} catch (error) {
					if (isEulaError(error)) {
						activationKey.value = keyFromUrl;
						activationFromUrl.value = true;
						eulaUrl.value = error.meta.eulaUrl;
						eulaModal.value = true;
					} else showActivationError(error);
				}
			}
			try {
				if (!route.query.key && canUserActivateLicense.value) await usageStore.refreshLicenseManagementToken();
				else await usageStore.getLicenseInfo();
				usageStore.setLoading(false);
			} catch (error) {
				if (!error.name) error.name = i18n.baseText("settings.usageAndPlan.error");
				toast.showError(error, error.name, { message: error.message });
			}
		});
		usePrefetchModals([COMMUNITY_PLUS_ENROLLMENT_MODAL], { enabled: () => !usageStore.isLoading && isCommunity.value && canUserRegisterCommunityPlus.value === true });
		const sendUsageTelemetry = (action) => {
			const telemetryPayload = usageStore.telemetryPayload;
			telemetryPayload.action = action;
			telemetry.track("User clicked button on usage page", telemetryPayload);
		};
		const onAddActivationKey = () => {
			activationKeyModal.value = true;
			sendUsageTelemetry("add_activation_key");
		};
		const onViewPlans = () => {
			pageRedirectionHelper.goToUpgrade("usage_page", "open");
			sendUsageTelemetry("view_plans");
		};
		const onManagePlan = () => {
			sendUsageTelemetry("manage_plan");
		};
		function onActivationDialogOpenUpdate(open) {
			if (!open) onActivationModalClose();
		}
		const openCommunityRegisterModal = () => {
			uiStore.openModalWithData({
				name: COMMUNITY_PLUS_ENROLLMENT_MODAL,
				data: { customHeading: void 0 }
			});
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", _hoisted_1, [createVNode(unref(N8nHeading_default), {
				tag: "h2",
				size: "2xlarge"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.usageAndPlan.title")), 1)]),
				_: 1
			}), !unref(usageStore).isLoading ? (openBlock(), createElementBlock("div", _hoisted_2, [
				createVNode(unref(N8nHeading_default), {
					tag: "h3",
					class: normalizeClass(_ctx.$style.title),
					size: "large"
				}, {
					default: withCtx(() => [createVNode(unref(I18nT), {
						keypath: "settings.usageAndPlan.description",
						tag: "span",
						scope: "global"
					}, {
						name: withCtx(() => [createTextVNode(toDisplayString(badgedPlanName.value.name ?? unref(usageStore).planName), 1)]),
						type: withCtx(() => [unref(usageStore).planId ? (openBlock(), createElementBlock("span", _hoisted_3, toDisplayString(unref(i18n).baseText("settings.usageAndPlan.plan")), 1)) : (openBlock(), createElementBlock("span", _hoisted_4, toDisplayString(unref(i18n).baseText("settings.usageAndPlan.edition")), 1))]),
						_: 1
					}), badgedPlanName.value.badge && badgedPlanName.value.name ? (openBlock(), createElementBlock("span", {
						key: 0,
						class: normalizeClass(_ctx.$style.titleTooltip)
					}, [createVNode(unref(N8nTooltip_default), {
						placement: "top",
						"as-child": ""
					}, {
						content: withCtx(() => [isCommunityEditionRegistered.value ? (openBlock(), createBlock(unref(I18nT), {
							key: 0,
							keypath: "settings.usageAndPlan.license.communityRegistered.tooltip",
							scope: "global"
						})) : createCommentVNode("", true)]),
						default: withCtx(() => [createVNode(unref(N8nBadge_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(badgedPlanName.value.badge), 1)]),
							_: 1
						})]),
						_: 1
					})], 2)) : createCommentVNode("", true)]),
					_: 1
				}, 8, ["class"]),
				isCommunity.value && canUserRegisterCommunityPlus.value ? (openBlock(), createBlock(unref(N8nNotice_default), {
					key: 0,
					class: "mt-0",
					theme: "warning"
				}, {
					default: withCtx(() => [createVNode(unref(I18nT), {
						keypath: "settings.usageAndPlan.callOut",
						scope: "global"
					}, {
						link: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "ghost",
							class: "pl-0 pr-0",
							label: unref(i18n).baseText("settings.usageAndPlan.callOut.link"),
							onClick: openCommunityRegisterModal
						}, null, 8, ["label"])]),
						_: 1
					})]),
					_: 1
				})) : createCommentVNode("", true),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.quota) }, [createVNode(unref(N8nText_default), {
					size: "medium",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.usageAndPlan.activeWorkflows")), 1)]),
					_: 1
				}), createBaseVNode("div", { class: normalizeClass(_ctx.$style.chart) }, [unref(usageStore).activeWorkflowTriggersLimit > 0 ? (openBlock(), createElementBlock("span", {
					key: 0,
					class: normalizeClass(_ctx.$style.chartLine)
				}, [createBaseVNode("span", {
					class: normalizeClass(_ctx.$style.chartBar),
					style: normalizeStyle({ width: `${unref(usageStore).executionPercentage}%` })
				}, null, 6)], 2)) : createCommentVNode("", true), createVNode(unref(I18nT), {
					tag: "span",
					class: normalizeClass(_ctx.$style.count),
					keypath: "settings.usageAndPlan.activeWorkflows.count",
					scope: "global"
				}, {
					count: withCtx(() => [createTextVNode(toDisplayString(unref(usageStore).activeWorkflowTriggersCount), 1)]),
					limit: withCtx(() => [unref(usageStore).activeWorkflowTriggersLimit < 0 ? (openBlock(), createElementBlock("span", _hoisted_5, toDisplayString(unref(i18n).baseText("settings.usageAndPlan.activeWorkflows.unlimited")), 1)) : (openBlock(), createElementBlock("span", _hoisted_6, toDisplayString(unref(usageStore).activeWorkflowTriggersLimit), 1))]),
					_: 1
				}, 8, ["class"])], 2)], 2),
				createVNode(unref(N8nInfoTip_default), null, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.usageAndPlan.activeWorkflows.hint")), 1)]),
					_: 1
				}),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.buttons) }, [canUserActivateLicense.value ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					variant: "outline",
					class: normalizeClass(_ctx.$style.buttonTertiary),
					size: "large",
					onClick: onAddActivationKey
				}, {
					default: withCtx(() => [createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("settings.usageAndPlan.button.activation")), 1)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true), unref(usageStore).managementToken ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 1,
					size: "large",
					onClick: onManagePlan
				}, {
					default: withCtx(() => [createBaseVNode("a", {
						href: managePlanUrl.value,
						target: "_blank"
					}, toDisplayString(unref(i18n).baseText("settings.usageAndPlan.button.manage")), 9, _hoisted_7)]),
					_: 1
				})) : (openBlock(), createBlock(unref(N8nButton_default), {
					key: 2,
					size: "large",
					onClick: withModifiers(onViewPlans, ["prevent"])
				}, {
					default: withCtx(() => [createBaseVNode("a", {
						href: viewPlansUrl.value,
						target: "_blank"
					}, toDisplayString(unref(i18n).baseText("settings.usageAndPlan.button.plans")), 9, _hoisted_8)]),
					_: 1
				}))], 2),
				createVNode(unref(Dialog_default), {
					open: activationKeyModal.value,
					size: "medium",
					header: unref(i18n).baseText("settings.usageAndPlan.dialog.activation.title"),
					"onUpdate:open": onActivationDialogOpenUpdate
				}, {
					default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
						default: withCtx(() => [createVNode(unref(Input_default), {
							modelValue: activationKey.value,
							"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => activationKey.value = $event),
							placeholder: unref(i18n).baseText("settings.usageAndPlan.dialog.activation.label")
						}, null, 8, ["modelValue", "placeholder"])]),
						_: 1
					}), createVNode(unref(DialogFooter_default), null, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "outline",
							onClick: onActivationCancel
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.usageAndPlan.dialog.activation.cancel")), 1)]),
							_: 1
						}), createVNode(unref(N8nButton_default), {
							disabled: !activationKey.value,
							onClick: _cache[1] || (_cache[1] = () => onLicenseActivation())
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.usageAndPlan.dialog.activation.activate")), 1)]),
							_: 1
						}, 8, ["disabled"])]),
						_: 1
					})]),
					_: 1
				}, 8, ["open", "header"]),
				createVNode(unref(Dialog_default), {
					open: activationSuccessModal.value,
					"onUpdate:open": _cache[3] || (_cache[3] = ($event) => activationSuccessModal.value = $event),
					size: "small",
					header: unref(i18n).baseText("settings.usageAndPlan.license.activation.success.title")
				}, {
					default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
						default: withCtx(() => [createVNode(unref(DialogDescription_default), {
							class: normalizeClass(_ctx.$style.activationSuccessDescription),
							"data-test-id": "license-activation-success-dialog"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.usageAndPlan.license.activation.success.message")), 1)]),
							_: 1
						}, 8, ["class"])]),
						_: 1
					}), createVNode(unref(DialogFooter_default), null, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							"data-test-id": "license-activation-success-close-button",
							onClick: _cache[2] || (_cache[2] = ($event) => activationSuccessModal.value = false)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.close")), 1)]),
							_: 1
						})]),
						_: 1
					})]),
					_: 1
				}, 8, ["open", "header"]),
				createVNode(EulaAcceptanceModal_default, {
					modelValue: eulaModal.value,
					"onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => eulaModal.value = $event),
					"eula-url": eulaUrl.value,
					onAccept: onEulaAccept,
					onCancel: onEulaCancel
				}, null, 8, ["modelValue", "eula-url"])
			])) : createCommentVNode("", true)]);
		};
	}
}), [["__cssModules", { "$style": {
	actionBox: "_actionBox_dkms5_1",
	spacedFlex: "_spacedFlex_dkms5_5",
	title: "_title_dkms5_11",
	quota: "_quota_dkms5_17",
	count: "_count_dkms5_29",
	buttons: "_buttons_dkms5_34",
	chart: "_chart_dkms5_50",
	chartLine: "_chartLine_dkms5_57",
	chartBar: "_chartBar_dkms5_67",
	titleTooltip: "_titleTooltip_dkms5_81",
	activationSuccessDescription: "_activationSuccessDescription_dkms5_87"
} }]]);
//#endregion
export { SettingsUsageAndPlan_default as default };
