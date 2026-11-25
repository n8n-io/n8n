import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Ho as RouterLink, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Od as useCssModule, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, zd as createBaseVNode, zo as require_dateformat } from "./vendor-Hx42-oQF.js";
import { CM as N8nDatatable_default, Cm as useRBACStore, Kd as useDocumentTitle, PA as useMessage, Py as CUSTOM_ROLES_DOCS_URL, Ru as usePageRedirectionHelper, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, YM as N8nActionToggle_default, Zf as useRolesStore, _N as N8nText_default, dC as useToast, fC as VIEWS, hC as useTelemetry, hM as N8nLink_default, jN as useI18n, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default, yj as Tabs_default } from "./app-D5flEmb-.js";
import { n as useRoleDeletion, r as useRoleDeleteGuard, t as DeleteInstanceRoleModal_default } from "./DeleteInstanceRoleModal-DvTvJuw6.js";
//#region src/features/roles/components/RolesTable.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var import_dateformat = /* @__PURE__ */ __toESM(require_dateformat(), 1);
var _hoisted_1$2 = ["onClick"];
var RolesTable_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "RolesTable",
	props: {
		roles: {},
		showPaywall: { type: Boolean },
		countColumnTitle: {},
		countColumnKey: {},
		rowActions: { type: Function },
		getCountRoute: { type: Function }
	},
	emits: ["action", "row-click"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const $style = useCssModule();
		const settingsStore = useSettingsStore();
		const { goToUpgrade } = usePageRedirectionHelper();
		const columns = computed(() => [
			{
				id: "displayName",
				path: "displayName",
				label: i18n.baseText("roles.table.name"),
				width: "400px"
			},
			{
				id: "systemRole",
				path: "systemRole",
				label: i18n.baseText("roles.table.type")
			},
			{
				id: props.countColumnKey,
				path: props.countColumnKey,
				label: props.countColumnTitle
			},
			{
				id: "updatedAt",
				path: "updatedAt",
				label: i18n.baseText("roles.table.lastEdited")
			},
			{
				id: "actions",
				path: "actions",
				label: "",
				width: "50px"
			}
		]);
		const rows = computed(() => props.roles.map((r) => ({
			...r,
			id: r.slug
		})));
		function resolveCountRoute(row) {
			return props.getCountRoute?.(row) ?? "";
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [__props.showPaywall ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(unref($style).paywallContainer)
			}, [
				createBaseVNode("div", { class: normalizeClass(unref($style).paywallIcons) }, [
					createBaseVNode("div", { class: normalizeClass([unref($style).iconBox, unref($style).iconBoxLeft]) }, [createVNode(unref(N8nIcon_default), {
						icon: "eye-off",
						size: 20,
						color: "foreground-xdark"
					})], 2),
					createBaseVNode("div", { class: normalizeClass([unref($style).iconBox, unref($style).iconBoxCenter]) }, [createVNode(unref(N8nIcon_default), {
						icon: "shield-user",
						size: 20,
						color: "foreground-xdark"
					})], 2),
					createBaseVNode("div", { class: normalizeClass([unref($style).iconBox, unref($style).iconBoxRight]) }, [createVNode(unref(N8nIcon_default), {
						icon: "pencil-off",
						size: 20,
						color: "foreground-xdark"
					})], 2)
				], 2),
				createBaseVNode("div", { class: normalizeClass(unref($style).paywallText) }, [createVNode(unref(N8nText_default), {
					tag: "p",
					size: "medium",
					bold: true,
					align: "center"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("roles.paywall.title")), 1)]),
					_: 1
				}), createVNode(unref(N8nText_default), {
					tag: "p",
					color: "text-light",
					align: "center"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("roles.paywall.description")), 1)]),
					_: 1
				})], 2),
				createBaseVNode("div", { class: normalizeClass(unref($style).paywallActions) }, [createVNode(unref(N8nButton_default), {
					variant: "outline",
					size: "medium",
					href: unref(CUSTOM_ROLES_DOCS_URL),
					target: "_blank"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.learnMore")) + " ", 1), createVNode(unref(N8nIcon_default), {
						icon: "external-link",
						size: "small"
					})]),
					_: 1
				}, 8, ["href"]), createVNode(unref(N8nButton_default), {
					variant: "solid",
					size: "medium",
					onClick: _cache[0] || (_cache[0] = ($event) => unref(goToUpgrade)("custom-roles-list", "upgrade-custom-roles"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(settingsStore).isCloudDeployment ? unref(i18n).baseText("roles.paywall.viewPlans") : unref(i18n).baseText("generic.upgrade")), 1)]),
					_: 1
				})], 2)
			], 2)) : (openBlock(), createBlock(unref(N8nDatatable_default), {
				key: 1,
				columns: columns.value,
				rows: rows.value,
				pagination: false
			}, {
				row: withCtx(({ row }) => [createBaseVNode("tr", {
					class: normalizeClass([unref($style).tallRow, unref($style).clickableRow]),
					onClick: ($event) => emit("row-click", row)
				}, [
					createBaseVNode("td", null, [createVNode(unref(N8nText_default), {
						tag: "div",
						class: "mb-4xs"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(row.displayName), 1)]),
						_: 2
					}, 1024), createVNode(unref(N8nText_default), {
						tag: "div",
						size: "small",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(row.description), 1)]),
						_: 2
					}, 1024)]),
					createBaseVNode("td", null, [row.systemRole ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(N8nIcon_default), { icon: "lock" }), createTextVNode(" " + toDisplayString(unref(i18n).baseText("roles.literal.system")), 1)], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createVNode(unref(N8nIcon_default), { icon: "user-pen" }), createTextVNode(" " + toDisplayString(unref(i18n).baseText("roles.literal.custom")), 1)], 64))]),
					createBaseVNode("td", { class: normalizeClass(unref($style).countCell) }, [(row[__props.countColumnKey] ?? 0) > 0 && resolveCountRoute(row) ? (openBlock(), createBlock(unref(RouterLink), {
						key: 0,
						to: resolveCountRoute(row),
						class: normalizeClass(unref($style).countLink),
						onClick: _cache[1] || (_cache[1] = withModifiers(() => {}, ["stop"]))
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(row[__props.countColumnKey]), 1)]),
						_: 2
					}, 1032, ["to", "class"])) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createTextVNode(toDisplayString(row[__props.countColumnKey] ?? 0), 1)], 64))], 2),
					createBaseVNode("td", null, toDisplayString(row.updatedAt && !row.systemRole ? unref(import_dateformat.default)(row.updatedAt, "d mmm, yyyy") : "—"), 1),
					createBaseVNode("td", { class: normalizeClass(unref($style).actionsCell) }, [!row.systemRole ? (openBlock(), createBlock(unref(N8nActionToggle_default), {
						key: 0,
						actions: __props.rowActions(row),
						onAction: ($event) => emit("action", $event, row)
					}, null, 8, ["actions", "onAction"])) : createCommentVNode("", true)], 2)
				], 10, _hoisted_1$2)]),
				_: 1
			}, 8, ["columns", "rows"]))]);
		};
	}
}), [["__cssModules", { "$style": {
	paywallContainer: "_paywallContainer_12mtn_2",
	paywallIcons: "_paywallIcons_12mtn_12",
	iconBox: "_iconBox_12mtn_18",
	iconBoxLeft: "_iconBoxLeft_12mtn_33",
	iconBoxCenter: "_iconBoxCenter_12mtn_38",
	iconBoxRight: "_iconBoxRight_12mtn_47",
	paywallText: "_paywallText_12mtn_52",
	paywallActions: "_paywallActions_12mtn_59",
	clickableRow: "_clickableRow_12mtn_65",
	tallRow: "_tallRow_12mtn_69",
	countCell: "_countCell_12mtn_73",
	actionsCell: "_actionsCell_12mtn_78",
	countLink: "_countLink_12mtn_83"
} }]]);
//#endregion
//#region src/features/roles/composables/useRolesListActions.ts
function useRolesListActions({ roleType, views, onBeforeDelete }) {
	const { showError, showMessage } = useToast();
	const rolesStore = useRolesStore();
	const i18n = useI18n();
	const { deleteBlockedReason } = useRoleDeleteGuard();
	const telemetry = useTelemetry();
	const router = useRouter();
	const { reassignState, requestDelete, confirmReassignDelete, cancelReassign } = useRoleDeletion();
	async function duplicateRole(item) {
		try {
			const displayName = i18n.baseText("roles.action.duplicate.name", { interpolate: { roleName: item.displayName } });
			const role = await rolesStore.createRole({
				displayName,
				description: item.description ?? void 0,
				roleType,
				scopes: item.scopes
			});
			rolesStore.roles[roleType].push(role);
			rolesStore.fetchRoles();
			telemetry.track("User duplicated role", {
				role_id: item.slug,
				role_name: item.displayName,
				permissions: item.scopes
			});
			showMessage({
				type: "success",
				message: i18n.baseText("roles.action.duplicate.success", { interpolate: {
					roleName: item.displayName,
					roleDuplicateName: displayName
				} })
			});
			return role;
		} catch (error) {
			showError(error, i18n.baseText("roles.action.duplicate.error"));
			return;
		}
	}
	async function deleteRole(item) {
		await requestDelete(item, {
			roleType,
			onBeforeDelete
		});
	}
	const actions = {
		duplicate: duplicateRole,
		delete: deleteRole
	};
	function rowActions(item) {
		const deleteBlocked = deleteBlockedReason(item, roleType);
		return [{
			label: i18n.baseText("roles.action.duplicate"),
			value: "duplicate"
		}, {
			label: i18n.baseText("roles.action.delete"),
			value: "delete",
			disabled: Boolean(deleteBlocked),
			tooltip: deleteBlocked
		}];
	}
	function handleAction(action, item) {
		actions[action](item);
	}
	function handleRowClick(item) {
		router.push({
			name: item.systemRole ? views.viewRoute : views.editRoute,
			params: { roleSlug: item.slug }
		});
	}
	return {
		duplicateRole,
		deleteRole,
		actions,
		rowActions,
		handleAction,
		handleRowClick,
		reassignState,
		confirmReassignDelete,
		cancelReassign
	};
}
//#endregion
//#region src/features/roles/instance/InstanceRolesView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/roles/instance/InstanceRolesView.vue
var InstanceRolesView_default = /* @__PURE__ */ defineComponent({
	__name: "InstanceRolesView",
	setup(__props) {
		const rolesStore = useRolesStore();
		const settingsStore = useSettingsStore();
		const i18n = useI18n();
		const { rowActions, handleAction, handleRowClick, reassignState, confirmReassignDelete, cancelReassign } = useRolesListActions({
			roleType: "global",
			views: {
				viewRoute: VIEWS.INSTANCE_ROLE_VIEW,
				editRoute: VIEWS.INSTANCE_ROLE_SETTINGS
			}
		});
		const reassignTargetRoles = computed(() => reassignState.value ? rolesStore.processedInstanceRoles.filter((r) => r.slug !== reassignState.value?.role.slug) : []);
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [createVNode(RolesTable_default, {
				roles: unref(rolesStore).processedInstanceRoles,
				"show-paywall": !unref(settingsStore).isCustomRolesFeatureEnabled,
				"count-column-title": unref(i18n).baseText("instanceRoles.table.membersAssigned"),
				"count-column-key": "usedByUsers",
				"row-actions": unref(rowActions),
				onAction: unref(handleAction),
				onRowClick: unref(handleRowClick)
			}, null, 8, [
				"roles",
				"show-paywall",
				"count-column-title",
				"row-actions",
				"onAction",
				"onRowClick"
			]), createVNode(DeleteInstanceRoleModal_default, {
				"model-value": unref(reassignState) !== null,
				role: unref(reassignState)?.role ?? null,
				"user-count": unref(reassignState)?.userCount ?? 0,
				"available-roles": reassignTargetRoles.value,
				onConfirm: unref(confirmReassignDelete),
				"onUpdate:modelValue": _cache[0] || (_cache[0] = (open) => !open && unref(cancelReassign)())
			}, null, 8, [
				"model-value",
				"role",
				"user-count",
				"available-roles",
				"onConfirm"
			])]);
		};
	}
});
//#endregion
//#region src/features/roles/project/ProjectRolesView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1$1 = { class: "pb-xl" };
//#endregion
//#region src/features/roles/project/ProjectRolesView.vue
var ProjectRolesView_default = /* @__PURE__ */ defineComponent({
	__name: "ProjectRolesView",
	setup(__props) {
		const rolesStore = useRolesStore();
		const router = useRouter();
		const message = useMessage();
		const i18n = useI18n();
		const settingsStore = useSettingsStore();
		function projectAssignmentsRoute(item) {
			return {
				name: item.systemRole ? VIEWS.PROJECT_ROLE_VIEW : VIEWS.PROJECT_ROLE_SETTINGS,
				params: { roleSlug: item.slug },
				query: { tab: "assignments" }
			};
		}
		async function onBeforeDelete(item) {
			if (!item.usedByProjects || item.usedByProjects === 0) return true;
			const inUseText = [i18n.baseText("projectRoles.action.delete.useWarning.before"), i18n.baseText("projectRoles.action.delete.useWarning.linkText", {
				adjustToNumber: item.usedByProjects,
				interpolate: { count: item.usedByProjects }
			})].join(" ") + ". " + i18n.baseText("projectRoles.action.delete.useWarning.after");
			if (await message.confirm(inUseText, i18n.baseText("projectRoles.action.delete.inUse.title", { interpolate: { roleName: item.displayName } }), {
				type: "warning",
				confirmButtonText: i18n.baseText("projectRoles.action.delete.inUse.goToAssignments"),
				cancelButtonText: i18n.baseText("roles.action.cancel")
			}) === "confirm") router.push({
				name: item.systemRole ? VIEWS.PROJECT_ROLE_VIEW : VIEWS.PROJECT_ROLE_SETTINGS,
				params: { roleSlug: item.slug },
				query: { tab: "assignments" }
			});
			return false;
		}
		const { rowActions, handleAction, handleRowClick } = useRolesListActions({
			roleType: "project",
			views: {
				viewRoute: VIEWS.PROJECT_ROLE_VIEW,
				editRoute: VIEWS.PROJECT_ROLE_SETTINGS
			},
			onBeforeDelete
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", _hoisted_1$1, [createVNode(RolesTable_default, {
				roles: unref(rolesStore).processedProjectRoles,
				"show-paywall": !unref(settingsStore).isCustomRolesFeatureEnabled,
				"count-column-title": unref(i18n).baseText("projectRoles.sourceControl.table.projectsAssigned"),
				"count-column-key": "usedByProjects",
				"row-actions": unref(rowActions),
				"get-count-route": projectAssignmentsRoute,
				onAction: unref(handleAction),
				onRowClick: unref(handleRowClick)
			}, null, 8, [
				"roles",
				"show-paywall",
				"count-column-title",
				"row-actions",
				"onAction",
				"onRowClick"
			])]);
		};
	}
});
//#endregion
//#region src/features/roles/RolesView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { class: "pb-xl" };
var DEFAULT_TAB = "instance";
var RolesView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "RolesView",
	setup(__props) {
		const route = useRoute();
		const router = useRouter();
		const i18n = useI18n();
		const rolesStore = useRolesStore();
		const settingsStore = useSettingsStore();
		const { showError } = useToast();
		const rbacStore = useRBACStore();
		function normalizeTab(value) {
			return value === "project" || !rbacStore.hasScope("role:manage") ? "project" : DEFAULT_TAB;
		}
		const canManageInstanceRoles = computed(() => rbacStore.hasScope("role:manage"));
		const activeTab = ref(normalizeTab(route.query.tab));
		function addRole() {
			router.push({ name: activeTab.value === "project" ? VIEWS.PROJECT_NEW_ROLE : VIEWS.INSTANCE_NEW_ROLE });
		}
		const addRoleLabel = computed(() => i18n.baseText(activeTab.value === "project" ? "roles.addRole.project" : "roles.addRole.instance"));
		const tabOptions = computed(() => [{
			label: i18n.baseText("roles.tab.instance"),
			value: "instance",
			disabled: !canManageInstanceRoles.value,
			tooltip: canManageInstanceRoles.value ? void 0 : i18n.baseText("roles.tab.instance.disabledTooltip")
		}, {
			label: i18n.baseText("roles.tab.project"),
			value: "project"
		}]);
		watch(activeTab, (tab) => {
			if (normalizeTab(route.query.tab) !== tab) router.replace({ query: {
				...route.query,
				tab
			} });
		});
		watch(() => route.query.tab, (tab) => {
			activeTab.value = normalizeTab(tab);
		});
		onMounted(async () => {
			useDocumentTitle().set(i18n.baseText("settings.roles"));
			try {
				await rolesStore.fetchRoles();
			} catch (error) {
				showError(error, i18n.baseText("roles.fetch.error"));
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", _hoisted_1, [
				createBaseVNode("div", { class: normalizeClass(["mb-m", _ctx.$style.headerTitle]) }, [createVNode(unref(N8nHeading_default), {
					tag: "h1",
					size: "2xlarge"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.roles")), 1)]),
					_: 1
				})], 2),
				createVNode(unref(N8nText_default), {
					color: "text-base",
					class: "mb-xl",
					tag: "p"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("roles.description")) + " ", 1), createVNode(unref(N8nLink_default), {
						href: unref(CUSTOM_ROLES_DOCS_URL),
						target: "_blank",
						"new-window": "",
						underline: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("roles.description.docsLink")), 1)]),
						_: 1
					}, 8, ["href"])]),
					_: 1
				}),
				createBaseVNode("div", { class: normalizeClass([_ctx.$style.tabsRow, "mb-l"]) }, [createVNode(unref(Tabs_default), {
					modelValue: activeTab.value,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => activeTab.value = $event),
					options: tabOptions.value,
					"data-test-id": "roles-tabs"
				}, null, 8, ["modelValue", "options"]), unref(settingsStore).isCustomRolesFeatureEnabled ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					variant: "solid",
					icon: "plus",
					onClick: addRole
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(addRoleLabel.value), 1)]),
					_: 1
				})) : createCommentVNode("", true)], 2),
				activeTab.value === "instance" && canManageInstanceRoles.value ? (openBlock(), createBlock(InstanceRolesView_default, { key: 0 })) : (openBlock(), createBlock(ProjectRolesView_default, { key: 1 }))
			]);
		};
	}
}), [["__cssModules", { "$style": {
	headerTitle: "_headerTitle_1sl7n_2",
	tabsRow: "_tabsRow_1sl7n_8"
} }]]);
//#endregion
export { RolesView_default as default };
