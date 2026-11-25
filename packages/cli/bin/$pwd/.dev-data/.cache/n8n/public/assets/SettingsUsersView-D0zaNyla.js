import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Vd as createCommentVNode, Vf as ref, Xd as guardReactiveProps, Xf as unref, _p as normalizeClass, bd as I18nT, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, nf as mergeModels, pd as useDebounceFn, vp as normalizeProps, xf as useModel, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { GM as Alert_default, GS as EnterpriseEditionFeature, JA as DialogHeader_default, Jg as useUIStore, KA as Dialog_default, Kd as useDocumentTitle, Kj as N8nNotice_default, PA as useMessage, Pn as formatTimeAgo, Ru as usePageRedirectionHelper, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, Vr as useClipboard, WA as DialogBody_default, YM as N8nActionToggle_default, Zf as useRolesStore, _C as useUsersStore, _N as N8nText_default, cN as Input_default, dC as useToast, eC as DEBOUNCE_TIME, ej as N8nDataTableServer_default, f as usePrefetchModals, fC as VIEWS, fN as N8nTooltip_default, fT as ROLE, gE as USERS_LIST_SORT_OPTIONS, hM as N8nLink_default, jN as useI18n, oj as N8nUserInfo_default, ot as useSSOStore, qA as DialogTitle_default, q_ as DELETE_USER_MODAL_KEY, uv as INVITE_USER_MODAL_KEY, w_ as DEFAULT_PROJECT_ICON, xM as N8nEmptyState_default, xN as N8nIcon_default, xm as hasPermission, yC as useSettingsStore, yN as N8nButton_default, yy as getDebounceTime } from "./app-D5flEmb-.js";
import { t as ProjectIcon_default } from "./ProjectIcon-Dl4TMfdP.js";
import { n as CustomRolesUpgradeModal_default, t as RoleSelectDropdown_default } from "./RoleSelectDropdown-CZKw80jp.js";
import { i as countGrantedInstancePermissions, r as TOTAL_INSTANCE_PERMISSIONS } from "./instanceRoleScopes-C7W9BUZD.js";
import { t as useUserRoleProvisioningStore } from "./userRoleProvisioning.store-ukVDX4-n.js";
import { t as copyInviteLink } from "./invite-link.utils-D0S7Bpfa.js";
//#region src/features/settings/users/components/SettingsUsersRoleCell.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var SettingsUsersRoleCell_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SettingsUsersRoleCell",
	props: {
		data: {},
		loading: {
			type: Boolean,
			default: false
		}
	},
	emits: ["update:role"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const settingsStore = useSettingsStore();
		const rolesStore = useRolesStore();
		const currentRole = computed(() => props.data.role ?? ROLE.Default);
		const selectedRole = computed(() => rolesStore.roles.global.find((role) => role.slug === currentRole.value));
		const isEditable = computed(() => currentRole.value !== ROLE.Owner && currentRole.value !== ROLE.Default);
		const hasCustomRolesLicense = computed(() => settingsStore.isCustomRolesFeatureEnabled);
		const canChangeRole = computed(() => hasPermission(["rbac"], { rbac: { scope: "user:changeRole" } }));
		const canManageRoles = computed(() => hasPermission(["rbac"], { rbac: { scope: "role:manage" } }));
		const assignableRoles = computed(() => rolesStore.processedInstanceRoles);
		const systemRoles = computed(() => assignableRoles.value.filter((role) => role.systemRole));
		const customRoles = computed(() => rolesStore.customInstanceRoles);
		const permissionCountFor = (role) => countGrantedInstancePermissions(role.scopes ?? []);
		const upgradeModalVisible = ref(false);
		const onRoleUpdate = (role) => {
			emit("update:role", {
				role,
				userId: props.data.id
			});
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.roleCell) }, [isEditable.value && canChangeRole.value ? (openBlock(), createBlock(RoleSelectDropdown_default, {
				key: 0,
				"system-roles": systemRoles.value,
				"custom-roles": customRoles.value,
				"current-role": currentRole.value,
				"has-custom-roles-license": hasCustomRolesLicense.value,
				"can-manage-roles": canManageRoles.value,
				"add-custom-role-route-name": unref(VIEWS).INSTANCE_NEW_ROLE,
				loading: __props.loading,
				"permission-count-fn": permissionCountFor,
				"total-permissions": unref(TOTAL_INSTANCE_PERMISSIONS),
				"edit-route-name": unref(VIEWS).INSTANCE_ROLE_SETTINGS,
				"view-route-name": unref(VIEWS).INSTANCE_ROLE_VIEW,
				"from-view": unref(VIEWS).USERS_SETTINGS,
				"test-id": "user-role-dropdown",
				"onUpdate:role": onRoleUpdate,
				onSystemRoleUpgradeNeeded: _cache[0] || (_cache[0] = ($event) => upgradeModalVisible.value = true)
			}, null, 8, [
				"system-roles",
				"custom-roles",
				"current-role",
				"has-custom-roles-license",
				"can-manage-roles",
				"add-custom-role-route-name",
				"loading",
				"total-permissions",
				"edit-route-name",
				"view-route-name",
				"from-view"
			])) : (openBlock(), createElementBlock("span", {
				key: 1,
				class: normalizeClass(_ctx.$style.roleName)
			}, toDisplayString(selectedRole.value?.displayName), 3)), createVNode(CustomRolesUpgradeModal_default, {
				modelValue: upgradeModalVisible.value,
				"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => upgradeModalVisible.value = $event)
			}, null, 8, ["modelValue"])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	roleCell: "_roleCell_xu5xc_3",
	roleName: "_roleName_xu5xc_8"
} }]]);
//#endregion
//#region src/features/settings/users/components/SettingsUsersProjectsModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var SettingsUsersProjectsModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SettingsUsersProjectsModal",
	props: {
		open: { type: Boolean },
		firstName: {},
		lastName: {},
		email: {},
		projects: {}
	},
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const projectNameFilter = ref("");
		const i18n = useI18n();
		const rolesStore = useRolesStore();
		const roleDisplayNameMap = computed(() => new Map(rolesStore.roles.project.map((role) => [role.slug, role.displayName])));
		function getRoleDisplayName(slug) {
			return roleDisplayNameMap.value.get(slug) ?? slug;
		}
		const userName = computed(() => [props.firstName, props.lastName].filter(Boolean).join(" ").trim() || props.email || "");
		const projectsToShow = computed(() => {
			const query = projectNameFilter.value.trim().toLowerCase();
			if (!query) return props.projects;
			return props.projects.filter((project) => project.name.toLowerCase().includes(query));
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: __props.open,
				size: "medium",
				style: { "max-height": "50vh" },
				"onUpdate:open": _cache[1] || (_cache[1] = ($event) => emit("update:open", $event))
			}, {
				default: withCtx(() => [createVNode(unref(DialogHeader_default), { class: normalizeClass(_ctx.$style.header) }, {
					default: withCtx(() => [createVNode(unref(DialogTitle_default), { class: normalizeClass(_ctx.$style.title) }, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.users.projectsModal.title", { interpolate: { user: userName.value } })), 1)]),
						_: 1
					}, 8, ["class"]), createVNode(unref(Input_default), {
						modelValue: projectNameFilter.value,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => projectNameFilter.value = $event),
						placeholder: unref(i18n).baseText("settings.users.projectsModal.searchPlaceholder"),
						clearable: "",
						"data-test-id": "user-projects-modal-search"
					}, {
						prefix: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "search" })]),
						_: 1
					}, 8, ["modelValue", "placeholder"])]),
					_: 1
				}, 8, ["class"]), createVNode(unref(DialogBody_default), { class: normalizeClass(_ctx.$style.body) }, {
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.list) }, [projectsToShow.value.length === 0 ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						class: normalizeClass(_ctx.$style.empty),
						color: "text-light",
						size: "small"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.users.projectsModal.noResults")), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true), (openBlock(true), createElementBlock(Fragment, null, renderList(projectsToShow.value, (p) => {
						return openBlock(), createElementBlock("div", {
							key: p.id,
							class: normalizeClass(_ctx.$style.row)
						}, [createVNode(ProjectIcon_default, {
							icon: p.icon ?? unref(DEFAULT_PROJECT_ICON),
							size: "medium",
							round: ""
						}, null, 8, ["icon"]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.info) }, [createVNode(unref(N8nText_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(p.name), 1)]),
							_: 2
						}, 1024), createVNode(unref(N8nText_default), {
							color: "text-light",
							size: "small"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(getRoleDisplayName(p.role)), 1)]),
							_: 2
						}, 1024)], 2)], 2);
					}), 128))], 2)]),
					_: 1
				}, 8, ["class"])]),
				_: 1
			}, 8, ["open"]);
		};
	}
}), [["__cssModules", { "$style": {
	header: "_header_24dju_1",
	body: "_body_24dju_8",
	title: "_title_24dju_12",
	list: "_list_24dju_16",
	empty: "_empty_24dju_21",
	row: "_row_24dju_27",
	info: "_info_24dju_38"
} }]]);
//#endregion
//#region src/features/settings/users/components/SettingsUsersProjectsCell.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var SettingsUsersProjectsCell_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SettingsUsersProjectsCell",
	props: { data: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const rolesAccessingAllProjects = ref([ROLE.Owner, ROLE.Admin]);
		const visibleProjectsNum = ref(1);
		const dialogOpen = ref(false);
		const hasProjectList = computed(() => !(props.data.role && rolesAccessingAllProjects.value.includes(props.data.role)) && (props.data.projectRelations?.length ?? 0) > 0);
		const label = computed(() => {
			if (props.data.role && rolesAccessingAllProjects.value.includes(props.data.role)) return i18n.baseText("settings.users.table.row.allProjects");
			return i18n.baseText("settings.users.table.row.personalProject");
		});
		const projectNames = computed(() => props.data.projectRelations?.map(({ name }) => name) ?? []);
		const projects = computed(() => ({
			visible: projectNames.value.slice(0, visibleProjectsNum.value),
			additional: projectNames.value.slice(visibleProjectsNum.value)
		}));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.projects) }, [hasProjectList.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(N8nLink_default), {
				theme: "text",
				underline: "",
				class: normalizeClass(_ctx.$style.trigger),
				"aria-label": unref(i18n).baseText("settings.users.projectsModal.trigger"),
				title: unref(i18n).baseText("settings.users.projectsModal.trigger"),
				"data-test-id": "user-projects-cell-trigger",
				onClick: _cache[0] || (_cache[0] = withModifiers(($event) => dialogOpen.value = true, ["stop"]))
			}, {
				default: withCtx(() => [
					(openBlock(true), createElementBlock(Fragment, null, renderList(projects.value.visible, (project, index) => {
						return openBlock(), createElementBlock(Fragment, { key: index }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.project) }, toDisplayString(project), 3), index < projects.value.visible.length - 1 ? (openBlock(), createElementBlock("span", {
							key: 0,
							class: normalizeClass(_ctx.$style.comma)
						}, ",", 2)) : createCommentVNode("", true)], 64);
					}), 128)),
					projects.value.additional.length > 0 ? (openBlock(), createElementBlock("span", {
						key: 0,
						class: normalizeClass(_ctx.$style.comma)
					}, ",", 2)) : createCommentVNode("", true),
					projects.value.additional.length > 0 ? (openBlock(), createElementBlock("span", {
						key: 1,
						class: normalizeClass(_ctx.$style.additional)
					}, "+ " + toDisplayString(projects.value.additional.length), 3)) : createCommentVNode("", true)
				]),
				_: 1
			}, 8, [
				"class",
				"aria-label",
				"title"
			]), createVNode(SettingsUsersProjectsModal_default, {
				open: dialogOpen.value,
				"onUpdate:open": _cache[1] || (_cache[1] = ($event) => dialogOpen.value = $event),
				"first-name": props.data.firstName,
				"last-name": props.data.lastName,
				email: props.data.email,
				projects: props.data.projectRelations ?? []
			}, null, 8, [
				"open",
				"first-name",
				"last-name",
				"email",
				"projects"
			])], 64)) : (openBlock(), createElementBlock("span", {
				key: 1,
				class: normalizeClass(_ctx.$style.project)
			}, toDisplayString(label.value), 3))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	projects: "_projects_xproz_1",
	trigger: "_trigger_xproz_8",
	project: "_project_xproz_1",
	comma: "_comma_xproz_34",
	additional: "_additional_xproz_39"
} }]]);
//#endregion
//#region src/features/settings/users/components/SettingsUsersActionsCell.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/settings/users/components/SettingsUsersActionsCell.vue
var SettingsUsersActionsCell_default = /* @__PURE__ */ defineComponent({
	__name: "SettingsUsersActionsCell",
	props: {
		data: {},
		actions: {}
	},
	emits: ["action"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const onUserAction = (action) => {
			emit("action", {
				action,
				userId: props.data.id
			});
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [props.data.signInType !== "ldap" && props.actions.length > 0 ? (openBlock(), createBlock(unref(N8nActionToggle_default), {
				key: 0,
				placement: "bottom",
				actions: props.actions,
				theme: "dark",
				onAction: onUserAction
			}, null, 8, ["actions"])) : createCommentVNode("", true)]);
		};
	}
});
//#endregion
//#region src/features/settings/users/components/SettingsUsersLastActiveCell.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler();
//#endregion
//#region src/features/settings/users/components/SettingsUsersLastActiveCell.vue
var SettingsUsersLastActiveCell_default = /* @__PURE__ */ defineComponent({
	__name: "SettingsUsersLastActiveCell",
	props: { data: {} },
	setup(__props) {
		const i18n = useI18n();
		const props = __props;
		const formattedDate = computed(() => props.data.lastActiveAt ? formatTimeAgo(props.data.lastActiveAt) : i18n.baseText("generic.never"));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("span", null, toDisplayString(formattedDate.value), 1);
		};
	}
});
//#endregion
//#region src/features/settings/users/components/SettingsUsersTable.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { class: "pt-xs pb-xs" };
var SettingsUsersTable_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SettingsUsersTable",
	props: /*@__PURE__*/ mergeModels({
		data: {},
		actions: {},
		loading: { type: Boolean },
		canEditRole: { type: Boolean },
		updatingRoleUserId: {}
	}, {
		"tableOptions": { default: () => ({}) },
		"tableOptionsModifiers": {}
	}),
	emits: /*@__PURE__*/ mergeModels([
		"update:options",
		"update:role",
		"action"
	], ["update:tableOptions"]),
	setup(__props, { emit: __emit }) {
		const i18n = useI18n();
		const settingsStore = useSettingsStore();
		const rolesStore = useRolesStore();
		const props = __props;
		const emit = __emit;
		const tableOptions = useModel(__props, "tableOptions");
		const rows = computed(() => props.data.items);
		const headers = ref([
			{
				title: i18n.baseText("settings.users.table.header.user"),
				key: "name",
				width: 400,
				value(row) {
					return {
						...row,
						isPendingUser: row.isPending
					};
				}
			},
			{
				title: i18n.baseText("settings.users.table.header.accountType"),
				key: "role",
				width: 200
			},
			{
				title: i18n.baseText("settings.users.table.header.lastActive"),
				key: "lastActiveAt",
				value(row) {
					return {
						...row,
						lastActiveAt: row.lastActiveAt ?? ""
					};
				}
			},
			{
				title: i18n.baseText("settings.users.table.header.2fa"),
				key: "mfaEnabled",
				value(row) {
					return row.mfaEnabled ? i18n.baseText("settings.users.table.row.2fa.enabled") : i18n.baseText("settings.users.table.row.2fa.disabled");
				}
			},
			{
				title: i18n.baseText("projects.menu.title"),
				key: "projects",
				disableSort: true,
				value() {}
			},
			{
				title: "",
				key: "actions",
				align: "end",
				width: 46,
				disableSort: true,
				value() {}
			}
		]);
		const roles = computed(() => ({
			[ROLE.Owner]: {
				label: i18n.baseText("auth.roles.owner"),
				desc: ""
			},
			[ROLE.Admin]: {
				label: i18n.baseText("auth.roles.admin"),
				desc: i18n.baseText("settings.users.table.row.role.description.admin")
			},
			[ROLE.Member]: {
				label: i18n.baseText("auth.roles.member"),
				desc: i18n.baseText("settings.users.table.row.role.description.member")
			},
			...settingsStore.isChatFeatureEnabled && { [ROLE.ChatUser]: {
				label: i18n.baseText("auth.roles.chatUser"),
				desc: i18n.baseText("settings.users.table.row.role.description.chatUser")
			} },
			[ROLE.Default]: {
				label: i18n.baseText("auth.roles.default"),
				desc: ""
			},
			...Object.fromEntries(rolesStore.customInstanceRoles.map((role) => [role.slug, {
				label: role.displayName,
				desc: role.description ?? ""
			}]))
		}));
		const canUpdateRole = computed(() => {
			if (!hasPermission(["rbac"], { rbac: { scope: ["user:update", "user:changeRole"] } })) return false;
			if (!props.canEditRole) return false;
			return true;
		});
		const filterActions = (user) => {
			if (user.isOwner) return [];
			return props.actions.filter((action) => action.guard?.({
				...user,
				isPendingUser: user.isPending
			}) ?? true);
		};
		const onRoleChange = ({ role, userId }) => {
			emit("update:role", {
				role,
				userId
			});
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [createVNode(unref(N8nDataTableServer_default), {
				"sort-by": tableOptions.value.sortBy,
				"onUpdate:sortBy": _cache[1] || (_cache[1] = ($event) => tableOptions.value.sortBy = $event),
				page: tableOptions.value.page,
				"onUpdate:page": _cache[2] || (_cache[2] = ($event) => tableOptions.value.page = $event),
				"items-per-page": tableOptions.value.itemsPerPage,
				"onUpdate:itemsPerPage": _cache[3] || (_cache[3] = ($event) => tableOptions.value.itemsPerPage = $event),
				headers: headers.value,
				items: rows.value,
				"items-length": __props.data.count,
				"page-sizes": [
					10,
					25,
					50
				],
				"pin-columns": 1,
				"onUpdate:options": _cache[4] || (_cache[4] = ($event) => emit("update:options", $event))
			}, {
				[`item.name`]: withCtx(({ value }) => [createBaseVNode("div", _hoisted_1, [createVNode(unref(N8nUserInfo_default), normalizeProps(guardReactiveProps(value)), null, 16)])]),
				[`item.role`]: withCtx(({ item }) => [canUpdateRole.value ? (openBlock(), createBlock(SettingsUsersRoleCell_default, {
					key: 0,
					data: item,
					loading: props.updatingRoleUserId === item.id,
					"onUpdate:role": onRoleChange
				}, null, 8, ["data", "loading"])) : (openBlock(), createBlock(unref(N8nText_default), {
					key: 1,
					color: "text-dark",
					class: normalizeClass(_ctx.$style.roleName)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(roles.value[item.role ?? unref(ROLE).Default]?.label), 1)]),
					_: 2
				}, 1032, ["class"]))]),
				[`item.lastActiveAt`]: withCtx(({ item }) => [createVNode(SettingsUsersLastActiveCell_default, { data: item }, null, 8, ["data"])]),
				[`item.projects`]: withCtx(({ item }) => [createVNode(SettingsUsersProjectsCell_default, { data: item }, null, 8, ["data"])]),
				[`item.actions`]: withCtx(({ item }) => [createVNode(SettingsUsersActionsCell_default, {
					data: item,
					actions: filterActions(item),
					onAction: _cache[0] || (_cache[0] = ($event) => _ctx.$emit("action", $event))
				}, null, 8, ["data", "actions"])]),
				_: 2
			}, 1032, [
				"sort-by",
				"page",
				"items-per-page",
				"headers",
				"items",
				"items-length"
			])]);
		};
	}
}), [["__cssModules", { "$style": { roleName: "_roleName_evauf_1" } }]]);
//#endregion
//#region src/features/settings/users/views/SettingsUsersView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var SettingsUsersView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SettingsUsersView",
	setup(__props) {
		const clipboard = useClipboard();
		const { showToast, showError } = useToast();
		const message = useMessage();
		const settingsStore = useSettingsStore();
		const uiStore = useUIStore();
		const usersStore = useUsersStore();
		const rolesStore = useRolesStore();
		const ssoStore = useSSOStore();
		const documentTitle = useDocumentTitle();
		const pageRedirectionHelper = usePageRedirectionHelper();
		const userRoleProvisioningStore = useUserRoleProvisioningStore();
		const i18n = useI18n();
		const search = ref("");
		const usersTableState = ref({
			page: 0,
			itemsPerPage: 10,
			sortBy: [
				{
					id: "firstName",
					desc: false
				},
				{
					id: "lastName",
					desc: false
				},
				{
					id: "email",
					desc: false
				}
			]
		});
		const showUMSetupWarning = computed(() => hasPermission(["defaultUser"]));
		const isInstanceRoleProvisioningEnabled = computed(() => userRoleProvisioningStore.provisioningConfig?.scopesProvisionInstanceRole || false);
		const isExpressionMappingEnabled = computed(() => userRoleProvisioningStore.provisioningConfig?.scopesUseExpressionMapping || false);
		const isSSOEnabled = computed(() => !!ssoStore.isSamlLoginEnabled || !!ssoStore.isOidcLoginEnabled);
		usePrefetchModals([INVITE_USER_MODAL_KEY], { enabled: () => !showUMSetupWarning.value && !isSSOEnabled.value && usersStore.usersLimitNotReached && (!settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Provisioning] || userRoleProvisioningStore.provisioningConfig !== void 0) && !isInstanceRoleProvisioningEnabled.value });
		usePrefetchModals([DELETE_USER_MODAL_KEY], { enabled: () => hasPermission(["rbac"], { rbac: { scope: "user:delete" } }) });
		onMounted(async () => {
			documentTitle.set(i18n.baseText("settings.users"));
			if (!showUMSetupWarning.value) await updateUsersTableData(usersTableState.value);
			if (!rolesStore.roles.project.length) rolesStore.fetchRoles();
			if (settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Provisioning]) await userRoleProvisioningStore.getProvisioningConfig();
		});
		const usersListActions = computed(() => {
			return [
				{
					label: i18n.baseText("settings.users.actions.generateInviteLink"),
					value: "generateInviteLink",
					guard: (user) => hasPermission(["rbac"], { rbac: { scope: "user:generateInviteLink" } }) && usersStore.usersLimitNotReached && user.id !== usersStore.currentUserId && !user.firstName
				},
				{
					label: i18n.baseText("settings.users.actions.reinvite"),
					value: "reinvite",
					guard: (user) => usersStore.usersLimitNotReached && !user.firstName && settingsStore.isSmtpSetup
				},
				{
					label: i18n.baseText("settings.users.actions.delete"),
					value: "delete",
					guard: (user) => hasPermission(["rbac"], { rbac: { scope: "user:delete" } }) && user.id !== usersStore.currentUserId
				},
				{
					label: i18n.baseText("settings.users.actions.copyPasswordResetLink"),
					value: "copyPasswordResetLink",
					guard: (user) => hasPermission(["rbac"], { rbac: { scope: "user:resetPassword" } }) && usersStore.usersLimitNotReached && !user.isPendingUser && user.id !== usersStore.currentUserId
				},
				{
					label: i18n.baseText("settings.users.actions.allowSSOManualLogin"),
					value: "allowSSOManualLogin",
					guard: (user) => isSSOEnabled.value && !user.settings?.allowSSOManualLogin
				},
				{
					label: i18n.baseText("settings.users.actions.disallowSSOManualLogin"),
					value: "disallowSSOManualLogin",
					guard: (user) => isSSOEnabled.value && user.settings?.allowSSOManualLogin === true
				}
			];
		});
		const isAdvancedPermissionsEnabled = computed(() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.AdvancedPermissions]);
		const userRoles = computed(() => {
			return [
				{
					value: ROLE.Member,
					label: i18n.baseText("auth.roles.member")
				},
				{
					value: ROLE.ChatUser,
					label: i18n.baseText("auth.roles.chatUser"),
					disabled: !isAdvancedPermissionsEnabled.value
				},
				{
					value: ROLE.Admin,
					label: i18n.baseText("auth.roles.admin"),
					disabled: !isAdvancedPermissionsEnabled.value
				},
				...rolesStore.customInstanceRoles.map((role) => ({
					value: role.slug,
					label: role.displayName,
					disabled: !role.licensed
				}))
			];
		});
		async function onUsersListAction({ action, userId }) {
			switch (action) {
				case "delete":
					await onDelete(userId);
					break;
				case "reinvite":
					await onReinvite(userId);
					break;
				case "copyInviteLink":
					await onCopyInviteLink(userId);
					break;
				case "generateInviteLink":
					await onGenerateInviteLink(userId);
					break;
				case "copyPasswordResetLink":
					await onCopyPasswordResetLink(userId);
					break;
				case "allowSSOManualLogin":
					await onAllowSSOManualLogin(userId);
					break;
				case "disallowSSOManualLogin": await onDisallowSSOManualLogin(userId);
			}
		}
		function onInvite() {
			uiStore.openModalWithData({
				name: INVITE_USER_MODAL_KEY,
				data: { afterInvite: async () => {
					await updateUsersTableData(usersTableState.value);
				} }
			});
		}
		async function onDelete(userId) {
			uiStore.openModalWithData({
				name: DELETE_USER_MODAL_KEY,
				data: {
					userId,
					afterDelete: async () => {
						await updateUsersTableData(usersTableState.value);
					}
				}
			});
		}
		async function onReinvite(userId) {
			try {
				const user = usersStore.usersList.state.items.find((u) => u.id === userId);
				if (user?.email && user?.role) {
					if (!(user.role !== ROLE.Owner && user.role !== ROLE.Default && user.role !== ROLE.ChatUser)) throw new Error("Invalid role name on reinvite");
					await usersStore.reinviteUser({
						email: user.email,
						role: user.role
					});
					showToast({
						type: "success",
						title: i18n.baseText("settings.users.inviteResent"),
						message: i18n.baseText("settings.users.emailSentTo", { interpolate: { email: user.email ?? "" } })
					});
				}
			} catch (e) {
				showError(e, i18n.baseText("settings.users.userReinviteError"));
			}
		}
		async function onCopyInviteLink(userId) {
			const user = usersStore.usersList.state.items.find((u) => u.id === userId);
			if (user?.inviteAcceptUrl) {
				clipboard.copy(user.inviteAcceptUrl);
				showToast({
					type: "success",
					title: i18n.baseText("settings.users.inviteUrlCreated"),
					message: i18n.baseText("settings.users.inviteUrlCreated.message")
				});
			}
		}
		async function onGenerateInviteLink(userId) {
			try {
				if (usersStore.usersList.state.items.find((u) => u.id === userId)) {
					await copyInviteLink(clipboard, usersStore, userId);
					showToast({
						type: "success",
						title: i18n.baseText("settings.users.inviteUrlCreated"),
						message: i18n.baseText("settings.users.inviteUrlCreated.message")
					});
				}
			} catch (error) {
				showError(error, i18n.baseText("settings.users.inviteLinkError"));
			}
		}
		async function onCopyPasswordResetLink(userId) {
			try {
				const user = usersStore.usersList.state.items.find((u) => u.id === userId);
				if (user) {
					const url = await usersStore.getUserPasswordResetLink(user);
					clipboard.copy(url.link);
					showToast({
						type: "success",
						title: i18n.baseText("settings.users.passwordResetUrlCreated"),
						message: i18n.baseText("settings.users.passwordResetUrlCreated.message")
					});
				}
			} catch (error) {
				showError(error, i18n.baseText("settings.users.passwordResetLinkError"));
			}
		}
		async function onAllowSSOManualLogin(userId) {
			const user = usersStore.usersList.state.items.find((u) => u.id === userId);
			if (user) {
				if (!user.settings) user.settings = {};
				user.settings.allowSSOManualLogin = true;
				await usersStore.updateOtherUserSettings(userId, user.settings);
				await updateUsersTableData(usersTableState.value);
				showToast({
					type: "success",
					title: i18n.baseText("settings.users.allowSSOManualLogin"),
					message: i18n.baseText("settings.users.allowSSOManualLogin.message")
				});
			}
		}
		async function onDisallowSSOManualLogin(userId) {
			const user = usersStore.usersList.state.items.find((u) => u.id === userId);
			if (user?.settings) {
				user.settings.allowSSOManualLogin = false;
				await usersStore.updateOtherUserSettings(userId, user.settings);
				await updateUsersTableData(usersTableState.value);
				showToast({
					type: "success",
					title: i18n.baseText("settings.users.disallowSSOManualLogin"),
					message: i18n.baseText("settings.users.disallowSSOManualLogin.message")
				});
			}
		}
		function goToUpgrade() {
			pageRedirectionHelper.goToUpgrade("settings-users", "upgrade-users");
		}
		function goToUpgradeAdvancedPermissions() {
			pageRedirectionHelper.goToUpgrade("settings-users", "upgrade-advanced-permissions");
		}
		const updatingRoleUserId = ref(null);
		const onUpdateRole = async (payload) => {
			const user = usersStore.usersList.state.items.find((u) => u.id === payload.userId);
			if (!user) {
				showError(/* @__PURE__ */ new Error("User not found"), i18n.baseText("settings.users.userNotFound"));
				return;
			}
			await onRoleChange(user, payload.role);
		};
		const updateUsersTableData = async ({ page, itemsPerPage, sortBy }) => {
			try {
				usersTableState.value = {
					page,
					itemsPerPage,
					sortBy
				};
				const skip = page * itemsPerPage;
				const take = itemsPerPage;
				const transformedSortBy = sortBy.flatMap(({ id, desc }) => {
					const dir = desc ? "desc" : "asc";
					if (id === "name") return [
						`firstName:${dir}`,
						`lastName:${dir}`,
						`email:${dir}`
					];
					return `${id}:${dir}`;
				}).filter(isValidSortKey);
				await usersStore.usersList.execute(0, {
					skip,
					take,
					sortBy: transformedSortBy,
					expand: ["projectRelations"],
					filter: { fullText: search.value.trim() }
				});
			} catch (error) {
				showError(error, i18n.baseText("settings.users.table.update.error"));
			}
		};
		async function onRoleChange(user, newRoleName) {
			if (newRoleName === user.role) return;
			const name = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email ?? "";
			const role = userRoles.value.find(({ value }) => value === newRoleName)?.label ?? newRoleName;
			if (newRoleName === ROLE.ChatUser) {
				if (await message.confirm(i18n.baseText("settings.users.userRoleUpdated.confirm.message", { interpolate: { role } }), i18n.baseText("settings.users.userRoleUpdated.confirm.title", { interpolate: { user: name } }), {
					confirmButtonText: i18n.baseText("settings.users.userRoleUpdated.confirm.button"),
					cancelButtonText: i18n.baseText("settings.users.userRoleUpdated.cancel.button")
				}) !== "confirm") return;
			}
			updatingRoleUserId.value = user.id;
			try {
				await usersStore.updateGlobalRole({
					id: user.id,
					newRoleName
				});
				await updateUsersTableData(usersTableState.value);
				showToast({
					type: "success",
					title: i18n.baseText("settings.users.userRoleUpdated"),
					message: i18n.baseText("settings.users.userRoleUpdated.message", { interpolate: {
						user: name,
						role
					} })
				});
			} catch (e) {
				showError(e, i18n.baseText("settings.users.userRoleUpdatedError"));
			} finally {
				updatingRoleUserId.value = null;
			}
		}
		const isValidSortKey = (key) => USERS_LIST_SORT_OPTIONS.includes(key);
		const debouncedUpdateUsersTableData = useDebounceFn(() => {
			usersTableState.value.page = 0;
			updateUsersTableData(usersTableState.value);
		}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
		const onSearch = (value) => {
			search.value = value;
			debouncedUpdateUsersTableData();
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [
				createVNode(unref(N8nHeading_default), {
					tag: "h1",
					size: "2xlarge",
					class: "mb-xl"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.users")) + " ", 1), !showUMSetupWarning.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						class: normalizeClass(_ctx.$style.userCount),
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.users.count", {
							interpolate: { count: unref(usersStore).usersList.state.count },
							adjustToNumber: unref(usersStore).usersList.state.count
						})), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true)]),
					_: 1
				}),
				!unref(usersStore).usersLimitNotReached ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.setupInfoContainer)
				}, [createVNode(unref(N8nEmptyState_default), {
					heading: unref(i18n).baseText(unref(uiStore).contextBasedTranslationKeys.users.settings.unavailable.title),
					description: unref(i18n).baseText(unref(uiStore).contextBasedTranslationKeys.users.settings.unavailable.description),
					"button-text": unref(i18n).baseText(unref(uiStore).contextBasedTranslationKeys.users.settings.unavailable.button),
					"onClick:button": goToUpgrade
				}, null, 8, [
					"heading",
					"description",
					"button-text"
				])], 2)) : createCommentVNode("", true),
				!isAdvancedPermissionsEnabled.value ? (openBlock(), createBlock(unref(N8nNotice_default), { key: 1 }, {
					default: withCtx(() => [createVNode(unref(I18nT), {
						keypath: "settings.users.advancedPermissions.warning",
						scope: "global"
					}, {
						link: withCtx(() => [createVNode(unref(N8nLink_default), {
							"data-test-id": "upgrade-permissions-link",
							size: "small",
							onClick: goToUpgradeAdvancedPermissions
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.upgrade")), 1)]),
							_: 1
						})]),
						_: 1
					})]),
					_: 1
				})) : createCommentVNode("", true),
				isExpressionMappingEnabled.value ? (openBlock(), createElementBlock("div", {
					key: 2,
					class: normalizeClass(_ctx.$style.container)
				}, [createVNode(unref(Alert_default), {
					type: "info",
					title: unref(i18n).baseText("settings.provisioningInstanceRolesHandledByExpressionMapping.description")
				}, null, 8, ["title"])], 2)) : isInstanceRoleProvisioningEnabled.value ? (openBlock(), createElementBlock("div", {
					key: 3,
					class: normalizeClass(_ctx.$style.container)
				}, [createVNode(unref(Alert_default), {
					type: "info",
					title: unref(i18n).baseText("settings.provisioningInstanceRolesHandledBySsoProvider.description")
				}, null, 8, ["title"])], 2)) : createCommentVNode("", true),
				!showUMSetupWarning.value ? (openBlock(), createElementBlock("div", {
					key: 4,
					class: normalizeClass(_ctx.$style.buttonContainer)
				}, [createVNode(unref(Input_default), {
					class: normalizeClass(_ctx.$style.search),
					"model-value": search.value,
					placeholder: unref(i18n).baseText("settings.users.search.placeholder"),
					clearable: "",
					"data-test-id": "users-list-search",
					"onUpdate:modelValue": onSearch
				}, {
					prefix: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "search" })]),
					_: 1
				}, 8, [
					"class",
					"model-value",
					"placeholder"
				]), createVNode(unref(N8nTooltip_default), { disabled: !isSSOEnabled.value }, {
					content: withCtx(() => [createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("settings.users.invite.tooltip")), 1)]),
					default: withCtx(() => [createBaseVNode("div", null, [createVNode(unref(N8nButton_default), {
						disabled: isSSOEnabled.value || !unref(usersStore).usersLimitNotReached || isInstanceRoleProvisioningEnabled.value,
						label: unref(i18n).baseText("settings.users.invite"),
						size: "large",
						"data-test-id": "settings-users-invite-button",
						onClick: onInvite
					}, null, 8, ["disabled", "label"])])]),
					_: 1
				}, 8, ["disabled"])], 2)) : createCommentVNode("", true),
				unref(usersStore).usersLimitNotReached || unref(usersStore).usersList.state.count > 1 ? (openBlock(), createElementBlock("div", {
					key: 5,
					class: normalizeClass(_ctx.$style.usersContainer)
				}, [createVNode(SettingsUsersTable_default, {
					"table-options": usersTableState.value,
					"onUpdate:tableOptions": _cache[0] || (_cache[0] = ($event) => usersTableState.value = $event),
					"data-test-id": "settings-users-table",
					"can-edit-role": !isInstanceRoleProvisioningEnabled.value && !isExpressionMappingEnabled.value,
					data: unref(usersStore).usersList.state,
					loading: unref(usersStore).usersList.isLoading,
					"updating-role-user-id": updatingRoleUserId.value,
					actions: usersListActions.value,
					"onUpdate:options": updateUsersTableData,
					"onUpdate:role": onUpdateRole,
					onAction: onUsersListAction
				}, null, 8, [
					"table-options",
					"can-edit-role",
					"data",
					"loading",
					"updating-role-user-id",
					"actions"
				])], 2)) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	userCount: "_userCount_rs87l_1",
	buttonContainer: "_buttonContainer_rs87l_6",
	search: "_search_rs87l_13",
	setupInfoContainer: "_setupInfoContainer_rs87l_17",
	container: "_container_rs87l_21"
} }]]);
//#endregion
export { SettingsUsersView_default as default };
