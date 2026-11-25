import "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Iu as useEventListener, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xd as guardReactiveProps, Xf as unref, Xo as useRouter, _p as normalizeClass, af as onBeforeMount, bd as I18nT, ff as openBlock, if as nextTick, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, nf as mergeModels, pd as useDebounceFn, qo as onBeforeRouteLeave, su as ElDialog, vp as normalizeProps, xf as useModel, zd as createBaseVNode, zf as reactive } from "./vendor-Hx42-oQF.js";
import { Cm as useRBACStore, GM as Alert_default, Ik as deepCopy, Jg as useUIStore, Kd as useDocumentTitle, MA as RadioGroupItem_default, Og as isProjectRole, PA as useMessage, Ru as usePageRedirectionHelper, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, VA as isIconOrEmoji, YM as N8nActionToggle_default, Zf as useRolesStore, _C as useUsersStore, _N as N8nText_default, cN as Input_default, dC as useToast, eC as DEBOUNCE_TIME, ej as N8nDataTableServer_default, fC as VIEWS, fN as N8nTooltip_default, gM as N8nInputLabel_default, gm as useAvailableProjectSearch, hC as useTelemetry, ij as N8nUserSelect_default, jA as RadioGroup_default, jN as useI18n, mC as useCloudPlanStore, mM as N8nOption_default, nD as getResourcePermissions, nj as N8nIconPicker_default, oj as N8nUserInfo_default, pM as N8nSelect_default, px as SECRETS_PROVIDER_CONNECTION_MODAL_KEY, qy as APP_MODALS_ELEMENT_ID, uM as N8nFormInput_default, vN as N8nIconButton_default, vm as useProjectsStore, w_ as DEFAULT_PROJECT_ICON, xM as N8nEmptyState_default, xN as N8nIcon_default, xm as hasPermission, yC as useSettingsStore, yN as N8nButton_default, yy as getDebounceTime } from "./app-D5flEmb-.js";
import { t as ProjectSharing_default } from "./ProjectSharing-CHLhYej8.js";
import { t as ProjectHeader_default } from "./ProjectHeader-D25_B2LW.js";
import { n as ProjectSelfHealingSection_default } from "./src-LSY8Q0f-.js";
import { t as RoleSelectDropdown_default } from "./RoleSelectDropdown-CZKw80jp.js";
import { t as useSecretsProvidersList } from "./useSecretsProvidersList.ee-DVnqZaqI.js";
import { t as useSecretsProviderConnection } from "./useSecretsProviderConnection.ee-CxOA3MoQ.js";
//#region ../../@n8n/utils/src/search/matches-all-terms.ts
var FOLDED_LETTERS = {
	æ: "ae",
	đ: "d",
	ð: "d",
	ħ: "h",
	ı: "i",
	ł: "l",
	ø: "o",
	œ: "oe",
	ß: "ss",
	þ: "th"
};
var normalize = (value) => value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[æđðħıłøœßþ]/g, (letter) => FOLDED_LETTERS[letter] ?? letter);
/** Splits a search query into terms on whitespace. */
function splitSearchTerms(query) {
	return query.split(/\s+/).filter(Boolean);
}
/**
* Returns true when each term of `query` occurs in at least one of `fields`.
* Case and diacritics are ignored, so "jose doe" matches "José" + "Doe".
*/
function matchesAllTerms(query, fields) {
	const terms = splitSearchTerms(normalize(query));
	if (terms.length === 0) return true;
	const haystacks = fields.filter((field) => !!field).map(normalize);
	return terms.every((term) => haystacks.some((haystack) => haystack.includes(term)));
}
//#endregion
//#region src/features/collaboration/projects/components/ProjectDeleteDialog.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$7 = { key: 1 };
var _hoisted_2$3 = { class: "pt-l" };
var _hoisted_3$2 = {
	key: 0,
	class: "pt-2xs"
};
var _hoisted_4$2 = {
	key: 0,
	class: "pt-2xs"
};
//#endregion
//#region src/features/collaboration/projects/components/ProjectDeleteDialog.vue
var ProjectDeleteDialog_default = /* @__PURE__ */ defineComponent({
	__name: "ProjectDeleteDialog",
	props: /*@__PURE__*/ mergeModels({
		currentProject: {},
		searchFn: { type: Function },
		resourceCounts: {}
	}, {
		"modelValue": { type: Boolean },
		"modelModifiers": {}
	}),
	emits: /*@__PURE__*/ mergeModels(["confirmDelete"], ["update:modelValue"]),
	setup(__props, { emit: __emit }) {
		const props = __props;
		const visible = useModel(__props, "modelValue");
		const resolvedSearchFn = computed(() => props.searchFn ?? useAvailableProjectSearch());
		const filterFn = (project) => project.id !== props.currentProject?.id;
		const emit = __emit;
		const locale = useI18n();
		const selectedProject = ref(null);
		const operation = ref(null);
		const wipeConfirmText = ref("");
		const hasMovableResources = computed(() => props.resourceCounts.credentials + props.resourceCounts.workflows + props.resourceCounts.dataTables > 0);
		const isValid = computed(() => {
			const expectedWipeConfirmation = locale.baseText("projects.settings.delete.question.wipe.placeholder");
			return !hasMovableResources.value || operation.value === "transfer" && !!selectedProject.value || operation.value === "wipe" && wipeConfirmText.value === expectedWipeConfirmation;
		});
		const onDelete = () => {
			if (!isValid.value) return;
			if (operation.value === "wipe") selectedProject.value = null;
			emit("confirmDelete", selectedProject.value?.id);
		};
		function onOperation(value) {
			if (value === "transfer" || value === "wipe") operation.value = value;
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(ElDialog), {
				modelValue: visible.value,
				"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => visible.value = $event),
				title: unref(locale).baseText("projects.settings.delete.title", { interpolate: { projectName: props.currentProject?.name ?? "" } }),
				width: "650",
				"append-to": `#${unref(APP_MODALS_ELEMENT_ID)}`
			}, {
				footer: withCtx(() => [createVNode(unref(DialogFooter_default), null, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "destructive",
						type: "button",
						disabled: !isValid.value,
						"data-test-id": "project-settings-delete-confirm-button",
						onClick: withModifiers(onDelete, ["stop", "prevent"])
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("projects.settings.danger.deleteProject")), 1)]),
						_: 1
					}, 8, ["disabled"])]),
					_: 1
				})]),
				default: withCtx(() => [!hasMovableResources.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					color: "text-base"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("projects.settings.delete.message.empty")), 1)]),
					_: 1
				})) : hasMovableResources.value ? (openBlock(), createElementBlock("div", _hoisted_1$7, [createVNode(unref(N8nText_default), { color: "text-base" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("projects.settings.delete.message")), 1)]),
					_: 1
				}), createBaseVNode("div", _hoisted_2$3, [createVNode(unref(RadioGroup_default), {
					"model-value": operation.value ?? void 0,
					"onUpdate:modelValue": onOperation
				}, {
					default: withCtx(() => [createVNode(unref(RadioGroupItem_default), { value: "transfer" }, {
						label: withCtx(() => [createVNode(unref(N8nText_default), { color: "text-dark" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("projects.settings.delete.question.transfer.label")), 1)]),
							_: 1
						})]),
						content: withCtx(() => [operation.value === "transfer" ? (openBlock(), createElementBlock("div", _hoisted_3$2, [createVNode(unref(N8nText_default), { color: "text-dark" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("projects.settings.delete.question.transfer.title")), 1)]),
							_: 1
						}), createVNode(ProjectSharing_default, {
							modelValue: selectedProject.value,
							"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selectedProject.value = $event),
							class: "pt-2xs",
							"search-fn": resolvedSearchFn.value,
							"filter-fn": filterFn,
							"empty-options-text": unref(locale).baseText("projects.sharing.noMatchingProjects")
						}, null, 8, [
							"modelValue",
							"search-fn",
							"empty-options-text"
						])])) : createCommentVNode("", true)]),
						_: 1
					}), createVNode(unref(RadioGroupItem_default), { value: "wipe" }, {
						label: withCtx(() => [createVNode(unref(N8nText_default), { color: "text-dark" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("projects.settings.delete.question.wipe.label")), 1)]),
							_: 1
						})]),
						content: withCtx(() => [operation.value === "wipe" ? (openBlock(), createElementBlock("div", _hoisted_4$2, [createVNode(unref(N8nInputLabel_default), { label: unref(locale).baseText("projects.settings.delete.question.wipe.title") }, {
							default: withCtx(() => [createVNode(unref(Input_default), {
								modelValue: wipeConfirmText.value,
								"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => wipeConfirmText.value = $event),
								"data-test-id": "project-delete-confirm-input",
								placeholder: unref(locale).baseText("projects.settings.delete.question.wipe.placeholder")
							}, null, 8, ["modelValue", "placeholder"])]),
							_: 1
						}, 8, ["label"])])) : createCommentVNode("", true)]),
						_: 1
					})]),
					_: 1
				}, 8, ["model-value"])])])) : createCommentVNode("", true)]),
				_: 1
			}, 8, [
				"modelValue",
				"title",
				"append-to"
			]);
		};
	}
});
//#endregion
//#region src/features/collaboration/projects/components/ProjectRoleUpgradeDialog.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$6 = { class: "pt-l" };
var ProjectRoleUpgradeDialog_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ProjectRoleUpgradeDialog",
	props: /*@__PURE__*/ mergeModels({
		limit: {},
		planName: {}
	}, {
		"modelValue": { type: Boolean },
		"modelModifiers": {}
	}),
	emits: ["update:modelValue"],
	setup(__props) {
		const props = __props;
		const visible = useModel(__props, "modelValue");
		const pageRedirectionHelper = usePageRedirectionHelper();
		const locale = useI18n();
		const goToUpgrade = async () => {
			await pageRedirectionHelper.goToUpgrade("rbac", "upgrade-rbac");
			visible.value = false;
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(ElDialog), {
				modelValue: visible.value,
				"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => visible.value = $event),
				title: unref(locale).baseText("projects.settings.role.upgrade.title"),
				width: "500",
				"append-to": `#${unref(APP_MODALS_ELEMENT_ID)}`
			}, {
				footer: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [createVNode(unref(N8nButton_default), {
					variant: "outline",
					"native-type": "button",
					onClick: _cache[0] || (_cache[0] = ($event) => visible.value = false)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("generic.cancel")), 1)]),
					_: 1
				}), createVNode(unref(N8nButton_default), {
					variant: "solid",
					"native-type": "button",
					onClick: goToUpgrade
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("projects.create.limitReached.link")), 1)]),
					_: 1
				})], 2)]),
				default: withCtx(() => [createBaseVNode("div", _hoisted_1$6, [createVNode(unref(I18nT), {
					keypath: "projects.settings.role.upgrade.message",
					scope: "global"
				}, {
					planName: withCtx(() => [createTextVNode(toDisplayString(props.planName), 1)]),
					limit: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("projects.create.limit", {
						adjustToNumber: props.limit,
						interpolate: { count: String(props.limit) }
					})), 1)]),
					_: 1
				})])]),
				_: 1
			}, 8, [
				"modelValue",
				"title",
				"append-to"
			]);
		};
	}
}), [["__cssModules", { "$style": { footer: "_footer_149jx_1" } }]]);
//#endregion
//#region src/features/collaboration/projects/components/ProjectMembersAccessCell.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1$5 = ["aria-label"];
var ProjectMembersAccessCell_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ProjectMembersAccessCell",
	props: {
		data: {},
		projectRoles: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const label = computed(() => i18n.baseText("projects.settings.table.access.full"));
		const storedRoleName = computed(() => props.projectRoles.find((role) => role.slug === props.data.role)?.displayName);
		const tooltip = computed(() => {
			const parts = [i18n.baseText("projects.settings.table.access.tooltip.full", { interpolate: {
				name: props.data.firstName || props.data.email || "",
				role: props.data.instanceRole?.displayName ?? ""
			} })];
			if (storedRoleName.value) parts.push(i18n.baseText("projects.settings.table.access.tooltip.storedRole", { interpolate: { projectRole: storedRoleName.value } }));
			return parts.join(" ");
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nTooltip_default), {
				placement: "top",
				"show-after": 300,
				content: tooltip.value
			}, {
				default: withCtx(() => [createBaseVNode("span", {
					class: normalizeClass(_ctx.$style.label),
					tabindex: "0",
					"aria-label": `${label.value}. ${tooltip.value}`,
					"data-test-id": "project-member-access-label"
				}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.text) }, toDisplayString(label.value), 3), createVNode(unref(N8nIcon_default), {
					icon: "info",
					size: "small",
					color: "text-light",
					class: normalizeClass(_ctx.$style.icon)
				}, null, 8, ["class"])], 10, _hoisted_1$5)]),
				_: 1
			}, 8, ["content"]);
		};
	}
}), [["__cssModules", { "$style": {
	label: "_label_1myfd_1",
	text: "_text_1myfd_16",
	icon: "_icon_1myfd_22"
} }]]);
//#endregion
//#region src/features/collaboration/projects/components/ProjectMembersActionsCell.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/collaboration/projects/components/ProjectMembersActionsCell.vue
var ProjectMembersActionsCell_default = /* @__PURE__ */ defineComponent({
	__name: "ProjectMembersActionsCell",
	props: {
		data: {},
		actions: {}
	},
	emits: ["action"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const onAction = (action) => {
			emit("action", {
				action,
				userId: props.data.id
			});
		};
		return (_ctx, _cache) => {
			return props.actions.length > 0 ? (openBlock(), createBlock(unref(N8nActionToggle_default), {
				key: 0,
				placement: "bottom",
				actions: props.actions,
				theme: "dark",
				onAction
			}, null, 8, ["actions"])) : createCommentVNode("", true);
		};
	}
});
//#endregion
//#region src/features/collaboration/projects/components/ProjectMembersRoleCell.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$4 = { key: 1 };
//#endregion
//#region src/features/collaboration/projects/components/ProjectMembersRoleCell.vue
var ProjectMembersRoleCell_default = /* @__PURE__ */ defineComponent({
	__name: "ProjectMembersRoleCell",
	props: {
		data: {},
		roles: {}
	},
	emits: ["update:role", "show-role-upgrade-dialog"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const settingsStore = useSettingsStore();
		const selectedRole = computed(() => props.roles.find((role) => role.slug === props.data.role));
		const isEditable = computed(() => props.data.role !== "project:personalOwner");
		const hasCustomRolesLicense = computed(() => settingsStore.isCustomRolesFeatureEnabled);
		const canManageRoles = computed(() => hasPermission(["rbac"], { rbac: { scope: "role:manage" } }));
		const systemRoles = computed(() => props.roles.filter((role) => role.systemRole));
		const customRoles = computed(() => props.roles.filter((role) => !role.systemRole));
		const onRoleUpdate = (role) => {
			emit("update:role", {
				role,
				userId: props.data.id
			});
		};
		return (_ctx, _cache) => {
			return isEditable.value ? (openBlock(), createBlock(RoleSelectDropdown_default, {
				key: 0,
				"system-roles": systemRoles.value,
				"custom-roles": customRoles.value,
				"current-role": __props.data.role,
				"has-custom-roles-license": hasCustomRolesLicense.value,
				"can-manage-roles": canManageRoles.value,
				"add-custom-role-route-name": unref(VIEWS).PROJECT_NEW_ROLE,
				"test-id": "project-member-role-dropdown",
				"onUpdate:role": onRoleUpdate,
				onSystemRoleUpgradeNeeded: _cache[0] || (_cache[0] = ($event) => emit("show-role-upgrade-dialog"))
			}, null, 8, [
				"system-roles",
				"custom-roles",
				"current-role",
				"has-custom-roles-license",
				"can-manage-roles",
				"add-custom-role-route-name"
			])) : (openBlock(), createElementBlock("span", _hoisted_1$4, toDisplayString(selectedRole.value?.displayName), 1));
		};
	}
});
//#endregion
//#region src/features/collaboration/projects/components/ProjectMembersTable.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$3 = { class: "pt-xs pb-xs" };
//#endregion
//#region src/features/collaboration/projects/components/ProjectMembersTable.vue
var ProjectMembersTable_default = /* @__PURE__ */ defineComponent({
	__name: "ProjectMembersTable",
	props: /*@__PURE__*/ mergeModels({
		data: {},
		loading: { type: Boolean },
		currentUserId: {},
		projectRoles: {},
		actions: {},
		canEditRole: { type: Boolean }
	}, {
		"tableOptions": { default: () => ({
			page: 0,
			itemsPerPage: 10,
			sortBy: []
		}) },
		"tableOptionsModifiers": {}
	}),
	emits: /*@__PURE__*/ mergeModels([
		"update:options",
		"update:role",
		"show-role-upgrade-dialog",
		"action"
	], ["update:tableOptions"]),
	setup(__props, { emit: __emit }) {
		const i18n = useI18n();
		const props = __props;
		const emit = __emit;
		const tableOptions = useModel(__props, "tableOptions");
		const rows = computed(() => props.data.items);
		const headers = ref([
			{
				title: i18n.baseText("projects.settings.table.header.user"),
				key: "name",
				width: 400,
				disableSort: true,
				value: (row) => row
			},
			{
				title: i18n.baseText("projects.settings.table.header.role"),
				key: "role",
				width: 200,
				disableSort: true
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
		const canUpdateRole = (member) => !member.alwaysHasAccess && member.id !== props.currentUserId && props.canEditRole;
		const onRoleChange = ({ role, userId }) => {
			emit("update:role", {
				role,
				userId
			});
		};
		const filterActions = (member) => {
			if (member.alwaysHasAccess || member.id === props.currentUserId || member.role === "project:personalOwner") return [];
			return (props.actions ?? []).filter((action) => action.guard?.(member) ?? true);
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [createVNode(unref(N8nDataTableServer_default), {
				"sort-by": tableOptions.value.sortBy,
				"onUpdate:sortBy": _cache[2] || (_cache[2] = ($event) => tableOptions.value.sortBy = $event),
				page: tableOptions.value.page,
				"onUpdate:page": _cache[3] || (_cache[3] = ($event) => tableOptions.value.page = $event),
				"items-per-page": tableOptions.value.itemsPerPage,
				"onUpdate:itemsPerPage": _cache[4] || (_cache[4] = ($event) => tableOptions.value.itemsPerPage = $event),
				headers: headers.value,
				items: rows.value,
				"items-length": __props.data.count,
				loading: __props.loading,
				"page-sizes": [
					10,
					25,
					50
				],
				"onUpdate:options": _cache[5] || (_cache[5] = ($event) => emit("update:options", $event))
			}, {
				[`item.name`]: withCtx(({ value }) => [createBaseVNode("div", _hoisted_1$3, [createVNode(unref(N8nUserInfo_default), normalizeProps(guardReactiveProps(value)), null, 16)])]),
				[`item.role`]: withCtx(({ item }) => [canUpdateRole(item) ? (openBlock(), createBlock(ProjectMembersRoleCell_default, {
					key: 0,
					data: item,
					roles: props.projectRoles,
					"onUpdate:role": onRoleChange,
					onShowRoleUpgradeDialog: _cache[0] || (_cache[0] = ($event) => emit("show-role-upgrade-dialog"))
				}, null, 8, ["data", "roles"])) : item.alwaysHasAccess ? (openBlock(), createBlock(ProjectMembersAccessCell_default, {
					key: 1,
					data: item,
					"project-roles": props.projectRoles
				}, null, 8, ["data", "project-roles"])) : (openBlock(), createBlock(unref(N8nText_default), {
					key: 2,
					color: "text-dark"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(props.projectRoles.find((role) => role.slug === item.role)?.displayName ?? item.role), 1)]),
					_: 2
				}, 1024))]),
				[`item.actions`]: withCtx(({ item }) => [createVNode(ProjectMembersActionsCell_default, {
					data: item,
					actions: filterActions(item),
					onAction: _cache[1] || (_cache[1] = ($event) => _ctx.$emit("action", $event))
				}, null, 8, ["data", "actions"])]),
				_: 2
			}, 1032, [
				"sort-by",
				"page",
				"items-per-page",
				"headers",
				"items",
				"items-length",
				"loading"
			])]);
		};
	}
});
//#endregion
//#region src/features/collaboration/projects/components/ProjectExternalSecrets.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$2 = {
	key: 0,
	"data-test-id": "external-secrets-section"
};
var _hoisted_2$2 = { class: "mb-s" };
var _hoisted_3$1 = { for: "projectExternalSecrets" };
var _hoisted_4$1 = { key: 0 };
var ProjectExternalSecrets_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ProjectExternalSecrets",
	setup(__props, { expose: __expose }) {
		const i18n = useI18n();
		const toast = useToast();
		const router = useRouter();
		const projectsStore = useProjectsStore();
		const uiStore = useUIStore();
		const rbacStore = useRBACStore();
		const settingsStore = useSettingsStore();
		const secretsProviders = useSecretsProvidersList();
		const secretsProviderConnection = useSecretsProviderConnection(projectsStore.currentProjectId);
		const projectSecretConnections = ref([]);
		const connectionSecrets = reactive({});
		const isLoadingSecretConnections = ref(false);
		const secretsSearch = ref("");
		const expandedConnections = ref(/* @__PURE__ */ new Set());
		const currentPage = ref(0);
		const itemsPerPage = ref(5);
		const isFeatureEnabled = computed(() => settingsStore.moduleSettings["external-secrets"]?.forProjects ?? false);
		const hasExternalSecretsListPermission = computed(() => projectsStore.currentProject?.scopes?.includes("externalSecretsProvider:list") ?? false);
		const hasProjectExternalSecretsCreatePermission = computed(() => projectsStore.currentProject?.scopes?.includes("externalSecretsProvider:create") ?? false);
		const canCreateGlobalSecretsStore = computed(() => rbacStore.hasScope("externalSecretsProvider:create"));
		const showExternalSecretsSection = computed(() => isFeatureEnabled.value && hasExternalSecretsListPermission.value);
		const emptyStateType = computed(() => {
			if (projectSecretConnections.value.length > 0) return null;
			if (canCreateGlobalSecretsStore.value) return secretsProviders.activeProviders.value.length > 0 ? "instance-admin-no-project-providers" : "project-admin-no-providers";
			return hasProjectExternalSecretsCreatePermission.value ? "project-admin-no-providers" : null;
		});
		const emptyStateConfig = computed(() => {
			const type = emptyStateType.value;
			if (!type) return null;
			return {
				"instance-admin-no-project-providers": {
					heading: i18n.baseText("projects.settings.externalSecrets.emptyState.heading"),
					description: i18n.baseText("projects.settings.externalSecrets.emptyState.instanceAdmin.noProjectProviders.description"),
					buttonText: i18n.baseText("projects.settings.externalSecrets.button.shareSecretsStore"),
					buttonAction: onShareSecretsStore,
					testId: "external-secrets-empty-state-no-project-providers"
				},
				"project-admin-no-providers": {
					heading: i18n.baseText("projects.settings.externalSecrets.emptyState.heading"),
					description: i18n.baseText("projects.settings.externalSecrets.emptyState.projectAdmin.description"),
					buttonText: i18n.baseText("projects.settings.externalSecrets.button.addSecretsStore"),
					buttonAction: onAddSecretsStore,
					testId: "external-secrets-empty-state-project-admin"
				}
			}[type];
		});
		const sortedConnections = computed(() => [...projectSecretConnections.value].sort((a, b) => a.name.localeCompare(b.name)));
		const filteredConnections = computed(() => {
			if (!secretsSearch.value.trim()) return sortedConnections.value;
			const searchTerm = secretsSearch.value.toLowerCase();
			return sortedConnections.value.filter((connection) => {
				if (connection.name.toLowerCase().includes(searchTerm)) return true;
				return (connectionSecrets[connection.name] ?? []).some((s) => s.name.toLowerCase().includes(searchTerm));
			});
		});
		const paginatedConnections = computed(() => {
			const start = currentPage.value * itemsPerPage.value;
			const end = start + itemsPerPage.value;
			return filteredConnections.value.slice(start, end);
		});
		function getFilteredSecrets(connectionName) {
			const secrets = connectionSecrets[connectionName] ?? [];
			const searchTerm = secretsSearch.value.trim().toLowerCase();
			if (!searchTerm) return secrets;
			return secrets.filter((secret) => secret.name.toLowerCase().includes(searchTerm) || connectionName.toLowerCase().includes(searchTerm));
		}
		const tableRows = computed(() => paginatedConnections.value.map((connection) => {
			const isExpanded = expandedConnections.value.has(connection.name);
			return {
				id: `header-${connection.name}`,
				connectionName: connection.name,
				secretsCount: connection.secretsCount,
				isExpanded,
				secrets: isExpanded ? getFilteredSecrets(connection.name) : []
			};
		}));
		const tableHeaders = computed(() => [{
			title: i18n.baseText("projects.settings.externalSecrets.table.header.secretName"),
			key: "connectionName",
			disableSort: true,
			resize: false,
			value: (row) => row.connectionName
		}]);
		async function fetchSecretsForConnection(connectionName) {
			if (connectionSecrets[connectionName]?.length) return;
			const { secrets } = await secretsProviderConnection.getConnection(connectionName);
			connectionSecrets[connectionName] = secrets ?? [];
		}
		async function fetchSecretsForCurrentPage() {
			await Promise.all(paginatedConnections.value.filter((connection) => connection.secretsCount > 0).map(async (connection) => await fetchSecretsForConnection(connection.name)));
		}
		async function fetchProjectSecretConnections() {
			if (!projectsStore.currentProjectId || !hasExternalSecretsListPermission.value || !isFeatureEnabled.value) return;
			isLoadingSecretConnections.value = true;
			try {
				projectSecretConnections.value = await projectsStore.getProjectSecretProviders(projectsStore.currentProjectId);
				await fetchSecretsForCurrentPage();
			} catch (error) {
				toast.showError(error, i18n.baseText("projects.settings.externalSecrets.load.error"));
			} finally {
				isLoadingSecretConnections.value = false;
			}
		}
		function toggleConnection(connectionName) {
			if (expandedConnections.value.has(connectionName)) expandedConnections.value.delete(connectionName);
			else expandedConnections.value.add(connectionName);
		}
		function openConnectionModal(providerKey, activeTab = "connection") {
			const existingNames = secretsProviders.activeProviders.value.map((provider) => provider.name);
			uiStore.openModalWithData({
				name: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
				data: {
					activeTab,
					providerKey,
					providerTypes: secretsProviders.providerTypes.value,
					existingProviderNames: existingNames,
					projectId: projectsStore.currentProjectId,
					onClose: async () => {
						await fetchProjectSecretConnections();
					}
				}
			});
		}
		function openProviderModal(providerKey) {
			openConnectionModal(providerKey, "connection");
		}
		function onAddSecretsStore() {
			if (!hasProjectExternalSecretsCreatePermission.value) return;
			openConnectionModal();
		}
		function onShareSecretsStore() {
			router.push({ name: VIEWS.EXTERNAL_SECRETS_SETTINGS });
		}
		watch(secretsSearch, () => {
			currentPage.value = 0;
		});
		watch([currentPage, itemsPerPage], async () => {
			await fetchSecretsForCurrentPage();
		});
		watch([() => projectsStore.currentProjectId, showExternalSecretsSection], async ([newProjectId, showSection]) => {
			if (newProjectId && showSection) await fetchProjectSecretConnections();
		}, { immediate: true });
		watch(showExternalSecretsSection, async (showSection) => {
			if (!showSection) return;
			await Promise.allSettled([secretsProviders.fetchProviderTypes(), secretsProviders.fetchActiveConnections()]);
			if (canCreateGlobalSecretsStore.value) await projectsStore.getAllProjects();
		}, { immediate: true });
		__expose({ fetchProjectSecretConnections });
		return (_ctx, _cache) => {
			return showExternalSecretsSection.value ? (openBlock(), createElementBlock("fieldset", _hoisted_1$2, [createBaseVNode("h3", _hoisted_2$2, [createBaseVNode("label", _hoisted_3$1, toDisplayString(unref(i18n).baseText("projects.settings.externalSecrets")), 1)]), emptyStateConfig.value ? (openBlock(), createBlock(unref(N8nEmptyState_default), {
				key: 0,
				"data-test-id": emptyStateConfig.value.testId,
				description: "yes"
			}, {
				description: withCtx(() => [createVNode(unref(N8nHeading_default), {
					tag: "h3",
					size: "small",
					class: "mb-2xs"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(emptyStateConfig.value.heading), 1)]),
					_: 1
				}), createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-base",
					class: normalizeClass(_ctx.$style.description)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(emptyStateConfig.value.description), 1)]),
					_: 1
				}, 8, ["class"])]),
				additionalContent: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "ghost",
					size: "xsmall",
					class: "mr-2xs",
					element: "a",
					href: unref(i18n).baseText("settings.externalSecrets.docs"),
					target: "_blank",
					"data-test-id": "secrets-provider-connections-learn-more"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.learnMore")) + " ", 1), createVNode(unref(N8nIcon_default), { icon: "arrow-up-right" })]),
					_: 1
				}, 8, ["href"]), createVNode(unref(N8nButton_default), {
					variant: "outline",
					size: "xsmall",
					"data-test-id": `${emptyStateType.value}-button`,
					onClick: emptyStateConfig.value.buttonAction
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(emptyStateConfig.value.buttonText), 1)]),
					_: 1
				}, 8, ["data-test-id", "onClick"])]),
				_: 1
			}, 8, ["data-test-id"])) : projectSecretConnections.value.length > 0 ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.secretProvidersContainer)
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.actionsContainer) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.searchContainer) }, [createVNode(unref(Input_default), {
				modelValue: secretsSearch.value,
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => secretsSearch.value = $event),
				placeholder: unref(i18n).baseText("projects.settings.externalSecrets.search.placeholder"),
				clearable: "",
				"data-test-id": "secrets-providers-search"
			}, {
				prefix: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "search" })]),
				_: 1
			}, 8, ["modelValue", "placeholder"])], 2), hasProjectExternalSecretsCreatePermission.value ? (openBlock(), createBlock(unref(N8nButton_default), {
				key: 0,
				variant: "outline",
				size: "large",
				"data-test-id": "external-secrets-add-button",
				onClick: onAddSecretsStore
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("projects.settings.externalSecrets.button.addSecretsStore")), 1)]),
				_: 1
			})) : createCommentVNode("", true)], 2), createVNode(unref(N8nDataTableServer_default), {
				page: currentPage.value,
				"onUpdate:page": _cache[1] || (_cache[1] = ($event) => currentPage.value = $event),
				"items-per-page": itemsPerPage.value,
				"onUpdate:itemsPerPage": _cache[2] || (_cache[2] = ($event) => itemsPerPage.value = $event),
				headers: tableHeaders.value,
				items: tableRows.value,
				"items-length": filteredConnections.value.length,
				loading: isLoadingSecretConnections.value,
				"page-sizes": [
					5,
					10,
					25,
					50
				],
				"row-props": () => ({ class: _ctx.$style.groupHeaderRow }),
				"data-test-id": "external-secrets-table"
			}, {
				item: withCtx(({ item }) => [createBaseVNode("tr", { class: normalizeClass(_ctx.$style.groupHeaderRow) }, [createBaseVNode("td", { class: normalizeClass(_ctx.$style.groupHeaderCell) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.groupHeaderContent) }, [
					createVNode(unref(N8nIconButton_default), {
						variant: "ghost",
						icon: item.isExpanded ? "chevron-down" : "chevron-right",
						class: normalizeClass(_ctx.$style.expandButton),
						disabled: item.secretsCount === 0,
						title: item.isExpanded ? unref(i18n).baseText("projects.settings.externalSecrets.collapse") : unref(i18n).baseText("projects.settings.externalSecrets.expand"),
						"data-test-id": "external-secrets-expand-button",
						onClick: ($event) => toggleConnection(item.connectionName)
					}, null, 8, [
						"icon",
						"class",
						"disabled",
						"title",
						"onClick"
					]),
					createVNode(unref(N8nText_default), {
						class: normalizeClass(_ctx.$style.connectionLink),
						bold: "",
						onClick: ($event) => openProviderModal(item.connectionName)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(item.connectionName), 1)]),
						_: 2
					}, 1032, ["class", "onClick"]),
					createVNode(unref(N8nText_default), {
						color: "text-light",
						size: "small"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(item.secretsCount === 1 ? unref(i18n).baseText("settings.secretsProviderConnections.oneSecret") : unref(i18n).baseText("settings.secretsProviderConnections.secrets", { interpolate: { count: item.secretsCount.toString() } })), 1)]),
						_: 2
					}, 1024)
				], 2)], 2)], 2), item.isExpanded && item.secrets.length > 0 ? (openBlock(), createElementBlock("tr", _hoisted_4$1, [createBaseVNode("td", { class: normalizeClass(_ctx.$style.secretsCell) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.secretsList) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(item.secrets, (secret) => {
					return openBlock(), createElementBlock("div", {
						key: secret.name,
						class: normalizeClass(_ctx.$style.secretRow)
					}, [createBaseVNode("span", null, [createBaseVNode("code", { class: normalizeClass(_ctx.$style.secretName) }, toDisplayString(secret.name), 3)])], 2);
				}), 128))], 2)], 2)])) : createCommentVNode("", true)]),
				_: 1
			}, 8, [
				"page",
				"items-per-page",
				"headers",
				"items",
				"items-length",
				"loading",
				"row-props"
			])], 2)) : createCommentVNode("", true)])) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	description: "_description_a1205_1",
	secretProvidersContainer: "_secretProvidersContainer_a1205_6",
	actionsContainer: "_actionsContainer_a1205_12",
	searchContainer: "_searchContainer_a1205_17",
	groupHeaderRow: "_groupHeaderRow_a1205_22",
	groupHeaderCell: "_groupHeaderCell_a1205_29",
	secretsCell: "_secretsCell_a1205_41",
	secretsList: "_secretsList_a1205_45",
	secretRow: "_secretRow_a1205_50",
	groupHeaderContent: "_groupHeaderContent_a1205_65",
	expandButton: "_expandButton_a1205_74",
	secretName: "_secretName_a1205_88",
	connectionLink: "_connectionLink_a1205_95"
} }]]);
//#endregion
//#region src/features/collaboration/projects/components/ProjectSettingsCustomTelemetryTags.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var ProjectSettingsCustomTelemetryTags_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ProjectSettingsCustomTelemetryTags",
	props: { modelValue: {} },
	emits: ["update:modelValue", "validate"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const tagTouched = ref(props.modelValue.map(() => false));
		watch(() => props.modelValue.length, (len) => {
			if (len < tagTouched.value.length) tagTouched.value = tagTouched.value.slice(0, len);
		});
		const tagErrors = computed(() => {
			const seen = /* @__PURE__ */ new Set();
			return props.modelValue.map((tag) => {
				const trimmed = tag.key.trim();
				if (!trimmed) return i18n.baseText("projects.settings.customSpanAttributes.error.emptyKey");
				if (seen.has(trimmed)) return i18n.baseText("projects.settings.customSpanAttributes.error.duplicateKey");
				seen.add(trimmed);
				return null;
			});
		});
		const hasErrors = computed(() => tagErrors.value.some((e) => e !== null));
		watch(hasErrors, (val) => emit("validate", !val), { immediate: true });
		function resetTouched() {
			tagTouched.value = props.modelValue.map(() => false);
		}
		function onTagKeyBlur(index) {
			tagTouched.value[index] = true;
		}
		function addTag() {
			emit("update:modelValue", [...props.modelValue, {
				key: "",
				value: ""
			}]);
			tagTouched.value.push(false);
		}
		function removeTag(index) {
			emit("update:modelValue", props.modelValue.filter((_, i) => i !== index));
			tagTouched.value.splice(index, 1);
		}
		function onTagInput(index, field, value) {
			emit("update:modelValue", props.modelValue.map((tag, i) => i === index ? {
				...tag,
				[field]: value
			} : tag));
		}
		__expose({ resetTouched });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [
				createVNode(unref(N8nText_default), {
					size: "small",
					class: "mb-s",
					tag: "p"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("projects.settings.customSpanAttributes.description")) + " ", 1), createBaseVNode("a", {
						class: normalizeClass(_ctx.$style.docsLink),
						href: "https://docs.n8n.io/hosting/logging-monitoring/opentelemetry/",
						target: "_blank"
					}, [createTextVNode(toDisplayString(unref(i18n).baseText("projects.settings.customSpanAttributes.docsLink")), 1), createVNode(unref(N8nIcon_default), {
						icon: "arrow-up-right",
						size: "xsmall"
					})], 2)]),
					_: 1
				}),
				(openBlock(true), createElementBlock(Fragment, null, renderList(__props.modelValue, (tag, index) => {
					return openBlock(), createElementBlock("div", {
						key: index,
						class: normalizeClass(_ctx.$style.telemetryTagContainer)
					}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.telemetryTagRow) }, [
						createVNode(unref(N8nInputLabel_default), {
							label: index === 0 ? unref(i18n).baseText("projects.settings.customSpanAttributes.key.label") : void 0,
							size: "small"
						}, {
							default: withCtx(() => [createVNode(unref(Input_default), {
								"model-value": tag.key,
								placeholder: unref(i18n).baseText("projects.settings.customSpanAttributes.key.placeholder"),
								"aria-label": unref(i18n).baseText("projects.settings.customSpanAttributes.key.label"),
								"data-test-id": "project-telemetry-tag-key",
								"onUpdate:modelValue": (v) => onTagInput(index, "key", v),
								onBlur: ($event) => onTagKeyBlur(index)
							}, null, 8, [
								"model-value",
								"placeholder",
								"aria-label",
								"onUpdate:modelValue",
								"onBlur"
							])]),
							_: 2
						}, 1032, ["label"]),
						createVNode(unref(N8nInputLabel_default), {
							label: index === 0 ? unref(i18n).baseText("projects.settings.customSpanAttributes.value.label") : void 0,
							size: "small"
						}, {
							default: withCtx(() => [createVNode(unref(Input_default), {
								"model-value": tag.value,
								placeholder: unref(i18n).baseText("projects.settings.customSpanAttributes.value.placeholder"),
								"aria-label": unref(i18n).baseText("projects.settings.customSpanAttributes.value.label"),
								"data-test-id": "project-telemetry-tag-value",
								"onUpdate:modelValue": (v) => onTagInput(index, "value", v)
							}, null, 8, [
								"model-value",
								"placeholder",
								"aria-label",
								"onUpdate:modelValue"
							])]),
							_: 2
						}, 1032, ["label"]),
						createVNode(unref(N8nButton_default), {
							icon: "trash-2",
							variant: "ghost",
							size: "small",
							"native-type": "button",
							title: unref(i18n).baseText("projects.settings.customSpanAttributes.remove"),
							"aria-label": unref(i18n).baseText("projects.settings.customSpanAttributes.remove"),
							"data-test-id": "project-telemetry-tag-remove",
							onClick: withModifiers(($event) => removeTag(index), ["stop", "prevent"])
						}, null, 8, [
							"title",
							"aria-label",
							"onClick"
						])
					], 2), tagTouched.value[index] && tagErrors.value[index] ? (openBlock(), createElementBlock("span", {
						key: 0,
						class: normalizeClass(_ctx.$style.tagErrorMessage),
						"data-test-id": "project-telemetry-tag-key-error"
					}, toDisplayString(tagErrors.value[index]), 3)) : createCommentVNode("", true)], 2);
				}), 128)),
				createVNode(unref(N8nButton_default), {
					icon: "plus",
					variant: "outline",
					"native-type": "button",
					class: "mt-2xs",
					"data-test-id": "project-telemetry-tag-add",
					onClick: withModifiers(addTag, ["stop", "prevent"])
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("projects.settings.customSpanAttributes.add")), 1)]),
					_: 1
				})
			]);
		};
	}
}), [["__cssModules", { "$style": {
	telemetryTagContainer: "_telemetryTagContainer_152r7_1",
	telemetryTagRow: "_telemetryTagRow_152r7_6",
	tagErrorMessage: "_tagErrorMessage_152r7_12",
	docsLink: "_docsLink_152r7_19"
} }]]);
//#endregion
//#region src/features/collaboration/projects/components/ProjectWorkerPoolsSection.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = {
	class: "project-worker-pools",
	"data-test-id": "project-worker-pools-section"
};
var _hoisted_2$1 = { for: "projectDefaultPool" };
var ProjectWorkerPoolsSection_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ProjectWorkerPoolsSection",
	props: {
		defaultPool: {},
		availablePools: {},
		disabled: { type: Boolean }
	},
	emits: ["update:defaultPool"],
	setup(__props, { emit: __emit }) {
		const i18n = useI18n();
		const props = __props;
		const emit = __emit;
		const onUpdate = (value) => {
			emit("update:defaultPool", value === "" ? "" : value);
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("fieldset", _hoisted_1$1, [
				createBaseVNode("h3", null, [createBaseVNode("label", _hoisted_2$1, toDisplayString(unref(i18n).baseText("projects.settings.workerPools.title")), 1)]),
				createVNode(unref(N8nSelect_default), {
					id: "projectDefaultPool",
					"model-value": props.defaultPool ?? "",
					disabled: props.disabled,
					class: normalizeClass(_ctx.$style.input),
					"data-test-id": "project-default-pool-input",
					"onUpdate:modelValue": onUpdate
				}, {
					default: withCtx(() => [createVNode(unref(N8nOption_default), {
						label: unref(i18n).baseText("projects.settings.workerPools.defaultQueue"),
						value: ""
					}, null, 8, ["label"]), (openBlock(true), createElementBlock(Fragment, null, renderList(props.availablePools, (pool) => {
						return openBlock(), createBlock(unref(N8nOption_default), {
							key: pool,
							label: pool,
							value: pool
						}, null, 8, ["label", "value"]);
					}), 128))]),
					_: 1
				}, 8, [
					"model-value",
					"disabled",
					"class"
				]),
				createVNode(unref(N8nText_default), {
					color: "text-light",
					size: "small",
					class: normalizeClass(_ctx.$style.help)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("projects.settings.workerPools.help")), 1)]),
					_: 1
				}, 8, ["class"])
			]);
		};
	}
}), [["__cssModules", { "$style": {
	input: "_input_1oor6_1",
	help: "_help_1oor6_5"
} }]]);
//#endregion
//#region src/features/collaboration/projects/views/ProjectSettings.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = { for: "projectName" };
var _hoisted_2 = { for: "projectDescription" };
var _hoisted_3 = {
	key: 1,
	id: "projectMembers"
};
var _hoisted_4 = { for: "projectMembers" };
var _hoisted_5 = {
	key: 0,
	class: "mb-m",
	"data-test-id": "project-roles-managed-notice"
};
var _hoisted_6 = { key: 0 };
var _hoisted_7 = { class: "mb-m" };
var SEARCH_THRESHOLD = 10;
var ProjectSettings_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ProjectSettings",
	setup(__props) {
		const usersStore = useUsersStore();
		const i18n = useI18n();
		const projectsStore = useProjectsStore();
		const rolesStore = useRolesStore();
		const cloudPlanStore = useCloudPlanStore();
		const settingsStore = useSettingsStore();
		const toast = useToast();
		const message = useMessage();
		const router = useRouter();
		const telemetry = useTelemetry();
		const documentTitle = useDocumentTitle();
		const canUpdateProject = computed(() => !!getResourcePermissions(projectsStore.currentProject?.scopes).project.update);
		/** Changing the membership list is gated separately from editing project details. */
		const canManageMembers = computed(() => !!getResourcePermissions(projectsStore.currentProject?.scopes).project.manageMembers);
		const showSaveError = (error) => {
			toast.showError(error, i18n.baseText("projects.settings.save.error.title"));
		};
		const dialogVisible = ref(false);
		const upgradeDialogVisible = ref(false);
		const isDirty = ref(false);
		const isNameValid = ref(false);
		const isDescriptionValid = ref(true);
		const isTelemetryTagsValid = ref(true);
		const isValid = computed(() => isNameValid.value && isDescriptionValid.value && isTelemetryTagsValid.value);
		const resourceCounts = ref({
			credentials: -1,
			dataTables: -1,
			workflows: -1
		});
		const formData = ref({
			name: "",
			description: "",
			relations: [],
			customTelemetryTags: [],
			defaultPool: null
		});
		const suppressNextSync = ref(false);
		const nameInput = ref(null);
		const projectIcon = ref({ ...DEFAULT_PROJECT_ICON });
		const search = ref("");
		const membersTableState = ref({
			page: 0,
			itemsPerPage: 10,
			sortBy: []
		});
		let latestUserSearchId = 0;
		const userSearchResults = ref([]);
		const isLoadingUsers = ref(false);
		const shouldFetchAllUsers = computed(() => hasPermission(["rbac"], { rbac: { scope: "user:list" } }) || canManageMembers.value);
		const implicitMembersById = computed(() => new Map((projectsStore.currentProject?.implicitMembers ?? []).map((member) => [member.id, member])));
		const usersList = computed(() => userSearchResults.value.filter((user) => {
			return !(formData.value.relations || []).find((r) => r.id === user.id) && !implicitMembersById.value.has(user.id);
		}));
		const firstLicensedRole = computed(() => rolesStore.processedProjectRoles.find((role) => role.licensed)?.slug);
		const projectMembersActions = computed(() => {
			if (rolesManaged.value || !canManageMembers.value) return [];
			return [{
				label: i18n.baseText("projects.settings.table.row.removeUser"),
				value: "remove",
				guard: (member) => member.id !== usersStore.currentUser?.id && member.role !== "project:personalOwner"
			}];
		});
		const onAddMember = async (userId) => {
			if (!projectsStore.currentProject) return;
			if (!usersStore.usersById[userId]) return;
			const role = firstLicensedRole.value;
			if (!role) return;
			if (!formData.value.relations.find((r) => r.id === userId)) formData.value.relations.push({
				id: userId,
				role
			});
			try {
				suppressNextSync.value = true;
				await projectsStore.addMember(projectsStore.currentProject.id, {
					userId,
					role
				});
				toast.showMessage({
					type: "success",
					title: i18n.baseText("projects.settings.member.added.title")
				});
				telemetry.track("User added member to project", {
					project_id: projectsStore.currentProject.id,
					target_user_id: userId,
					role
				});
			} catch (error) {
				formData.value.relations = formData.value.relations.filter((r) => r.id !== userId);
				showSaveError(error);
			}
		};
		const onUpdateMemberRole = async ({ userId, role }) => {
			if (!projectsStore.currentProject) return;
			const memberIndex = formData.value.relations.findIndex((r) => r.id === userId);
			if (memberIndex === -1) return;
			const originalRole = formData.value.relations[memberIndex].role;
			formData.value.relations[memberIndex].role = role;
			try {
				suppressNextSync.value = true;
				await projectsStore.updateMemberRole(projectsStore.currentProject.id, userId, role);
				rolesStore.fetchRoles();
				toast.showMessage({
					type: "success",
					title: i18n.baseText("projects.settings.memberRole.updated.title")
				});
				telemetry.track("User changed member role on project", {
					project_id: projectsStore.currentProject.id,
					target_user_id: userId,
					role
				});
			} catch (error) {
				formData.value.relations[memberIndex].role = originalRole;
				toast.showError(error, i18n.baseText("projects.settings.memberRole.update.error.title"));
			}
		};
		const onTextInput = () => {
			isDirty.value = true;
		};
		const telemetryTagsRef = ref(null);
		async function onRemoveMember(userId) {
			const current = projectsStore.currentProject;
			if (!current) return;
			const idx = formData.value.relations.findIndex((r) => r.id === userId);
			if (idx === -1) return;
			const removed = formData.value.relations.splice(idx, 1)[0];
			if (!current.relations.some((r) => r.id === userId)) return;
			try {
				suppressNextSync.value = true;
				await projectsStore.removeMember(current.id, userId);
				toast.showMessage({
					type: "success",
					title: i18n.baseText("projects.settings.member.removed.title")
				});
				telemetry.track("User removed member from project", {
					project_id: current.id,
					target_user_id: userId
				});
			} catch (error) {
				formData.value.relations.splice(idx, 0, removed);
				showSaveError(error);
			}
		}
		const onMembersListAction = async ({ action, userId }) => {
			switch (action) {
				case "remove": await onRemoveMember(userId);
			}
		};
		const resetFormData = () => {
			formData.value.relations = projectsStore.currentProject?.relations ? deepCopy(projectsStore.currentProject.relations) : [];
			formData.value.name = projectsStore.currentProject?.name ?? "";
			formData.value.description = projectsStore.currentProject?.description ?? "";
			formData.value.customTelemetryTags = projectsStore.currentProject?.customTelemetryTags ? deepCopy(projectsStore.currentProject.customTelemetryTags) : [];
			telemetryTagsRef.value?.resetTouched();
			formData.value.defaultPool = projectsStore.currentProjectPoolSettings?.defaultPool ?? null;
		};
		const hasWorkerPoolsChanges = () => {
			const stored = projectsStore.currentProjectPoolSettings?.defaultPool || null;
			return (formData.value.defaultPool || null) !== stored;
		};
		const onCancel = () => {
			resetFormData();
			isDirty.value = false;
		};
		const makeFormDataDiff = () => {
			const diff = {};
			if (!projectsStore.currentProject) return diff;
			if (formData.value.name !== projectsStore.currentProject.name) diff.name = formData.value.name ?? "";
			if (formData.value.description !== projectsStore.currentProject.description) diff.description = formData.value.description ?? "";
			if (formData.value.relations.length !== projectsStore.currentProject.relations.length) {
				diff.memberAdded = formData.value.relations.filter((r) => !projectsStore.currentProject?.relations.find((cr) => cr.id === r.id));
				diff.memberRemoved = projectsStore.currentProject.relations.filter((cr) => !formData.value.relations.find((r) => r.id === cr.id));
			}
			diff.role = formData.value.relations.filter((r) => {
				return (projectsStore.currentProject?.relations.find((cr) => cr.id === r.id))?.role !== r.role && !diff.memberAdded?.find((ar) => ar.id === r.id);
			});
			return diff;
		};
		const sendTelemetry = (diff) => {
			const projectId = projectsStore.currentProject?.id;
			if (diff.name) telemetry.track("User changed project name", {
				project_id: projectId,
				name: diff.name
			});
			diff.memberAdded?.forEach((r) => {
				telemetry.track("User added member to project", {
					project_id: projectId,
					target_user_id: r.id,
					role: r.role
				});
			});
			diff.memberRemoved?.forEach((r) => {
				telemetry.track("User removed member from project", {
					project_id: projectId,
					target_user_id: r.id
				});
			});
			diff.role?.forEach((r) => {
				telemetry.track("User changed member role on project", {
					project_id: projectId,
					target_user_id: r.id,
					role: r.role
				});
			});
		};
		const updateProject = async () => {
			if (!projectsStore.currentProject) return;
			try {
				const projectId = projectsStore.currentProject.id;
				const tasks = [];
				tasks.push(projectsStore.updateProject(projectId, {
					name: formData.value.name ?? "",
					description: formData.value.description ?? "",
					...settingsStore.isOtelCustomSpanAttributesEnabled ? { customTelemetryTags: formData.value.customTelemetryTags } : {}
				}));
				if (isWorkerPoolsEnabled.value && hasWorkerPoolsChanges()) tasks.push(projectsStore.updateCurrentProjectPoolSettings(projectId, { defaultPool: formData.value.defaultPool ?? "" }));
				await Promise.all(tasks);
				isDirty.value = false;
			} catch (error) {
				showSaveError(error);
				throw error;
			}
		};
		const onSubmit = async () => {
			if (!isDirty.value) return;
			try {
				await updateProject();
				const diff = makeFormDataDiff();
				sendTelemetry(diff);
				toast.showMessage({
					title: i18n.baseText("projects.settings.save.successful.title", { interpolate: { projectName: formData.value.name ?? "" } }),
					type: "success"
				});
			} catch (error) {}
		};
		const onDelete = async () => {
			if (projectsStore.currentProjectId) resourceCounts.value = await projectsStore.getResourceCounts(projectsStore.currentProjectId);
			dialogVisible.value = true;
		};
		const onConfirmDelete = async (transferId) => {
			try {
				if (projectsStore.currentProject) {
					const projectName = projectsStore.currentProject?.name ?? "";
					await projectsStore.deleteProject(projectsStore.currentProject.id, transferId);
					isDirty.value = false;
					await router.push({ name: VIEWS.HOMEPAGE });
					toast.showMessage({
						title: i18n.baseText("projects.settings.delete.successful.title", { interpolate: { projectName } }),
						type: "success"
					});
					dialogVisible.value = true;
				}
			} catch (error) {
				toast.showError(error, i18n.baseText("projects.settings.delete.error.title"));
			}
		};
		const selectProjectNameIfMatchesDefault = () => {
			if (formData.value.name === i18n.baseText("projects.settings.newProjectName")) {
				nameInput.value?.inputRef?.focus();
				nameInput.value?.inputRef?.select();
			}
		};
		const onIconUpdated = async () => {
			if (!projectsStore.currentProject) return;
			try {
				await projectsStore.updateProject(projectsStore.currentProject.id, { icon: projectIcon.value });
				toast.showMessage({
					title: i18n.baseText("projects.settings.icon.update.successful.title"),
					type: "success"
				});
			} catch (error) {
				showSaveError(error);
			}
		};
		const isWorkerPoolsEnabled = computed(() => settingsStore.isWorkerPoolsEnabled);
		const resetPoolSettingsFormData = () => {
			formData.value.defaultPool = projectsStore.currentProjectPoolSettings?.defaultPool ?? null;
		};
		watch(() => projectsStore.currentProject, async () => {
			if (suppressNextSync.value) {
				suppressNextSync.value = false;
				return;
			}
			resetFormData();
			await nextTick();
			selectProjectNameIfMatchesDefault();
			if (projectsStore.currentProject?.icon && isIconOrEmoji(projectsStore.currentProject.icon)) projectIcon.value = projectsStore.currentProject.icon;
			const projectId = projectsStore.currentProjectId;
			if (canUpdateProject.value && projectId && isWorkerPoolsEnabled.value) await projectsStore.fetchProjectPoolSettings(projectId).catch(() => {}).finally(resetPoolSettingsFormData);
		}, { immediate: true });
		const relationUsers = computed(() => {
			const implicitMembers = implicitMembersById.value;
			const currentUserId = usersStore.currentUser?.id;
			const rows = formData.value.relations.map((relation) => {
				const user = usersStore.usersById[relation.id];
				const safeRole = isProjectRole(relation.role) ? relation.role : "project:viewer";
				const implicitMember = implicitMembers.get(relation.id);
				return {
					...user,
					...relation,
					role: safeRole,
					firstName: relation?.firstName ?? user?.firstName ?? null,
					lastName: relation?.lastName ?? user?.lastName ?? null,
					email: relation?.email ?? user?.email ?? null,
					isCurrentUser: relation.id === currentUserId,
					...implicitMember && {
						alwaysHasAccess: true,
						instanceRole: implicitMember.globalRole
					}
				};
			});
			const rowIds = new Set(rows.map((row) => row.id));
			for (const member of implicitMembers.values()) {
				if (rowIds.has(member.id)) continue;
				rows.push({
					id: member.id,
					firstName: member.firstName ?? null,
					lastName: member.lastName ?? null,
					email: member.email ?? null,
					role: member.globalRole.slug,
					isPendingUser: usersStore.usersById[member.id]?.isPendingUser ?? false,
					isCurrentUser: member.id === currentUserId,
					alwaysHasAccess: true,
					instanceRole: member.globalRole
				});
			}
			return rows;
		});
		const matchesUser = (query, user) => matchesAllTerms(query, [
			user.firstName,
			user.lastName,
			user.email
		]);
		const filteredMembers = computed(() => relationUsers.value.filter((member) => matchesUser(search.value, member)));
		const memberSortName = (member) => `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() || (member.email ?? "");
		const sortedMembers = computed(() => {
			const creatorId = projectsStore.currentProject?.creatorId;
			const currentUserId = usersStore.currentUser?.id;
			const rank = (member) => {
				if (creatorId && member.id === creatorId) return 0;
				if (member.id === currentUserId) return 1;
				return 2;
			};
			return [...filteredMembers.value].sort((a, b) => rank(a) - rank(b) || memberSortName(a).localeCompare(memberSortName(b), void 0, { sensitivity: "base" }));
		});
		const membersPageData = computed(() => {
			const { page, itemsPerPage } = membersTableState.value;
			const start = page * itemsPerPage;
			return {
				items: sortedMembers.value.slice(start, start + itemsPerPage),
				count: sortedMembers.value.length
			};
		});
		watch(() => sortedMembers.value.length, (count) => {
			const { page, itemsPerPage } = membersTableState.value;
			if (page > 0 && page * itemsPerPage >= count) membersTableState.value.page = Math.max(0, Math.ceil(count / itemsPerPage) - 1);
		});
		const shouldShowSearch = computed(() => relationUsers.value.length >= SEARCH_THRESHOLD);
		watch(shouldShowSearch, (show) => {
			if (!show && search.value) search.value = "";
		});
		const onSearch = (value) => {
			search.value = value;
			membersTableState.value.page = 0;
		};
		const onUpdateMembersTableOptions = (options) => {
			membersTableState.value = options;
		};
		const searchUsers = async (query) => {
			const searchId = ++latestUserSearchId;
			isLoadingUsers.value = true;
			try {
				const projectId = projectsStore.currentProject?.id;
				if (!projectId) {
					userSearchResults.value = [];
					return;
				}
				const filter = {};
				if (query.trim()) filter.fullText = query;
				if (!shouldFetchAllUsers.value) filter.projectId = projectId;
				await usersStore.fetchUsers({
					take: 50,
					filter
				});
				if (searchId !== latestUserSearchId) return;
				userSearchResults.value = usersStore.allUsers.filter((user) => matchesUser(query, user));
			} catch (error) {
				if (searchId !== latestUserSearchId) return;
				toast.showError(error, i18n.baseText("projects.settings.users.search.error"));
			} finally {
				if (searchId === latestUserSearchId) isLoadingUsers.value = false;
			}
		};
		const debouncedUserSearch = useDebounceFn(searchUsers, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
		onBeforeMount(async () => {
			if (!canManageMembers.value) return;
			await searchUsers("");
		});
		const rolesManaged = computed(() => projectsStore.currentProject?.rolesManaged ?? false);
		useEventListener(window, "beforeunload", (event) => {
			if (isDirty.value) event.preventDefault();
		});
		onBeforeRouteLeave(async (_to, _from, next) => {
			if (!isDirty.value) {
				next();
				return;
			}
			const response = await message.confirm(i18n.baseText("generic.unsavedWork.confirmMessage.message"), {
				title: i18n.baseText("generic.unsavedWork.confirmMessage.headline"),
				type: "warning",
				confirmButtonText: i18n.baseText("generic.unsavedWork.confirmMessage.confirmButtonText"),
				cancelButtonText: i18n.baseText("generic.unsavedWork.confirmMessage.cancelButtonText"),
				showClose: true
			});
			if (response === "confirm") {
				if (isValid.value) await onSubmit();
				next(!isDirty.value);
				return;
			}
			if (response === "cancel") {
				onCancel();
				next();
				return;
			}
			next(false);
		});
		onMounted(async () => {
			documentTitle.set(i18n.baseText("projects.settings"));
			if (!canUpdateProject.value && !canManageMembers.value) return;
			selectProjectNameIfMatchesDefault();
			await rolesStore.fetchRoles();
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.projectSettings),
				"data-test-id": "project-settings-container"
			}, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createVNode(ProjectHeader_default), canUpdateProject.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.headerRow)
				}, [createVNode(unref(N8nText_default), {
					tag: "h1",
					size: "xlarge",
					class: "pt-xs pb-m"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("projects.settings.info")), 1)]),
					_: 1
				}), createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerButtons) }, [createVNode(unref(N8nButton_default), {
					variant: "outline",
					"native-type": "button",
					disabled: !isDirty.value,
					class: "mr-2xs",
					"data-test-id": "project-settings-cancel-button",
					onClick: withModifiers(onCancel, ["stop", "prevent"])
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("projects.settings.button.cancel")), 1)]),
					_: 1
				}, 8, ["disabled"]), createVNode(unref(N8nButton_default), {
					disabled: !isValid.value || !isDirty.value,
					variant: "solid",
					"data-test-id": "project-settings-save-button",
					onClick: withModifiers(onSubmit, ["stop", "prevent"])
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("projects.settings.button.save")), 1)]),
					_: 1
				}, 8, ["disabled"])], 2)], 2)) : createCommentVNode("", true)], 2),
				createBaseVNode("form", { onSubmit: withModifiers(onSubmit, ["prevent"]) }, [
					canUpdateProject.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
						createBaseVNode("fieldset", null, [createBaseVNode("label", _hoisted_1, toDisplayString(unref(i18n).baseText("projects.settings.name")), 1), createBaseVNode("div", { class: normalizeClass(_ctx.$style.projectName) }, [createVNode(unref(N8nIconPicker_default), {
							modelValue: projectIcon.value,
							"onUpdate:modelValue": [_cache[0] || (_cache[0] = ($event) => projectIcon.value = $event), onIconUpdated],
							"button-tooltip": unref(i18n).baseText("projects.settings.iconPicker.button.tooltip"),
							"show-color-picker": ""
						}, null, 8, ["modelValue", "button-tooltip"]), createVNode(unref(N8nFormInput_default), {
							id: "projectName",
							ref_key: "nameInput",
							ref: nameInput,
							modelValue: formData.value.name,
							"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => formData.value.name = $event),
							label: "",
							type: "text",
							name: "name",
							required: "",
							"data-test-id": "project-settings-name-input",
							class: normalizeClass(_ctx.$style.projectNameInput),
							onEnter: onSubmit,
							onInput: onTextInput,
							onValidate: _cache[2] || (_cache[2] = ($event) => isNameValid.value = $event)
						}, null, 8, ["modelValue", "class"])], 2)]),
						createBaseVNode("fieldset", null, [createBaseVNode("label", _hoisted_2, toDisplayString(unref(i18n).baseText("projects.settings.description")), 1), createVNode(unref(N8nFormInput_default), {
							id: "projectDescription",
							modelValue: formData.value.description,
							"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => formData.value.description = $event),
							label: "",
							name: "description",
							type: "textarea",
							maxlength: 512,
							autosize: true,
							"data-test-id": "project-settings-description-input",
							class: normalizeClass(_ctx.$style.projectDescriptionInput),
							onEnter: onSubmit,
							onInput: onTextInput,
							onValidate: _cache[4] || (_cache[4] = ($event) => isDescriptionValid.value = $event)
						}, null, 8, ["modelValue", "class"])]),
						unref(settingsStore).moduleSettings["instance-ai"]?.workflowSuggestionsEnabled && unref(projectsStore).currentProject ? (openBlock(), createBlock(unref(ProjectSelfHealingSection_default), {
							key: 0,
							"project-id": unref(projectsStore).currentProject.id
						}, null, 8, ["project-id"])) : createCommentVNode("", true)
					], 64)) : createCommentVNode("", true),
					createVNode(ProjectExternalSecrets_default, { class: normalizeClass(_ctx.$style.externalSecrets) }, null, 8, ["class"]),
					canUpdateProject.value || canManageMembers.value ? (openBlock(), createElementBlock("fieldset", _hoisted_3, [
						createBaseVNode("h3", null, [createBaseVNode("label", _hoisted_4, toDisplayString(unref(i18n).baseText("projects.settings.projectMembers")), 1)]),
						createBaseVNode("div", { class: normalizeClass([_ctx.$style.membersInputRow, "mb-s"]) }, [createVNode(unref(N8nUserSelect_default), {
							id: "projectMembers",
							class: normalizeClass(_ctx.$style.userSelect),
							size: "large",
							users: usersList.value,
							"current-user-id": unref(usersStore).currentUser?.id,
							placeholder: unref(i18n).baseText("workflows.shareModal.select.placeholder"),
							"data-test-id": "project-members-select",
							remote: "",
							"remote-method": unref(debouncedUserSearch),
							loading: isLoadingUsers.value,
							disabled: rolesManaged.value || !canManageMembers.value,
							"onUpdate:modelValue": onAddMember
						}, {
							prefix: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "search" })]),
							_: 1
						}, 8, [
							"class",
							"users",
							"current-user-id",
							"placeholder",
							"remote-method",
							"loading",
							"disabled"
						]), shouldShowSearch.value ? (openBlock(), createBlock(unref(Input_default), {
							key: 0,
							class: normalizeClass(_ctx.$style.search),
							"model-value": search.value,
							placeholder: unref(i18n).baseText("projects.settings.members.search.placeholder"),
							clearable: "",
							"data-test-id": "project-members-search",
							"onUpdate:modelValue": onSearch
						}, {
							prefix: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "search" })]),
							_: 1
						}, 8, [
							"class",
							"model-value",
							"placeholder"
						])) : createCommentVNode("", true)], 2),
						rolesManaged.value ? (openBlock(), createElementBlock("div", _hoisted_5, [createVNode(unref(Alert_default), {
							type: "info",
							title: unref(i18n).baseText("settings.projectRolesManaged.description")
						}, null, 8, ["title"])])) : createCommentVNode("", true),
						relationUsers.value.length > 0 ? (openBlock(), createElementBlock("div", {
							key: 1,
							class: normalizeClass(_ctx.$style.membersTableContainer)
						}, [createVNode(ProjectMembersTable_default, {
							"table-options": membersTableState.value,
							"onUpdate:tableOptions": _cache[5] || (_cache[5] = ($event) => membersTableState.value = $event),
							"data-test-id": "project-members-table",
							data: membersPageData.value,
							"current-user-id": unref(usersStore).currentUser?.id,
							"project-roles": unref(rolesStore).processedProjectRoles,
							actions: projectMembersActions.value,
							"can-edit-role": !rolesManaged.value && canManageMembers.value,
							"onUpdate:options": onUpdateMembersTableOptions,
							"onUpdate:role": onUpdateMemberRole,
							onShowRoleUpgradeDialog: _cache[6] || (_cache[6] = ($event) => upgradeDialogVisible.value = true),
							onAction: onMembersListAction
						}, null, 8, [
							"table-options",
							"data",
							"current-user-id",
							"project-roles",
							"actions",
							"can-edit-role"
						])], 2)) : createCommentVNode("", true)
					])) : createCommentVNode("", true),
					canUpdateProject.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
						unref(settingsStore).isOtelCustomSpanAttributesEnabled ? (openBlock(), createElementBlock("fieldset", _hoisted_6, [createBaseVNode("h3", null, [createBaseVNode("label", null, toDisplayString(unref(i18n).baseText("projects.settings.customSpanAttributes.label")), 1)]), createVNode(ProjectSettingsCustomTelemetryTags_default, {
							ref_key: "telemetryTagsRef",
							ref: telemetryTagsRef,
							modelValue: formData.value.customTelemetryTags,
							"onUpdate:modelValue": [_cache[7] || (_cache[7] = ($event) => formData.value.customTelemetryTags = $event), onTextInput],
							onValidate: _cache[8] || (_cache[8] = ($event) => isTelemetryTagsValid.value = $event)
						}, null, 8, ["modelValue"])])) : createCommentVNode("", true),
						isWorkerPoolsEnabled.value ? (openBlock(), createBlock(ProjectWorkerPoolsSection_default, {
							key: 1,
							"default-pool": formData.value.defaultPool,
							"available-pools": unref(projectsStore).currentProjectPoolSettings?.availablePools ?? [],
							"onUpdate:defaultPool": _cache[9] || (_cache[9] = (v) => {
								formData.value.defaultPool = v;
								onTextInput();
							})
						}, null, 8, ["default-pool", "available-pools"])) : createCommentVNode("", true),
						createBaseVNode("fieldset", null, [
							createBaseVNode("h3", _hoisted_7, toDisplayString(unref(i18n).baseText("projects.settings.danger.title")), 1),
							createBaseVNode("small", { class: normalizeClass(_ctx.$style.danger) }, toDisplayString(unref(i18n).baseText("projects.settings.danger.message")), 3),
							createVNode(unref(N8nButton_default), {
								variant: "outline",
								size: "large",
								"native-type": "button",
								"data-test-id": "project-settings-delete-button",
								onClick: withModifiers(onDelete, ["stop", "prevent"])
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("projects.settings.danger.deleteProject")), 1)]),
								_: 1
							})
						])
					], 64)) : createCommentVNode("", true)
				], 32),
				createVNode(ProjectDeleteDialog_default, {
					modelValue: dialogVisible.value,
					"onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => dialogVisible.value = $event),
					"current-project": unref(projectsStore).currentProject,
					"resource-counts": resourceCounts.value,
					onConfirmDelete
				}, null, 8, [
					"modelValue",
					"current-project",
					"resource-counts"
				]),
				createVNode(ProjectRoleUpgradeDialog_default, {
					modelValue: upgradeDialogVisible.value,
					"onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => upgradeDialogVisible.value = $event),
					limit: unref(projectsStore).teamProjectsLimit,
					"plan-name": unref(cloudPlanStore).currentPlanData?.displayName
				}, null, 8, [
					"modelValue",
					"limit",
					"plan-name"
				])
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	projectSettings: "_projectSettings_17305_1",
	header: "_header_17305_25",
	headerRow: "_headerRow_17305_31",
	headerButtons: "_headerButtons_17305_38",
	upgrade: "_upgrade_17305_44",
	externalSecrets: "_externalSecrets_17305_48",
	membersInputRow: "_membersInputRow_17305_53",
	membersTableContainer: "_membersTableContainer_17305_61",
	search: "_search_17305_68",
	projectName: "_projectName_17305_73",
	projectNameInput: "_projectNameInput_17305_78",
	projectDescriptionInput: "_projectDescriptionInput_17305_82",
	userSelect: "_userSelect_17305_83",
	danger: "_danger_17305_102"
} }]]);
//#endregion
export { ProjectSettings_default as default };
