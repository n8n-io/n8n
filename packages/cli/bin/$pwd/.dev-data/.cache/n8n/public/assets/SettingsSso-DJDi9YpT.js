import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Bn as EditorView, Cf as useTemplateRef, Df as withCtx, Et as historyKeymap, Gd as createTextVNode, Hd as createElementBlock, If as isRef, Jd as defineComponent, Jn as keymap, Kd as createVNode, Lr as captureMessage, M as javascriptLanguage, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Nn as syntaxHighlighting, Pd as Fragment, Pn as syntaxTree, Rd as computed, Rn as tags, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Vn as ViewPlugin, Xf as unref, Xo as useRouter, _ as draggableComponent, _p as normalizeClass, bn as LRLanguage, ff as openBlock, hf as renderSlot, if as nextTick, ip as init_shared_esm_bundler, lf as onMounted, lr as parseMixed, mf as renderList, nf as mergeModels, of as onBeforeUnmount, qo as onBeforeRouteLeave, tr as EditorState, wt as history, xf as useModel, xn as LanguageSupport, yn as HighlightStyle, zd as createBaseVNode, zn as Decoration } from "./vendor-Hx42-oQF.js";
import { AC as generateScimToken, Cm as useRBACStore, FC as listRoleMappingRules, HA as AlertDialog_default, Hj as SettingsPageHeader_default, IC as moveRoleMappingRule, KA as Dialog_default, Kd as useDocumentTitle, LC as updateRoleMappingRule, LM as N8nCallout_default, MC as setScimEnabled, NC as createRoleMappingRule, NM as N8nCard_default, PA as useMessage, PC as deleteRoleMappingRule, Pj as SettingsSection_default, Ru as usePageRedirectionHelper, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, Uj as SettingsLayout_default, Vr as useClipboard, WA as DialogBody_default, Zf as useRolesStore, Zj as PreviewBadge_default, _M as Checkbox_default, _N as N8nText_default, at as SupportedProtocols, bC as useRootStore, cN as Input_default, dC as useToast, fC as VIEWS, fN as N8nTooltip_default, fT as ROLE, hC as useTelemetry, jC as getScimConfig, jN as useI18n, kj as N8nSegmentControl_default, mM as N8nOption_default, ot as useSSOStore, pM as N8nSelect_default, pr as parserWithMetaData, vm as useProjectsStore, wy as TELEMETRY_EVENT, xC as getUsers, xM as N8nEmptyState_default, xN as N8nIcon_default, xm as hasPermission, yC as useSettingsStore, yN as N8nButton_default, zA as openSafeUrl, zw as BLOCK_ACCESS_ASSIGNMENT } from "./app-D5flEmb-.js";
import { t as CopyInput_default } from "./CopyInput-OmhSMN7b.js";
import { n as CustomRolesUpgradeModal_default, t as RoleSelectDropdown_default } from "./RoleSelectDropdown-CZKw80jp.js";
import { i as countGrantedInstancePermissions, r as TOTAL_INSTANCE_PERMISSIONS } from "./instanceRoleScopes-C7W9BUZD.js";
import { n as maskSecretParts, t as maskSecret } from "./maskSecret-C7BUBem9.js";
import { t as useUserRoleProvisioningStore } from "./userRoleProvisioning.store-ukVDX4-n.js";
//#region src/features/settings/sso/provisioning/components/InstanceRoleAssignmentSelect.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var InstanceRoleAssignmentSelect_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceRoleAssignmentSelect",
	props: /*@__PURE__*/ mergeModels({
		disabled: {
			type: Boolean,
			default: false
		},
		testId: { default: "instance-role-assignment-select" },
		allowBlockAccess: {
			type: Boolean,
			default: false
		}
	}, {
		"modelValue": { required: true },
		"modelModifiers": {}
	}),
	emits: ["update:modelValue"],
	setup(__props) {
		const modelValue = useModel(__props, "modelValue");
		const i18n = useI18n();
		const settingsStore = useSettingsStore();
		const rolesStore = useRolesStore();
		const hasCustomRolesLicense = computed(() => settingsStore.isCustomRolesFeatureEnabled);
		const canManageRoles = computed(() => hasPermission(["rbac"], { rbac: { scope: "role:manage" } }));
		const systemRoles = computed(() => rolesStore.processedInstanceRoles.filter((role) => role.systemRole));
		const customRoles = computed(() => rolesStore.customInstanceRoles);
		const permissionCountFor = (role) => countGrantedInstancePermissions(role.scopes ?? []);
		const blockAccessOption = computed(() => __props.allowBlockAccess ? {
			value: BLOCK_ACCESS_ASSIGNMENT,
			label: i18n.baseText("settings.sso.settings.roleMappingRules.blockAccess")
		} : void 0);
		const upgradeModalVisible = ref(false);
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("span", { class: normalizeClass(_ctx.$style.wrapper) }, [createVNode(RoleSelectDropdown_default, {
				"system-roles": systemRoles.value,
				"custom-roles": customRoles.value,
				"current-role": modelValue.value,
				"has-custom-roles-license": hasCustomRolesLicense.value,
				"can-manage-roles": canManageRoles.value,
				"add-custom-role-route-name": unref(VIEWS).INSTANCE_NEW_ROLE,
				"terminal-option": blockAccessOption.value,
				placeholder: unref(i18n).baseText("settings.sso.settings.roleMappingRules.selectRole"),
				variant: "default",
				disabled: __props.disabled,
				"permission-count-fn": permissionCountFor,
				"total-permissions": unref(TOTAL_INSTANCE_PERMISSIONS),
				"edit-route-name": unref(VIEWS).INSTANCE_ROLE_SETTINGS,
				"view-route-name": unref(VIEWS).INSTANCE_ROLE_VIEW,
				"from-view": unref(VIEWS).SSO_SETTINGS,
				"test-id": __props.testId,
				"onUpdate:role": _cache[0] || (_cache[0] = ($event) => modelValue.value = $event),
				onSystemRoleUpgradeNeeded: _cache[1] || (_cache[1] = ($event) => upgradeModalVisible.value = true)
			}, null, 8, [
				"system-roles",
				"custom-roles",
				"current-role",
				"has-custom-roles-license",
				"can-manage-roles",
				"add-custom-role-route-name",
				"terminal-option",
				"placeholder",
				"disabled",
				"total-permissions",
				"edit-route-name",
				"view-route-name",
				"from-view",
				"test-id"
			]), createVNode(CustomRolesUpgradeModal_default, {
				modelValue: upgradeModalVisible.value,
				"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => upgradeModalVisible.value = $event)
			}, null, 8, ["modelValue"])], 2);
		};
	}
}), [["__cssModules", { "$style": { wrapper: "_wrapper_l938g_1" } }]]);
//#endregion
//#region src/features/settings/sso/provisioning/components/DefaultConditionRow.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var DefaultConditionRow_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "DefaultConditionRow",
	props: /*@__PURE__*/ mergeModels({
		label: {},
		disabled: {
			type: Boolean,
			default: false
		},
		standalone: {
			type: Boolean,
			default: false
		}
	}, {
		"modelValue": { required: true },
		"modelModifiers": {}
	}),
	emits: ["update:modelValue"],
	setup(__props) {
		const modelValue = useModel(__props, "modelValue");
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass([_ctx.$style.defaultRow, { [_ctx.$style.standalone]: __props.standalone }]),
				"data-test-id": "default-condition-row"
			}, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.defaultCellIcon) }, [createVNode(unref(N8nIcon_default), {
					icon: "lock",
					size: "small",
					color: "text-light"
				})], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.defaultCellText) }, toDisplayString(__props.label), 3),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.defaultCellRole) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.label) }, toDisplayString(unref(i18n).baseText("settings.sso.settings.roleMappingRules.assign")), 3), createVNode(InstanceRoleAssignmentSelect_default, {
					modelValue: modelValue.value,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => modelValue.value = $event),
					disabled: __props.disabled,
					"allow-block-access": "",
					"test-id": "default-condition-role-select"
				}, null, 8, ["modelValue", "disabled"])], 2),
				!__props.standalone ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.defaultCellSpacer)
				}, null, 2)) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	defaultRow: "_defaultRow_n1nmk_1",
	standalone: "_standalone_n1nmk_9",
	defaultCellIcon: "_defaultCellIcon_n1nmk_14",
	defaultCellText: "_defaultCellText_n1nmk_23",
	defaultCellRole: "_defaultCellRole_n1nmk_31",
	defaultCellSpacer: "_defaultCellSpacer_n1nmk_39",
	label: "_label_n1nmk_44"
} }]]);
//#endregion
//#region src/features/settings/sso/provisioning/components/UserRoleProvisioningDropdown.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1$5 = ["href"];
var UserRoleProvisioningDropdown_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "UserRoleProvisioningDropdown",
	props: /*@__PURE__*/ mergeModels({
		authProtocol: {},
		disabled: {
			type: Boolean,
			default: false
		}
	}, {
		"roleAssignment": { default: "manual" },
		"roleAssignmentModifiers": {},
		"mappingMethod": { default: "idp" },
		"mappingMethodModifiers": {},
		"defaultInstanceRole": { default: ROLE.Member },
		"defaultInstanceRoleModifiers": {}
	}),
	emits: [
		"update:roleAssignment",
		"update:mappingMethod",
		"update:defaultInstanceRole"
	],
	setup(__props) {
		const roleAssignment = useModel(__props, "roleAssignment");
		const mappingMethod = useModel(__props, "mappingMethod");
		const defaultInstanceRole = useModel(__props, "defaultInstanceRole");
		const i18n = useI18n();
		const canManage = useRBACStore().hasScope("provisioning:manage");
		const showMappingMethod = computed(() => roleAssignment.value !== "manual");
		const showIdpInfoBox = computed(() => showMappingMethod.value && mappingMethod.value === "idp");
		const idpInfoText = computed(() => roleAssignment.value === "instance_and_project" ? i18n.baseText("settings.sso.settings.roleMappingMethod.idp.instanceAndProjectInfo") : i18n.baseText("settings.sso.settings.roleMappingMethod.idp.instanceInfo"));
		const roleAssignmentOptions = [
			{
				value: "manual",
				label: "roleAssignment.manual",
				desc: "roleAssignment.manual.description"
			},
			{
				value: "instance",
				label: "roleAssignment.instanceRoles",
				desc: "roleAssignment.instanceRoles.description"
			},
			{
				value: "instance_and_project",
				label: "roleAssignment.instanceAndProjectRoles",
				desc: "roleAssignment.instanceAndProjectRoles.description"
			}
		];
		const mappingMethodOptions = [{
			value: "idp",
			label: "roleMappingMethod.idp",
			desc: "roleMappingMethod.idp.description"
		}, {
			value: "rules_in_n8n",
			label: "roleMappingMethod.rulesInN8n",
			desc: "roleMappingMethod.rulesInN8n.description"
		}];
		const ssoKey = (key) => i18n.baseText(`settings.sso.settings.${key}`);
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [
				createBaseVNode("div", { class: normalizeClass([_ctx.shared.settingsItem, { [_ctx.shared.settingsItemNoBorder]: !showMappingMethod.value }]) }, [createBaseVNode("div", { class: normalizeClass(_ctx.shared.settingsItemLabel) }, [createBaseVNode("label", null, toDisplayString(ssoKey("roleAssignment.label")), 1), createBaseVNode("small", null, toDisplayString(ssoKey("roleAssignment.description")), 1)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.shared.settingsItemControl) }, [createVNode(unref(N8nSelect_default), {
					modelValue: roleAssignment.value,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => roleAssignment.value = $event),
					size: "medium",
					disabled: __props.disabled || !unref(canManage),
					"data-test-id": "role-assignment-select"
				}, {
					default: withCtx(() => [(openBlock(), createElementBlock(Fragment, null, renderList(roleAssignmentOptions, (opt) => {
						return createVNode(unref(N8nOption_default), {
							key: opt.value,
							label: ssoKey(opt.label),
							value: opt.value
						}, {
							default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.optionContent) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.optionTitle) }, toDisplayString(ssoKey(opt.label)), 3), createBaseVNode("span", { class: normalizeClass(_ctx.$style.optionDescription) }, toDisplayString(ssoKey(opt.desc)), 3)], 2)]),
							_: 2
						}, 1032, ["label", "value"]);
					}), 64))]),
					_: 1
				}, 8, ["modelValue", "disabled"])], 2)], 2),
				showMappingMethod.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.shared.settingsItem)
				}, [createBaseVNode("div", { class: normalizeClass(_ctx.shared.settingsItemLabel) }, [createBaseVNode("label", null, toDisplayString(ssoKey("roleMappingMethod.label")), 1), createBaseVNode("small", null, toDisplayString(ssoKey("roleMappingMethod.description")), 1)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.shared.settingsItemControl) }, [createVNode(unref(N8nSelect_default), {
					modelValue: mappingMethod.value,
					"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => mappingMethod.value = $event),
					size: "medium",
					disabled: __props.disabled || !unref(canManage),
					"data-test-id": "role-mapping-method-select"
				}, {
					default: withCtx(() => [(openBlock(), createElementBlock(Fragment, null, renderList(mappingMethodOptions, (opt) => {
						return createVNode(unref(N8nOption_default), {
							key: opt.value,
							label: ssoKey(opt.label),
							value: opt.value
						}, {
							default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.optionContent) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.optionTitle) }, toDisplayString(ssoKey(opt.label)), 3), createBaseVNode("span", { class: normalizeClass(_ctx.$style.optionDescription) }, toDisplayString(ssoKey(opt.desc)), 3)], 2)]),
							_: 2
						}, 1032, ["label", "value"]);
					}), 64))]),
					_: 1
				}, 8, ["modelValue", "disabled"])], 2)], 2)) : createCommentVNode("", true),
				showIdpInfoBox.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.infoBox) }, [createVNode(unref(N8nCallout_default), {
					theme: "custom",
					icon: "info",
					class: normalizeClass(_ctx.$style.callout)
				}, {
					default: withCtx(() => [createBaseVNode("div", null, toDisplayString(idpInfoText.value), 1), createBaseVNode("a", {
						href: `https://docs.n8n.io/user-management/${__props.authProtocol}/setup/`,
						target: "_blank",
						class: normalizeClass(_ctx.$style.learnMoreLink)
					}, toDisplayString(unref(i18n).baseText("settings.sso.settings.roleMappingMethod.idp.learnMore")), 11, _hoisted_1$5)]),
					_: 1
				}, 8, ["class"])], 2), createVNode(DefaultConditionRow_default, {
					modelValue: defaultInstanceRole.value,
					"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => defaultInstanceRole.value = $event),
					standalone: "",
					label: unref(i18n).baseText("settings.sso.settings.roleMappingRules.defaultCondition.idp"),
					disabled: __props.disabled || !unref(canManage)
				}, null, 8, [
					"modelValue",
					"label",
					"disabled"
				])], 64)) : createCommentVNode("", true)
			]);
		};
	}
});
var sso_form_module_scss_vue_type_style_index_0_src_true_lang_module_default = {
	"switch": "_switch_72t8v_4",
	group: "_group_72t8v_10",
	checkboxGroup: "_checkboxGroup_72t8v_31",
	actionBox: "_actionBox_72t8v_35",
	card: "_card_72t8v_39",
	firstCard: "_firstCard_72t8v_47",
	settingsItem: "_settingsItem_72t8v_57",
	settingsItemNoBorder: "_settingsItemNoBorder_72t8v_69",
	settingsItemLabel: "_settingsItemLabel_72t8v_73",
	settingsItemControl: "_settingsItemControl_72t8v_90",
	copyInputGroup: "_copyInputGroup_72t8v_100",
	copyInputField: "_copyInputField_72t8v_109",
	copyButtonWrapper: "_copyButtonWrapper_72t8v_130",
	ipsBlock: "_ipsBlock_72t8v_148",
	fieldError: "_fieldError_72t8v_158",
	optional: "_optional_72t8v_165",
	greenDot: "_greenDot_72t8v_170",
	footer: "_footer_72t8v_179"
};
var UserRoleProvisioningDropdown_default = /*#__PURE__*/ _plugin_vue_export_helper_default(UserRoleProvisioningDropdown_vue_vue_type_script_setup_true_lang_default, [["__cssModules", {
	"shared": sso_form_module_scss_vue_type_style_index_0_src_true_lang_module_default,
	"$style": {
		optionContent: "_optionContent_1t4kl_1",
		optionTitle: "_optionTitle_1t4kl_10",
		optionDescription: "_optionDescription_1t4kl_16",
		callout: "_callout_1t4kl_21",
		infoBox: "_infoBox_1t4kl_29",
		learnMoreLink: "_learnMoreLink_1t4kl_33"
	}
}]]);
//#endregion
//#region src/features/settings/sso/provisioning/composables/useRoleMappingRulesApi.ts
/**
* API layer for role mapping rules.
* Delegates to the REST API client in @n8n/rest-api-client.
*/
function useRoleMappingRulesApi() {
	const rootStore = useRootStore();
	async function listRules() {
		return await listRoleMappingRules(rootStore.restApiContext);
	}
	async function createRule(input) {
		return await createRoleMappingRule(rootStore.restApiContext, input);
	}
	async function updateRule(id, patch) {
		return await updateRoleMappingRule(rootStore.restApiContext, id, patch);
	}
	async function deleteRule(id) {
		await deleteRoleMappingRule(rootStore.restApiContext, id);
	}
	async function moveRule(id, targetIndex) {
		return await moveRoleMappingRule(rootStore.restApiContext, id, targetIndex);
	}
	return {
		listRules,
		createRule,
		updateRule,
		deleteRule,
		moveRule
	};
}
//#endregion
//#region src/features/settings/sso/provisioning/composables/useUserRoleProvisioningForm.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var DEFAULTS = {
	roleAssignment: "manual",
	mappingMethod: "idp"
};
var DEFAULT_INSTANCE_ROLE = ROLE.Member;
function getDropdownValuesFromConfig(config, hasProjectRules = false) {
	if (!config) return DEFAULTS;
	const mappingMethod = config.scopesUseExpressionMapping ? "rules_in_n8n" : "idp";
	if (config.scopesProvisionInstanceRole && config.scopesProvisionProjectRoles) return {
		roleAssignment: "instance_and_project",
		mappingMethod
	};
	else if (config.scopesProvisionInstanceRole) return {
		roleAssignment: "instance",
		mappingMethod
	};
	else if (config.scopesUseExpressionMapping) return {
		roleAssignment: hasProjectRules ? "instance_and_project" : "instance",
		mappingMethod: "rules_in_n8n"
	};
	return DEFAULTS;
}
function getProvisioningConfigFromDropdowns(roleAssignment, mappingMethod) {
	if (roleAssignment === "manual") return {
		scopesProvisionInstanceRole: false,
		scopesProvisionProjectRoles: false,
		scopesUseExpressionMapping: false
	};
	const useExpressions = mappingMethod === "rules_in_n8n";
	return {
		scopesProvisionInstanceRole: !useExpressions,
		scopesProvisionProjectRoles: !useExpressions && roleAssignment === "instance_and_project",
		scopesUseExpressionMapping: useExpressions
	};
}
function getTelemetryAssignmentMethod(roleAssignment) {
	if (roleAssignment === "manual") return "disabled";
	if (roleAssignment === "instance_and_project") return "instance_and_project_roles";
	return "instance_role";
}
function getTelemetryRoleMappingMethod(mappingMethod) {
	return mappingMethod === "rules_in_n8n" ? "n8n_rule_mapping" : "idp_rule_mapping";
}
function useUserRoleProvisioningForm(protocol) {
	const provisioningStore = useUserRoleProvisioningStore();
	const telemetry = useTelemetry();
	const roleAssignment = ref("manual");
	const mappingMethod = ref("idp");
	const defaultInstanceRole = ref(DEFAULT_INSTANCE_ROLE);
	const storedHasProjectRules = ref(false);
	const storedValues = computed(() => getDropdownValuesFromConfig(provisioningStore.provisioningConfig, storedHasProjectRules.value));
	const storedDefaultInstanceRole = computed(() => provisioningStore.provisioningConfig?.defaultInstanceRole ?? DEFAULT_INSTANCE_ROLE);
	const isUserRoleProvisioningChanged = computed(() => {
		const stored = storedValues.value;
		return stored.roleAssignment !== roleAssignment.value || stored.mappingMethod !== mappingMethod.value || storedDefaultInstanceRole.value !== defaultInstanceRole.value;
	});
	const trackProvisioningChange = (provisioningResult, ruleSaveResult) => {
		const rulesChanged = (ruleSaveResult?.createdCount ?? 0) > 0 || (ruleSaveResult?.deletedCount ?? 0) > 0;
		if (!provisioningResult.configChanged && !rulesChanged) return;
		telemetry.track(TELEMETRY_EVENT.PROVISIONING.USER_UPDATED_PROVISIONING_SETTINGS, {
			instance_id: useRootStore().instanceId,
			authentication_method: protocol,
			assignment_method: getTelemetryAssignmentMethod(roleAssignment.value),
			role_mapping_method: getTelemetryRoleMappingMethod(mappingMethod.value),
			instance_rule_count: ruleSaveResult?.instanceRuleCount ?? 0,
			project_rule_count: ruleSaveResult?.projectRuleCount ?? 0
		});
	};
	const saveProvisioningConfig = async (isDisablingSso) => {
		const effectiveRoleAssignment = isDisablingSso ? "manual" : roleAssignment.value;
		const effectiveMappingMethod = isDisablingSso ? "idp" : mappingMethod.value;
		const effectiveDefaultInstanceRole = defaultInstanceRole.value;
		const shouldDeleteProjectRules = effectiveRoleAssignment !== "instance_and_project";
		const stored = storedValues.value;
		const defaultInstanceRoleChanged = effectiveDefaultInstanceRole !== storedDefaultInstanceRole.value;
		const configChanged = effectiveRoleAssignment !== stored.roleAssignment || effectiveMappingMethod !== stored.mappingMethod || defaultInstanceRoleChanged;
		if (!configChanged && !shouldDeleteProjectRules) return { configChanged: false };
		await provisioningStore.saveProvisioningConfig({
			...getProvisioningConfigFromDropdowns(effectiveRoleAssignment, effectiveMappingMethod),
			...defaultInstanceRoleChanged ? { defaultInstanceRole: effectiveDefaultInstanceRole } : {},
			...shouldDeleteProjectRules ? { deleteProjectRules: true } : {}
		});
		roleAssignment.value = effectiveRoleAssignment;
		mappingMethod.value = effectiveMappingMethod;
		defaultInstanceRole.value = effectiveDefaultInstanceRole;
		if (shouldDeleteProjectRules) storedHasProjectRules.value = false;
		return { configChanged: configChanged || shouldDeleteProjectRules };
	};
	const roleAssignmentTransition = computed(() => {
		const stored = storedValues.value;
		if (stored.roleAssignment === roleAssignment.value && stored.mappingMethod === mappingMethod.value) return "none";
		if (roleAssignment.value === "manual") return "switchToManual";
		return "backup";
	});
	const storedHasProjectRoles = computed(() => storedValues.value.roleAssignment === "instance_and_project");
	const isDroppingProjectRules = computed(() => storedValues.value.roleAssignment === "instance_and_project" && roleAssignment.value !== "instance_and_project");
	const revertRoleAssignment = () => {
		const stored = storedValues.value;
		roleAssignment.value = stored.roleAssignment;
		mappingMethod.value = stored.mappingMethod;
		defaultInstanceRole.value = storedDefaultInstanceRole.value;
	};
	const initFormValue = () => {
		provisioningStore.getProvisioningConfig().then(async () => {
			const config = provisioningStore.provisioningConfig;
			let hasProjectRules = false;
			if (config?.scopesUseExpressionMapping) hasProjectRules = (await useRoleMappingRulesApi().listRules()).some((r) => r.type === "project");
			storedHasProjectRules.value = hasProjectRules;
			const values = getDropdownValuesFromConfig(config, hasProjectRules);
			roleAssignment.value = values.roleAssignment;
			mappingMethod.value = values.mappingMethod;
			defaultInstanceRole.value = config?.defaultInstanceRole ?? DEFAULT_INSTANCE_ROLE;
		});
	};
	initFormValue();
	return {
		roleAssignment,
		mappingMethod,
		defaultInstanceRole,
		isUserRoleProvisioningChanged,
		saveProvisioningConfig,
		trackProvisioningChange,
		roleAssignmentTransition,
		storedHasProjectRoles,
		isDroppingProjectRules,
		revertRoleAssignment
	};
}
//#endregion
//#region src/features/settings/sso/provisioning/composables/useAccessSettingsCsvExport.ts
init_reactivity_esm_bundler();
async function fetchUsers(context) {
	const allUsers = [];
	const fieldsNeededForAccessSettingExport = {
		select: ["email", "role"],
		expand: ["projectRelations"]
	};
	const PAGE_SIZE = 50;
	let currentPage = 0;
	let totalCount = 0;
	let hasMorePages = true;
	while (hasMorePages) {
		const filter = {
			...fieldsNeededForAccessSettingExport,
			sortBy: ["email:desc"],
			take: PAGE_SIZE,
			skip: currentPage * PAGE_SIZE
		};
		const response = await getUsers(context, filter);
		if (currentPage === 0) totalCount = response.count;
		allUsers.push(...response.items);
		hasMorePages = response.items.length === PAGE_SIZE && allUsers.length < totalCount;
		currentPage++;
	}
	return {
		count: totalCount,
		items: allUsers
	};
}
function useAccessSettingsCsvExport() {
	const cachedUserData = ref();
	/**
	* Since users can click the "download project roles" and "download instance roles"
	* buttons right after one another, we're tracking the active request here
	* to not have to fetch the users list twice.
	*/
	const pendingUserDataRequest = ref();
	const rootStore = useRootStore();
	const formatDateForFilename = () => {
		const now = /* @__PURE__ */ new Date();
		return `${now.getDate()}_${now.getMonth() + 1}_${now.getFullYear()}_${now.getHours()}_${now.getMinutes()}`;
	};
	const escapeCsvValue = (value) => {
		if (value.includes(",") || value.includes("\"")) return `"${value.replace(/"/g, "\"\"")}"`;
		return value;
	};
	const downloadCsv = (csvContent, filename) => {
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const tempElement = document.createElement("a");
		tempElement.setAttribute("href", url);
		tempElement.setAttribute("download", filename);
		tempElement.style.display = "none";
		document.body.appendChild(tempElement);
		tempElement.click();
		document.body.removeChild(tempElement);
		URL.revokeObjectURL(url);
	};
	const getUserData = async () => {
		if (cachedUserData.value) return cachedUserData.value;
		if (pendingUserDataRequest.value) return await pendingUserDataRequest.value;
		const userDataRequest = fetchUsers(rootStore.restApiContext).then((userData) => {
			cachedUserData.value = userData;
			pendingUserDataRequest.value = void 0;
			return userData;
		}).catch((error) => {
			pendingUserDataRequest.value = void 0;
			throw error;
		});
		pendingUserDataRequest.value = userDataRequest;
		return await userDataRequest;
	};
	const hasDownloadedProjectRoleCsv = ref(false);
	const downloadProjectRolesCsv = async () => {
		const userData = await getUserData();
		const csvRows = ["email,project_displayname,project_id,project_role"];
		for (const user of userData.items) {
			const email = escapeCsvValue(user.email ?? "");
			if (user.projectRelations && user.projectRelations.length > 0) for (const project of user.projectRelations) {
				const projectName = escapeCsvValue(project.name ?? "");
				const projectId = escapeCsvValue(project.id ?? "");
				const roleValueForProvisioning = project.role.split(":")[1] ?? project.role;
				const projectRole = escapeCsvValue(roleValueForProvisioning);
				csvRows.push(`${email},${projectName},${projectId},${projectRole}`);
			}
		}
		const csvContent = csvRows.join("\n");
		const filename = `n8n_project_role_export_${formatDateForFilename()}.csv`;
		downloadCsv(csvContent, filename);
		hasDownloadedProjectRoleCsv.value = true;
	};
	const hasDownloadedInstanceRoleCsv = ref(false);
	const downloadInstanceRolesCsv = async () => {
		const userData = await getUserData();
		const csvRows = ["email,instance_role"];
		for (const user of userData.items) {
			const email = escapeCsvValue(user.email ?? "");
			const instanceRole = escapeCsvValue(user.role ?? "");
			csvRows.push(`${email},${instanceRole}`);
		}
		const csvContent = csvRows.join("\n");
		const filename = `n8n_instance_role_export_${formatDateForFilename()}.csv`;
		downloadCsv(csvContent, filename);
		hasDownloadedInstanceRoleCsv.value = true;
	};
	const accessSettingsCsvExportOnModalClose = () => {
		hasDownloadedInstanceRoleCsv.value = false;
		hasDownloadedProjectRoleCsv.value = false;
		cachedUserData.value = void 0;
		pendingUserDataRequest.value = void 0;
	};
	return {
		downloadProjectRolesCsv,
		downloadInstanceRolesCsv,
		hasDownloadedInstanceRoleCsv,
		hasDownloadedProjectRoleCsv,
		accessSettingsCsvExportOnModalClose
	};
}
//#endregion
//#region src/features/settings/sso/provisioning/components/ConfirmProvisioningDialog.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$4 = { class: "mb-s" };
var _hoisted_2$2 = { class: "mb-s" };
var _hoisted_3$1 = ["href"];
var _hoisted_4 = { key: 0 };
var _hoisted_5 = { class: "mb-s" };
var _hoisted_6 = { class: "mb-s" };
var _hoisted_7 = ["href"];
var _hoisted_8 = {
	key: 2,
	class: "mb-s",
	"data-test-id": "provisioning-project-rules-deletion-warning"
};
var _hoisted_9 = { class: "mb-s" };
var ConfirmProvisioningDialog_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "ConfirmProvisioningDialog",
	props: /*@__PURE__*/ mergeModels({
		transitionType: {},
		showProjectRolesCsv: { type: Boolean },
		authProtocol: {},
		willDeleteProjectRules: {
			type: Boolean,
			default: false
		}
	}, {
		"modelValue": { type: Boolean },
		"modelModifiers": {}
	}),
	emits: /*@__PURE__*/ mergeModels(["confirmProvisioning", "cancel"], ["update:modelValue"]),
	setup(__props, { emit: __emit }) {
		const visible = useModel(__props, "modelValue");
		const props = __props;
		const emit = __emit;
		const locale = useI18n();
		const downloadingInstanceRolesCsv = ref(false);
		const downloadingProjectRolesCsv = ref(false);
		const loading = ref(false);
		const confirmationChecked = ref(false);
		const { hasDownloadedInstanceRoleCsv, hasDownloadedProjectRoleCsv, downloadProjectRolesCsv, downloadInstanceRolesCsv, accessSettingsCsvExportOnModalClose } = useAccessSettingsCsvExport();
		const isSwitchingToManual = computed(() => props.transitionType === "switchToManual");
		const messagingKey = computed(() => isSwitchingToManual.value ? "disable" : "enable");
		const shouldShowProjectRolesCsv = computed(() => props.showProjectRolesCsv);
		const isCsvBackupPending = computed(() => !isSwitchingToManual.value && (!hasDownloadedInstanceRoleCsv.value || shouldShowProjectRolesCsv.value && !hasDownloadedProjectRoleCsv.value));
		watch(visible, () => {
			loading.value = false;
			confirmationChecked.value = false;
			accessSettingsCsvExportOnModalClose();
		});
		const onDownloadInstanceRolesCsv = async () => {
			downloadingInstanceRolesCsv.value = true;
			try {
				await downloadInstanceRolesCsv();
			} finally {
				downloadingInstanceRolesCsv.value = false;
			}
		};
		const onDownloadProjectRolesCsv = async () => {
			downloadingProjectRolesCsv.value = true;
			try {
				await downloadProjectRolesCsv();
			} finally {
				downloadingProjectRolesCsv.value = false;
			}
		};
		const onConfirmProvisioningSetting = () => {
			loading.value = true;
			emit("confirmProvisioning");
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: visible.value,
				"onUpdate:open": _cache[2] || (_cache[2] = ($event) => visible.value = $event),
				size: "xlarge",
				header: unref(locale).baseText(`settings.provisioningConfirmDialog.${messagingKey.value}.title`)
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [createBaseVNode("div", null, [
						!isSwitchingToManual.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
							createBaseVNode("div", _hoisted_1$4, [createVNode(unref(N8nText_default), { color: "text-base" }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("settings.provisioningConfirmDialog.enable.description")), 1)]),
								_: 1
							})]),
							createBaseVNode("div", _hoisted_2$2, [createVNode(unref(N8nText_default), { color: "text-base" }, {
								default: withCtx(() => [createBaseVNode("a", {
									href: `https://docs.n8n.io/user-management/${__props.authProtocol}/setup/`,
									target: "_blank"
								}, toDisplayString(unref(locale).baseText("settings.provisioningConfirmDialog.link.docs")), 9, _hoisted_3$1)]),
								_: 1
							})]),
							createBaseVNode("ul", { class: normalizeClass([_ctx.$style.list, "mb-s"]) }, [createBaseVNode("li", null, [createVNode(unref(N8nText_default), { color: "text-base" }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("settings.provisioningConfirmDialog.button.downloadInstanceRolesCsv")), 1)]),
								_: 1
							}), !unref(hasDownloadedInstanceRoleCsv) ? (openBlock(), createBlock(unref(N8nButton_default), {
								key: 0,
								variant: "ghost",
								"native-type": "button",
								icon: "arrow-circle-down",
								"data-test-id": "provisioning-download-instance-roles-csv-button",
								disabled: downloadingInstanceRolesCsv.value,
								loading: downloadingInstanceRolesCsv.value,
								class: normalizeClass([_ctx.$style.button, "n8n-button--highlight"]),
								onClick: onDownloadInstanceRolesCsv
							}, null, 8, [
								"disabled",
								"loading",
								"class"
							])) : (openBlock(), createBlock(unref(N8nIcon_default), {
								key: 1,
								icon: "check",
								color: "success",
								class: normalizeClass(_ctx.$style.icon)
							}, null, 8, ["class"]))]), shouldShowProjectRolesCsv.value ? (openBlock(), createElementBlock("li", _hoisted_4, [createVNode(unref(N8nText_default), { color: "text-base" }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("settings.provisioningConfirmDialog.button.downloadProjectRolesCsv")), 1)]),
								_: 1
							}), !unref(hasDownloadedProjectRoleCsv) ? (openBlock(), createBlock(unref(N8nButton_default), {
								key: 0,
								variant: "ghost",
								"native-type": "button",
								icon: "arrow-circle-down",
								"data-test-id": "provisioning-download-project-roles-csv-button",
								disabled: downloadingProjectRolesCsv.value,
								loading: downloadingProjectRolesCsv.value,
								class: normalizeClass([_ctx.$style.button, "n8n-button--highlight"]),
								onClick: onDownloadProjectRolesCsv
							}, null, 8, [
								"disabled",
								"loading",
								"class"
							])) : (openBlock(), createBlock(unref(N8nIcon_default), {
								key: 1,
								icon: "check",
								color: "success",
								class: normalizeClass(_ctx.$style.icon)
							}, null, 8, ["class"]))])) : createCommentVNode("", true)], 2)
						], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createBaseVNode("div", _hoisted_5, [createVNode(unref(N8nText_default), { color: "text-base" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("settings.provisioningConfirmDialog.disable.description")), 1)]),
							_: 1
						})]), createBaseVNode("div", _hoisted_6, [createVNode(unref(N8nText_default), { color: "text-base" }, {
							default: withCtx(() => [createBaseVNode("a", {
								href: `https://docs.n8n.io/user-management/${__props.authProtocol}/setup/`,
								target: "_blank"
							}, toDisplayString(unref(locale).baseText("settings.provisioningConfirmDialog.link.docs")), 9, _hoisted_7)]),
							_: 1
						})])], 64)),
						props.willDeleteProjectRules ? (openBlock(), createElementBlock("div", _hoisted_8, [createVNode(unref(N8nCallout_default), { theme: "danger" }, {
							default: withCtx(() => [
								createVNode(unref(N8nText_default), {
									color: "text-base",
									size: "small",
									bold: true
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("settings.provisioningConfirmDialog.projectRulesDeletion.warning")), 1)]),
									_: 1
								}),
								_cache[3] || (_cache[3] = createBaseVNode("br", null, null, -1)),
								createVNode(unref(N8nText_default), {
									color: "text-base",
									size: "small"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText(`settings.provisioningConfirmDialog.projectRulesDeletion.description.${messagingKey.value}`)), 1)]),
									_: 1
								})
							]),
							_: 1
						})])) : createCommentVNode("", true),
						createBaseVNode("div", _hoisted_9, [createVNode(unref(N8nCard_default), { class: normalizeClass(_ctx.$style.card) }, {
							default: withCtx(() => [createVNode(unref(Checkbox_default), {
								modelValue: confirmationChecked.value,
								"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => confirmationChecked.value = $event),
								disabled: isCsvBackupPending.value,
								"data-test-id": "provisioning-confirmation-checkbox"
							}, {
								label: withCtx(() => [createVNode(unref(N8nText_default), { color: "text-base" }, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText(`settings.provisioningConfirmDialog.${messagingKey.value}.checkbox`)), 1)]),
									_: 1
								})]),
								_: 1
							}, 8, ["modelValue", "disabled"])]),
							_: 1
						}, 8, ["class"])])
					])]),
					_: 1
				}), createVNode(unref(DialogFooter_default), null, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "ghost",
						type: "button",
						"data-test-id": "provisioning-cancel-button",
						onClick: _cache[1] || (_cache[1] = ($event) => emit("cancel"))
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("settings.provisioningConfirmDialog.button.cancel")), 1)]),
						_: 1
					}), createVNode(unref(N8nButton_default), {
						variant: "solid",
						type: "button",
						disabled: loading.value || !confirmationChecked.value || isCsvBackupPending.value,
						"data-test-id": "provisioning-confirm-button",
						onClick: onConfirmProvisioningSetting
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText(`settings.provisioningConfirmDialog.button.${messagingKey.value}.confirm`)), 1)]),
						_: 1
					}, 8, ["disabled"])]),
					_: 1
				})]),
				_: 1
			}, 8, ["open", "header"]);
		};
	}
}), [["__cssModules", { "$style": {
	button: "_button_1kyc7_2",
	card: "_card_1kyc7_6",
	icon: "_icon_1kyc7_10",
	list: "_list_1kyc7_15"
} }]]);
//#endregion
//#region src/features/settings/sso/provisioning/composables/useRoleMappingRules.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function generateLocalId() {
	return `local-${crypto.randomUUID()}`;
}
function createEmptyRule(type, order) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	return {
		id: generateLocalId(),
		expression: "",
		role: "",
		type,
		order,
		projectIds: [],
		createdAt: now,
		updatedAt: now
	};
}
function useRoleMappingRules() {
	const api = useRoleMappingRulesApi();
	const instanceRules = ref([]);
	const projectRules = ref([]);
	const isLoading = ref(false);
	const isDirty = ref(false);
	let serverRuleIds = /* @__PURE__ */ new Set();
	let serverProjectRuleIds = /* @__PURE__ */ new Set();
	function getRulesRef(type) {
		return type === "instance" ? instanceRules : projectRules;
	}
	function addRule(type) {
		const rules = getRulesRef(type);
		const order = rules.value.length;
		rules.value.push(createEmptyRule(type, order));
		isDirty.value = true;
	}
	function updateRule(id, patch) {
		for (const rules of [instanceRules, projectRules]) {
			const index = rules.value.findIndex((r) => r.id === id);
			if (index !== -1) {
				rules.value[index] = {
					...rules.value[index],
					...patch,
					updatedAt: (/* @__PURE__ */ new Date()).toISOString()
				};
				isDirty.value = true;
				return;
			}
		}
	}
	function deleteRule(id) {
		for (const rules of [instanceRules, projectRules]) {
			const index = rules.value.findIndex((r) => r.id === id);
			if (index !== -1) {
				rules.value.splice(index, 1);
				rules.value.forEach((r, i) => {
					r.order = i;
				});
				isDirty.value = true;
				return;
			}
		}
	}
	async function reorder(type, fromIndex, toIndex) {
		const rules = getRulesRef(type);
		const movedRule = rules.value[fromIndex];
		if (!movedRule) return;
		const [moved] = rules.value.splice(fromIndex, 1);
		rules.value.splice(toIndex, 0, moved);
		rules.value.forEach((r, i) => {
			r.order = i;
		});
		if (!movedRule.id.startsWith("local-")) try {
			await api.moveRule(movedRule.id, toIndex);
		} catch {
			await loadRules();
			return;
		}
		isDirty.value = true;
	}
	async function loadRules() {
		isLoading.value = true;
		try {
			const allRules = await api.listRules();
			instanceRules.value = allRules.filter((r) => r.type === "instance");
			projectRules.value = allRules.filter((r) => r.type === "project");
			serverRuleIds = new Set(allRules.map((r) => r.id));
			serverProjectRuleIds = new Set(allRules.filter((r) => r.type === "project").map((r) => r.id));
			isDirty.value = false;
		} finally {
			isLoading.value = false;
		}
	}
	function discardProjectRules() {
		projectRules.value = [];
		for (const id of serverProjectRuleIds) serverRuleIds.delete(id);
		serverProjectRuleIds = /* @__PURE__ */ new Set();
	}
	async function save() {
		isLoading.value = true;
		try {
			const freshServerRules = await api.listRules();
			const freshServerIds = new Set(freshServerRules.map((r) => r.id));
			serverRuleIds = new Set([...serverRuleIds].filter((id) => freshServerIds.has(id)));
			serverProjectRuleIds = new Set([...serverProjectRuleIds].filter((id) => freshServerIds.has(id)));
			const allLocalRules = [...instanceRules.value, ...projectRules.value];
			const localRuleIds = new Set(allLocalRules.map((r) => r.id));
			const rulePayload = (r) => ({
				expression: r.expression,
				role: r.role,
				type: r.type,
				order: r.order,
				projectIds: r.projectIds
			});
			const deleteIds = [...serverRuleIds].filter((id) => !localRuleIds.has(id));
			const updateRules = allLocalRules.filter((r) => !r.id.startsWith("local-") && serverRuleIds.has(r.id));
			const createRules = allLocalRules.filter((r) => r.id.startsWith("local-"));
			await Promise.all([...deleteIds.map(async (id) => await api.deleteRule(id)), ...updateRules.map(async (r) => await api.updateRule(r.id, rulePayload(r)))]);
			for (const rule of createRules) await api.createRule(rulePayload(rule));
			await loadRules();
			return {
				createdCount: createRules.length,
				deletedCount: deleteIds.length,
				instanceRuleCount: instanceRules.value.length,
				projectRuleCount: projectRules.value.length
			};
		} finally {
			isLoading.value = false;
		}
	}
	return {
		instanceRules,
		projectRules,
		isLoading: computed(() => isLoading.value),
		isDirty: computed(() => isDirty.value),
		addRule,
		updateRule,
		deleteRule,
		reorder,
		loadRules,
		save,
		discardProjectRules
	};
}
//#endregion
//#region src/features/settings/sso/provisioning/components/RuleSectionHeader.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler();
var RuleSectionHeader_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "RuleSectionHeader",
	props: {
		title: {},
		description: {}
	},
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.header) }, [createBaseVNode("h3", { class: normalizeClass(_ctx.$style.title) }, toDisplayString(__props.title), 3), createBaseVNode("p", { class: normalizeClass(_ctx.$style.description) }, toDisplayString(__props.description), 3)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	header: "_header_w6bth_1",
	title: "_title_w6bth_8",
	description: "_description_w6bth_15"
} }]]);
//#endregion
//#region src/features/settings/sso/provisioning/components/ProjectRoleAssignmentSelect.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ProjectRoleAssignmentSelect_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ProjectRoleAssignmentSelect",
	props: /*@__PURE__*/ mergeModels({
		disabled: {
			type: Boolean,
			default: false
		},
		testId: { default: "project-role-assignment-select" }
	}, {
		"modelValue": { required: true },
		"modelModifiers": {}
	}),
	emits: ["update:modelValue"],
	setup(__props) {
		const modelValue = useModel(__props, "modelValue");
		const i18n = useI18n();
		const settingsStore = useSettingsStore();
		const rolesStore = useRolesStore();
		const hasCustomRolesLicense = computed(() => settingsStore.isCustomRolesFeatureEnabled);
		const canManageRoles = computed(() => hasPermission(["rbac"], { rbac: { scope: "role:manage" } }));
		const systemRoles = computed(() => rolesStore.processedProjectRoles.filter((role) => role.systemRole));
		const customRoles = computed(() => rolesStore.processedProjectRoles.filter((role) => !role.systemRole));
		const upgradeModalVisible = ref(false);
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("span", { class: normalizeClass(_ctx.$style.wrapper) }, [createVNode(RoleSelectDropdown_default, {
				"system-roles": systemRoles.value,
				"custom-roles": customRoles.value,
				"current-role": modelValue.value,
				"has-custom-roles-license": hasCustomRolesLicense.value,
				"can-manage-roles": canManageRoles.value,
				"add-custom-role-route-name": unref(VIEWS).PROJECT_NEW_ROLE,
				placeholder: unref(i18n).baseText("settings.sso.settings.roleMappingRules.selectRole"),
				variant: "default",
				disabled: __props.disabled,
				"test-id": __props.testId,
				"onUpdate:role": _cache[0] || (_cache[0] = ($event) => modelValue.value = $event),
				onSystemRoleUpgradeNeeded: _cache[1] || (_cache[1] = ($event) => upgradeModalVisible.value = true)
			}, null, 8, [
				"system-roles",
				"custom-roles",
				"current-role",
				"has-custom-roles-license",
				"can-manage-roles",
				"add-custom-role-route-name",
				"placeholder",
				"disabled",
				"test-id"
			]), createVNode(CustomRolesUpgradeModal_default, {
				modelValue: upgradeModalVisible.value,
				"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => upgradeModalVisible.value = $event)
			}, null, 8, ["modelValue"])], 2);
		};
	}
}), [["__cssModules", { "$style": { wrapper: "_wrapper_l938g_1" } }]]);
//#endregion
//#region src/features/settings/sso/provisioning/components/RuleMappingExpressionInput.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1$3 = ["data-placeholder"];
var RuleMappingExpressionInput_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "RuleMappingExpressionInput",
	props: {
		modelValue: {},
		placeholder: { default: "" },
		disabled: {
			type: Boolean,
			default: false
		}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const editorRef = ref();
		const expandedEditorRef = ref();
		const isEmpty = ref(true);
		const hasError = ref(false);
		const dialogVisible = ref(false);
		let editorView = null;
		let expandedEditorView = null;
		const mockClaims = new Proxy({}, { get: (_target, prop) => typeof prop === "symbol" ? void 0 : ["mock"] });
		function validateExpression(value) {
			if (!value.trim()) return true;
			const match = value.match(/^\{\{(.+)\}\}$/s);
			const jsContent = match ? match[1].trim() : value.trim();
			if (!jsContent) return true;
			try {
				new Function("$claims", "$oidc", "$saml", "$provider", `return (${jsContent})`)(mockClaims, {
					idToken: {},
					userInfo: {}
				}, { attributes: {} }, "oidc");
				return true;
			} catch {
				return false;
			}
		}
		const isResolvable = (node) => node.type.name === "Resolvable";
		const n8nParserWithNestedJs = parserWithMetaData.configure({ wrap: parseMixed((node) => {
			if (node.type.isTop) return null;
			return node.name === "Resolvable" ? {
				parser: javascriptLanguage.parser,
				overlay: isResolvable
			} : null;
		}) });
		const n8nLanguage = LRLanguage.define({ parser: n8nParserWithNestedJs });
		const bracketDecoMark = Decoration.mark({ class: "cm-expression-bracket" });
		function buildDecorations(view) {
			const decorations = [];
			syntaxTree(view.state).iterate({ enter(node) {
				if (node.name === "OpenMarker" || node.name === "CloseMarker") decorations.push(bracketDecoMark.range(node.from, node.to));
			} });
			return Decoration.set(decorations, true);
		}
		function createBracketPlugin() {
			return ViewPlugin.fromClass(class {
				decorations;
				constructor(view) {
					this.decorations = buildDecorations(view);
				}
				update(update) {
					if (update.docChanged || update.viewportChanged) this.decorations = buildDecorations(update.view);
				}
			}, { decorations: (v) => v.decorations });
		}
		const expressionHighlightStyle = HighlightStyle.define([
			{
				tag: tags.string,
				color: "var(--color--success--shade-1)"
			},
			{
				tag: tags.number,
				color: "var(--color--primary)"
			},
			{
				tag: tags.bool,
				color: "var(--color--primary)"
			},
			{
				tag: tags.keyword,
				color: "var(--color--primary--shade-1)"
			},
			{
				tag: tags.operator,
				color: "var(--color--text--shade-1)"
			},
			{
				tag: tags.propertyName,
				color: "var(--color--success)"
			},
			{
				tag: tags.variableName,
				color: "var(--color--text--shade-1)"
			},
			{
				tag: tags.function(tags.variableName),
				color: "var(--color--success--shade-1)"
			},
			{
				tag: tags.paren,
				color: "var(--color--text--tint-1)"
			},
			{
				tag: tags.punctuation,
				color: "var(--color--text--tint-1)"
			}
		]);
		const editorUpdateListener = EditorView.updateListener.of((update) => {
			if (update.docChanged) {
				const newValue = update.state.doc.toString();
				isEmpty.value = newValue.length === 0;
				hasError.value = !validateExpression(newValue);
				if (newValue !== props.modelValue) emit("update:modelValue", newValue);
			}
		});
		const sharedThemeRules = {
			".cm-content": {
				fontFamily: "var(--font-family--monospace)",
				color: "var(--input--color--text, var(--color--text--shade-1))",
				caretColor: "var(--code--caret--color)"
			},
			".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--code--caret--color)" },
			".cm-expression-bracket": {
				color: "var(--color--text--shade-1)",
				fontWeight: "700"
			}
		};
		function createInlineExtensions() {
			return [
				new LanguageSupport(n8nLanguage),
				syntaxHighlighting(expressionHighlightStyle),
				createBracketPlugin(),
				history(),
				keymap.of(historyKeymap),
				EditorState.readOnly.of(props.disabled),
				EditorView.theme({
					"&": {
						fontSize: "var(--font-size--sm)",
						borderWidth: "var(--border-width)",
						borderStyle: "var(--border-style)",
						borderColor: "var(--input--border-color, var(--border-color))",
						borderRadius: "var(--radius)",
						backgroundColor: "var(--color--foreground--tint-2)",
						height: "30px",
						width: "100%",
						padding: "0 0 0 var(--spacing--2xs)"
					},
					"&.cm-focused": {
						outline: "0 !important",
						borderColor: "var(--color--foreground--shade-1, var(--input--border-color))"
					},
					".cm-content": {
						fontFamily: "var(--font-family--monospace)",
						color: "var(--input--color--text, var(--color--text--shade-1))",
						caretColor: props.disabled ? "transparent" : "var(--code--caret--color)",
						padding: "0 !important",
						lineHeight: "28px"
					},
					".cm-line": {
						padding: "0 !important",
						whiteSpace: "nowrap",
						lineHeight: "28px"
					},
					".cm-scroller": {
						overflowX: "auto",
						overflowY: "hidden",
						display: "flex",
						alignItems: "center"
					},
					".cm-cursor, .cm-dropCursor": sharedThemeRules[".cm-cursor, .cm-dropCursor"],
					".cm-expression-bracket": sharedThemeRules[".cm-expression-bracket"]
				}),
				editorUpdateListener
			];
		}
		function createExpandedExtensions() {
			return [
				new LanguageSupport(n8nLanguage),
				syntaxHighlighting(expressionHighlightStyle),
				createBracketPlugin(),
				history(),
				keymap.of(historyKeymap),
				EditorView.lineWrapping,
				EditorView.theme({
					"&": {
						fontSize: "var(--font-size--xs)",
						borderWidth: "var(--border-width)",
						borderStyle: "var(--border-style)",
						borderColor: "var(--input--border-color, var(--border-color))",
						borderRadius: "var(--radius--lg)",
						backgroundColor: "var(--color--foreground--tint-2)",
						minHeight: "120px",
						width: "100%",
						padding: "var(--spacing--2xs) var(--spacing--xs)"
					},
					"&.cm-focused": {
						outline: "0 !important",
						borderColor: "var(--color--foreground--shade-1, var(--input--border-color))"
					},
					".cm-content": {
						fontFamily: "var(--font-family--monospace)",
						color: "var(--input--color--text, var(--color--text--shade-1))",
						caretColor: "var(--code--caret--color)",
						padding: "var(--spacing--4xs) 0"
					},
					".cm-line": { padding: "0" },
					".cm-scroller": {
						lineHeight: "1.68",
						overflow: "auto"
					},
					".cm-cursor, .cm-dropCursor": sharedThemeRules[".cm-cursor, .cm-dropCursor"],
					".cm-expression-bracket": sharedThemeRules[".cm-expression-bracket"]
				}),
				editorUpdateListener
			];
		}
		function openExpandedEditor() {
			dialogVisible.value = true;
		}
		async function mountExpandedEditor() {
			await nextTick();
			if (!expandedEditorRef.value) await nextTick();
			if (!expandedEditorRef.value || expandedEditorView) return;
			expandedEditorView = new EditorView({
				state: EditorState.create({
					doc: props.modelValue,
					extensions: createExpandedExtensions()
				}),
				parent: expandedEditorRef.value
			});
			expandedEditorView.focus();
		}
		watch(dialogVisible, (open) => {
			if (open) mountExpandedEditor();
		});
		function closeExpandedEditor() {
			dialogVisible.value = false;
			expandedEditorView?.destroy();
			expandedEditorView = null;
		}
		function onExpandedEditorOpenUpdate(open) {
			if (!open) closeExpandedEditor();
		}
		onMounted(() => {
			if (!editorRef.value) return;
			isEmpty.value = !props.modelValue;
			hasError.value = !validateExpression(props.modelValue);
			const state = EditorState.create({
				doc: props.modelValue,
				extensions: createInlineExtensions()
			});
			editorView = new EditorView({
				state,
				parent: editorRef.value
			});
		});
		onBeforeUnmount(() => {
			editorView?.destroy();
			editorView = null;
			expandedEditorView?.destroy();
			expandedEditorView = null;
		});
		watch(() => props.modelValue, (newVal) => {
			for (const view of [editorView, expandedEditorView]) {
				if (!view) continue;
				if (newVal !== view.state.doc.toString()) view.dispatch({ changes: {
					from: 0,
					to: view.state.doc.length,
					insert: newVal
				} });
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.wrapper) }, [
				createBaseVNode("div", {
					ref_key: "editorRef",
					ref: editorRef,
					class: normalizeClass([_ctx.$style.container, {
						[_ctx.$style.disabled]: __props.disabled,
						[_ctx.$style.empty]: isEmpty.value,
						[_ctx.$style.error]: hasError.value,
						[_ctx.$style.valid]: !isEmpty.value && !hasError.value
					}]),
					"data-placeholder": __props.placeholder ? `{{ ${__props.placeholder} }}` : "",
					"data-test-id": "rule-expression-input"
				}, null, 10, _hoisted_1$3),
				!__props.disabled ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					variant: "ghost",
					size: "mini",
					class: normalizeClass(_ctx.$style.expandButton),
					"aria-label": unref(i18n).baseText("expressionEdit.editExpression"),
					"data-test-id": "expression-expand-button",
					onClick: openExpandedEditor
				}, {
					default: withCtx(() => [..._cache[0] || (_cache[0] = [createBaseVNode("svg", {
						width: "9",
						height: "9",
						viewBox: "0 0 24 24",
						fill: "currentColor"
					}, [createBaseVNode("path", {
						d: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3",
						stroke: "currentColor",
						"stroke-width": "2",
						"stroke-linecap": "round",
						"stroke-linejoin": "round",
						fill: "none"
					})], -1)])]),
					_: 1
				}, 8, ["class", "aria-label"])) : createCommentVNode("", true),
				createVNode(unref(Dialog_default), {
					open: dialogVisible.value,
					size: "xlarge",
					header: unref(i18n).baseText("expressionEdit.editExpression"),
					"onUpdate:open": onExpandedEditorOpenUpdate
				}, {
					default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
						default: withCtx(() => [createBaseVNode("div", {
							ref_key: "expandedEditorRef",
							ref: expandedEditorRef,
							class: normalizeClass(_ctx.$style.expandedContainer)
						}, null, 2)]),
						_: 1
					})]),
					_: 1
				}, 8, ["open", "header"])
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	wrapper: "_wrapper_2rrxq_1",
	container: "_container_2rrxq_7",
	valid: "_valid_2rrxq_14",
	error: "_error_2rrxq_18",
	empty: "_empty_2rrxq_30",
	expandButton: "_expandButton_2rrxq_48",
	expandedContainer: "_expandedContainer_2rrxq_71",
	disabled: "_disabled_2rrxq_75"
} }]]);
//#endregion
//#region src/features/settings/sso/provisioning/components/RuleRow.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var RuleRow_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "RuleRow",
	props: {
		rule: {},
		priority: {},
		type: { default: "instance" },
		projects: { default: () => [] },
		disabled: {
			type: Boolean,
			default: false
		}
	},
	emits: [
		"update",
		"delete",
		"duplicate"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const selectedProjectNames = computed(() => {
			if (!props.rule.projectIds?.length) return "";
			return props.projects.filter((p) => props.rule.projectIds.includes(p.id)).map((p) => p.name).join(", ");
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass([_ctx.$style.row, { [_ctx.$style.disabled]: props.disabled }]),
				"data-test-id": "rule-row"
			}, [
				createBaseVNode("div", {
					class: normalizeClass([_ctx.$style.cellDrag, "drag-handle"]),
					"aria-label": "Reorder rule"
				}, [createVNode(unref(N8nIcon_default), {
					icon: "grip-vertical",
					size: "small",
					color: "text-light"
				})], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.cellPriority) }, toDisplayString(__props.priority) + ".", 3),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.cellCondition) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.label) }, "If", 2), createVNode(RuleMappingExpressionInput_default, {
					"model-value": props.rule.expression,
					disabled: props.disabled,
					placeholder: unref(i18n).baseText("settings.sso.settings.roleMappingRules.expression.placeholder"),
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => emit("update", props.rule.id, { expression: $event }))
				}, null, 8, [
					"model-value",
					"disabled",
					"placeholder"
				])], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.cellRole) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.label) }, "assign", 2), props.type !== "project" ? (openBlock(), createBlock(InstanceRoleAssignmentSelect_default, {
					key: 0,
					"model-value": props.rule.role,
					disabled: props.disabled,
					"test-id": "rule-role-select",
					"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => emit("update", props.rule.id, { role: $event }))
				}, null, 8, ["model-value", "disabled"])) : (openBlock(), createBlock(ProjectRoleAssignmentSelect_default, {
					key: 1,
					"model-value": props.rule.role,
					disabled: props.disabled,
					"test-id": "rule-role-select",
					"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => emit("update", props.rule.id, { role: $event }))
				}, null, 8, ["model-value", "disabled"]))], 2),
				props.type === "project" ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.cellProject)
				}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.label) }, "in", 2), createVNode(unref(N8nTooltip_default), {
					content: selectedProjectNames.value,
					disabled: !selectedProjectNames.value,
					placement: "top"
				}, {
					default: withCtx(() => [createVNode(unref(N8nSelect_default), {
						"model-value": props.rule.projectIds,
						size: "small",
						multiple: "",
						"collapse-tags": "",
						"collapse-tags-tooltip": false,
						disabled: props.disabled,
						placeholder: "Select proj...",
						"data-test-id": "rule-project-select",
						"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => emit("update", props.rule.id, { projectIds: $event ?? [] }))
					}, {
						default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(props.projects, (project) => {
							return openBlock(), createBlock(unref(N8nOption_default), {
								key: project.id,
								label: project.name,
								value: project.id
							}, null, 8, ["label", "value"]);
						}), 128))]),
						_: 1
					}, 8, ["model-value", "disabled"])]),
					_: 1
				}, 8, ["content", "disabled"])], 2)) : createCommentVNode("", true),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.cellAction) }, [createVNode(unref(N8nIcon_default), {
					icon: "copy",
					size: "small",
					color: "text-light",
					class: normalizeClass([_ctx.$style.actionIcon, { [_ctx.$style.disabledIcon]: props.disabled }]),
					"aria-label": "Duplicate rule",
					"data-test-id": "rule-copy-button",
					onClick: _cache[4] || (_cache[4] = ($event) => !props.disabled && emit("duplicate", props.rule.id))
				}, null, 8, ["class"])], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.cellAction) }, [createVNode(unref(N8nIcon_default), {
					icon: "trash-2",
					size: "small",
					color: "text-light",
					class: normalizeClass([_ctx.$style.actionIcon, { [_ctx.$style.disabledIcon]: props.disabled }]),
					"aria-label": "Delete rule",
					"data-test-id": "rule-delete-button",
					onClick: _cache[5] || (_cache[5] = ($event) => !props.disabled && emit("delete", props.rule.id))
				}, null, 8, ["class"])], 2)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	row: "_row_1foa3_1",
	cellDrag: "_cellDrag_1foa3_12",
	cellPriority: "_cellPriority_1foa3_25",
	cellCondition: "_cellCondition_1foa3_32",
	cellProject: "_cellProject_1foa3_41",
	cellRole: "_cellRole_1foa3_49",
	cellAction: "_cellAction_1foa3_57",
	actionIcon: "_actionIcon_1foa3_65",
	disabledIcon: "_disabledIcon_1foa3_72",
	disabled: "_disabled_1foa3_72",
	label: "_label_1foa3_85"
} }]]);
//#endregion
//#region src/features/settings/sso/provisioning/components/RuleList.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var RuleList_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "RuleList",
	props: {
		rules: {},
		fallbackRole: { default: ROLE.Member },
		type: { default: "instance" },
		projects: { default: () => [] },
		disabled: {
			type: Boolean,
			default: false
		}
	},
	emits: [
		"reorder",
		"update",
		"delete",
		"duplicate",
		"update:fallbackRole"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		function onDragEnd(event) {
			if (event.oldIndex !== void 0 && event.newIndex !== void 0 && event.oldIndex !== event.newIndex) emit("reorder", event.oldIndex, event.newIndex);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.table),
				"data-test-id": "rule-list"
			}, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerRow) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerCellFull) }, "Condition & Assignment", 2)], 2),
				createVNode(unref(draggableComponent), {
					"model-value": props.rules,
					"item-key": "id",
					handle: ".drag-handle",
					animation: 150,
					disabled: props.disabled,
					"drag-class": _ctx.$style.dragging,
					"ghost-class": _ctx.$style.ghost,
					"chosen-class": _ctx.$style.chosen,
					onEnd: onDragEnd
				}, {
					item: withCtx(({ element, index }) => [createVNode(RuleRow_default, {
						rule: element,
						priority: index + 1,
						type: props.type,
						projects: props.projects,
						disabled: props.disabled,
						onUpdate: _cache[0] || (_cache[0] = (id, patch) => emit("update", id, patch)),
						onDelete: _cache[1] || (_cache[1] = (id) => emit("delete", id)),
						onDuplicate: _cache[2] || (_cache[2] = (id) => emit("duplicate", id))
					}, null, 8, [
						"rule",
						"priority",
						"type",
						"projects",
						"disabled"
					])]),
					_: 1
				}, 8, [
					"model-value",
					"disabled",
					"drag-class",
					"ghost-class",
					"chosen-class"
				]),
				props.type !== "project" ? (openBlock(), createBlock(DefaultConditionRow_default, {
					key: 0,
					"model-value": props.fallbackRole,
					label: unref(i18n).baseText("settings.sso.settings.roleMappingRules.defaultCondition.instance"),
					disabled: props.disabled,
					"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => emit("update:fallbackRole", String($event)))
				}, null, 8, [
					"model-value",
					"label",
					"disabled"
				])) : (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.defaultRow)
				}, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.defaultCellIcon) }, [createVNode(unref(N8nIcon_default), {
						icon: "lock",
						size: "small",
						color: "text-light"
					})], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.defaultCellText) }, toDisplayString(unref(i18n).baseText("settings.sso.settings.roleMappingRules.defaultCondition.project")), 3),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.defaultCellSpacer) }, null, 2)
				], 2))
			], 2);
		};
	}
});
var RuleList_default = /*#__PURE__*/ _plugin_vue_export_helper_default(RuleList_vue_vue_type_script_setup_true_lang_default, [["__cssModules", { "$style": {
	table: "_table_1iz2h_1",
	headerRow: "_headerRow_1iz2h_7",
	headerCellFull: "_headerCellFull_1iz2h_15",
	defaultRow: "_defaultRow_1iz2h_23",
	defaultCellIcon: "_defaultCellIcon_1iz2h_31",
	defaultCellText: "_defaultCellText_1iz2h_40",
	defaultCellSpacer: "_defaultCellSpacer_1iz2h_48",
	ghost: "_ghost_1iz2h_53",
	chosen: "_chosen_1iz2h_57",
	dragging: "_dragging_1iz2h_61"
} }]]);
//#endregion
//#region src/features/settings/sso/provisioning/components/RoleMappingRuleEditor.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var RoleMappingRuleEditor_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "RoleMappingRuleEditor",
	props: /*@__PURE__*/ mergeModels({ showProjectRules: {
		type: Boolean,
		default: true
	} }, {
		"defaultInstanceRole": { required: true },
		"defaultInstanceRoleModifiers": {}
	}),
	emits: ["update:defaultInstanceRole"],
	setup(__props, { expose: __expose }) {
		const props = __props;
		const defaultInstanceRole = useModel(__props, "defaultInstanceRole");
		const i18n = useI18n();
		const rbacStore = useRBACStore();
		const rolesStore = useRolesStore();
		const projectsStore = useProjectsStore();
		const canEdit = computed(() => rbacStore.hasScope("roleMappingRule:create"));
		const teamProjectOptions = computed(() => projectsStore.teamProjects.map((p) => ({
			id: p.id,
			name: p.name ?? ""
		})));
		const { instanceRules, projectRules, isDirty, addRule, updateRule, deleteRule, reorder, loadRules, save, discardProjectRules } = useRoleMappingRules();
		function duplicateRule(id) {
			const source = [...instanceRules.value, ...projectRules.value].find((r) => r.id === id);
			if (!source) return;
			addRule(source.type);
			const rules = source.type === "instance" ? instanceRules : projectRules;
			const newRule = rules.value[rules.value.length - 1];
			updateRule(newRule.id, {
				expression: source.expression,
				role: source.role,
				projectIds: [...source.projectIds]
			});
		}
		onMounted(async () => {
			await Promise.all([
				loadRules(),
				rolesStore.fetchRoles(),
				projectsStore.getAllProjects()
			]);
		});
		__expose({
			isDirty,
			save,
			discardProjectRules
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.editor),
				"data-test-id": "role-mapping-rule-editor"
			}, [
				createVNode(RuleSectionHeader_default, {
					title: unref(i18n).baseText("settings.sso.settings.roleMappingRules.instanceRules.title"),
					description: unref(i18n).baseText("settings.sso.settings.roleMappingRules.instanceRules.description")
				}, null, 8, ["title", "description"]),
				createVNode(RuleList_default, {
					type: "instance",
					rules: unref(instanceRules),
					"fallback-role": defaultInstanceRole.value,
					disabled: !canEdit.value,
					onReorder: _cache[0] || (_cache[0] = (from, to) => unref(reorder)("instance", from, to)),
					onUpdate: unref(updateRule),
					onDelete: unref(deleteRule),
					onDuplicate: duplicateRule,
					"onUpdate:fallbackRole": _cache[1] || (_cache[1] = ($event) => defaultInstanceRole.value = $event)
				}, null, 8, [
					"rules",
					"fallback-role",
					"disabled",
					"onUpdate",
					"onDelete"
				]),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.addButtonRow) }, [createVNode(unref(N8nButton_default), {
					variant: "outline",
					size: "small",
					icon: "plus",
					disabled: !canEdit.value,
					"data-test-id": "add-instance-rule-button",
					onClick: _cache[2] || (_cache[2] = ($event) => unref(addRule)("instance"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sso.settings.roleMappingRules.addRule")), 1)]),
					_: 1
				}, 8, ["disabled"])], 2),
				props.showProjectRules ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
					createBaseVNode("hr", { class: normalizeClass(_ctx.$style.sectionDivider) }, null, 2),
					createVNode(RuleSectionHeader_default, {
						title: unref(i18n).baseText("settings.sso.settings.roleMappingRules.projectRules.title"),
						description: unref(i18n).baseText("settings.sso.settings.roleMappingRules.projectRules.description")
					}, null, 8, ["title", "description"]),
					createVNode(RuleList_default, {
						type: "project",
						rules: unref(projectRules),
						projects: teamProjectOptions.value,
						disabled: !canEdit.value,
						onReorder: _cache[3] || (_cache[3] = (from, to) => unref(reorder)("project", from, to)),
						onUpdate: unref(updateRule),
						onDelete: unref(deleteRule),
						onDuplicate: duplicateRule
					}, null, 8, [
						"rules",
						"projects",
						"disabled",
						"onUpdate",
						"onDelete"
					]),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.addButtonRow) }, [createVNode(unref(N8nButton_default), {
						variant: "outline",
						size: "small",
						icon: "plus",
						disabled: !canEdit.value,
						"data-test-id": "add-project-rule-button",
						onClick: _cache[4] || (_cache[4] = ($event) => unref(addRule)("project"))
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sso.settings.roleMappingRules.addRule")), 1)]),
						_: 1
					}, 8, ["disabled"])], 2)
				], 64)) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	editor: "_editor_3vbfy_1",
	addButtonRow: "_addButtonRow_3vbfy_5",
	sectionDivider: "_sectionDivider_3vbfy_11"
} }]]);
//#endregion
//#region src/features/settings/sso/components/SamlSettingsForm.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$2 = { key: 0 };
var _hoisted_2$1 = { key: 1 };
var SamlSettingsForm_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SamlSettingsForm",
	setup(__props, { expose: __expose }) {
		const i18n = useI18n();
		const ssoStore = useSSOStore();
		const telemetry = useTelemetry();
		const toast = useToast();
		const message = useMessage();
		const clipboard = useClipboard();
		const redirectUrlCopied = ref(false);
		const entityIdCopied = ref(false);
		async function handleCopy(value, field) {
			await clipboard.copy(value);
			if (field === "redirectUrl") {
				redirectUrlCopied.value = true;
				setTimeout(() => redirectUrlCopied.value = false, 2e3);
			} else if (field === "entityId") {
				entityIdCopied.value = true;
				setTimeout(() => entityIdCopied.value = false, 2e3);
			}
		}
		const isSsoManagedByEnv = computed(() => ssoStore.ssoManagedByEnv);
		const isRulesMappingInN8n = computed(() => mappingMethod.value === "rules_in_n8n");
		const savingForm = ref(false);
		const roleMappingRuleEditorRef = ref(null);
		const redirectUrl = ref();
		const samlLoginEnabled = ref(false);
		const IdentityProviderSettingsType = {
			URL: "url",
			XML: "xml"
		};
		const ipsOptions = ref([{
			label: i18n.baseText("settings.sso.settings.ips.options.url"),
			value: IdentityProviderSettingsType.URL
		}, {
			label: i18n.baseText("settings.sso.settings.ips.options.xml"),
			value: IdentityProviderSettingsType.XML
		}]);
		const ipsType = ref(IdentityProviderSettingsType.URL);
		const metadataUrl = ref();
		const metadata = ref();
		const entityId = ref();
		const showUserRoleProvisioningDialog = ref(false);
		const { roleAssignment, mappingMethod, defaultInstanceRole, isUserRoleProvisioningChanged, saveProvisioningConfig, trackProvisioningChange, roleAssignmentTransition, storedHasProjectRoles, isDroppingProjectRules, revertRoleAssignment } = useUserRoleProvisioningForm(SupportedProtocols.SAML);
		async function loadSamlConfig() {
			if (!ssoStore.isEnterpriseSamlEnabled) return;
			try {
				await getSamlConfig();
			} catch (error) {
				toast.showError(error, "error");
			}
		}
		const getSamlConfig = async () => {
			const config = await ssoStore.getSamlConfig();
			entityId.value = config?.entityID;
			redirectUrl.value = config?.returnUrl;
			if (config?.metadataUrl) ipsType.value = IdentityProviderSettingsType.URL;
			else if (config?.metadata) ipsType.value = IdentityProviderSettingsType.XML;
			metadata.value = config?.metadata;
			metadataUrl.value = config?.metadataUrl;
			samlLoginEnabled.value = config.loginEnabled ?? false;
		};
		const isSaveEnabled = computed(() => {
			if (savingForm.value) return false;
			const isIdentityProviderChanged = () => {
				if (ipsType.value === IdentityProviderSettingsType.URL) return !!metadataUrl.value && metadataUrl.value !== ssoStore.samlConfig?.metadataUrl;
				else if (ipsType.value === IdentityProviderSettingsType.XML) return !!metadata.value && metadata.value !== ssoStore.samlConfig?.metadata;
				return false;
			};
			const isSamlLoginEnabledChanged = ssoStore.isSamlLoginEnabled !== samlLoginEnabled.value;
			const isRuleMappingDirty = roleMappingRuleEditorRef.value?.isDirty ?? false;
			return isUserRoleProvisioningChanged.value || isIdentityProviderChanged() || isSamlLoginEnabledChanged || isRuleMappingDirty;
		});
		const isTestEnabled = computed(() => {
			if (ipsType.value === IdentityProviderSettingsType.URL) return !!metadataUrl.value;
			else if (ipsType.value === IdentityProviderSettingsType.XML) return !!metadata.value;
			return false;
		});
		const sendTrackingEvent = (config) => {
			if (!config) {
				captureMessage("Single Sign-On SAML: telemtetry data undefined on submit", { level: "error" });
				return;
			}
			telemetry.track(TELEMETRY_EVENT.SSO.USER_UPDATED_SSO_SETTINGS, {
				instance_id: useRootStore().instanceId,
				authentication_method: SupportedProtocols.SAML,
				identity_provider: config.metadataUrl ? "metadata" : "xml",
				is_active: config.loginEnabled ?? false
			});
		};
		const promptConfirmDisablingSamlLogin = async () => {
			return await message.confirm(i18n.baseText("settings.sso.confirmMessage.beforeSaveForm.message", { interpolate: { protocol: "SAML" } }), i18n.baseText("settings.sso.confirmMessage.beforeSaveForm.headline", { interpolate: { protocol: "SAML" } }), {
				cancelButtonText: i18n.baseText("settings.ldap.confirmMessage.beforeSaveForm.cancelButtonText"),
				confirmButtonText: i18n.baseText("settings.ldap.confirmMessage.beforeSaveForm.confirmButtonText")
			});
		};
		const prompTestSamlConnectionBeforeActivating = async () => {
			const promptOpeningTestConnectionPage = await message.confirm(i18n.baseText("settings.sso.settings.save.testConnection.message"), i18n.baseText("settings.sso.settings.save.testConnection.title"), {
				confirmButtonText: i18n.baseText("settings.sso.settings.save.testConnection.test"),
				cancelButtonText: i18n.baseText("settings.sso.settings.save.activate.cancel")
			});
			if (promptOpeningTestConnectionPage === "confirm") {
				await onTest();
				return await message.confirm(i18n.baseText("settings.sso.settings.save.confirmTestConnection.message"), i18n.baseText("settings.sso.settings.save.confirmTestConnection.title"), {
					confirmButtonText: i18n.baseText("settings.sso.settings.save.confirmTestConnection.confirm"),
					cancelButtonText: i18n.baseText("settings.sso.settings.save.activate.cancel")
				});
			}
			return promptOpeningTestConnectionPage;
		};
		const onSave = async (provisioningChangesConfirmed = false) => {
			if (isSsoManagedByEnv.value) try {
				savingForm.value = true;
				const ruleSaveResult = await roleMappingRuleEditorRef.value?.save();
				trackProvisioningChange({ configChanged: false }, ruleSaveResult);
				toast.showMessage({
					title: i18n.baseText("settings.sso.settings.save.success"),
					type: "success"
				});
				return true;
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.sso.settings.save.error"));
				return false;
			} finally {
				savingForm.value = false;
			}
			try {
				savingForm.value = true;
				validateSamlInput();
				const isDisablingSamlLogin = samlLoginEnabled.value !== ssoStore.isSamlLoginEnabled && ssoStore.isSamlLoginEnabled === true;
				if (isDisablingSamlLogin) {
					if (await promptConfirmDisablingSamlLogin() !== "confirm") return false;
				}
				if (!provisioningChangesConfirmed && roleAssignmentTransition.value !== "none") {
					showUserRoleProvisioningDialog.value = true;
					return false;
				}
				showUserRoleProvisioningDialog.value = false;
				const metaDataConfig = ipsType.value === IdentityProviderSettingsType.URL ? { metadataUrl: metadataUrl.value } : { metadata: metadata.value };
				if (!ssoStore.isSamlLoginEnabled && samlLoginEnabled.value) {
					await ssoStore.saveSamlConfig(metaDataConfig);
					if (await prompTestSamlConnectionBeforeActivating() !== "confirm") return false;
				}
				const configResponse = await ssoStore.saveSamlConfig({
					...metaDataConfig,
					loginEnabled: samlLoginEnabled.value
				});
				const provisioningResult = await saveProvisioningConfig(isDisablingSamlLogin);
				if ((isDisablingSamlLogin ? "manual" : roleAssignment.value) !== "instance_and_project") roleMappingRuleEditorRef.value?.discardProjectRules();
				const ruleSaveResult = mappingMethod.value === "rules_in_n8n" ? await roleMappingRuleEditorRef.value?.save() : void 0;
				trackProvisioningChange(provisioningResult, ruleSaveResult);
				ssoStore.selectedAuthProtocol = SupportedProtocols.SAML;
				await getSamlConfig();
				sendTrackingEvent(configResponse);
				toast.showMessage({
					title: i18n.baseText("settings.sso.settings.save.success"),
					type: "success"
				});
				return true;
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.sso.settings.save.error"));
				return false;
			} finally {
				savingForm.value = false;
			}
		};
		const onTest = async () => {
			try {
				const metaDataConfig = ipsType.value === IdentityProviderSettingsType.URL ? { metadataUrl: metadataUrl.value } : { metadata: metadata.value };
				const url = await ssoStore.testSamlConfig(metaDataConfig);
				if (typeof window !== "undefined") openSafeUrl(url);
			} catch (error) {
				toast.showError(error, "error");
			}
		};
		const validateSamlInput = () => {
			if (ipsType.value === IdentityProviderSettingsType.URL) try {
				const parsedUrl = new URL(metadataUrl.value);
				if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") throw new Error("The provided protocol is not supported");
			} catch (error) {
				throw new Error(i18n.baseText("settings.sso.settings.ips.url.invalid"));
			}
		};
		__expose({
			hasUnsavedChanges: computed(() => isSaveEnabled.value && (!isSsoManagedByEnv.value || isRulesMappingInN8n.value)),
			onSave,
			saving: savingForm,
			isTestEnabled,
			onTest
		});
		onMounted(async () => {
			await loadSamlConfig();
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [
				createBaseVNode("div", { class: normalizeClass([_ctx.$style.card, _ctx.$style.firstCard]) }, [
					renderSlot(_ctx.$slots, "protocol-select"),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.settingsItem) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.settingsItemLabel) }, [createBaseVNode("label", null, toDisplayString(unref(i18n).baseText("settings.sso.settings.redirectUrl.label")), 1), createBaseVNode("small", null, toDisplayString(unref(i18n).baseText("settings.sso.settings.redirectUrl.help")), 1)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.settingsItemControl) }, [createBaseVNode("div", {
						class: normalizeClass(_ctx.$style.copyInputGroup),
						"data-test-id": "copy-input"
					}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.copyInputField) }, [createVNode(unref(Input_default), {
						"model-value": redirectUrl.value,
						type: "text",
						readonly: true
					}, null, 8, ["model-value"])], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.copyButtonWrapper) }, [createVNode(unref(N8nButton_default), {
						variant: "outline",
						"icon-only": "",
						icon: redirectUrlCopied.value ? "check" : "copy",
						onClick: _cache[0] || (_cache[0] = ($event) => handleCopy(redirectUrl.value, "redirectUrl"))
					}, null, 8, ["icon"])], 2)], 2)], 2)], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.settingsItem) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.settingsItemLabel) }, [createBaseVNode("label", null, toDisplayString(unref(i18n).baseText("settings.sso.settings.entityId.label")), 1), createBaseVNode("small", null, toDisplayString(unref(i18n).baseText("settings.sso.settings.entityId.help")), 1)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.settingsItemControl) }, [createBaseVNode("div", {
						class: normalizeClass(_ctx.$style.copyInputGroup),
						"data-test-id": "copy-input"
					}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.copyInputField) }, [createVNode(unref(Input_default), {
						"model-value": entityId.value,
						type: "text",
						readonly: true
					}, null, 8, ["model-value"])], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.copyButtonWrapper) }, [createVNode(unref(N8nButton_default), {
						variant: "outline",
						"icon-only": "",
						icon: entityIdCopied.value ? "check" : "copy",
						onClick: _cache[1] || (_cache[1] = ($event) => handleCopy(entityId.value, "entityId"))
					}, null, 8, ["icon"])], 2)], 2)], 2)], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.ipsBlock) }, [
						createBaseVNode("div", { class: normalizeClass([_ctx.$style.settingsItem, _ctx.$style.settingsItemNoBorder]) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.settingsItemLabel) }, [createBaseVNode("label", null, toDisplayString(unref(i18n).baseText("settings.sso.settings.ips.label")), 1)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.settingsItemControl) }, [createVNode(unref(N8nSegmentControl_default), {
							modelValue: ipsType.value,
							"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => ipsType.value = $event),
							disabled: isSsoManagedByEnv.value,
							options: ipsOptions.value
						}, null, 8, [
							"modelValue",
							"disabled",
							"options"
						])], 2)], 2),
						ipsType.value === IdentityProviderSettingsType.URL ? (openBlock(), createElementBlock("div", _hoisted_1$2, [createVNode(unref(Input_default), {
							modelValue: metadataUrl.value,
							"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => metadataUrl.value = $event),
							disabled: isSsoManagedByEnv.value,
							type: "text",
							name: "metadataUrl",
							size: "large",
							placeholder: unref(i18n).baseText("settings.sso.settings.ips.url.placeholder"),
							"data-test-id": "sso-provider-url"
						}, null, 8, [
							"modelValue",
							"disabled",
							"placeholder"
						]), createBaseVNode("small", null, toDisplayString(unref(i18n).baseText("settings.sso.settings.ips.url.help")), 1)])) : createCommentVNode("", true),
						ipsType.value === IdentityProviderSettingsType.XML ? (openBlock(), createElementBlock("div", _hoisted_2$1, [createVNode(unref(Input_default), {
							modelValue: metadata.value,
							"onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => metadata.value = $event),
							disabled: isSsoManagedByEnv.value,
							type: "textarea",
							name: "metadata",
							rows: 4,
							"data-test-id": "sso-provider-xml"
						}, null, 8, ["modelValue", "disabled"]), createBaseVNode("small", null, toDisplayString(unref(i18n).baseText("settings.sso.settings.ips.xml.help")), 1)])) : createCommentVNode("", true)
					], 2)
				], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.card) }, [
					createVNode(UserRoleProvisioningDropdown_default, {
						"role-assignment": unref(roleAssignment),
						"onUpdate:roleAssignment": _cache[5] || (_cache[5] = ($event) => isRef(roleAssignment) ? roleAssignment.value = $event : null),
						"mapping-method": unref(mappingMethod),
						"onUpdate:mappingMethod": _cache[6] || (_cache[6] = ($event) => isRef(mappingMethod) ? mappingMethod.value = $event : null),
						"default-instance-role": unref(defaultInstanceRole),
						"onUpdate:defaultInstanceRole": _cache[7] || (_cache[7] = ($event) => isRef(defaultInstanceRole) ? defaultInstanceRole.value = $event : null),
						disabled: isSsoManagedByEnv.value,
						"auth-protocol": "saml"
					}, null, 8, [
						"role-assignment",
						"mapping-method",
						"default-instance-role",
						"disabled"
					]),
					unref(mappingMethod) === "rules_in_n8n" ? (openBlock(), createBlock(RoleMappingRuleEditor_default, {
						key: 0,
						ref_key: "roleMappingRuleEditorRef",
						ref: roleMappingRuleEditorRef,
						"default-instance-role": unref(defaultInstanceRole),
						"onUpdate:defaultInstanceRole": _cache[8] || (_cache[8] = ($event) => isRef(defaultInstanceRole) ? defaultInstanceRole.value = $event : null),
						"show-project-rules": unref(roleAssignment) === "instance_and_project"
					}, null, 8, ["default-instance-role", "show-project-rules"])) : createCommentVNode("", true),
					createVNode(ConfirmProvisioningDialog_default, {
						modelValue: showUserRoleProvisioningDialog.value,
						"onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => showUserRoleProvisioningDialog.value = $event),
						"transition-type": unref(roleAssignmentTransition),
						"show-project-roles-csv": unref(storedHasProjectRoles) || unref(roleAssignment) === "instance_and_project",
						"will-delete-project-rules": unref(isDroppingProjectRules),
						"auth-protocol": "saml",
						onConfirmProvisioning: _cache[10] || (_cache[10] = ($event) => onSave(true)),
						onCancel: _cache[11] || (_cache[11] = ($event) => {
							unref(revertRoleAssignment)();
							showUserRoleProvisioningDialog.value = false;
						})
					}, null, 8, [
						"modelValue",
						"transition-type",
						"show-project-roles-csv",
						"will-delete-project-rules"
					])
				], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.card) }, [createBaseVNode("div", { class: normalizeClass([_ctx.$style.settingsItem, _ctx.$style.settingsItemNoBorder]) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.settingsItemLabel) }, [createBaseVNode("label", null, toDisplayString(unref(i18n).baseText("settings.sso.settings.ssoToggle.label")), 1), createBaseVNode("small", null, toDisplayString(unref(i18n).baseText("settings.sso.settings.ssoToggle.description")), 1)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.settingsItemControl) }, [createVNode(unref(N8nSelect_default), {
					"model-value": samlLoginEnabled.value ? "enabled" : "disabled",
					size: "medium",
					disabled: isSsoManagedByEnv.value,
					"data-test-id": "sso-toggle",
					"onUpdate:modelValue": _cache[12] || (_cache[12] = ($event) => samlLoginEnabled.value = $event === "enabled")
				}, {
					prefix: withCtx(() => [samlLoginEnabled.value ? (openBlock(), createElementBlock("span", {
						key: 0,
						class: normalizeClass(_ctx.$style.greenDot)
					}, null, 2)) : createCommentVNode("", true)]),
					default: withCtx(() => [createVNode(unref(N8nOption_default), {
						value: "enabled",
						label: unref(i18n).baseText("settings.sso.settings.ssoToggle.enabled")
					}, null, 8, ["label"]), createVNode(unref(N8nOption_default), {
						value: "disabled",
						label: unref(i18n).baseText("settings.sso.settings.ssoToggle.disabled")
					}, null, 8, ["label"])]),
					_: 1
				}, 8, ["model-value", "disabled"])], 2)], 2)], 2)
			]);
		};
	}
}), [["__cssModules", { "$style": sso_form_module_scss_vue_type_style_index_0_src_true_lang_module_default }]]);
//#endregion
//#region src/features/settings/sso/components/OidcSettingsForm.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = { key: 1 };
var OidcSettingsForm_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "OidcSettingsForm",
	setup(__props, { expose: __expose }) {
		const i18n = useI18n();
		const ssoStore = useSSOStore();
		const telemetry = useTelemetry();
		const toast = useToast();
		const message = useMessage();
		const savingForm = ref(false);
		const roleMappingRuleEditorRef = ref(null);
		const isSsoManagedByEnv = computed(() => ssoStore.ssoManagedByEnv);
		const isRulesMappingInN8n = computed(() => mappingMethod.value === "rules_in_n8n");
		const discoveryEndpoint = ref("");
		const clientId = ref("");
		const clientSecret = ref("");
		const showUserRoleProvisioningDialog = ref(false);
		const { roleAssignment, mappingMethod, defaultInstanceRole, isUserRoleProvisioningChanged, saveProvisioningConfig, trackProvisioningChange, roleAssignmentTransition, storedHasProjectRoles, isDroppingProjectRules, revertRoleAssignment } = useUserRoleProvisioningForm(SupportedProtocols.OIDC);
		const prompt = ref("select_account");
		const handlePromptChange = (value) => {
			prompt.value = value;
		};
		const promptDescriptions = [
			{
				label: i18n.baseText("settings.sso.settings.oidc.prompt.login"),
				value: "login"
			},
			{
				label: i18n.baseText("settings.sso.settings.oidc.prompt.none"),
				value: "none"
			},
			{
				label: i18n.baseText("settings.sso.settings.oidc.prompt.consent"),
				value: "consent"
			},
			{
				label: i18n.baseText("settings.sso.settings.oidc.prompt.select_account"),
				value: "select_account"
			},
			{
				label: i18n.baseText("settings.sso.settings.oidc.prompt.create"),
				value: "create"
			}
		];
		const authenticationContextClassReference = ref("");
		const additionalScopes = ref("");
		const rpInitiatedLogoutEnabled = ref(false);
		const isAdditionalScopesInvalid = computed(() => [",", ";"].some((c) => additionalScopes.value.includes(c)));
		const getOidcConfig = async () => {
			const config = await ssoStore.getOidcConfig();
			clientId.value = config.clientId;
			clientSecret.value = config.clientSecret;
			discoveryEndpoint.value = config.discoveryEndpoint;
			prompt.value = config.prompt ?? "select_account";
			authenticationContextClassReference.value = config.authenticationContextClassReference?.join(",") || "";
			additionalScopes.value = config.additionalScopes ?? "";
			rpInitiatedLogoutEnabled.value = config.rpInitiatedLogoutEnabled ?? false;
		};
		const loadOidcConfig = async () => {
			if (!ssoStore.isEnterpriseOidcEnabled) return;
			try {
				await getOidcConfig();
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.sso.settings.save.error_oidc"));
			}
		};
		const cannotSaveOidcSettings = computed(() => {
			const currentAcrString = authenticationContextClassReference.value.split(",").map((s) => s.trim()).filter(Boolean).join(",");
			const storedAcrString = ssoStore.oidcConfig?.authenticationContextClassReference?.join(",") || "";
			const isRuleMappingDirty = roleMappingRuleEditorRef.value?.isDirty ?? false;
			return isAdditionalScopesInvalid.value || ssoStore.oidcConfig?.clientId === clientId.value && ssoStore.oidcConfig?.clientSecret === clientSecret.value && ssoStore.oidcConfig?.discoveryEndpoint === discoveryEndpoint.value && ssoStore.oidcConfig?.loginEnabled === ssoStore.isOidcLoginEnabled && ssoStore.oidcConfig?.prompt === prompt.value && ssoStore.oidcConfig?.additionalScopes === additionalScopes.value && ssoStore.oidcConfig?.rpInitiatedLogoutEnabled === rpInitiatedLogoutEnabled.value && !isUserRoleProvisioningChanged.value && !isRuleMappingDirty && storedAcrString === authenticationContextClassReference.value && currentAcrString === storedAcrString;
		});
		async function onOidcSettingsSave(provisioningChangesConfirmed = false) {
			if (isSsoManagedByEnv.value) try {
				savingForm.value = true;
				const ruleSaveResult = await roleMappingRuleEditorRef.value?.save();
				trackProvisioningChange({ configChanged: false }, ruleSaveResult);
				toast.showMessage({
					title: i18n.baseText("settings.sso.settings.save.success"),
					type: "success"
				});
				return true;
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.sso.settings.save.error_oidc"));
				return false;
			} finally {
				savingForm.value = false;
			}
			if (!provisioningChangesConfirmed && roleAssignmentTransition.value !== "none") {
				showUserRoleProvisioningDialog.value = true;
				return false;
			}
			const isDisablingOidcLogin = ssoStore.oidcConfig?.loginEnabled !== ssoStore.isOidcLoginEnabled && ssoStore.oidcConfig?.loginEnabled === true;
			if (isDisablingOidcLogin) {
				if (await message.confirm(i18n.baseText("settings.sso.confirmMessage.beforeSaveForm.message", { interpolate: { protocol: "OIDC" } }), i18n.baseText("settings.sso.confirmMessage.beforeSaveForm.headline", { interpolate: { protocol: "OIDC" } }), {
					cancelButtonText: i18n.baseText("settings.ldap.confirmMessage.beforeSaveForm.cancelButtonText"),
					confirmButtonText: i18n.baseText("settings.ldap.confirmMessage.beforeSaveForm.confirmButtonText")
				}) !== "confirm") return false;
			}
			const acrArray = authenticationContextClassReference.value.split(",").map((s) => s.trim()).filter(Boolean);
			try {
				savingForm.value = true;
				const newConfig = await ssoStore.saveOidcConfig({
					clientId: clientId.value,
					clientSecret: clientSecret.value,
					discoveryEndpoint: discoveryEndpoint.value,
					prompt: prompt.value,
					loginEnabled: ssoStore.isOidcLoginEnabled,
					authenticationContextClassReference: acrArray,
					additionalScopes: additionalScopes.value,
					rpInitiatedLogoutEnabled: rpInitiatedLogoutEnabled.value
				});
				const provisioningResult = await saveProvisioningConfig(isDisablingOidcLogin);
				if ((isDisablingOidcLogin ? "manual" : roleAssignment.value) !== "instance_and_project") roleMappingRuleEditorRef.value?.discardProjectRules();
				const ruleSaveResult = mappingMethod.value === "rules_in_n8n" ? await roleMappingRuleEditorRef.value?.save() : void 0;
				trackProvisioningChange(provisioningResult, ruleSaveResult);
				showUserRoleProvisioningDialog.value = false;
				ssoStore.selectedAuthProtocol = SupportedProtocols.OIDC;
				clientSecret.value = newConfig.clientSecret;
				sendTrackingEvent(newConfig);
				toast.showMessage({
					title: i18n.baseText("settings.sso.settings.save.success"),
					type: "success"
				});
				return true;
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.sso.settings.save.error_oidc"));
				return false;
			} finally {
				await getOidcConfig();
				savingForm.value = false;
			}
		}
		function sendTrackingEvent(config) {
			telemetry.track(TELEMETRY_EVENT.SSO.USER_UPDATED_SSO_SETTINGS, {
				instance_id: useRootStore().instanceId,
				authentication_method: SupportedProtocols.OIDC,
				discovery_endpoint: config.discoveryEndpoint,
				is_active: config.loginEnabled
			});
		}
		const isTestEnabled = computed(() => !!ssoStore.oidcConfig?.discoveryEndpoint && ssoStore.oidcConfig.discoveryEndpoint !== "" && !!ssoStore.oidcConfig?.clientId && !!ssoStore.oidcConfig?.clientSecret);
		const onTest = async () => {
			try {
				const { url } = await ssoStore.testOidcConfig();
				if (typeof window !== "undefined") openSafeUrl(url);
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.sso.settings.test.error"));
			}
		};
		__expose({
			hasUnsavedChanges: computed(() => !cannotSaveOidcSettings.value && !savingForm.value && (!isSsoManagedByEnv.value || isRulesMappingInN8n.value)),
			onSave: onOidcSettingsSave,
			saving: savingForm,
			isTestEnabled,
			onTest
		});
		onMounted(async () => {
			await loadOidcConfig();
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [
				createBaseVNode("div", { class: normalizeClass([_ctx.$style.card, _ctx.$style.firstCard]) }, [
					renderSlot(_ctx.$slots, "protocol-select"),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.group) }, [
						_cache[14] || (_cache[14] = createBaseVNode("label", null, "Redirect URL", -1)),
						createVNode(CopyInput_default, {
							value: unref(ssoStore).oidc.callbackUrl,
							"copy-button-text": unref(i18n).baseText("generic.clickToCopy"),
							"toast-title": "Redirect URL copied to clipboard"
						}, null, 8, ["value", "copy-button-text"]),
						_cache[15] || (_cache[15] = createBaseVNode("small", null, "Copy the Redirect URL to configure your OIDC provider ", -1))
					], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.group) }, [
						_cache[16] || (_cache[16] = createBaseVNode("label", null, "Discovery Endpoint", -1)),
						createVNode(unref(Input_default), {
							"model-value": discoveryEndpoint.value,
							disabled: isSsoManagedByEnv.value,
							type: "text",
							"data-test-id": "oidc-discovery-endpoint",
							placeholder: "https://accounts.google.com/.well-known/openid-configuration",
							"onUpdate:modelValue": _cache[0] || (_cache[0] = (v) => discoveryEndpoint.value = v)
						}, null, 8, ["model-value", "disabled"]),
						_cache[17] || (_cache[17] = createBaseVNode("small", null, "Paste here your discovery endpoint", -1))
					], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.group) }, [
						_cache[18] || (_cache[18] = createBaseVNode("label", null, "Client ID", -1)),
						createVNode(unref(Input_default), {
							"model-value": clientId.value,
							disabled: isSsoManagedByEnv.value,
							type: "text",
							"data-test-id": "oidc-client-id",
							"onUpdate:modelValue": _cache[1] || (_cache[1] = (v) => clientId.value = v)
						}, null, 8, ["model-value", "disabled"]),
						_cache[19] || (_cache[19] = createBaseVNode("small", null, "The client ID you received when registering your application with your provider", -1))
					], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.group) }, [
						_cache[20] || (_cache[20] = createBaseVNode("label", null, "Client Secret", -1)),
						createVNode(unref(Input_default), {
							"model-value": clientSecret.value,
							disabled: isSsoManagedByEnv.value,
							type: "password",
							"data-test-id": "oidc-client-secret",
							"onUpdate:modelValue": _cache[2] || (_cache[2] = (v) => clientSecret.value = v)
						}, null, 8, ["model-value", "disabled"]),
						_cache[21] || (_cache[21] = createBaseVNode("small", null, "The client Secret you received when registering your application with your provider", -1))
					], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.group) }, [
						_cache[22] || (_cache[22] = createBaseVNode("label", null, "Prompt", -1)),
						createVNode(unref(N8nSelect_default), {
							"model-value": prompt.value,
							disabled: isSsoManagedByEnv.value,
							"data-test-id": "oidc-prompt",
							"onUpdate:modelValue": handlePromptChange
						}, {
							default: withCtx(() => [(openBlock(), createElementBlock(Fragment, null, renderList(promptDescriptions, (option) => {
								return createVNode(unref(N8nOption_default), {
									key: option.value,
									label: option.label,
									"data-test-id": "oidc-prompt-filter-option",
									value: option.value
								}, null, 8, ["label", "value"]);
							}), 64))]),
							_: 1
						}, 8, ["model-value", "disabled"]),
						_cache[23] || (_cache[23] = createBaseVNode("small", null, "The prompt parameter to use when authenticating with the OIDC provider", -1))
					], 2)
				], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.card) }, [
					createVNode(UserRoleProvisioningDropdown_default, {
						"role-assignment": unref(roleAssignment),
						"onUpdate:roleAssignment": _cache[3] || (_cache[3] = ($event) => isRef(roleAssignment) ? roleAssignment.value = $event : null),
						"mapping-method": unref(mappingMethod),
						"onUpdate:mappingMethod": _cache[4] || (_cache[4] = ($event) => isRef(mappingMethod) ? mappingMethod.value = $event : null),
						"default-instance-role": unref(defaultInstanceRole),
						"onUpdate:defaultInstanceRole": _cache[5] || (_cache[5] = ($event) => isRef(defaultInstanceRole) ? defaultInstanceRole.value = $event : null),
						"auth-protocol": "oidc",
						disabled: isSsoManagedByEnv.value
					}, null, 8, [
						"role-assignment",
						"mapping-method",
						"default-instance-role",
						"disabled"
					]),
					unref(mappingMethod) === "rules_in_n8n" ? (openBlock(), createBlock(RoleMappingRuleEditor_default, {
						key: 0,
						ref_key: "roleMappingRuleEditorRef",
						ref: roleMappingRuleEditorRef,
						"default-instance-role": unref(defaultInstanceRole),
						"onUpdate:defaultInstanceRole": _cache[6] || (_cache[6] = ($event) => isRef(defaultInstanceRole) ? defaultInstanceRole.value = $event : null),
						"show-project-rules": unref(roleAssignment) === "instance_and_project"
					}, null, 8, ["default-instance-role", "show-project-rules"])) : createCommentVNode("", true),
					createVNode(ConfirmProvisioningDialog_default, {
						modelValue: showUserRoleProvisioningDialog.value,
						"onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => showUserRoleProvisioningDialog.value = $event),
						"transition-type": unref(roleAssignmentTransition),
						"show-project-roles-csv": unref(storedHasProjectRoles) || unref(roleAssignment) === "instance_and_project",
						"will-delete-project-rules": unref(isDroppingProjectRules),
						"auth-protocol": "oidc",
						onConfirmProvisioning: _cache[8] || (_cache[8] = ($event) => onOidcSettingsSave(true)),
						onCancel: _cache[9] || (_cache[9] = ($event) => {
							unref(revertRoleAssignment)();
							showUserRoleProvisioningDialog.value = false;
						})
					}, null, 8, [
						"modelValue",
						"transition-type",
						"show-project-roles-csv",
						"will-delete-project-rules"
					]),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.group) }, [
						_cache[24] || (_cache[24] = createBaseVNode("label", null, "Authentication Context Class Reference", -1)),
						createVNode(unref(Input_default), {
							"model-value": authenticationContextClassReference.value,
							type: "textarea",
							disabled: isSsoManagedByEnv.value,
							"data-test-id": "oidc-authentication-context-class-reference",
							placeholder: "mfa, phrh, pwd",
							"onUpdate:modelValue": _cache[10] || (_cache[10] = (v) => authenticationContextClassReference.value = v)
						}, null, 8, ["model-value", "disabled"]),
						_cache[25] || (_cache[25] = createBaseVNode("small", null, "ACR values to include in the authorization request (acr_values parameter), separated by commas in order of preference.", -1))
					], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.group) }, [
						createBaseVNode("label", null, [_cache[26] || (_cache[26] = createTextVNode("Additional scopes ", -1)), createBaseVNode("span", { class: normalizeClass(_ctx.$style.optional) }, "(Optional)", 2)]),
						createVNode(unref(Input_default), {
							"model-value": additionalScopes.value,
							disabled: isSsoManagedByEnv.value,
							type: "text",
							"data-test-id": "oidc-additional-scopes",
							placeholder: "e.g. groups roles",
							"onUpdate:modelValue": _cache[11] || (_cache[11] = (v) => additionalScopes.value = v)
						}, null, 8, ["model-value", "disabled"]),
						isAdditionalScopesInvalid.value ? (openBlock(), createElementBlock("small", {
							key: 0,
							class: normalizeClass(_ctx.$style.fieldError)
						}, "Use spaces to separate scopes. Commas and semicolons are not allowed.", 2)) : (openBlock(), createElementBlock("small", _hoisted_1$1, [..._cache[27] || (_cache[27] = [
							createTextVNode("By default n8n requests ", -1),
							createBaseVNode("code", null, "openid", -1),
							createTextVNode(", ", -1),
							createBaseVNode("code", null, "profile", -1),
							createTextVNode(" and ", -1),
							createBaseVNode("code", null, "email", -1),
							createTextVNode(". If you need other scopes, define them here space separated.", -1)
						])]))
					], 2)
				], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.card) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.settingsItem) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.settingsItemLabel) }, [..._cache[28] || (_cache[28] = [createBaseVNode("label", null, "Single sign-on (SSO)", -1), createBaseVNode("small", null, "Allow users to sign in through your identity provider", -1)])], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.settingsItemControl) }, [createVNode(unref(N8nSelect_default), {
					"model-value": unref(ssoStore).isOidcLoginEnabled ? "enabled" : "disabled",
					size: "medium",
					"data-test-id": "sso-oidc-toggle",
					disabled: isSsoManagedByEnv.value,
					"onUpdate:modelValue": _cache[12] || (_cache[12] = ($event) => unref(ssoStore).isOidcLoginEnabled = $event === "enabled")
				}, {
					prefix: withCtx(() => [unref(ssoStore).isOidcLoginEnabled ? (openBlock(), createElementBlock("span", {
						key: 0,
						class: normalizeClass(_ctx.$style.greenDot)
					}, null, 2)) : createCommentVNode("", true)]),
					default: withCtx(() => [createVNode(unref(N8nOption_default), {
						value: "enabled",
						label: "Enabled",
						"data-test-id": "sso-oidc-toggle-option"
					}), createVNode(unref(N8nOption_default), {
						value: "disabled",
						label: "Disabled",
						"data-test-id": "sso-oidc-toggle-option"
					})]),
					_: 1
				}, 8, ["model-value", "disabled"])], 2)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.settingsItem) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.settingsItemLabel) }, [..._cache[29] || (_cache[29] = [createBaseVNode("label", null, "Log out from identity provider", -1), createBaseVNode("small", null, "Also end your session at the identity provider when signing out of n8n", -1)])], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.settingsItemControl) }, [createVNode(unref(N8nSelect_default), {
					"model-value": rpInitiatedLogoutEnabled.value ? "enabled" : "disabled",
					size: "medium",
					"data-test-id": "sso-oidc-logout-toggle",
					disabled: isSsoManagedByEnv.value,
					"onUpdate:modelValue": _cache[13] || (_cache[13] = ($event) => rpInitiatedLogoutEnabled.value = $event === "enabled")
				}, {
					prefix: withCtx(() => [rpInitiatedLogoutEnabled.value ? (openBlock(), createElementBlock("span", {
						key: 0,
						class: normalizeClass(_ctx.$style.greenDot)
					}, null, 2)) : createCommentVNode("", true)]),
					default: withCtx(() => [createVNode(unref(N8nOption_default), {
						value: "enabled",
						label: "Enabled"
					}), createVNode(unref(N8nOption_default), {
						value: "disabled",
						label: "Disabled"
					})]),
					_: 1
				}, 8, ["model-value", "disabled"])], 2)], 2)], 2)
			]);
		};
	}
}), [["__cssModules", { "$style": sso_form_module_scss_vue_type_style_index_0_src_true_lang_module_default }]]);
//#endregion
//#region src/features/settings/sso/components/ScimProvisioningSection.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
/** Every SCIM token starts with this prefix, so the UI can show it unmasked. */
var SCIM_TOKEN_PREFIX = "n8n_scim_";
var ScimProvisioningSection_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ScimProvisioningSection",
	props: { ssoEnabled: { type: Boolean } },
	setup(__props, { expose: __expose }) {
		const props = __props;
		const i18n = useI18n();
		const rootStore = useRootStore();
		const { showError } = useToast();
		const clipboard = useClipboard();
		const config = ref(null);
		/** The value in the select. The SSO page saves it with its other settings. */
		const selectedEnabled = ref(false);
		/** The backend returns the full token once. The page shows it until the user leaves. */
		const newToken = ref(null);
		const saving = ref(false);
		const generatingToken = ref(false);
		const showRegenerateDialog = ref(false);
		const copied = ref({
			baseUrl: false,
			token: false
		});
		/** Copies a value and shows the check icon for a moment, as the SAML settings do. */
		async function copyValue(value, field) {
			await clipboard.copy(value);
			copied.value[field] = true;
			setTimeout(() => copied.value[field] = false, 2e3);
		}
		const hasUnsavedChanges = computed(() => config.value !== null && selectedEnabled.value !== config.value.enabled);
		const selectValue = computed({
			get: () => selectedEnabled.value ? "enabled" : "disabled",
			set: (value) => {
				selectedEnabled.value = value === "enabled";
			}
		});
		/** The token with its middle hidden. Null while there is no token. */
		const maskedToken = computed(() => {
			if (newToken.value) return maskSecret(newToken.value, 9);
			if (config.value?.hasToken && config.value.tokenHint) return maskSecretParts(SCIM_TOKEN_PREFIX, config.value.tokenHint);
			return null;
		});
		const tokenDescription = computed(() => {
			if (newToken.value) return i18n.baseText("settings.sso.scim.token.copyNow");
			if (maskedToken.value) return i18n.baseText("settings.sso.scim.token.active");
			if (config.value?.enabled) return i18n.baseText("settings.sso.scim.token.none");
			return i18n.baseText("settings.sso.scim.token.createdOnEnable");
		});
		async function load() {
			try {
				config.value = await getScimConfig(rootStore.restApiContext);
				selectedEnabled.value = config.value.enabled;
			} catch (error) {
				showError(error, i18n.baseText("settings.sso.scim.load.error"));
			}
		}
		/** Saves the select value. Returns false when the save fails. */
		async function save() {
			if (!config.value || !hasUnsavedChanges.value) return true;
			saving.value = true;
			try {
				const { enabled } = await setScimEnabled(rootStore.restApiContext, selectedEnabled.value);
				config.value = {
					...config.value,
					enabled
				};
				selectedEnabled.value = enabled;
				if (enabled && !config.value.hasToken) await generateToken();
				return true;
			} catch (error) {
				showError(error, i18n.baseText("settings.sso.scim.enable.error"));
				return false;
			} finally {
				saving.value = false;
			}
		}
		function discard() {
			if (config.value) selectedEnabled.value = config.value.enabled;
		}
		async function generateToken() {
			showRegenerateDialog.value = false;
			generatingToken.value = true;
			try {
				const { token } = await generateScimToken(rootStore.restApiContext);
				newToken.value = token;
				if (config.value) config.value = {
					...config.value,
					hasToken: true,
					tokenHint: token.slice(-4)
				};
			} catch (error) {
				showError(error, i18n.baseText("settings.sso.scim.token.error"));
			} finally {
				generatingToken.value = false;
			}
		}
		__expose({
			hasUnsavedChanges,
			saving,
			save,
			discard,
			reload: load
		});
		onMounted(load);
		watch(() => props.ssoEnabled, async () => await load());
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SettingsSection_default), {
				description: unref(i18n).baseText("settings.sso.scim.description"),
				"data-test-id": "sso-scim-section"
			}, {
				title: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.titleRow) }, [createVNode(unref(N8nHeading_default), {
					tag: "h2",
					step: "md",
					color: "text-dark"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sso.scim.title")), 1)]),
					_: 1
				}), createVNode(unref(PreviewBadge_default), {
					size: "xsmall",
					"data-test-id": "sso-scim-preview-badge"
				})], 2)]),
				default: withCtx(() => [config.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.shared.card)
				}, [
					createBaseVNode("div", { class: normalizeClass(_ctx.shared.settingsItem) }, [createBaseVNode("div", { class: normalizeClass(_ctx.shared.settingsItemLabel) }, [createBaseVNode("label", null, toDisplayString(unref(i18n).baseText("settings.sso.scim.enable.title")), 1), createBaseVNode("small", null, toDisplayString(unref(i18n).baseText("settings.sso.scim.enable.description")), 1)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.shared.settingsItemControl) }, [createVNode(unref(N8nTooltip_default), {
						"as-child": "",
						disabled: props.ssoEnabled,
						content: unref(i18n).baseText("settings.sso.scim.enable.needsSso"),
						placement: "top"
					}, {
						default: withCtx(() => [createBaseVNode("div", {
							class: normalizeClass(_ctx.$style.selectWrapper),
							"data-test-id": "sso-scim-enabled-select-wrapper"
						}, [createVNode(unref(N8nSelect_default), {
							modelValue: selectValue.value,
							"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selectValue.value = $event),
							size: "medium",
							disabled: saving.value || !props.ssoEnabled,
							"aria-label": unref(i18n).baseText("settings.sso.scim.enable.title"),
							"data-test-id": "sso-scim-enabled-select"
						}, {
							default: withCtx(() => [createVNode(unref(N8nOption_default), {
								value: "enabled",
								label: unref(i18n).baseText("settings.sso.settings.ssoToggle.enabled"),
								"data-test-id": "sso-scim-enabled-option"
							}, null, 8, ["label"]), createVNode(unref(N8nOption_default), {
								value: "disabled",
								label: unref(i18n).baseText("settings.sso.settings.ssoToggle.disabled"),
								"data-test-id": "sso-scim-enabled-option"
							}, null, 8, ["label"])]),
							_: 1
						}, 8, [
							"modelValue",
							"disabled",
							"aria-label"
						])], 2)]),
						_: 1
					}, 8, ["disabled", "content"])], 2)], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.shared.settingsItem) }, [createBaseVNode("div", { class: normalizeClass(_ctx.shared.settingsItemLabel) }, [createBaseVNode("label", null, toDisplayString(unref(i18n).baseText("settings.sso.scim.baseUrl.title")), 1), createBaseVNode("small", null, toDisplayString(unref(i18n).baseText("settings.sso.scim.baseUrl.description")), 1)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.shared.settingsItemControl) }, [createBaseVNode("div", { class: normalizeClass(_ctx.shared.copyInputGroup) }, [createBaseVNode("div", { class: normalizeClass(_ctx.shared.copyInputField) }, [createVNode(unref(Input_default), {
						"model-value": config.value.baseUrl,
						type: "text",
						readonly: true,
						"aria-label": unref(i18n).baseText("settings.sso.scim.baseUrl.title"),
						"data-test-id": "sso-scim-base-url"
					}, null, 8, ["model-value", "aria-label"])], 2), createBaseVNode("div", { class: normalizeClass(_ctx.shared.copyButtonWrapper) }, [createVNode(unref(N8nButton_default), {
						variant: "outline",
						"icon-only": "",
						icon: copied.value.baseUrl ? "check" : "copy",
						"aria-label": unref(i18n).baseText("generic.copy"),
						"data-test-id": "sso-scim-base-url-copy",
						onClick: _cache[1] || (_cache[1] = ($event) => copyValue(config.value.baseUrl, "baseUrl"))
					}, null, 8, ["icon", "aria-label"])], 2)], 2)], 2)], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.shared.settingsItem) }, [createBaseVNode("div", { class: normalizeClass(_ctx.shared.settingsItemLabel) }, [createBaseVNode("label", null, toDisplayString(unref(i18n).baseText("settings.sso.scim.token.title")), 1), createBaseVNode("small", null, toDisplayString(tokenDescription.value), 1)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.shared.settingsItemControl) }, [maskedToken.value ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.shared.copyInputGroup)
					}, [
						createBaseVNode("div", { class: normalizeClass(_ctx.shared.copyInputField) }, [createVNode(unref(Input_default), {
							"model-value": maskedToken.value,
							type: "text",
							readonly: true,
							"aria-label": unref(i18n).baseText("settings.sso.scim.token.title"),
							"data-test-id": "sso-scim-token"
						}, null, 8, ["model-value", "aria-label"])], 2),
						newToken.value ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: normalizeClass(_ctx.shared.copyButtonWrapper)
						}, [createVNode(unref(N8nButton_default), {
							variant: "outline",
							"icon-only": "",
							icon: copied.value.token ? "check" : "copy",
							"aria-label": unref(i18n).baseText("generic.copy"),
							"data-test-id": "sso-scim-token-copy",
							onClick: _cache[2] || (_cache[2] = ($event) => copyValue(newToken.value, "token"))
						}, null, 8, ["icon", "aria-label"])], 2)) : createCommentVNode("", true),
						createBaseVNode("div", { class: normalizeClass(_ctx.shared.copyButtonWrapper) }, [createVNode(unref(N8nTooltip_default), {
							content: unref(i18n).baseText("settings.sso.scim.token.rotate"),
							placement: "top"
						}, {
							default: withCtx(() => [createVNode(unref(N8nButton_default), {
								variant: "outline",
								"icon-only": "",
								icon: "refresh-cw",
								disabled: generatingToken.value,
								"aria-label": unref(i18n).baseText("settings.sso.scim.token.rotate"),
								"data-test-id": "sso-scim-token-rotate",
								onClick: _cache[3] || (_cache[3] = ($event) => showRegenerateDialog.value = true)
							}, null, 8, ["disabled", "aria-label"])]),
							_: 1
						}, 8, ["content"])], 2)
					], 2)) : config.value.enabled ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 1,
						disabled: generatingToken.value,
						"data-test-id": "sso-scim-generate-token",
						onClick: generateToken
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sso.scim.token.generate")), 1)]),
						_: 1
					}, 8, ["disabled"])) : createCommentVNode("", true)], 2)], 2)
				], 2)) : createCommentVNode("", true), createVNode(unref(AlertDialog_default), {
					open: showRegenerateDialog.value,
					title: unref(i18n).baseText("settings.sso.scim.regenerate.title"),
					description: unref(i18n).baseText("settings.sso.scim.regenerate.description"),
					"action-label": unref(i18n).baseText("settings.sso.scim.token.rotate"),
					"action-variant": "destructive",
					onAction: generateToken,
					onCancel: _cache[4] || (_cache[4] = ($event) => showRegenerateDialog.value = false),
					"onUpdate:open": _cache[5] || (_cache[5] = ($event) => showRegenerateDialog.value = $event)
				}, null, 8, [
					"open",
					"title",
					"description",
					"action-label"
				])]),
				_: 1
			}, 8, ["description"]);
		};
	}
}), [["__cssModules", {
	"shared": sso_form_module_scss_vue_type_style_index_0_src_true_lang_module_default,
	"$style": {
		titleRow: "_titleRow_5xciu_1",
		selectWrapper: "_selectWrapper_5xciu_8"
	}
}]]);
//#endregion
//#region src/features/settings/sso/views/SettingsSso.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = { key: 1 };
var _hoisted_2 = {
	key: 0,
	"data-test-id": "sso-content-licensed"
};
var _hoisted_3 = {
	key: 1,
	"data-test-id": "sso-content-licensed"
};
var SettingsSso_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SettingsSso",
	setup(__props) {
		const i18n = useI18n();
		const router = useRouter();
		const ssoStore = useSSOStore();
		const settingsStore = useSettingsStore();
		const rbacStore = useRBACStore();
		const provisioningStore = useUserRoleProvisioningStore();
		const documentTitle = useDocumentTitle();
		const pageRedirectionHelper = usePageRedirectionHelper();
		const isRulesMappingInN8n = computed(() => provisioningStore.provisioningConfig?.scopesUseExpressionMapping ?? false);
		/** The env config locks the SSO form, unless n8n owns the role mapping rules. */
		const canEditSso = computed(() => !ssoStore.ssoManagedByEnv || isRulesMappingInN8n.value);
		const samlFormRef = useTemplateRef("samlForm");
		const oidcFormRef = useTemplateRef("oidcForm");
		const scimSectionRef = useTemplateRef("scimSection");
		const showUnsavedChangesDialog = ref(false);
		const pendingNext = ref(null);
		const options = computed(() => {
			return [{
				label: SupportedProtocols.SAML.toUpperCase(),
				value: SupportedProtocols.SAML
			}, {
				label: ssoStore.isEnterpriseOidcEnabled ? SupportedProtocols.OIDC.toUpperCase() : `${SupportedProtocols.OIDC.toUpperCase()} (${i18n.baseText("generic.upgradeToEnterprise")})`,
				value: SupportedProtocols.OIDC
			}];
		});
		const hasAnySsoEnabled = computed(() => ssoStore.isEnterpriseSamlEnabled || ssoStore.isEnterpriseOidcEnabled);
		/** SCIM needs the `feat:scim` license, which activates the module, and the `scim:manage` scope. */
		const showScimSection = computed(() => settingsStore.isModuleActive("scim") && rbacStore.hasScope("scim:manage"));
		const isSsoLoginEnabled = computed(() => ssoStore.isSamlLoginEnabled || ssoStore.isOidcLoginEnabled);
		async function goToAuthentication() {
			await router.push({ name: VIEWS.AUTHENTICATION_SETTINGS });
		}
		const activeForm = computed(() => {
			if (authProtocol.value === SupportedProtocols.SAML) return samlFormRef.value;
			if (authProtocol.value === SupportedProtocols.OIDC) return oidcFormRef.value;
			return null;
		});
		const authProtocol = ref(SupportedProtocols.SAML);
		const isSamlFormShown = computed(() => hasAnySsoEnabled.value && ssoStore.isEnterpriseSamlEnabled && authProtocol.value === SupportedProtocols.SAML);
		const isOidcFormShown = computed(() => hasAnySsoEnabled.value && ssoStore.isEnterpriseOidcEnabled && authProtocol.value === SupportedProtocols.OIDC);
		function onTestConnection() {
			activeForm.value?.onTest();
		}
		const hasUnsavedChanges = computed(() => Boolean(activeForm.value?.hasUnsavedChanges) || Boolean(scimSectionRef.value?.hasUnsavedChanges));
		const isSaving = computed(() => Boolean(activeForm.value?.saving) || Boolean(scimSectionRef.value?.saving));
		/**
		* One save for the SSO form and SCIM. SSO goes first, because the backend
		* accepts SCIM only while SAML or OIDC login is on.
		*/
		async function saveAll() {
			if (activeForm.value?.hasUnsavedChanges) {
				if (!await activeForm.value.onSave()) return false;
			}
			const scimSection = scimSectionRef.value;
			if (!scimSection) return true;
			if (!isSsoLoginEnabled.value) {
				await scimSection.reload();
				return true;
			}
			return scimSection.hasUnsavedChanges ? await scimSection.save() : true;
		}
		async function onSave() {
			await saveAll();
		}
		function onAuthProtocolUpdated(value) {
			authProtocol.value = value;
		}
		const goToUpgrade = () => {
			pageRedirectionHelper.goToUpgrade("sso", "upgrade-sso");
		};
		onBeforeRouteLeave((_to, _from, next) => {
			if (!hasUnsavedChanges.value) {
				next();
				return;
			}
			pendingNext.value = next;
			showUnsavedChangesDialog.value = true;
		});
		async function onSaveAndLeave() {
			const next = pendingNext.value;
			pendingNext.value = null;
			showUnsavedChangesDialog.value = false;
			if (await saveAll()) next?.();
			else next?.(false);
		}
		function onLeaveWithoutSaving() {
			const next = pendingNext.value;
			pendingNext.value = null;
			showUnsavedChangesDialog.value = false;
			next?.();
		}
		function onDismissUnsavedChanges() {
			showUnsavedChangesDialog.value = false;
			pendingNext.value?.(false);
			pendingNext.value = null;
		}
		function onUnsavedDialogOpenUpdate(open) {
			if (!open) onDismissUnsavedChanges();
		}
		onMounted(() => {
			documentTitle.set(i18n.baseText("settings.sso.title"));
			ssoStore.initializeSelectedProtocol();
			authProtocol.value = ssoStore.selectedAuthProtocol || SupportedProtocols.SAML;
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SettingsLayout_default), {
				class: normalizeClass(_ctx.$style.layout),
				"full-width": "",
				"show-back": "",
				"back-label": unref(i18n).baseText("settings.authentication.back"),
				"data-test-id": "sso-settings-view",
				onBack: goToAuthentication
			}, {
				default: withCtx(() => [
					createVNode(unref(SettingsPageHeader_default), {
						title: unref(i18n).baseText("settings.sso.title"),
						description: unref(i18n).baseText("settings.sso.info"),
						"docs-url": "https://docs.n8n.io/user-management/saml/",
						class: normalizeClass(_ctx.$style.header),
						"data-test-id": "sso-settings-header"
					}, null, 8, [
						"title",
						"description",
						"class"
					]),
					unref(ssoStore).ssoManagedByEnv ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 0,
						theme: "warning"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(isRulesMappingInN8n.value ? unref(i18n).baseText("settings.sso.settings.envConfigBannerWithRules") : unref(i18n).baseText("settings.sso.settings.envConfigBanner")), 1)]),
						_: 1
					})) : createCommentVNode("", true),
					hasAnySsoEnabled.value ? (openBlock(), createElementBlock("div", _hoisted_1, [
						createBaseVNode("div", { class: normalizeClass([_ctx.shared.card, _ctx.$style.protocolCard]) }, [createBaseVNode("div", {
							"data-test-id": "sso-auth-protocol-select",
							class: normalizeClass(_ctx.shared.settingsItem)
						}, [createBaseVNode("div", { class: normalizeClass(_ctx.shared.settingsItemLabel) }, [createBaseVNode("label", null, toDisplayString(unref(i18n).baseText("settings.sso.settings.authProtocol.label")), 1), createBaseVNode("small", null, toDisplayString(unref(i18n).baseText("settings.sso.settings.authProtocol.description")), 1)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.shared.settingsItemControl) }, [createVNode(unref(N8nSelect_default), {
							filterable: "",
							size: "medium",
							disabled: unref(ssoStore).ssoManagedByEnv,
							"model-value": authProtocol.value,
							placeholder: unref(i18n).baseText("parameterInput.select"),
							"onUpdate:modelValue": onAuthProtocolUpdated,
							onKeydown: _cache[0] || (_cache[0] = withModifiers(() => {}, ["stop"]))
						}, {
							default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(options.value, ({ label, value }) => {
								return openBlock(), createBlock(unref(N8nOption_default), {
									key: value,
									value,
									label,
									"data-test-id": "credential-select-option"
								}, null, 8, ["value", "label"]);
							}), 128))]),
							_: 1
						}, 8, [
							"disabled",
							"model-value",
							"placeholder"
						])], 2)], 2)], 2),
						isSamlFormShown.value ? (openBlock(), createElementBlock("div", _hoisted_2, [createVNode(SamlSettingsForm_default, { ref: "samlForm" }, null, 512)])) : createCommentVNode("", true),
						isOidcFormShown.value ? (openBlock(), createElementBlock("div", _hoisted_3, [createVNode(OidcSettingsForm_default, { ref: "oidcForm" }, null, 512)])) : createCommentVNode("", true)
					])) : (openBlock(), createBlock(unref(N8nEmptyState_default), {
						key: 2,
						"data-test-id": "sso-content-unlicensed",
						description: unref(i18n).baseText("settings.sso.actionBox.description"),
						"button-text": unref(i18n).baseText("settings.sso.actionBox.buttonText"),
						"onClick:button": goToUpgrade
					}, {
						heading: withCtx(() => [createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("settings.sso.actionBox.title")), 1)]),
						_: 1
					}, 8, ["description", "button-text"])),
					showScimSection.value ? (openBlock(), createBlock(ScimProvisioningSection_default, {
						key: 3,
						ref: "scimSection",
						"sso-enabled": isSsoLoginEnabled.value
					}, null, 8, ["sso-enabled"])) : createCommentVNode("", true),
					isSamlFormShown.value || isOidcFormShown.value || showScimSection.value ? (openBlock(), createElementBlock("div", {
						key: 4,
						class: normalizeClass(_ctx.$style.actions)
					}, [canEditSso.value || showScimSection.value ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 0,
						disabled: !hasUnsavedChanges.value || isSaving.value,
						loading: isSaving.value,
						size: "large",
						"data-test-id": "sso-save",
						onClick: onSave
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sso.settings.save")), 1)]),
						_: 1
					}, 8, ["disabled", "loading"])) : createCommentVNode("", true), isSamlFormShown.value ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 1,
						variant: "outline",
						disabled: !samlFormRef.value?.isTestEnabled,
						size: "large",
						"data-test-id": "sso-test",
						onClick: onTestConnection
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sso.settings.test")), 1)]),
						_: 1
					}, 8, ["disabled"])) : isOidcFormShown.value ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 2,
						variant: "outline",
						disabled: !oidcFormRef.value?.isTestEnabled,
						size: "large",
						"data-test-id": "sso-oidc-test",
						onClick: onTestConnection
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sso.settings.test")), 1)]),
						_: 1
					}, 8, ["disabled"])) : createCommentVNode("", true)], 2)) : createCommentVNode("", true),
					createVNode(unref(Dialog_default), {
						open: showUnsavedChangesDialog.value,
						size: "medium",
						header: unref(i18n).baseText("settings.sso.settings.unsavedChanges.title"),
						"data-test-id": "sso-unsaved-changes-dialog",
						"onUpdate:open": onUnsavedDialogOpenUpdate
					}, {
						default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
							default: withCtx(() => [createVNode(unref(N8nText_default), null, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sso.settings.unsavedChanges.message")), 1)]),
								_: 1
							})]),
							_: 1
						}), createVNode(unref(DialogFooter_default), null, {
							default: withCtx(() => [createVNode(unref(N8nButton_default), {
								variant: "outline",
								"data-test-id": "sso-unsaved-leave",
								onClick: onLeaveWithoutSaving
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sso.settings.unsavedChanges.leaveWithoutSaving")), 1)]),
								_: 1
							}), createVNode(unref(N8nButton_default), {
								variant: "solid",
								"data-test-id": "sso-unsaved-save-and-leave",
								onClick: onSaveAndLeave
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sso.settings.unsavedChanges.saveAndLeave")), 1)]),
								_: 1
							})]),
							_: 1
						})]),
						_: 1
					}, 8, ["open", "header"])
				]),
				_: 1
			}, 8, ["class", "back-label"]);
		};
	}
}), [["__cssModules", {
	"shared": sso_form_module_scss_vue_type_style_index_0_src_true_lang_module_default,
	"$style": {
		layout: "_layout_1gm5m_2",
		header: "_header_1gm5m_7",
		protocolCard: "_protocolCard_1gm5m_12",
		actions: "_actions_1gm5m_21"
	}
}]]);
//#endregion
export { SettingsSso_default as default };
