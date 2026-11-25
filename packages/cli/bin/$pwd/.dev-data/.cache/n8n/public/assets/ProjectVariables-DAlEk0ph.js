import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Du as useAsyncState, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Of as withDirectives, Pd as Fragment, Rd as computed, Sp as toDisplayString, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, Yo as useRoute, _f as resolveDirective, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, rf as mergeProps, vp as normalizeProps, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { GS as EnterpriseEditionFeature, Ig as isVariableResource, Jg as useUIStore, Kd as useDocumentTitle, PA as useMessage, Ru as usePageRedirectionHelper, SN as _plugin_vue_export_helper_default, Vr as useClipboard, _C as useUsersStore, _M as Checkbox_default, _N as N8nText_default, bm as useSourceControlStore, cm as useEnvironmentsStore, dC as useToast, fN as N8nTooltip_default, gM as N8nInputLabel_default, hC as useTelemetry, hM as N8nLink_default, jN as useI18n, mM as N8nOption_default, nD as getResourcePermissions, nN as N8nBadge_default, pM as N8nSelect_default, vm as useProjectsStore, xM as N8nEmptyState_default, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default, y_ as VARIABLE_MODAL_KEY } from "./app-D5flEmb-.js";
import { t as ResourcesListLayout_default } from "./ResourcesListLayout-DF4MauKJ.js";
import { t as ResourcesListEmptyState_default } from "./ResourcesListEmptyState-CgwRE9Zu.js";
import { t as useProjectPages } from "./useProjectPages-OdpLVExv.js";
import { t as ProjectHeader_default } from "./ProjectHeader-D25_B2LW.js";
import { t as useInsightsStore } from "./insights.store-DnugpkOH.js";
import { t as InsightsSummary_default } from "./InsightsSummary-di7i8i9y.js";
import "./src-DnjiQGBn.js";
import { i as getProtectedInstanceTooltip } from "./sourceControl.utils-wyA1x_2k.js";
import { t as require_pickBy } from "./pickBy-Ui6BeW_E.js";
//#region src/features/settings/environments.ee/components/VariablesUsageBadge.vue?vue&type=script&setup=true&lang.ts
var import_pickBy = /* @__PURE__ */ __toESM(require_pickBy(), 1);
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/settings/environments.ee/components/VariablesUsageBadge.vue
var VariablesUsageBadge_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "VariablesUsageBadge",
	props: { name: {} },
	setup(__props) {
		const i18n = useI18n();
		const clipboard = useClipboard();
		const { showMessage } = useToast();
		const props = __props;
		const usage = computed(() => `$vars.${props.name}`);
		const handleClick = () => {
			clipboard.copy(usage.value);
			showMessage({
				title: i18n.baseText("variables.row.usage.copiedToClipboard"),
				type: "success"
			});
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nTooltip_default), { placement: "top" }, {
				content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("variables.row.usage.copyToClipboard")), 1)]),
				default: withCtx(() => [createBaseVNode("span", {
					class: "usageSyntax",
					onClick: handleClick
				}, toDisplayString(usage.value), 1)]),
				_: 1
			});
		};
	}
}), [["__scopeId", "data-v-ce74e568"]]);
//#endregion
//#region src/features/collaboration/projects/views/ProjectVariables.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { class: "mb-s" };
var _hoisted_2 = {
	key: 0,
	class: "mb-s"
};
var _hoisted_3 = { "data-test-id": "variables-row" };
var _hoisted_4 = { key: 0 };
var _hoisted_5 = { key: 0 };
var _hoisted_6 = {
	class: "scope-badge",
	style: {
		"display": "flex",
		"align-items": "center",
		"gap": "4px"
	}
};
var _hoisted_7 = {
	key: 1,
	align: "right"
};
var _hoisted_8 = { class: "action-buttons" };
var _hoisted_9 = {
	key: 0,
	class: "mt-xs"
};
var ProjectVariables_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ProjectVariables",
	setup(__props) {
		const settingsStore = useSettingsStore();
		const environmentsStore = useEnvironmentsStore();
		const usersStore = useUsersStore();
		const uiStore = useUIStore();
		const telemetry = useTelemetry();
		const i18n = useI18n();
		const message = useMessage();
		const sourceControlStore = useSourceControlStore();
		const route = useRoute();
		const router = useRouter();
		const insightsStore = useInsightsStore();
		const overview = useProjectPages();
		const projectsStore = useProjectsStore();
		const layoutRef = useTemplateRef("layoutRef");
		const { showError, showMessage } = useToast();
		const projectId = route.params.projectId;
		const globalPermissions = computed(() => getResourcePermissions(usersStore.currentUser?.globalScopes).variable);
		const projectPermissions = computed(() => getResourcePermissions(projectsStore.currentProject?.scopes).projectVariable);
		const { isLoading, execute } = useAsyncState(environmentsStore.fetchAllVariables, [], { immediate: true });
		const isFeatureEnabled = computed(() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Variables]);
		const openCreateVariableModal = () => {
			uiStore.openModalWithData({
				name: VARIABLE_MODAL_KEY,
				data: { mode: "new" }
			});
			telemetry.track("User clicked add variable button");
		};
		const openEditVariableModal = (variable) => {
			uiStore.openModalWithData({
				name: VARIABLE_MODAL_KEY,
				data: {
					mode: "edit",
					variable
				}
			});
		};
		const variables = computed(() => environmentsStore.variables.filter((v) => !projectId || v.project?.id === projectId).map((variable) => ({
			resourceType: "variable",
			id: variable.id,
			name: variable.key,
			key: variable.key,
			value: variable.value,
			project: variable.project
		})));
		const globalVariables = computed(() => environmentsStore.variables.filter((v) => !v.project));
		const canCreateVariables = computed(() => isFeatureEnabled.value && (globalPermissions.value.create ?? projectPermissions.value.create));
		const isProtectedInstance = computed(() => sourceControlStore.preferences.branchReadOnly);
		const canDeleteVariables = computed(() => !isProtectedInstance.value && !!(globalPermissions.value.delete ?? projectPermissions.value.delete));
		const deleteDisabledTooltip = computed(() => isProtectedInstance.value ? getProtectedInstanceTooltip() : i18n.baseText("variables.row.button.delete.onlyRoleCanDelete"));
		const columns = computed(() => {
			const cols = [
				{
					id: 0,
					path: "name",
					label: i18n.baseText("variables.table.key"),
					classes: ["variables-key-column"]
				},
				{
					id: 1,
					path: "value",
					label: i18n.baseText("variables.table.value"),
					classes: ["variables-value-column"]
				},
				{
					id: 2,
					path: "usage",
					label: i18n.baseText("variables.table.usage"),
					classes: ["variables-usage-column"]
				}
			];
			if (!projectId) cols.push({
				id: 3,
				path: "project",
				label: i18n.baseText("variables.table.scope"),
				classes: ["variables-scope-column"]
			});
			if (!isFeatureEnabled.value) return cols;
			return cols.concat({
				id: 4,
				path: "actions",
				label: "",
				classes: ["variables-actions-column"]
			});
		});
		const handleDeleteVariable = async (variable) => {
			try {
				if (await message.confirm(i18n.baseText("variables.modals.deleteConfirm.message", { interpolate: { name: variable.key } }), i18n.baseText("variables.modals.deleteConfirm.title"), {
					confirmButtonText: i18n.baseText("variables.modals.deleteConfirm.confirmButton"),
					cancelButtonText: i18n.baseText("variables.modals.deleteConfirm.cancelButton")
				}) !== "confirm") return;
				await environmentsStore.deleteVariable({
					id: variable.id,
					value: variable.value,
					key: variable.key
				});
				showMessage({
					title: i18n.baseText("variables.delete.successful.message", { interpolate: { variableName: variable.key } }),
					type: "success"
				});
			} catch (error) {
				showError(error, i18n.baseText("variables.errors.delete"));
			}
		};
		const updateFilter = (state) => {
			router.replace({ query: (0, import_pickBy.default)(state) });
		};
		const filters = ref({
			...route.query,
			incomplete: route.query.incomplete?.toString() === "true",
			projectId: route.query.projectId?.toString() || ""
		});
		const onSearchUpdated = (search) => {
			updateFilter({
				...filters.value,
				search
			});
		};
		const handleFilter = (resource, newFilters, matches) => {
			if (!isVariableResource(resource)) return false;
			const filtersToApply = newFilters;
			if (filtersToApply.incomplete) matches = matches && !resource.value;
			if (filtersToApply.projectId) {
				if (filtersToApply.projectId === "global") matches = matches && !resource.project;
				else matches = matches && resource.project?.id === filtersToApply.projectId;
			}
			return matches;
		};
		const nameSortFn = (a, b, direction) => {
			return direction === "asc" ? displayName(a).trim().localeCompare(displayName(b).trim()) : displayName(b).trim().localeCompare(displayName(a).trim());
		};
		const sortFns = {
			nameAsc: (a, b) => nameSortFn(a, b, "asc"),
			nameDesc: (a, b) => nameSortFn(a, b, "desc")
		};
		const projectOptions = computed(() => {
			const options = [{
				value: "global",
				label: i18n.baseText("variables.modal.scope.global"),
				icon: {
					type: "icon",
					value: "database"
				}
			}];
			options.push(...projectsStore.availableProjects.filter((project) => project.type !== "personal").map((project) => {
				const icon = project.icon ?? {
					type: "icon",
					value: "layer-group"
				};
				return {
					value: project.id,
					label: project.name ?? project.id,
					icon
				};
			}));
			return options;
		});
		const selectedProjectIcon = computed(() => {
			return projectOptions.value.find((option) => option.value === filters.value.projectId)?.icon ?? {
				type: "icon",
				value: "database"
			};
		});
		function goToUpgrade() {
			usePageRedirectionHelper().goToUpgrade("variables", "upgrade-variables");
		}
		function displayName(resource) {
			return resource.key;
		}
		sourceControlStore.$onAction(({ name, after }) => {
			if (name === "pullWorkfolder" && after) after(() => {
				execute();
			});
		});
		const unavailableNoticeProps = computed(() => ({
			heading: i18n.baseText(uiStore.contextBasedTranslationKeys.variables.unavailable.title),
			description: i18n.baseText(uiStore.contextBasedTranslationKeys.variables.unavailable.description),
			buttonText: i18n.baseText(uiStore.contextBasedTranslationKeys.variables.unavailable.button),
			buttonType: "secondary",
			"onClick:button": goToUpgrade,
			"data-test-id": "unavailable-resources-list"
		}));
		onMounted(() => {
			useDocumentTitle().set(i18n.baseText("variables.heading"));
		});
		return (_ctx, _cache) => {
			const _directive_n8n_truncate = resolveDirective("n8n-truncate");
			return openBlock(), createBlock(ResourcesListLayout_default, {
				ref_key: "layoutRef",
				ref: layoutRef,
				filters: filters.value,
				"onUpdate:filters": [_cache[1] || (_cache[1] = ($event) => filters.value = $event), updateFilter],
				"resource-key": "variables",
				disabled: !isFeatureEnabled.value,
				resources: variables.value,
				"additional-filters-handler": handleFilter,
				shareable: false,
				"display-name": displayName,
				"sort-fns": sortFns,
				"sort-options": ["nameAsc", "nameDesc"],
				type: "datatable",
				"type-props": { columns: columns.value },
				loading: unref(isLoading),
				"onUpdate:search": onSearchUpdated,
				"onClick:add": openCreateVariableModal
			}, createSlots({
				header: withCtx(() => [createVNode(ProjectHeader_default, { "main-button": "variable" }, {
					default: withCtx(() => [unref(overview).isOverviewSubPage && unref(insightsStore).isSummaryEnabled ? (openBlock(), createBlock(unref(InsightsSummary_default), {
						key: 0,
						loading: unref(insightsStore).weeklySummary.isLoading,
						summary: unref(insightsStore).weeklySummary.state,
						"time-range": "week"
					}, null, 8, ["loading", "summary"])) : createCommentVNode("", true)]),
					_: 1
				})]),
				filters: withCtx(({ setKeyValue }) => [createBaseVNode("div", _hoisted_1, [createVNode(unref(N8nInputLabel_default), {
					label: unref(i18n).baseText("credentials.filters.status"),
					bold: false,
					size: "small",
					color: "text-base",
					class: "mb-3xs"
				}, null, 8, ["label"]), createVNode(unref(Checkbox_default), {
					label: unref(i18n).baseText("variables.filters.incomplete"),
					"data-test-id": "variable-filter-incomplete",
					"model-value": filters.value.incomplete,
					"onUpdate:modelValue": ($event) => setKeyValue("incomplete", $event)
				}, null, 8, [
					"label",
					"model-value",
					"onUpdate:modelValue"
				])]), !unref(projectId) ? (openBlock(), createElementBlock("div", _hoisted_2, [createVNode(unref(N8nInputLabel_default), {
					label: unref(i18n).baseText("forms.resourceFiltersDropdown.owner"),
					bold: false,
					size: "small",
					color: "text-base",
					class: "mb-3xs"
				}, null, 8, ["label"]), createVNode(unref(N8nSelect_default), {
					modelValue: filters.value.projectId,
					"onUpdate:modelValue": [_cache[0] || (_cache[0] = ($event) => filters.value.projectId = $event), ($event) => setKeyValue("projectId", $event)],
					size: "large",
					filterable: "",
					"data-test-id": "variable-modal-scope-select"
				}, {
					prefix: withCtx(() => [selectedProjectIcon.value?.type === "emoji" ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						class: normalizeClass(_ctx.$style.menuItemEmoji)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(selectedProjectIcon.value?.value), 1)]),
						_: 1
					}, 8, ["class"])) : selectedProjectIcon.value?.value ? (openBlock(), createBlock(unref(N8nIcon_default), {
						key: 1,
						icon: selectedProjectIcon.value.value
					}, null, 8, ["icon"])) : createCommentVNode("", true)]),
					default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(projectOptions.value, (option) => {
						return openBlock(), createBlock(unref(N8nOption_default), {
							key: option.value || "global",
							value: option.value,
							label: option.label,
							class: normalizeClass({ [_ctx.$style.globalOption]: option.value === "global" })
						}, {
							default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.optionContent) }, [option.icon && option.icon?.type === "emoji" ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 0,
								class: normalizeClass(_ctx.$style.menuItemEmoji)
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(option.icon.value), 1)]),
								_: 2
							}, 1032, ["class"])) : option.icon?.value ? (openBlock(), createBlock(unref(N8nIcon_default), {
								key: 1,
								icon: option.icon.value
							}, null, 8, ["icon"])) : createCommentVNode("", true), createBaseVNode("span", null, toDisplayString(option.label), 1)], 2)]),
							_: 2
						}, 1032, [
							"value",
							"label",
							"class"
						]);
					}), 128))]),
					_: 1
				}, 8, ["modelValue", "onUpdate:modelValue"])])) : createCommentVNode("", true)]),
				default: withCtx(({ data }) => [createBaseVNode("tr", _hoisted_3, [
					createBaseVNode("td", null, toDisplayString(data.key), 1),
					createBaseVNode("td", null, [data.value ? withDirectives((openBlock(), createElementBlock("span", _hoisted_4, null, 512)), [[
						_directive_n8n_truncate,
						data.value,
						"20"
					]]) : (openBlock(), createBlock(unref(N8nBadge_default), {
						key: 1,
						variant: "warning"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("variables.row.valueMissing")), 1)]),
						_: 1
					}))]),
					createBaseVNode("td", null, [data.key ? (openBlock(), createBlock(VariablesUsageBadge_default, {
						key: 0,
						name: data.key
					}, null, 8, ["name"])) : createCommentVNode("", true)]),
					!unref(projectId) ? (openBlock(), createElementBlock("td", _hoisted_5, [createVNode(unref(N8nBadge_default), null, {
						default: withCtx(() => [createBaseVNode("div", _hoisted_6, [data.project ? (openBlock(), createBlock(unref(N8nIcon_default), {
							key: 0,
							icon: "layers"
						})) : createCommentVNode("", true), createTextVNode(" " + toDisplayString(data.project?.name ?? unref(i18n).baseText("variables.table.scope.global")), 1)])]),
						_: 2
					}, 1024)])) : createCommentVNode("", true),
					isFeatureEnabled.value ? (openBlock(), createElementBlock("td", _hoisted_7, [createBaseVNode("div", _hoisted_8, [createVNode(unref(N8nTooltip_default), {
						disabled: globalPermissions.value.update ?? projectPermissions.value.update,
						placement: "top"
					}, {
						content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("variables.row.button.edit.onlyRoleCanEdit")), 1)]),
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "outline",
							size: "small",
							"data-test-id": "variable-row-edit-button",
							class: "mr-xs",
							disabled: !(globalPermissions.value.update ?? projectPermissions.value.update),
							onClick: ($event) => openEditVariableModal(data)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("variables.row.button.edit")), 1)]),
							_: 1
						}, 8, ["disabled", "onClick"])]),
						_: 2
					}, 1032, ["disabled"]), createVNode(unref(N8nTooltip_default), {
						disabled: canDeleteVariables.value,
						content: deleteDisabledTooltip.value,
						placement: "top"
					}, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "outline",
							size: "small",
							"data-test-id": "variable-row-delete-button",
							disabled: !canDeleteVariables.value,
							onClick: ($event) => handleDeleteVariable(data)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("variables.row.button.delete")), 1)]),
							_: 1
						}, 8, ["disabled", "onClick"])]),
						_: 2
					}, 1032, ["disabled", "content"])])])) : createCommentVNode("", true)
				])]),
				postdata: withCtx(() => [unref(projectId) && globalVariables.value.length ? (openBlock(), createElementBlock("div", _hoisted_9, [unref(projectId) ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					size: "small"
				}, {
					default: withCtx(() => [createVNode(unref(N8nLink_default), {
						href: "/home/variables",
						theme: "text",
						size: "small"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(globalVariables.value.length) + " global variables ", 1)]),
						_: 1
					}), _cache[2] || (_cache[2] = createTextVNode(" available in this project ", -1))]),
					_: 1
				})) : createCommentVNode("", true)])) : createCommentVNode("", true)]),
				_: 2
			}, [!isFeatureEnabled.value ? {
				name: "preamble",
				fn: withCtx(() => [createVNode(unref(N8nEmptyState_default), mergeProps({ class: "mb-m" }, unavailableNoticeProps.value), null, 16)]),
				key: "0"
			} : void 0, !isFeatureEnabled.value || !canCreateVariables.value || isProtectedInstance.value ? {
				name: "empty",
				fn: withCtx(() => [!isFeatureEnabled.value ? (openBlock(), createBlock(unref(N8nEmptyState_default), normalizeProps(mergeProps({ key: 0 }, unavailableNoticeProps.value)), null, 16)) : !canCreateVariables.value ? (openBlock(), createBlock(unref(N8nEmptyState_default), {
					key: 1,
					"data-test-id": "cannot-create-variables",
					heading: unref(i18n).baseText("variables.empty.notAllowedToCreate.heading", { interpolate: { name: unref(usersStore).currentUser?.firstName ?? "" } }),
					description: unref(i18n).baseText("variables.empty.notAllowedToCreate.description")
				}, null, 8, ["heading", "description"])) : (openBlock(), createBlock(ResourcesListEmptyState_default, {
					key: 2,
					"resource-key": "variables",
					"button-disabled": true,
					"disabled-tooltip-text": unref(i18n).baseText("readOnlyEnv.cantAdd.any")
				}, null, 8, ["disabled-tooltip-text"]))]),
				key: "1"
			} : void 0]), 1032, [
				"filters",
				"disabled",
				"resources",
				"type-props",
				"loading"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	optionContent: "_optionContent_5otes_1",
	menuItemEmoji: "_menuItemEmoji_5otes_7",
	globalOption: "_globalOption_5otes_12"
} }], ["__scopeId", "data-v-0d0f4869"]]);
//#endregion
export { ProjectVariables_default as default };
