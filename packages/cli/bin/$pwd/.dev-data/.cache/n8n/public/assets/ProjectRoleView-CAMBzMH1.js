import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Du as useAsyncState, Gd as createTextVNode, Gf as toRaw, Hd as createElementBlock, Ho as RouterLink, If as isRef, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Of as withDirectives, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, jd as vShow, mf as renderList, zd as createBaseVNode, zo as require_dateformat } from "./vendor-Hx42-oQF.js";
import { JA as DialogHeader_default, KA as Dialog_default, PA as useMessage, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, WA as DialogBody_default, Zf as useRolesStore, _N as N8nText_default, aD as CUSTOM_ROLE_SCOPE_WHITELIST, dC as useToast, dx as MODAL_CONFIRM, fC as VIEWS, fN as N8nTooltip_default, hC as useTelemetry, jN as useI18n, oj as N8nUserInfo_default, qA as DialogTitle_default, tN as N8nLoading_default, uM as N8nFormInput_default, wM as TableBase_default, yC as useSettingsStore, yN as N8nButton_default, yj as Tabs_default } from "./app-D5flEmb-.js";
import { a as normalizeCoupledScopes, n as SCOPE_TYPES, t as SCOPES } from "./projectRoleScopes-Cnu0XOUp.js";
import { n as RoleEditorLayout_default, t as useRoleEditorForm } from "./useRoleEditorForm-CAoirHuN.js";
//#region src/features/roles/project/RoleProjectMembersModal.vue?vue&type=script&setup=true&lang.ts
var import_dateformat = /* @__PURE__ */ __toESM(require_dateformat(), 1);
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var RoleProjectMembersModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "RoleProjectMembersModal",
	props: {
		open: { type: Boolean },
		roleSlug: {},
		projectId: {},
		projectName: {}
	},
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const rolesStore = useRolesStore();
		const i18n = useI18n();
		const router = useRouter();
		const membersData = ref({ members: [] });
		const isLoading = ref(false);
		watch(() => props.open, async (isOpen) => {
			if (!isOpen) return;
			isLoading.value = true;
			try {
				membersData.value = await rolesStore.fetchRoleProjectMembers(props.roleSlug, props.projectId);
			} finally {
				isLoading.value = false;
			}
		}, { immediate: true });
		const roleDisplayNameMap = computed(() => {
			const allRoles = [
				...rolesStore.roles.global,
				...rolesStore.roles.project,
				...rolesStore.roles.credential,
				...rolesStore.roles.workflow
			];
			return new Map(allRoles.map((r) => [r.slug, r.displayName]));
		});
		function getRoleDisplayName(slug) {
			return roleDisplayNameMap.value.get(slug) ?? slug;
		}
		function navigateToProjectSettings() {
			emit("update:open", false);
			router.push({
				name: VIEWS.PROJECT_SETTINGS,
				params: { projectId: props.projectId }
			});
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: __props.open,
				size: "medium",
				"onUpdate:open": _cache[1] || (_cache[1] = ($event) => emit("update:open", $event))
			}, {
				default: withCtx(() => [
					createVNode(unref(DialogHeader_default), null, {
						default: withCtx(() => [createVNode(unref(DialogTitle_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("projectRoles.assignments.membersModal.title", { interpolate: { projectName: __props.projectName } })), 1)]),
							_: 1
						})]),
						_: 1
					}),
					createVNode(unref(DialogBody_default), { class: normalizeClass(_ctx.$style.body) }, {
						default: withCtx(() => [isLoading.value ? (openBlock(), createBlock(unref(N8nLoading_default), {
							key: 0,
							rows: 3
						})) : (openBlock(), createElementBlock("div", {
							key: 1,
							class: normalizeClass(_ctx.$style.memberList)
						}, [(openBlock(true), createElementBlock(Fragment, null, renderList(membersData.value.members, (member) => {
							return openBlock(), createElementBlock("div", {
								key: member.userId,
								class: normalizeClass(_ctx.$style.memberRow)
							}, [createVNode(unref(N8nUserInfo_default), {
								"first-name": member.firstName,
								"last-name": member.lastName,
								email: member.email
							}, null, 8, [
								"first-name",
								"last-name",
								"email"
							]), createVNode(unref(N8nText_default), {
								class: normalizeClass(_ctx.$style.roleLabel),
								color: "text-light",
								size: "small"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(getRoleDisplayName(member.role)), 1)]),
								_: 2
							}, 1032, ["class"])], 2);
						}), 128))], 2))]),
						_: 1
					}, 8, ["class"]),
					createVNode(unref(DialogFooter_default), null, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "outline",
							onClick: _cache[0] || (_cache[0] = ($event) => emit("update:open", false))
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("projectRoles.assignments.membersModal.cancel")), 1)]),
							_: 1
						}), createVNode(unref(N8nButton_default), { onClick: navigateToProjectSettings }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("projectRoles.assignments.membersModal.manageMembers")), 1)]),
							_: 1
						})]),
						_: 1
					})
				]),
				_: 1
			}, 8, ["open"]);
		};
	}
}), [["__cssModules", { "$style": {
	body: "_body_1uzav_2",
	memberList: "_memberList_1uzav_6",
	memberRow: "_memberRow_1uzav_11",
	roleLabel: "_roleLabel_1uzav_23"
} }]]);
//#endregion
//#region src/features/roles/project/RoleAssignmentsTab.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = ["onClick"];
var RoleAssignmentsTab_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "RoleAssignmentsTab",
	props: { roleSlug: {} },
	setup(__props) {
		const props = __props;
		const rolesStore = useRolesStore();
		const i18n = useI18n();
		const { state: assignments, isLoading, execute } = useAsyncState(async () => await rolesStore.fetchRoleAssignments(props.roleSlug), {
			projects: [],
			totalProjects: 0
		});
		watch(() => props.roleSlug, async () => await execute());
		const membersModalOpen = ref(false);
		const selectedProject = ref(null);
		const sortColumn = ref("memberCount");
		const sortDirection = ref("desc");
		const hiddenProjectCount = computed(() => assignments.value.totalProjects - assignments.value.projects.length);
		const sortedProjects = computed(() => {
			return [...assignments.value.projects].sort((a, b) => {
				let cmp = 0;
				if (sortColumn.value === "projectName") cmp = a.projectName.localeCompare(b.projectName);
				else if (sortColumn.value === "memberCount") cmp = a.memberCount - b.memberCount;
				else cmp = (a.lastAssigned ?? "").localeCompare(b.lastAssigned ?? "");
				return sortDirection.value === "desc" ? -cmp : cmp;
			});
		});
		function toggleSort(column) {
			if (sortColumn.value === column) sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
			else {
				sortColumn.value = column;
				sortDirection.value = column === "memberCount" ? "desc" : "asc";
			}
		}
		function sortIndicator(column) {
			if (sortColumn.value !== column) return "";
			return sortDirection.value === "asc" ? " ↑" : " ↓";
		}
		function openMembersModal(project) {
			selectedProject.value = project;
			membersModalOpen.value = true;
		}
		function formatDate(dateStr) {
			if (!dateStr) return "—";
			return (0, import_dateformat.default)(new Date(dateStr), "mmm dS, yyyy");
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [unref(isLoading) ? (openBlock(), createBlock(unref(N8nLoading_default), {
				key: 0,
				rows: 3
			})) : unref(assignments).projects.length === 0 ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.emptyState)
			}, [createVNode(unref(N8nText_default), { color: "text-light" }, {
				default: withCtx(() => [createTextVNode(toDisplayString(hiddenProjectCount.value > 0 ? unref(i18n).baseText("projectRoles.assignments.restrictedEmptyState", {
					adjustToNumber: hiddenProjectCount.value,
					interpolate: { count: hiddenProjectCount.value }
				}) : unref(i18n).baseText("projectRoles.assignments.emptyState")), 1)]),
				_: 1
			})], 2)) : (openBlock(), createElementBlock(Fragment, { key: 2 }, [hiddenProjectCount.value > 0 ? (openBlock(), createBlock(unref(N8nText_default), {
				key: 0,
				class: normalizeClass(_ctx.$style.restrictedNotice),
				color: "text-light",
				size: "small",
				tag: "p"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("projectRoles.assignments.restrictedNotice", { interpolate: {
					count: unref(assignments).projects.length,
					total: unref(assignments).totalProjects
				} })), 1)]),
				_: 1
			}, 8, ["class"])) : createCommentVNode("", true), createVNode(unref(TableBase_default), null, {
				default: withCtx(() => [createBaseVNode("thead", null, [createBaseVNode("tr", null, [
					createBaseVNode("th", {
						class: normalizeClass(_ctx.$style.sortableHeader),
						onClick: _cache[0] || (_cache[0] = ($event) => toggleSort("projectName"))
					}, toDisplayString(unref(i18n).baseText("projectRoles.assignments.projectColumn")) + toDisplayString(sortIndicator("projectName")), 3),
					createBaseVNode("th", {
						class: normalizeClass([_ctx.$style.alignRight, _ctx.$style.sortableHeader]),
						onClick: _cache[1] || (_cache[1] = ($event) => toggleSort("memberCount"))
					}, toDisplayString(unref(i18n).baseText("projectRoles.assignments.membersColumn")) + toDisplayString(sortIndicator("memberCount")), 3),
					createBaseVNode("th", {
						class: normalizeClass(_ctx.$style.sortableHeader),
						onClick: _cache[2] || (_cache[2] = ($event) => toggleSort("lastAssigned"))
					}, toDisplayString(unref(i18n).baseText("projectRoles.assignments.lastAssignedColumn")) + toDisplayString(sortIndicator("lastAssigned")), 3)
				])]), createBaseVNode("tbody", null, [(openBlock(true), createElementBlock(Fragment, null, renderList(sortedProjects.value, (project) => {
					return openBlock(), createElementBlock("tr", { key: project.projectId }, [
						createBaseVNode("td", null, [createVNode(unref(RouterLink), {
							to: {
								name: unref(VIEWS).PROJECTS_WORKFLOWS,
								params: { projectId: project.projectId }
							},
							class: normalizeClass(_ctx.$style.projectLink)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(project.projectName), 1)]),
							_: 2
						}, 1032, ["to", "class"])]),
						createBaseVNode("td", { class: normalizeClass(_ctx.$style.alignRight) }, [createBaseVNode("button", {
							class: normalizeClass(_ctx.$style.memberCountButton),
							onClick: ($event) => openMembersModal(project)
						}, toDisplayString(project.memberCount), 11, _hoisted_1$1)], 2),
						createBaseVNode("td", null, toDisplayString(formatDate(project.lastAssigned)), 1)
					]);
				}), 128))])]),
				_: 1
			})], 64)), selectedProject.value ? (openBlock(), createBlock(RoleProjectMembersModal_default, {
				key: 3,
				open: membersModalOpen.value,
				"role-slug": __props.roleSlug,
				"project-id": selectedProject.value.projectId,
				"project-name": selectedProject.value.projectName,
				"onUpdate:open": _cache[3] || (_cache[3] = ($event) => membersModalOpen.value = $event)
			}, null, 8, [
				"open",
				"role-slug",
				"project-id",
				"project-name"
			])) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_s1egh_2",
	emptyState: "_emptyState_s1egh_6",
	restrictedNotice: "_restrictedNotice_s1egh_11",
	alignRight: "_alignRight_s1egh_15",
	sortableHeader: "_sortableHeader_s1egh_19",
	projectLink: "_projectLink_s1egh_24",
	memberCountButton: "_memberCountButton_s1egh_33"
} }]]);
//#endregion
//#region src/features/roles/project/ProjectRoleView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = {
	key: 0,
	class: "mb-l"
};
var _hoisted_2 = { style: { "flex": "1" } };
var _hoisted_3 = {
	key: 1,
	class: "mt-xl"
};
var ProjectRoleView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ProjectRoleView",
	props: { roleSlug: {} },
	setup(__props) {
		const rolesStore = useRolesStore();
		const route = useRoute();
		const router = useRouter();
		const { showError, showMessage } = useToast();
		const i18n = useI18n();
		const message = useMessage();
		const telemetry = useTelemetry();
		const settingsStore = useSettingsStore();
		const props = __props;
		const { activeTab, tabOptions, form, isLoading, initialState, isReadOnly, isNew, showEditButtons, showCreateButton, hasUnsavedChanges, displayNameValidationRules, submitted, validateOnSubmit, resetForm } = useRoleEditorForm({
			roleSlug: () => props.roleSlug,
			viewRoute: VIEWS.PROJECT_ROLE_VIEW,
			defaultScopes: () => structuredClone(toRaw(rolesStore.processedProjectRoles.find((role) => role.slug === "project:viewer")?.scopes ?? [])),
			filterScopes: (scopes) => scopes.filter((s) => CUSTOM_ROLE_SCOPE_WHITELIST.project.has(s)),
			fetchError: "Error fetching role"
		});
		const cameFromProjectSettings = computed(() => route.query.from === VIEWS.PROJECT_SETTINGS);
		const backButtonText = computed(() => cameFromProjectSettings.value ? i18n.baseText("projectRoles.backToProjectSettings") : i18n.baseText("projectRoles.backToProjectRoles"));
		const onBackClick = () => {
			if (cameFromProjectSettings.value) router.back();
			else router.push({ name: VIEWS.PROJECT_ROLES_SETTINGS });
		};
		const scopeTypes = computed(() => {
			let types = SCOPE_TYPES;
			if (!settingsStore.isAppsEnabled) types = types.filter((type) => type !== "app");
			if (!settingsStore.moduleSettings["external-secrets"]?.roleBasedAccess) types = types.filter((type) => type !== "externalSecretsProvider" && type !== "externalSecret");
			if (!settingsStore.isModuleActive("agents")) types = types.filter((type) => type !== "projectSkill");
			return types;
		});
		const scopes = SCOPES;
		function toggleScope(scope) {
			const index = form.value.scopes.indexOf(scope);
			const isBeingAdded = index === -1;
			if (index !== -1) form.value.scopes.splice(index, 1);
			else form.value.scopes.push(scope);
			if (scope.startsWith("dataTable:") && scope.endsWith(":read")) {
				toggleScope(scope.replace(":read", ":listProject"));
				return;
			}
			if (scope.endsWith(":read")) toggleScope(scope.replace(":read", ":list"));
			if (scope === "workflow:execute" && isBeingAdded) {
				if (!form.value.scopes.includes("workflow:read")) toggleScope("workflow:read");
			}
			if (scope === "workflow:read" && !isBeingAdded) {
				if (form.value.scopes.includes("workflow:execute")) toggleScope("workflow:execute");
			}
			if (scope === "workflow:read") {
				if (isBeingAdded && !form.value.scopes.includes("execution:read")) toggleScope("execution:read");
				if (!isBeingAdded) {
					if (form.value.scopes.includes("execution:read")) toggleScope("execution:read");
					if (form.value.scopes.includes("execution:delete")) toggleScope("execution:delete");
				}
			}
			if (scope === "execution:delete" && isBeingAdded && !form.value.scopes.includes("workflow:read")) toggleScope("workflow:read");
			if (scope === "workflow:publish") {
				if (isBeingAdded && !form.value.scopes.includes("workflow:unpublish")) form.value.scopes.push("workflow:unpublish");
				else if (!isBeingAdded) {
					const idx = form.value.scopes.indexOf("workflow:unpublish");
					if (idx !== -1) form.value.scopes.splice(idx, 1);
				}
			}
		}
		async function createProjectRole() {
			if (!validateOnSubmit("projectRoles.action.create.error")) return;
			try {
				const role = await rolesStore.createRole({
					...form.value,
					scopes: normalizeCoupledScopes(form.value.scopes),
					description: form.value.description ?? void 0,
					roleType: "project"
				});
				rolesStore.fetchRoles();
				telemetry.track("User successfully created new role", {
					role_id: role.slug,
					role_name: role.displayName,
					role_type: "project",
					permissions: role.scopes
				});
				router.replace({
					name: VIEWS.PROJECT_ROLE_SETTINGS,
					params: { roleSlug: role.slug }
				});
				showMessage({
					type: "success",
					message: i18n.baseText("projectRoles.action.create.success")
				});
				initialState.value = structuredClone(role);
				return role;
			} catch (error) {
				showError(error, i18n.baseText("projectRoles.action.create.error"));
				return;
			}
		}
		async function confirmRoleUpdate(usedByUsers) {
			if (!usedByUsers) return true;
			return await message.confirm(i18n.baseText("projectRoles.action.update.text", { interpolate: { count: usedByUsers } }), i18n.baseText("projectRoles.action.update.title", { interpolate: { count: usedByUsers } }), {
				type: "warning",
				confirmButtonText: i18n.baseText("projectRoles.action.update"),
				cancelButtonText: i18n.baseText("roles.action.cancel")
			}) === MODAL_CONFIRM;
		}
		async function updateProjectRole(slug) {
			if (!await confirmRoleUpdate(initialState?.value?.usedByUsers)) return;
			try {
				const role = await rolesStore.updateRole(slug, {
					...form.value,
					scopes: normalizeCoupledScopes(form.value.scopes),
					description: form.value.description ?? void 0
				});
				rolesStore.fetchRoles();
				telemetry.track("User updated role", {
					role_id: role.slug,
					role_name: role.displayName,
					role_type: "project",
					permissions_from: initialState.value?.scopes,
					permissions_to: role.scopes
				});
				initialState.value = structuredClone(role);
				showMessage({
					type: "success",
					message: i18n.baseText("projectRoles.action.update.success")
				});
				return role;
			} catch (error) {
				showError(error, i18n.baseText("projectRoles.action.update.error"));
				return;
			}
		}
		async function handleSubmit() {
			if (props.roleSlug) await updateProjectRole(props.roleSlug);
			else await createProjectRole();
		}
		function setPreset(slug) {
			const preset = rolesStore.processedProjectRoles.find((role) => role.slug === slug);
			if (!preset) return;
			form.value.scopes = structuredClone(toRaw(preset.scopes)).filter((s) => CUSTOM_ROLE_SCOPE_WHITELIST.project.has(s));
		}
		async function deleteRole() {
			if (!initialState?.value) return;
			if (await message.confirm(i18n.baseText("roles.action.delete.text", { interpolate: { roleName: initialState.value.displayName } }), i18n.baseText("roles.action.delete.title", { interpolate: { roleName: initialState.value.displayName } }), {
				type: "warning",
				confirmButtonText: i18n.baseText("roles.action.delete"),
				cancelButtonText: i18n.baseText("roles.action.cancel")
			}) !== "confirm") return;
			telemetry.track("User clicked delete role", {
				role_id: initialState.value.slug,
				role_name: initialState.value.displayName,
				permissions: initialState.value?.scopes
			});
			try {
				await rolesStore.deleteRole(initialState.value.slug);
				const index = rolesStore.roles.project.findIndex((role) => role.slug === initialState.value?.slug);
				if (index !== -1) rolesStore.roles.project.splice(index, 1);
				showMessage({
					title: i18n.baseText("roles.action.delete.success"),
					type: "success"
				});
				telemetry.track("User successfully deleted role", {
					role_id: initialState.value.slug,
					role_name: initialState.value.displayName,
					permissions: initialState.value?.scopes
				});
				router.back();
			} catch (error) {
				showError(error, i18n.baseText("roles.action.delete.error"));
				return;
			}
		}
		const editorLabels = computed(() => ({
			newRoleTitle: i18n.baseText("projectRoles.newRole"),
			roleName: i18n.baseText("projectRoles.roleName"),
			description: i18n.baseText("projectRoles.description"),
			optional: i18n.baseText("projectRoles.optional"),
			systemRoleNotEditable: i18n.baseText("projectRoles.systemRoleNotEditable"),
			discardChanges: i18n.baseText("projectRoles.discardChanges"),
			save: i18n.baseText("projectRoles.save"),
			create: i18n.baseText("projectRoles.create")
		}));
		return (_ctx, _cache) => {
			return openBlock(), createBlock(RoleEditorLayout_default, {
				"display-name": unref(form).displayName,
				"onUpdate:displayName": _cache[5] || (_cache[5] = ($event) => unref(form).displayName = $event),
				description: unref(form).description,
				"onUpdate:description": _cache[6] || (_cache[6] = ($event) => unref(form).description = $event),
				"is-new": unref(isNew),
				"is-read-only": unref(isReadOnly),
				"show-edit-buttons": unref(showEditButtons),
				"show-create-button": unref(showCreateButton),
				"has-unsaved-changes": unref(hasUnsavedChanges),
				"back-button-text": backButtonText.value,
				labels: editorLabels.value,
				"display-name-validation-rules": unref(displayNameValidationRules),
				"show-display-name-error": unref(submitted),
				onBack: onBackClick,
				onSave: handleSubmit,
				onDiscard: _cache[7] || (_cache[7] = ($event) => unref(resetForm)(unref(initialState))),
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
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("projectRoles.preset")), 1)]),
							_: 1
						}), createBaseVNode("div", { class: normalizeClass(["mb-s", _ctx.$style.presetsContainer]) }, [
							createVNode(unref(N8nButton_default), {
								variant: "outline",
								onClick: _cache[1] || (_cache[1] = ($event) => setPreset("project:admin"))
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("projectRoles.admin")), 1)]),
								_: 1
							}),
							createVNode(unref(N8nButton_default), {
								variant: "outline",
								onClick: _cache[2] || (_cache[2] = ($event) => setPreset("project:editor"))
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("projectRoles.editor")), 1)]),
								_: 1
							}),
							createVNode(unref(N8nButton_default), {
								variant: "outline",
								onClick: _cache[3] || (_cache[3] = ($event) => setPreset("project:viewer"))
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("projectRoles.viewer")), 1)]),
								_: 1
							})
						], 2)], 64)) : createCommentVNode("", true),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardContainer) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(scopeTypes.value, (type) => {
							return openBlock(), createElementBlock("div", {
								key: type,
								class: normalizeClass(["mb-s mt-s", _ctx.$style.card])
							}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardTitle) }, toDisplayString(unref(i18n).baseText(`projectRoles.type.${type}`)), 3), createBaseVNode("div", _hoisted_2, [unref(isLoading) ? (openBlock(), createBlock(unref(N8nLoading_default), {
								key: 0,
								rows: unref(scopes)[type].length,
								"shrink-last": false
							}, null, 8, ["rows"])) : (openBlock(true), createElementBlock(Fragment, { key: 1 }, renderList(unref(scopes)[type], (scope) => {
								return openBlock(), createElementBlock("div", {
									key: scope,
									class: "mb-2xs"
								}, [createVNode(unref(N8nTooltip_default), {
									content: unref(i18n).baseText(`projectRoles.${scope}.tooltip`),
									placement: "right",
									enterable: false,
									"show-after": 250
								}, {
									default: withCtx(() => [createVNode(unref(N8nFormInput_default), {
										"data-test-id": `scope-checkbox-${scope}`,
										"model-value": unref(form).scopes.includes(scope),
										label: unref(i18n).baseText(`projectRoles.${scope}`),
										"validate-on-blur": "",
										type: "checkbox",
										class: normalizeClass(_ctx.$style.checkbox),
										disabled: unref(isReadOnly) || scope === "execution:read",
										"onUpdate:modelValue": () => toggleScope(scope)
									}, null, 8, [
										"data-test-id",
										"model-value",
										"label",
										"class",
										"disabled",
										"onUpdate:modelValue"
									])]),
									_: 2
								}, 1032, ["content"])]);
							}), 128))])], 2);
						}), 128))], 2),
						__props.roleSlug && !unref(isReadOnly) ? (openBlock(), createElementBlock("div", _hoisted_3, [
							createVNode(unref(N8nHeading_default), {
								tag: "h2",
								class: "mb-2xs",
								size: "large"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("projectRoles.dangerZone")), 1)]),
								_: 1
							}),
							createVNode(unref(N8nText_default), {
								tag: "p",
								class: "mb-s"
							}, {
								default: withCtx(() => [unref(initialState)?.usedByProjects ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
									createTextVNode(toDisplayString(unref(i18n).baseText("projectRoles.action.delete.useWarning.before")) + " ", 1),
									createBaseVNode("a", {
										class: normalizeClass(_ctx.$style.assignmentsLink),
										onClick: _cache[4] || (_cache[4] = ($event) => activeTab.value = "assignments")
									}, toDisplayString(unref(i18n).baseText("projectRoles.action.delete.useWarning.linkText", {
										adjustToNumber: unref(initialState).usedByProjects,
										interpolate: { count: unref(initialState).usedByProjects }
									})), 3),
									createTextVNode(". " + toDisplayString(unref(i18n).baseText("projectRoles.action.delete.useWarning.after")), 1)
								], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createTextVNode(toDisplayString(unref(i18n).baseText("projectRoles.action.delete.warning")), 1)], 64))]),
								_: 1
							}),
							createVNode(unref(N8nButton_default), {
								variant: "destructive",
								disabled: Boolean(unref(initialState)?.usedByProjects),
								onClick: deleteRole
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("projectRoles.action.delete.button")), 1)]),
								_: 1
							}, 8, ["disabled"])
						])) : createCommentVNode("", true)
					], 512), [[vShow, !__props.roleSlug || unref(activeTab) === "permissions"]]),
					__props.roleSlug && unref(activeTab) === "assignments" ? (openBlock(), createBlock(RoleAssignmentsTab_default, {
						key: 1,
						"role-slug": __props.roleSlug
					}, null, 8, ["role-slug"])) : createCommentVNode("", true)
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
}), [["__cssModules", { "$style": {
	cardContainer: "_cardContainer_1gh3t_2",
	card: "_card_1gh3t_2",
	cardTitle: "_cardTitle_1gh3t_21",
	presetsContainer: "_presetsContainer_1gh3t_25",
	checkbox: "_checkbox_1gh3t_30",
	assignmentsLink: "_assignmentsLink_1gh3t_38"
} }]]);
//#endregion
export { ProjectRoleView_default as default };
