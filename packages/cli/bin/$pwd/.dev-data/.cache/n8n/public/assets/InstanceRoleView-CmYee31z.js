import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Du as useAsyncState, Gd as createTextVNode, Hd as createElementBlock, If as isRef, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Of as withDirectives, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, bd as I18nT, bf as useId, ff as openBlock, ip as init_shared_esm_bundler, jd as vShow, mf as renderList, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { LM as N8nCallout_default, PA as useMessage, Py as CUSTOM_ROLES_DOCS_URL, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, Zf as useRolesStore, _C as useUsersStore, _M as Checkbox_default, _N as N8nText_default, dC as useToast, dD as GLOBAL_MEMBER_ROLE_SLUG, dx as MODAL_CONFIRM, fC as VIEWS, fN as N8nTooltip_default, hC as useTelemetry, hM as N8nLink_default, jN as useI18n, lD as withMandatoryInstanceScopes, oj as N8nUserInfo_default, tM as N8nInfoTip_default, tN as N8nLoading_default, uD as GLOBAL_ADMIN_ROLE_SLUG, vN as N8nIconButton_default, wM as TableBase_default, yC as useSettingsStore, yN as N8nButton_default, yj as Tabs_default } from "./app-D5flEmb-.js";
import { n as useRoleDeletion, r as useRoleDeleteGuard, t as DeleteInstanceRoleModal_default } from "./DeleteInstanceRoleModal-DvTvJuw6.js";
import { n as RoleEditorLayout_default, t as useRoleEditorForm } from "./useRoleEditorForm-CAoirHuN.js";
import { a as getEscalationWarningKey, c as isOptionImplied, d as resolveOptionState, f as toggleOptionInGroup, l as isOptionMandatory, n as INSTANCE_SCOPE_GROUP_LIST, o as getPresetScopes, s as impliedByOption, t as ALL_INSTANCE_SCOPES, u as mandatoryOptionTooltipKey } from "./instanceRoleScopes-C7W9BUZD.js";
//#region src/features/roles/instance/InstanceRoleAssignmentsTab.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var InstanceRoleAssignmentsTab_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceRoleAssignmentsTab",
	props: { roleSlug: {} },
	setup(__props) {
		const props = __props;
		const rolesStore = useRolesStore();
		const usersStore = useUsersStore();
		const i18n = useI18n();
		const { state: members, isLoading, error, execute } = useAsyncState(async () => await rolesStore.fetchRoleMembers(props.roleSlug), {
			members: [],
			total: 0
		});
		const visibleMembers = computed(() => members.value.members.filter((member) => member.kind !== "service"));
		watch(() => props.roleSlug, async () => await execute());
		function roleLabel(slug) {
			return rolesStore.processedInstanceRoles.find((role) => role.slug === slug)?.displayName ?? slug;
		}
		function isCurrentUser(member) {
			return member.userId === usersStore.currentUserId;
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [unref(isLoading) ? (openBlock(), createBlock(unref(N8nLoading_default), {
				key: 0,
				rows: 3
			})) : unref(error) ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.stateBox)
			}, [createVNode(unref(N8nText_default), { color: "text-light" }, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("roles.instance.assignments.fetch.error")), 1)]),
				_: 1
			})], 2)) : visibleMembers.value.length === 0 ? (openBlock(), createElementBlock("div", {
				key: 2,
				class: normalizeClass(_ctx.$style.stateBox)
			}, [createVNode(unref(N8nText_default), { color: "text-light" }, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("roles.instance.assignments.emptyState")), 1)]),
				_: 1
			})], 2)) : (openBlock(), createBlock(unref(TableBase_default), { key: 3 }, {
				default: withCtx(() => [createBaseVNode("thead", null, [createBaseVNode("tr", null, [createBaseVNode("th", null, toDisplayString(unref(i18n).baseText("roles.instance.assignments.memberColumn")), 1), createBaseVNode("th", null, toDisplayString(unref(i18n).baseText("roles.instance.assignments.roleColumn")), 1)])]), createBaseVNode("tbody", null, [(openBlock(true), createElementBlock(Fragment, null, renderList(visibleMembers.value, (member) => {
					return openBlock(), createElementBlock("tr", {
						key: member.userId,
						"data-test-id": "instance-role-member-row"
					}, [createBaseVNode("td", null, [createVNode(unref(N8nUserInfo_default), {
						"first-name": member.firstName,
						"last-name": member.lastName,
						email: member.email,
						"is-current-user": isCurrentUser(member)
					}, null, 8, [
						"first-name",
						"last-name",
						"email",
						"is-current-user"
					])]), createBaseVNode("td", null, [createVNode(unref(N8nText_default), { color: "text-dark" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(roleLabel(member.role)), 1)]),
						_: 2
					}, 1024)])]);
				}), 128))])]),
				_: 1
			}))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1frue_1",
	stateBox: "_stateBox_1frue_5"
} }]]);
//#endregion
//#region src/features/roles/instance/personalSpacePermissions.ts
/**
* The "Personal space" block of the instance role editor. Every user owns a
* personal project, whatever their instance role grants, so the block is static:
* two groups (view, manage) over the same resources, all checked and disabled.
*/
var PERSONAL_SPACE_GROUPS = ["view", "manage"];
/** Display order follows the design. */
var PERSONAL_SPACE_RESOURCES = [
	"workflow",
	"credential",
	"dataTable",
	"agent",
	"app",
	"folder",
	"execution"
];
var PERSONAL_SPACE_GROUP_LABEL_KEYS = {
	view: "instanceRoles.personalSpace.view",
	manage: "instanceRoles.personalSpace.manage"
};
/** Same resource names as the project role editor. */
var PERSONAL_SPACE_RESOURCE_LABEL_KEYS = {
	workflow: "projectRoles.type.workflow",
	credential: "projectRoles.type.credential",
	dataTable: "projectRoles.type.dataTable",
	agent: "projectRoles.type.agent",
	app: "projectRoles.type.app",
	folder: "projectRoles.type.folder",
	execution: "projectRoles.type.execution"
};
var PERSONAL_SPACE_TOOLTIP_KEYS = {
	view: {
		workflow: "instanceRoles.personalSpace.view.workflow",
		credential: "instanceRoles.personalSpace.view.credential",
		dataTable: "instanceRoles.personalSpace.view.dataTable",
		agent: "instanceRoles.personalSpace.view.agent",
		app: "instanceRoles.personalSpace.view.app",
		folder: "instanceRoles.personalSpace.view.folder",
		execution: "instanceRoles.personalSpace.view.execution"
	},
	manage: {
		workflow: "instanceRoles.personalSpace.manage.workflow",
		credential: "instanceRoles.personalSpace.manage.credential",
		dataTable: "instanceRoles.personalSpace.manage.dataTable",
		agent: "instanceRoles.personalSpace.manage.agent",
		app: "instanceRoles.personalSpace.manage.app",
		folder: "instanceRoles.personalSpace.manage.folder",
		execution: "instanceRoles.personalSpace.manage.execution"
	}
};
//#endregion
//#region src/features/roles/instance/components/PersonalSpacePermissions.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$1 = ["id", "data-test-id"];
var PersonalSpacePermissions_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PersonalSpacePermissions",
	setup(__props) {
		const i18n = useI18n();
		const listId = useId();
		const settingsStore = useSettingsStore();
		const resources = computed(() => settingsStore.isAppsEnabled ? PERSONAL_SPACE_RESOURCES : PERSONAL_SPACE_RESOURCES.filter((resource) => resource !== "app"));
		const expanded = ref({
			view: false,
			manage: false
		});
		function toggle(group) {
			expanded.value[group] = !expanded.value[group];
		}
		function toggleLabel(group) {
			return i18n.baseText(expanded.value[group] ? "instanceRoles.personalSpace.collapse" : "instanceRoles.personalSpace.expand", { interpolate: { group: i18n.baseText(PERSONAL_SPACE_GROUP_LABEL_KEYS[group]) } });
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.container),
				"data-test-id": "personal-space-permissions"
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(PERSONAL_SPACE_GROUPS), (group) => {
				return openBlock(), createElementBlock("div", {
					key: group,
					class: normalizeClass(_ctx.$style.group)
				}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.groupHeader) }, [createVNode(unref(N8nIconButton_default), {
					icon: expanded.value[group] ? "chevron-down" : "chevron-right",
					variant: "ghost",
					size: "xsmall",
					"icon-size": "small",
					"aria-expanded": expanded.value[group],
					"aria-controls": `${unref(listId)}-${group}`,
					"aria-label": toggleLabel(group),
					"data-test-id": `personal-space-toggle-${group}`,
					onClick: ($event) => toggle(group)
				}, null, 8, [
					"icon",
					"aria-expanded",
					"aria-controls",
					"aria-label",
					"data-test-id",
					"onClick"
				]), createVNode(unref(Checkbox_default), {
					label: unref(i18n).baseText(unref(PERSONAL_SPACE_GROUP_LABEL_KEYS)[group]),
					"model-value": true,
					disabled: "",
					class: normalizeClass(_ctx.$style.checkbox),
					"data-test-id": `personal-space-group-${group}`
				}, null, 8, [
					"label",
					"class",
					"data-test-id"
				])], 2), withDirectives(createBaseVNode("ul", {
					id: `${unref(listId)}-${group}`,
					class: normalizeClass(_ctx.$style.resources),
					"data-test-id": `personal-space-resources-${group}`
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(resources.value, (resource) => {
					return openBlock(), createElementBlock("li", {
						key: resource,
						class: normalizeClass(_ctx.$style.resource)
					}, [createVNode(unref(Checkbox_default), {
						label: unref(i18n).baseText(unref(PERSONAL_SPACE_RESOURCE_LABEL_KEYS)[resource]),
						"model-value": true,
						disabled: "",
						class: normalizeClass(_ctx.$style.checkbox),
						"data-test-id": `personal-space-${group}-${resource}`
					}, null, 8, [
						"label",
						"class",
						"data-test-id"
					]), createVNode(unref(N8nInfoTip_default), {
						type: "tooltip",
						theme: "info",
						bold: false,
						"tooltip-placement": "right"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(unref(PERSONAL_SPACE_TOOLTIP_KEYS)[group][resource])), 1)]),
						_: 2
					}, 1024)], 2);
				}), 128))], 10, _hoisted_1$1), [[vShow, expanded.value[group]]])], 2);
			}), 128)), createVNode(unref(N8nCallout_default), {
				theme: "info",
				slim: "",
				class: normalizeClass(_ctx.$style.callout),
				"data-test-id": "personal-space-callout"
			}, {
				default: withCtx(() => [createVNode(unref(I18nT), {
					keypath: "instanceRoles.personalSpace.callout",
					scope: "global"
				}, {
					link: withCtx(() => [createVNode(unref(N8nLink_default), {
						to: { name: unref(VIEWS).SECURITY_SETTINGS },
						size: "small",
						theme: "text",
						bold: true,
						underline: true
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceRoles.personalSpace.callout.link")), 1)]),
						_: 1
					}, 8, ["to"])]),
					_: 1
				})]),
				_: 1
			}, 8, ["class"])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_im31u_2",
	group: "_group_im31u_10",
	groupHeader: "_groupHeader_im31u_19",
	resources: "_resources_im31u_25",
	resource: "_resource_im31u_25",
	checkbox: "_checkbox_im31u_42",
	callout: "_callout_im31u_46"
} }]]);
//#endregion
//#region src/features/roles/instance/components/ScopeGroupSelector.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ScopeGroupSelector_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ScopeGroupSelector",
	props: {
		modelValue: {},
		readonly: {
			type: Boolean,
			default: false
		},
		loading: {
			type: Boolean,
			default: false
		}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const i18n = useI18n();
		const props = __props;
		const emit = __emit;
		const settingsStore = useSettingsStore();
		const groups = computed(() => settingsStore.isAppsEnabled ? INSTANCE_SCOPE_GROUP_LIST : INSTANCE_SCOPE_GROUP_LIST.filter((group) => group.resource !== "app"));
		/** data-testid must be a single value: turn "Manage own" into "manage-own". */
		function optionTestId(resource, option) {
			return `scope-option-${resource}-${option.key.toLowerCase().replace(/\s+/g, "-")}`;
		}
		function impliedTooltip(option, groupOptions) {
			const superseding = impliedByOption(option, groupOptions, props.modelValue);
			if (!superseding) return "";
			return i18n.baseText("instanceRoles.option.includedIn", { interpolate: { option: i18n.baseText(superseding.labelKey) } });
		}
		/**
		* Tooltip shown for a permission option. A mandatory option (granted to every
		* role, see `isOptionMandatory`) explains why it can't be turned off; an option
		* implied by another (e.g. "Manage own" under a checked "Manage all") shows the
		* "Included in …" note; otherwise it explains what the permission grants.
		*/
		function optionTooltip(resource, option, groupOptions) {
			const mandatoryKey = mandatoryOptionTooltipKey(resource, option);
			if (mandatoryKey) return i18n.baseText(mandatoryKey);
			if (isOptionImplied(option, groupOptions, props.modelValue)) return impliedTooltip(option, groupOptions);
			return option.descriptionKey ? i18n.baseText(option.descriptionKey) : "";
		}
		function onToggle(option, groupOptions) {
			if (props.readonly) return;
			if (isOptionImplied(option, groupOptions, props.modelValue)) return;
			emit("update:modelValue", toggleOptionInGroup(props.modelValue, option, groupOptions));
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [createBaseVNode("div", {
				class: normalizeClass(_ctx.$style.cardContainer),
				"data-test-id": "personal-space-card"
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.card) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardTitle) }, toDisplayString(unref(i18n).baseText("instanceRoles.personalSpace.title")), 3), createBaseVNode("div", { class: normalizeClass(_ctx.$style.optionList) }, [createVNode(PersonalSpacePermissions_default)], 2)], 2)], 2), createBaseVNode("div", {
				class: normalizeClass(_ctx.$style.cardContainer),
				"data-test-id": "instance-permissions-card"
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(groups.value, (group) => {
				return openBlock(), createElementBlock("div", {
					key: group.resource,
					class: normalizeClass(_ctx.$style.card)
				}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardTitle) }, toDisplayString(unref(i18n).baseText(group.labelKey)), 3), createBaseVNode("div", { class: normalizeClass([_ctx.$style.optionList, _ctx.$style.optionListInset]) }, [__props.loading ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.loading)
				}, [createVNode(unref(N8nLoading_default), {
					rows: group.options.length,
					"shrink-last": false
				}, null, 8, ["rows"])], 2)) : (openBlock(true), createElementBlock(Fragment, { key: 1 }, renderList(group.options, (option) => {
					return openBlock(), createBlock(unref(N8nTooltip_default), {
						key: option.key,
						content: optionTooltip(group.resource, option, group.options),
						disabled: !optionTooltip(group.resource, option, group.options),
						placement: "right",
						enterable: false,
						"show-after": 250
					}, {
						default: withCtx(() => [createVNode(unref(Checkbox_default), {
							"data-test-id": optionTestId(group.resource, option),
							label: unref(i18n).baseText(option.labelKey),
							"model-value": unref(resolveOptionState)(option, group.options, __props.modelValue) === "checked",
							indeterminate: unref(resolveOptionState)(option, group.options, __props.modelValue) === "indeterminate",
							disabled: __props.readonly || unref(isOptionImplied)(option, group.options, __props.modelValue) || unref(isOptionMandatory)(group.resource, option),
							class: normalizeClass(_ctx.$style.checkbox),
							"onUpdate:modelValue": ($event) => onToggle(option, group.options)
						}, null, 8, [
							"data-test-id",
							"label",
							"model-value",
							"indeterminate",
							"disabled",
							"class",
							"onUpdate:modelValue"
						])]),
						_: 2
					}, 1032, ["content", "disabled"]);
				}), 128)), !__props.readonly && unref(getEscalationWarningKey)(group.resource, __props.modelValue) ? (openBlock(), createBlock(unref(N8nCallout_default), {
					key: 2,
					theme: "warning",
					class: normalizeClass(_ctx.$style.warning),
					"data-test-id": `scope-escalation-warning-${group.resource}`
				}, {
					default: withCtx(() => [createVNode(unref(I18nT), {
						keypath: unref(getEscalationWarningKey)(group.resource, __props.modelValue),
						scope: "global"
					}, {
						link: withCtx(() => [createVNode(unref(N8nLink_default), {
							href: unref(CUSTOM_ROLES_DOCS_URL),
							"new-window": true,
							size: "small",
							theme: "text",
							bold: true,
							underline: true
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceRoles.warning.viewDocs")), 1)]),
							_: 1
						}, 8, ["href"])]),
						_: 1
					}, 8, ["keypath"])]),
					_: 2
				}, 1032, ["class", "data-test-id"])) : createCommentVNode("", true)], 2)], 2);
			}), 128))], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_rev8u_2",
	cardContainer: "_cardContainer_rev8u_10",
	card: "_card_rev8u_10",
	cardTitle: "_cardTitle_rev8u_28",
	optionList: "_optionList_rev8u_35",
	optionListInset: "_optionListInset_rev8u_48",
	checkbox: "_checkbox_rev8u_31",
	loading: "_loading_rev8u_65",
	warning: "_warning_rev8u_70"
} }]]);
//#endregion
//#region src/features/roles/instance/InstanceRoleView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = {
	key: 0,
	class: "mb-l"
};
var _hoisted_2 = {
	key: 1,
	class: "mt-xl"
};
var _hoisted_3 = { key: 1 };
var InstanceRoleView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceRoleView",
	props: { roleSlug: {} },
	setup(__props) {
		const rolesStore = useRolesStore();
		const router = useRouter();
		const { deleteBlockedReason } = useRoleDeleteGuard();
		const { showMessage, showError } = useToast();
		const i18n = useI18n();
		const message = useMessage();
		const telemetry = useTelemetry();
		const { reassignState, requestDelete, confirmReassignDelete, cancelReassign } = useRoleDeletion();
		const props = __props;
		const { activeTab, tabOptions, form, isLoading, initialState, isReadOnly, isNew, showEditButtons, showCreateButton, hasUnsavedChanges, displayNameValidationRules, submitted, validateOnSubmit, resetForm } = useRoleEditorForm({
			roleSlug: () => props.roleSlug,
			viewRoute: VIEWS.INSTANCE_ROLE_VIEW,
			filterScopes: (scopes) => scopes.filter((s) => ALL_INSTANCE_SCOPES.includes(s)),
			ensureScopes: withMandatoryInstanceScopes,
			fetchError: i18n.baseText("roles.instance.action.fetch.error")
		});
		const editorLabels = computed(() => ({
			newRoleTitle: i18n.baseText("roles.instance.newRole"),
			roleName: i18n.baseText("projectRoles.roleName"),
			description: i18n.baseText("projectRoles.description"),
			optional: i18n.baseText("projectRoles.optional"),
			systemRoleNotEditable: i18n.baseText("projectRoles.systemRoleNotEditable"),
			discardChanges: i18n.baseText("projectRoles.discardChanges"),
			save: i18n.baseText("projectRoles.save"),
			create: i18n.baseText("projectRoles.create")
		}));
		const PRESET_ROLE_SLUGS = [GLOBAL_MEMBER_ROLE_SLUG, GLOBAL_ADMIN_ROLE_SLUG];
		const presetRoles = computed(() => PRESET_ROLE_SLUGS.flatMap((slug) => rolesStore.processedInstanceRoles.filter((r) => r.systemRole && r.slug === slug)));
		const sameScopeSet = (a, b) => {
			const setA = new Set(a);
			const setB = new Set(b);
			return setA.size === setB.size && [...setA].every((scope) => setB.has(scope));
		};
		const activePresetSlug = computed(() => presetRoles.value.find((preset) => sameScopeSet(getPresetScopes(preset.scopes), form.value.scopes))?.slug ?? null);
		const reassignTargetRoles = computed(() => rolesStore.processedInstanceRoles.filter((r) => r.slug !== reassignState.value?.role.slug));
		const deleteBlockedTooltip = computed(() => initialState.value ? deleteBlockedReason(initialState.value, "global") : void 0);
		const isDeleteDisabled = computed(() => Boolean(deleteBlockedTooltip.value));
		function onBackClick() {
			router.push({
				name: VIEWS.ROLES_SETTINGS,
				query: { tab: "instance" }
			});
		}
		function setPreset(slug) {
			const preset = rolesStore.processedInstanceRoles.find((role) => role.slug === slug);
			if (!preset) return;
			form.value.scopes = getPresetScopes(preset.scopes);
		}
		async function createInstanceRole() {
			if (!validateOnSubmit("roles.instance.action.create.error")) return;
			try {
				const role = await rolesStore.createRole({
					displayName: form.value.displayName,
					description: form.value.description ?? void 0,
					scopes: form.value.scopes,
					roleType: "global"
				});
				rolesStore.fetchRoles();
				telemetry.track("User successfully created new role", {
					role_id: role.slug,
					role_name: role.displayName,
					role_type: "instance",
					permissions: role.scopes
				});
				router.replace({
					name: VIEWS.INSTANCE_ROLE_SETTINGS,
					params: { roleSlug: role.slug }
				});
				showMessage({
					type: "success",
					message: i18n.baseText("roles.instance.action.create.success")
				});
				initialState.value = structuredClone(role);
				return role;
			} catch (error) {
				showError(error, i18n.baseText("roles.instance.action.create.error"));
				return;
			}
		}
		async function confirmRoleUpdate(slug) {
			const usedByUsers = await rolesStore.fetchRoleBySlug({ slug }).then((role) => role.usedByUsers).catch(() => initialState.value?.usedByUsers);
			if (!usedByUsers) return true;
			return await message.confirm(i18n.baseText("roles.instance.action.update.text", {
				interpolate: { count: usedByUsers },
				adjustToNumber: usedByUsers
			}), i18n.baseText("roles.instance.action.update.title"), {
				type: "warning",
				confirmButtonText: i18n.baseText("projectRoles.action.update"),
				cancelButtonText: i18n.baseText("roles.action.cancel")
			}) === MODAL_CONFIRM;
		}
		async function updateInstanceRole(slug) {
			if (!await confirmRoleUpdate(slug)) return;
			try {
				const role = await rolesStore.updateRole(slug, {
					displayName: form.value.displayName,
					description: form.value.description ?? void 0,
					scopes: form.value.scopes
				});
				rolesStore.fetchRoles();
				telemetry.track("User updated role", {
					role_id: role.slug,
					role_name: role.displayName,
					role_type: "instance",
					permissions_from: initialState.value?.scopes,
					permissions_to: role.scopes
				});
				initialState.value = structuredClone(role);
				showMessage({
					type: "success",
					message: i18n.baseText("roles.instance.action.update.success")
				});
				return role;
			} catch (error) {
				showError(error, i18n.baseText("roles.instance.action.update.error"));
				return;
			}
		}
		async function handleSubmit() {
			if (props.roleSlug) await updateInstanceRole(props.roleSlug);
			else await createInstanceRole();
		}
		async function deleteRole() {
			if (!initialState.value) return;
			await requestDelete(initialState.value, {
				roleType: "global",
				redirectTo: {
					name: VIEWS.ROLES_SETTINGS,
					query: { tab: "instance" }
				}
			});
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(RoleEditorLayout_default, {
				"display-name": unref(form).displayName,
				"onUpdate:displayName": _cache[3] || (_cache[3] = ($event) => unref(form).displayName = $event),
				description: unref(form).description,
				"onUpdate:description": _cache[4] || (_cache[4] = ($event) => unref(form).description = $event),
				"is-new": unref(isNew),
				"is-read-only": unref(isReadOnly),
				"show-edit-buttons": unref(showEditButtons),
				"show-create-button": unref(showCreateButton),
				"has-unsaved-changes": unref(hasUnsavedChanges),
				"back-button-text": unref(i18n).baseText("roles.instance.backToRoles"),
				labels: editorLabels.value,
				"display-name-validation-rules": unref(displayNameValidationRules),
				"show-display-name-error": unref(submitted),
				onBack: onBackClick,
				onSave: handleSubmit,
				onDiscard: _cache[5] || (_cache[5] = ($event) => unref(resetForm)(unref(initialState))),
				onCreate: handleSubmit
			}, {
				default: withCtx(() => [
					__props.roleSlug ? (openBlock(), createElementBlock("div", _hoisted_1, [createVNode(unref(Tabs_default), {
						modelValue: unref(activeTab),
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(activeTab) ? activeTab.value = $event : null),
						options: unref(tabOptions)
					}, null, 8, ["modelValue", "options"])])) : createCommentVNode("", true),
					withDirectives(createBaseVNode("div", null, [
						!unref(isReadOnly) ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(N8nText_default), {
							color: "text-light",
							class: "mb-2xs",
							tag: "p"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("roles.instance.preset")), 1)]),
							_: 1
						}), createBaseVNode("div", { class: normalizeClass(["mb-s", _ctx.$style.presetsContainer]) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(presetRoles.value, (preset) => {
							return openBlock(), createBlock(unref(N8nButton_default), {
								key: preset.slug,
								variant: preset.slug === activePresetSlug.value ? "solid" : "outline",
								"aria-pressed": preset.slug === activePresetSlug.value,
								"data-test-id": `role-preset-${preset.slug}`,
								onClick: ($event) => setPreset(preset.slug)
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(preset.displayName), 1)]),
								_: 2
							}, 1032, [
								"variant",
								"aria-pressed",
								"data-test-id",
								"onClick"
							]);
						}), 128))], 2)], 64)) : createCommentVNode("", true),
						createVNode(ScopeGroupSelector_default, {
							modelValue: unref(form).scopes,
							"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => unref(form).scopes = $event),
							readonly: unref(isReadOnly),
							loading: unref(isLoading)
						}, null, 8, [
							"modelValue",
							"readonly",
							"loading"
						]),
						__props.roleSlug && !unref(isReadOnly) ? (openBlock(), createElementBlock("div", _hoisted_2, [
							createVNode(unref(N8nHeading_default), {
								tag: "h2",
								class: "mb-2xs",
								size: "large"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("roles.instance.dangerZone")), 1)]),
								_: 1
							}),
							createVNode(unref(N8nText_default), {
								tag: "p",
								class: "mb-s"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("roles.instance.action.delete.warning")), 1)]),
								_: 1
							}),
							createVNode(unref(N8nTooltip_default), {
								disabled: !isDeleteDisabled.value,
								placement: "top-start",
								"content-class": "instanceRoleDeleteTooltip",
								content: deleteBlockedTooltip.value
							}, {
								default: withCtx(() => [createVNode(unref(N8nButton_default), {
									variant: "destructive",
									disabled: isDeleteDisabled.value,
									onClick: deleteRole
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("roles.instance.action.delete.button")), 1)]),
									_: 1
								}, 8, ["disabled"])]),
								_: 1
							}, 8, ["disabled", "content"])
						])) : createCommentVNode("", true)
					], 512), [[vShow, !__props.roleSlug || unref(activeTab) === "permissions"]]),
					__props.roleSlug && unref(activeTab) === "assignments" ? (openBlock(), createElementBlock("div", _hoisted_3, [createVNode(InstanceRoleAssignmentsTab_default, { "role-slug": __props.roleSlug }, null, 8, ["role-slug"])])) : createCommentVNode("", true),
					createVNode(DeleteInstanceRoleModal_default, {
						"model-value": unref(reassignState) !== null,
						role: unref(reassignState)?.role ?? null,
						"user-count": unref(reassignState)?.userCount ?? 0,
						"available-roles": reassignTargetRoles.value,
						onConfirm: unref(confirmReassignDelete),
						"onUpdate:modelValue": _cache[2] || (_cache[2] = (open) => !open && unref(cancelReassign)())
					}, null, 8, [
						"model-value",
						"role",
						"user-count",
						"available-roles",
						"onConfirm"
					])
				]),
				_: 1
			}, 8, [
				"display-name",
				"description",
				"is-new",
				"is-read-only",
				"show-edit-buttons",
				"show-create-button",
				"has-unsaved-changes",
				"back-button-text",
				"labels",
				"display-name-validation-rules",
				"show-display-name-error"
			]);
		};
	}
}), [["__cssModules", { "$style": { presetsContainer: "_presetsContainer_1a5k5_2" } }]]);
//#endregion
export { InstanceRoleView_default as default };
