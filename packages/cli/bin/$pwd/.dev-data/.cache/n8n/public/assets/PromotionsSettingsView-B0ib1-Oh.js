import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Wf as shallowRef, Xf as unref, Xo as useRouter, _p as normalizeClass, bd as I18nT, ff as openBlock, if as nextTick, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, pd as useDebounceFn, zd as createBaseVNode, zf as reactive } from "./vendor-Hx42-oQF.js";
import { Bj as SettingsRow_default, C as PROMOTIONS_ENVIRONMENT_ADD_VIEW, Cm as useRBACStore, D as PROMOTION_INSTANCE_APPLY_VIEW, HC as createPublicProject, Hj as SettingsPageHeader_default, Ij as SettingsRowGroup_default, JA as DialogHeader_default, KA as Dialog_default, Mw as ResponseError, NA as Loading_default, PA as useMessage, Pj as SettingsSection_default, Qg as projectContext, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, Uj as SettingsLayout_default, VC as addProjectMembers, Vn as getErrorMessage, WA as DialogBody_default, YM as N8nActionToggle_default, Zf as useRolesStore, Zj as PreviewBadge_default, _C as useUsersStore, _M as Checkbox_default, _N as N8nText_default, aE as promotionDirectionSchema, b as ENVIRONMENTS_DOCS_URL, bC as useRootStore, bM as N8nExternalLink_default, dC as useToast, dM as N8nSwitch_default, eC as DEBOUNCE_TIME, fC as VIEWS, fD as PROJECT_ADMIN_ROLE_SLUG, fN as N8nTooltip_default, fT as ROLE, hM as N8nLink_default, ij as N8nUserSelect_default, jN as useI18n, n_ as environmentsSettings, oE as isPromotionGitHostType, o_ as use, qA as DialogTitle_default, qd as useDocumentTitle, vN as N8nIconButton_default, w as PROMOTIONS_ENVIRONMENT_EDIT_VIEW, x as ENVIRONMENTS_PLAN_DOCS_URL, xM as N8nEmptyState_default, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default, yy as getDebounceTime, zj as EnterpriseReadinessBadge_default } from "./app-D5flEmb-.js";
import { t as useLatestFetch } from "./useLatestFetch-Bxfz-zbp.js";
import { c as deletePromotionEnvironment, f as fetchPromotionEnvironment, g as promotePackage, l as deleteProviderIfUnused, p as fetchPromotionEnvironments, t as invalidateInstancePromotionConnection, u as fetchMissingPromotionProjects } from "./useInstancePromotionConnection-5-otSLfL.js";
import { r as warningSegments, t as httpUrl } from "./promotionResult-CXJqKPa0.js";
import { a as promotionEnvironmentBranch, s as promotionProviderIcon } from "./promotionsSettings.utils-DVnAp-i1.js";
import { t as usePromotionCheckout } from "./usePromotionCheckout-BTtFHAl-.js";
import { t as PromotionCommitMessageField_default } from "./PromotionCommitMessageField-0DaWMDdb.js";
//#region ../../modules/promotions/frontend/src/components/PromoteInstanceDialog.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
var PromoteInstanceDialog_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PromoteInstanceDialog",
	props: {
		open: { type: Boolean },
		environmentId: {},
		environmentName: {},
		baseBranchName: {},
		createBranchOnPromotion: { type: Boolean },
		providerType: {}
	},
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const rootStore = useRootStore();
		const commitMessage = ref("");
		const isSubmitting = ref(false);
		const result = ref(null);
		const messageField = useTemplateRef("messageField");
		const dialogTitle = computed(() => i18n.baseText(result.value ? "settings.promotions.promote.dialog.result.title" : "settings.promotions.promote.dialog.title", { interpolate: { environment: props.environmentName } }));
		const ariaDescription = computed(() => result.value ? dialogTitle.value : i18n.baseText("settings.promotions.promote.dialog.ariaDescription"));
		const bodyText = computed(() => {
			if (props.providerType === "gitlab" && props.createBranchOnPromotion) return i18n.baseText("settings.promotions.promote.dialog.body.mergeRequest", { interpolate: { branch: props.baseBranchName } });
			return props.createBranchOnPromotion ? i18n.baseText("settings.promotions.promote.dialog.body.newBranch") : i18n.baseText("settings.promotions.promote.dialog.body.toBranch", { interpolate: { branch: props.baseBranchName } });
		});
		const mergeRequestUrl = computed(() => httpUrl(result.value?.review?.webUrl));
		const reviewNotRecorded = computed(() => i18n.baseText("promotions.result.reviewNotRecorded"));
		const pushedText = computed(() => result.value ? i18n.baseText("promotions.result.pushed", { interpolate: { branch: result.value.git.branchName } }) : "");
		function close() {
			emit("update:open", false);
		}
		function onOpenChange(value) {
			if (value || isSubmitting.value) return;
			close();
		}
		function onOpenAutoFocus(event) {
			event.preventDefault();
			nextTick(() => messageField.value?.focus());
		}
		async function submit() {
			if (isSubmitting.value) return;
			const message = commitMessage.value.trim();
			isSubmitting.value = true;
			try {
				result.value = await promotePackage(rootStore.publicApiContext, props.environmentId, message ? { commitMessage: message } : {});
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.promotions.promote.toast.error"));
			} finally {
				isSubmitting.value = false;
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: __props.open,
				size: "medium",
				"aria-description": ariaDescription.value,
				"data-test-id": "promote-instance-dialog",
				onOpenAutoFocus,
				"onUpdate:open": onOpenChange
			}, {
				default: withCtx(() => [createVNode(unref(DialogHeader_default), null, {
					default: withCtx(() => [createVNode(unref(DialogTitle_default), null, {
						default: withCtx(() => [createTextVNode(toDisplayString(dialogTitle.value), 1)]),
						_: 1
					})]),
					_: 1
				}), !result.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [createBaseVNode("form", {
						id: "promote-instance-form",
						class: normalizeClass(_ctx.$style.body),
						onSubmit: withModifiers(submit, ["prevent"])
					}, [createVNode(unref(N8nText_default), { color: "text-base" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(bodyText.value), 1)]),
						_: 1
					}), createVNode(PromotionCommitMessageField_default, {
						ref_key: "messageField",
						ref: messageField,
						modelValue: commitMessage.value,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => commitMessage.value = $event),
						disabled: isSubmitting.value
					}, null, 8, ["modelValue", "disabled"])], 34)]),
					_: 1
				}), createVNode(unref(DialogFooter_default), null, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						type: "button",
						variant: "outline",
						disabled: isSubmitting.value,
						"data-test-id": "promote-cancel-button",
						onClick: close
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.cancel")), 1)]),
						_: 1
					}, 8, ["disabled"]), createVNode(unref(N8nButton_default), {
						type: "submit",
						form: "promote-instance-form",
						disabled: isSubmitting.value,
						loading: isSubmitting.value,
						"data-test-id": "promote-confirm-button"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.promotions.promote.dialog.confirm")), 1)]),
						_: 1
					}, 8, ["disabled", "loading"])]),
					_: 1
				})], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.body) }, [mergeRequestUrl.value ? (openBlock(), createBlock(unref(N8nLink_default), {
						key: 0,
						to: mergeRequestUrl.value,
						"new-window": "",
						"data-test-id": "promote-merge-request-link"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("promotions.result.viewMergeRequest")), 1)]),
						_: 1
					}, 8, ["to"])) : (openBlock(), createBlock(unref(N8nText_default), {
						key: 1,
						color: "text-base",
						"data-test-id": "promote-result-summary"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(pushedText.value), 1)]),
						_: 1
					})), (openBlock(true), createElementBlock(Fragment, null, renderList(result.value.warnings, (warning, index) => {
						return openBlock(), createBlock(unref(N8nText_default), {
							key: index,
							color: "text-base",
							"data-test-id": "promote-warning"
						}, {
							default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(warningSegments)(warning, reviewNotRecorded.value), (segment, segmentIndex) => {
								return openBlock(), createElementBlock(Fragment, { key: segmentIndex }, [segment.kind === "link" ? (openBlock(), createBlock(unref(N8nLink_default), {
									key: 0,
									to: segment.url,
									"new-window": ""
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(segment.url), 1)]),
									_: 2
								}, 1032, ["to"])) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createTextVNode(toDisplayString(segment.text), 1)], 64))], 64);
							}), 128))]),
							_: 2
						}, 1024);
					}), 128))], 2)]),
					_: 1
				}), createVNode(unref(DialogFooter_default), null, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						type: "button",
						"data-test-id": "promote-close-button",
						onClick: close
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.close")), 1)]),
						_: 1
					})]),
					_: 1
				})], 64))]),
				_: 1
			}, 8, ["open", "aria-description"]);
		};
	}
}), [["__cssModules", { "$style": { body: "_body_htak6_1" } }]]);
//#endregion
//#region ../../modules/promotions/frontend/src/components/PromotionMissingProjectsDialog.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$1 = { scope: "col" };
var _hoisted_2 = {
	key: 0,
	scope: "col"
};
var _hoisted_3 = ["data-test-id"];
var _hoisted_4 = { key: 0 };
var PromotionMissingProjectsDialog_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PromotionMissingProjectsDialog",
	props: {
		open: { type: Boolean },
		environmentName: {},
		projects: {}
	},
	emits: ["update:open", "changed"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const rootStore = useRootStore();
		const projectContext$1 = use(projectContext);
		const rolesStore = useRolesStore();
		const usersStore = useUsersStore();
		const { next: nextSearch } = useLatestFetch();
		const selected = reactive(/* @__PURE__ */ new Set());
		const states = reactive(/* @__PURE__ */ new Map());
		/** The user picked as project admin, by project ID. */
		const admins = reactive(/* @__PURE__ */ new Map());
		const isSubmitting = ref(false);
		const searchResults = ref([]);
		const isLoadingUsers = ref(false);
		const description = computed(() => i18n.baseText("settings.promotions.missingProjects.dialog.description", { interpolate: { environment: props.environmentName } }));
		const canAssignAdmin = computed(() => rolesStore.processedProjectRoles.some(({ slug, licensed }) => slug === "project:admin" && licensed));
		const userOptions = computed(() => {
			const picked = [...admins.values()].flatMap((id) => usersStore.usersById[id] ?? []);
			return [...new Map([...picked, ...searchResults.value].map((user) => [user.id, user])).values()];
		});
		const isDone = (id) => {
			const status = states.get(id)?.status;
			return status === "created" || status === "already-exists";
		};
		const hasProject = (id) => {
			const status = states.get(id)?.status;
			return status === "created" || status === "already-exists" || status === "admin-failed";
		};
		const isFailed = (id) => {
			const status = states.get(id)?.status;
			return status === "failed" || status === "admin-failed";
		};
		const statusLine = (id) => {
			const state = states.get(id);
			switch (state?.status) {
				case "created": return {
					color: "success",
					text: i18n.baseText("settings.promotions.missingProjects.status.created")
				};
				case "already-exists": return {
					color: "text-light",
					text: i18n.baseText("settings.promotions.missingProjects.status.alreadyExists")
				};
				case "admin-failed": return {
					color: "danger",
					text: i18n.baseText("settings.promotions.missingProjects.status.adminFailed", { interpolate: { error: state.message } })
				};
				case "failed": return {
					color: "danger",
					text: state.message
				};
				default: return;
			}
		};
		const selectable = computed(() => props.projects.filter(({ id }) => !isDone(id)));
		const allState = computed(() => {
			if (selected.size === 0) return "unchecked";
			return selected.size === selectable.value.length ? "checked" : "indeterminate";
		});
		const isRetry = computed(() => selected.size > 0 && [...selected].every(isFailed));
		const submitLabel = computed(() => {
			if (selected.size === 0) return i18n.baseText("settings.promotions.missingProjects.button");
			return i18n.baseText(isRetry.value ? "settings.promotions.missingProjects.dialog.retry" : "settings.promotions.missingProjects.button.count", {
				adjustToNumber: selected.size,
				interpolate: { count: String(selected.size) }
			});
		});
		function toggle(id) {
			if (selected.has(id)) selected.delete(id);
			else selected.add(id);
		}
		function toggleAll() {
			if (allState.value === "checked") selected.clear();
			else for (const { id } of selectable.value) selected.add(id);
		}
		function setAdmin(projectId, userId) {
			if (userId) admins.set(projectId, userId);
			else admins.delete(projectId);
		}
		const canBecomeProjectAdmin = (user) => user.role !== ROLE.Owner && user.role !== ROLE.Admin;
		async function searchUsers(query) {
			const isLatest = nextSearch();
			isLoadingUsers.value = true;
			try {
				const fullText = query.trim();
				const users = await usersStore.fetchUsers({ filter: fullText ? { fullText } : void 0 });
				if (isLatest()) searchResults.value = users.filter(canBecomeProjectAdmin);
			} catch (error) {
				if (isLatest()) toast.showError(error, i18n.baseText("settings.promotions.missingProjects.dialog.usersError"));
			} finally {
				if (isLatest()) isLoadingUsers.value = false;
			}
		}
		const debouncedSearchUsers = useDebounceFn(searchUsers, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
		onMounted(async () => {
			if (canAssignAdmin.value) await searchUsers("");
		});
		function close() {
			emit("update:open", false);
			if ([...states.keys()].some(hasProject)) emit("changed");
		}
		function onOpenChange(value) {
			if (value || isSubmitting.value) return;
			close();
		}
		async function create(project) {
			try {
				await createPublicProject(rootStore.publicApiContext, project);
				return { status: "created" };
			} catch (error) {
				if (error instanceof ResponseError && error.httpStatusCode === 409) return { status: "already-exists" };
				return {
					status: "failed",
					message: getErrorMessage(error)
				};
			}
		}
		async function assignAdmin(projectId) {
			const userId = admins.get(projectId);
			if (!userId) return { status: "created" };
			try {
				await addProjectMembers(rootStore.restApiContext, projectId, [{
					userId,
					role: PROJECT_ADMIN_ROLE_SLUG
				}]);
				return { status: "created" };
			} catch (error) {
				return {
					status: "admin-failed",
					message: getErrorMessage(error)
				};
			}
		}
		async function refreshProjects() {
			try {
				await Promise.all([projectContext$1.getMyProjects(), projectContext$1.getProjectsCount()]);
			} catch {}
		}
		async function submit() {
			if (isSubmitting.value || selected.size === 0) return;
			isSubmitting.value = true;
			let created = 0;
			for (const project of props.projects.filter(({ id }) => selected.has(id))) {
				const isNew = states.get(project.id)?.status !== "admin-failed";
				states.set(project.id, { status: "creating" });
				let state = { status: "created" };
				if (isNew) {
					state = await create(project);
					if (state.status === "created") created++;
				}
				if (state.status === "created") state = await assignAdmin(project.id);
				states.set(project.id, state);
				if (isDone(project.id)) selected.delete(project.id);
			}
			isSubmitting.value = false;
			if (created) await refreshProjects();
			if ([...states.keys()].some(isFailed)) return;
			if (created) toast.showMessage({
				title: i18n.baseText("settings.promotions.missingProjects.toast.created", {
					adjustToNumber: created,
					interpolate: { count: String(created) }
				}),
				type: "success"
			});
			close();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: __props.open,
				size: "xlarge",
				"aria-description": description.value,
				"data-test-id": "promotion-missing-projects-dialog",
				"onUpdate:open": onOpenChange
			}, {
				default: withCtx(() => [
					createVNode(unref(DialogHeader_default), null, {
						default: withCtx(() => [createVNode(unref(DialogTitle_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.promotions.missingProjects.dialog.title")), 1)]),
							_: 1
						})]),
						_: 1
					}),
					createVNode(unref(DialogBody_default), null, {
						default: withCtx(() => [createBaseVNode("form", {
							id: "promotion-missing-projects-form",
							class: normalizeClass(_ctx.$style.form),
							onSubmit: withModifiers(submit, ["prevent"])
						}, [createVNode(unref(N8nText_default), { color: "text-base" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(description.value), 1)]),
							_: 1
						}), createBaseVNode("table", { class: normalizeClass(_ctx.$style.table) }, [
							createBaseVNode("colgroup", null, [
								_cache[0] || (_cache[0] = createBaseVNode("col", null, null, -1)),
								_cache[1] || (_cache[1] = createBaseVNode("col", null, null, -1)),
								canAssignAdmin.value ? (openBlock(), createElementBlock("col", {
									key: 0,
									class: normalizeClass(_ctx.$style.adminColumn)
								}, null, 2)) : createCommentVNode("", true)
							]),
							createBaseVNode("thead", null, [createBaseVNode("tr", null, [
								createBaseVNode("th", null, [createVNode(unref(Checkbox_default), {
									"model-value": allState.value === "checked",
									indeterminate: allState.value === "indeterminate",
									disabled: isSubmitting.value || selectable.value.length === 0,
									"aria-label": unref(i18n).baseText("settings.promotions.missingProjects.dialog.selectAll"),
									"data-test-id": "promotion-missing-projects-select-all",
									"onUpdate:modelValue": toggleAll
								}, null, 8, [
									"model-value",
									"indeterminate",
									"disabled",
									"aria-label"
								])]),
								createBaseVNode("th", _hoisted_1$1, toDisplayString(unref(i18n).baseText("settings.promotions.missingProjects.dialog.project")), 1),
								canAssignAdmin.value ? (openBlock(), createElementBlock("th", _hoisted_2, toDisplayString(unref(i18n).baseText("settings.promotions.missingProjects.dialog.admin")), 1)) : createCommentVNode("", true)
							])]),
							createBaseVNode("tbody", null, [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.projects, (project) => {
								return openBlock(), createElementBlock("tr", {
									key: project.id,
									"data-test-id": `promotion-missing-project-${project.id}`
								}, [
									createBaseVNode("td", null, [!isDone(project.id) ? (openBlock(), createBlock(unref(Checkbox_default), {
										key: 0,
										"model-value": selected.has(project.id),
										disabled: isSubmitting.value,
										"aria-label": project.name,
										"onUpdate:modelValue": ($event) => toggle(project.id)
									}, null, 8, [
										"model-value",
										"disabled",
										"aria-label",
										"onUpdate:modelValue"
									])) : createCommentVNode("", true)]),
									createBaseVNode("td", null, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.project) }, [hasProject(project.id) ? (openBlock(), createBlock(unref(N8nLink_default), {
										key: 0,
										to: {
											name: unref(VIEWS).PROJECTS_WORKFLOWS,
											params: { projectId: project.id }
										}
									}, {
										default: withCtx(() => [createVNode(unref(N8nText_default), { bold: "" }, {
											default: withCtx(() => [createTextVNode(toDisplayString(project.name), 1)]),
											_: 2
										}, 1024)]),
										_: 2
									}, 1032, ["to"])) : (openBlock(), createBlock(unref(N8nText_default), {
										key: 1,
										bold: "",
										color: "text-dark"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(project.name), 1)]),
										_: 2
									}, 1024)), states.get(project.id)?.status === "creating" ? (openBlock(), createBlock(unref(N8nIcon_default), {
										key: 2,
										icon: "loader-circle",
										spin: "",
										size: "small"
									})) : createCommentVNode("", true)], 2), statusLine(project.id) ? (openBlock(), createBlock(unref(N8nText_default), {
										key: 0,
										class: normalizeClass(_ctx.$style.status),
										size: "small",
										color: statusLine(project.id)?.color,
										"data-test-id": "promotion-missing-project-status"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(statusLine(project.id)?.text), 1)]),
										_: 2
									}, 1032, ["class", "color"])) : createCommentVNode("", true)]),
									canAssignAdmin.value ? (openBlock(), createElementBlock("td", _hoisted_4, [createVNode(unref(N8nUserSelect_default), {
										"model-value": admins.get(project.id) ?? "",
										users: userOptions.value,
										"current-user-id": unref(usersStore).currentUser?.id,
										placeholder: unref(i18n).baseText("settings.promotions.missingProjects.dialog.adminPlaceholder"),
										disabled: isSubmitting.value || !selected.has(project.id),
										loading: isLoadingUsers.value,
										"remote-method": unref(debouncedSearchUsers),
										teleported: false,
										"aria-label": unref(i18n).baseText("settings.promotions.missingProjects.dialog.adminLabel", { interpolate: { project: project.name } }),
										size: "medium",
										remote: "",
										"show-avatar": "",
										clearable: "",
										"data-test-id": "promotion-missing-project-admin",
										"onUpdate:modelValue": (userId) => setAdmin(project.id, userId)
									}, null, 8, [
										"model-value",
										"users",
										"current-user-id",
										"placeholder",
										"disabled",
										"loading",
										"remote-method",
										"aria-label",
										"onUpdate:modelValue"
									])])) : createCommentVNode("", true)
								], 8, _hoisted_3);
							}), 128))])
						], 2)], 34)]),
						_: 1
					}),
					createVNode(unref(DialogFooter_default), null, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							type: "button",
							variant: "outline",
							disabled: isSubmitting.value,
							"data-test-id": "promotion-missing-projects-cancel",
							onClick: close
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.cancel")), 1)]),
							_: 1
						}, 8, ["disabled"]), createVNode(unref(N8nButton_default), {
							type: "submit",
							form: "promotion-missing-projects-form",
							loading: isSubmitting.value,
							disabled: selected.size === 0,
							"data-test-id": "promotion-missing-projects-create"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(submitLabel.value), 1)]),
							_: 1
						}, 8, ["loading", "disabled"])]),
						_: 1
					})
				]),
				_: 1
			}, 8, ["open", "aria-description"]);
		};
	}
}), [["__cssModules", { "$style": {
	form: "_form_mwkvu_1",
	table: "_table_mwkvu_7",
	adminColumn: "_adminColumn_mwkvu_36",
	project: "_project_mwkvu_40",
	status: "_status_mwkvu_46"
} }]]);
//#endregion
//#region ../../modules/promotions/frontend/src/components/PromotionMissingProjectsButton.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var PromotionMissingProjectsButton_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PromotionMissingProjectsButton",
	props: {
		environmentId: {},
		environmentName: {},
		busy: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const rootStore = useRootStore();
		const rbacStore = useRBACStore();
		const { next: nextLoad } = useLatestFetch();
		const projects = shallowRef();
		const loadError = ref();
		const dialogOpen = ref(false);
		const count = computed(() => projects.value?.length ?? 0);
		const tooltip = computed(() => {
			const interpolate = {
				environment: props.environmentName,
				count: String(count.value)
			};
			if (loadError.value !== void 0) return i18n.baseText("settings.promotions.missingProjects.tooltip.error", { interpolate: {
				...interpolate,
				error: loadError.value
			} });
			if (projects.value === void 0) return void 0;
			return count.value ? i18n.baseText("settings.promotions.missingProjects.tooltip.missing", {
				adjustToNumber: count.value,
				interpolate
			}) : i18n.baseText("settings.promotions.missingProjects.tooltip.none", { interpolate });
		});
		async function load() {
			const isLatestLoad = nextLoad();
			projects.value = void 0;
			loadError.value = void 0;
			try {
				const { data } = await fetchMissingPromotionProjects(rootStore.publicApiContext, props.environmentId);
				if (isLatestLoad()) projects.value = data;
			} catch (error) {
				if (isLatestLoad()) loadError.value = getErrorMessage(error);
			}
		}
		watch(() => props.environmentId, load, { immediate: true });
		async function onClick() {
			if (loadError.value !== void 0) await load();
			if (count.value) dialogOpen.value = true;
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.root) }, [createVNode(unref(N8nTooltip_default), {
				content: tooltip.value,
				disabled: !tooltip.value,
				"show-after": unref(500)
			}, {
				default: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "outline",
					size: "small",
					disabled: __props.busy || !count.value && loadError.value === void 0 || !unref(rbacStore).hasScope("project:create"),
					"data-test-id": "promotion-missing-projects-button",
					onClick
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(count.value ? unref(i18n).baseText("settings.promotions.missingProjects.button.count", {
						adjustToNumber: count.value,
						interpolate: { count: String(count.value) }
					}) : unref(i18n).baseText("settings.promotions.missingProjects.button")), 1)]),
					_: 1
				}, 8, ["disabled"])]),
				_: 1
			}, 8, [
				"content",
				"disabled",
				"show-after"
			]), dialogOpen.value && projects.value ? (openBlock(), createBlock(PromotionMissingProjectsDialog_default, {
				key: 0,
				open: dialogOpen.value,
				"environment-name": __props.environmentName,
				projects: projects.value,
				"onUpdate:open": _cache[0] || (_cache[0] = ($event) => dialogOpen.value = $event),
				onChanged: load
			}, null, 8, [
				"open",
				"environment-name",
				"projects"
			])) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": { root: "_root_17li2_1" } }]]);
//#endregion
//#region ../../modules/promotions/frontend/src/components/PromotionEnvironmentCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var PromotionEnvironmentCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PromotionEnvironmentCard",
	props: {
		environment: {},
		busy: {},
		connectError: {},
		canConnect: { type: Boolean }
	},
	emits: [
		"connect",
		"edit",
		"remove"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const router = useRouter();
		const { permissions } = usePromotionCheckout();
		const dialogOpen = ref(false);
		const branch = computed(() => promotionEnvironmentBranch(props.environment));
		const canRun = computed(() => props.environment.direction === "apply" ? !!permissions.value.apply : !!permissions.value.promote);
		const actions = computed(() => [
			{
				label: i18n.baseText("generic.edit"),
				value: "edit"
			},
			...props.canConnect ? [{
				label: i18n.baseText("settings.promotions.environment.testConnection"),
				value: "connect"
			}] : [],
			{
				label: i18n.baseText("settings.promotions.environment.remove"),
				value: "remove",
				destructive: true
			}
		]);
		async function run() {
			if (props.environment.direction === "apply") {
				await router.push({ name: PROMOTION_INSTANCE_APPLY_VIEW });
				return;
			}
			dialogOpen.value = true;
		}
		function onAction(action) {
			if (action === "edit") emit("edit");
			else if (action === "connect") emit("connect");
			else emit("remove");
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [
				createVNode(unref(SettingsRow_default), {
					title: unref(i18n).baseText(`settings.promotions.environments.${__props.environment.direction}.title`),
					"show-divider": false
				}, {
					action: withCtx(() => [createVNode(unref(N8nActionToggle_default), {
						actions: actions.value,
						disabled: !!__props.busy,
						"data-test-id": "promotion-environment-menu",
						onAction
					}, {
						default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
							variant: "ghost",
							icon: "ellipsis",
							size: "small",
							disabled: !!__props.busy,
							"aria-label": unref(i18n).baseText("settings.promotions.environment.menu")
						}, null, 8, ["disabled", "aria-label"])]),
						_: 1
					}, 8, ["actions", "disabled"])]),
					_: 1
				}, 8, ["title"]),
				createVNode(unref(SettingsRow_default), { "show-divider": false }, {
					info: withCtx(() => [
						createVNode(unref(N8nText_default), {
							bold: "",
							color: "text-dark"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(__props.environment.name), 1)]),
							_: 1
						}),
						createVNode(unref(N8nText_default), {
							class: normalizeClass(_ctx.$style.remote),
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.promotions.environment.remoteSummary", { interpolate: {
								type: unref(i18n).baseText(`settings.promotions.providers.type.${__props.environment.provider.type}`),
								remoteUrl: __props.environment.remote.remoteUrl,
								branch: branch.value
							} })), 1)]),
							_: 1
						}, 8, ["class"]),
						__props.busy === "connect" ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							role: "status",
							class: normalizeClass(_ctx.$style.connectState),
							size: "small",
							color: "text-light",
							"data-test-id": "promotion-environment-connecting"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.promotions.environment.testingConnection")), 1)]),
							_: 1
						}, 8, ["class"])) : __props.connectError ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 1,
							role: "alert",
							class: normalizeClass(_ctx.$style.connectState),
							size: "small",
							color: "danger",
							"data-test-id": "promotion-environment-connect-error"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(__props.connectError), 1)]),
							_: 1
						}, 8, ["class"])) : createCommentVNode("", true)
					]),
					visual: withCtx(() => [createVNode(unref(N8nIcon_default), {
						icon: unref(promotionProviderIcon)[__props.environment.provider.type],
						color: "text-dark",
						size: "xlarge"
					}, null, 8, ["icon"])]),
					_: 1
				}),
				createVNode(unref(SettingsRow_default), {
					"show-divider": false,
					"action-max-width": "100%"
				}, {
					action: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.actions) }, [
						__props.connectError && __props.canConnect ? (openBlock(), createBlock(unref(N8nButton_default), {
							key: 0,
							variant: "outline",
							size: "small",
							loading: __props.busy === "connect",
							disabled: __props.busy === "remove",
							"data-test-id": "promotion-environment-retry",
							onClick: _cache[0] || (_cache[0] = ($event) => emit("connect"))
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.retry")), 1)]),
							_: 1
						}, 8, ["loading", "disabled"])) : createCommentVNode("", true),
						__props.environment.direction === "apply" ? (openBlock(), createBlock(PromotionMissingProjectsButton_default, {
							key: 1,
							"environment-id": __props.environment.id,
							"environment-name": __props.environment.name,
							busy: !!__props.busy
						}, null, 8, [
							"environment-id",
							"environment-name",
							"busy"
						])) : createCommentVNode("", true),
						canRun.value ? (openBlock(), createBlock(unref(N8nButton_default), {
							key: 2,
							size: "small",
							disabled: !!__props.busy,
							"data-test-id": `${__props.environment.direction}-instance-button`,
							onClick: run
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(`settings.promotions.${__props.environment.direction}.button`)), 1)]),
							_: 1
						}, 8, ["disabled", "data-test-id"])) : createCommentVNode("", true)
					], 2)]),
					_: 1
				}),
				dialogOpen.value && __props.environment.direction === "promote" ? (openBlock(), createBlock(PromoteInstanceDialog_default, {
					key: 0,
					open: dialogOpen.value,
					"environment-id": __props.environment.id,
					"base-branch-name": __props.environment.settings.baseBranchName,
					"environment-name": __props.environment.name,
					"create-branch-on-promotion": __props.environment.settings.createBranchOnPromotion,
					"provider-type": __props.environment.provider.type,
					"onUpdate:open": _cache[1] || (_cache[1] = ($event) => dialogOpen.value = $event)
				}, null, 8, [
					"open",
					"environment-id",
					"base-branch-name",
					"environment-name",
					"create-branch-on-promotion",
					"provider-type"
				])) : createCommentVNode("", true)
			]);
		};
	}
}), [["__cssModules", { "$style": {
	remote: "_remote_mig1y_1",
	connectState: "_connectState_mig1y_5",
	actions: "_actions_mig1y_9"
} }]]);
//#endregion
//#region ../../modules/promotions/frontend/src/composables/useInstanceProtection.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* The protected instance setting on the Environments v2 page. It lives in the source control
* preferences, so this is the one place to change when the setting moves to its own endpoint.
*/
function useInstanceProtection() {
	const i18n = useI18n();
	const toast = useToast();
	const environmentsSettings$1 = use(environmentsSettings);
	const busy = ref(true);
	const isProtected = computed(() => environmentsSettings$1.isProtected());
	async function load() {
		try {
			await environmentsSettings$1.loadPreferences();
			busy.value = false;
		} catch (error) {
			toast.showError(error, i18n.baseText("settings.promotions.protected.toast.error.load"), { message: i18n.baseText("settings.promotions.protected.toast.error.description") });
		}
	}
	async function set(value) {
		busy.value = true;
		try {
			await environmentsSettings$1.setProtected(value);
			toast.showMessage({
				title: i18n.baseText("settings.sourceControl.saved.title"),
				type: "success"
			});
		} catch (error) {
			toast.showError(error, i18n.baseText("settings.promotions.protected.toast.error.save"), { message: i18n.baseText("settings.promotions.protected.toast.error.description") });
		} finally {
			busy.value = false;
		}
	}
	return {
		busy,
		isProtected,
		load,
		set
	};
}
//#endregion
//#region ../../modules/promotions/frontend/src/views/PromotionsSettingsView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = ["disabled"];
var PromotionsSettingsView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PromotionsSettingsView",
	setup(__props) {
		const i18n = useI18n();
		const toast = useToast();
		const message = useMessage();
		const router = useRouter();
		const rootStore = useRootStore();
		const settingsStore = useSettingsStore();
		const documentTitle = useDocumentTitle({ releaseChannel: settingsStore.settings.releaseChannel });
		const { next: nextLoad } = useLatestFetch();
		const { connectErrors, canConnect, connect } = usePromotionCheckout();
		const { busy: switchBusy, canSwitchBack, switchTo: switchEnvironmentsVersion } = use(environmentsSettings).useVersionSwitch();
		const { busy: protectionBusy, isProtected, load: loadProtection, set: setProtected } = useInstanceProtection();
		const environments = ref({});
		const isInitialLoading = ref(true);
		const loadError = ref(false);
		const busy = reactive(/* @__PURE__ */ new Map());
		const addButtons = {};
		async function load() {
			const isLatestLoad = nextLoad();
			loadError.value = false;
			try {
				const context = rootStore.publicApiContext;
				const summaries = await fetchPromotionEnvironments(context, { scope: "instance" });
				const details = await Promise.all(summaries.map(async ({ id }) => await fetchPromotionEnvironment(context, id)));
				if (!isLatestLoad()) return;
				environments.value = Object.fromEntries(details.map((detail) => [detail.direction, detail]));
			} catch (error) {
				if (!isLatestLoad()) return;
				loadError.value = true;
				toast.showError(error, i18n.baseText("settings.promotions.environments.error.title"));
			} finally {
				if (isLatestLoad()) isInitialLoading.value = false;
			}
		}
		onMounted(async () => {
			documentTitle.set(i18n.baseText("settings.promotions.title"));
			await Promise.all([load(), loadProtection()]);
		});
		async function testConnection(environment) {
			busy.set(environment.id, "connect");
			if (await connect(environment.id)) toast.showMessage({
				title: i18n.baseText("settings.promotions.environment.toast.connected", { interpolate: { name: environment.name } }),
				type: "success"
			});
			busy.delete(environment.id);
		}
		async function remove(environment) {
			const messageKey = environment.direction === "promote" && isPromotionGitHostType(environment.provider.type) ? "settings.promotions.environment.remove.confirm.message.gitHost" : "settings.promotions.environment.remove.confirm.message";
			if (await message.confirm(i18n.baseText(messageKey, { interpolate: { name: environment.name } }), i18n.baseText("settings.promotions.environment.remove.confirm.title"), {
				confirmButtonText: i18n.baseText("settings.promotions.environment.remove.confirm.button"),
				cancelButtonText: i18n.baseText("generic.cancel"),
				customClass: "el-message-box--destructive",
				showClose: true
			}) !== "confirm") return;
			const context = rootStore.publicApiContext;
			busy.set(environment.id, "remove");
			try {
				await deletePromotionEnvironment(context, environment.id);
			} catch (error) {
				if (!(error instanceof ResponseError && error.httpStatusCode === 404)) {
					busy.delete(environment.id);
					toast.showError(error, i18n.baseText("settings.promotions.environment.toast.error.remove"));
					return;
				}
			}
			try {
				await deleteProviderIfUnused(context, environment.provider.id);
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.promotions.provider.toast.error.delete"));
			}
			connectErrors.delete(environment.id);
			invalidateInstancePromotionConnection();
			await load();
			busy.delete(environment.id);
			toast.showMessage({
				title: i18n.baseText("settings.promotions.environment.toast.removed", { interpolate: { name: environment.name } }),
				type: "success"
			});
			await nextTick();
			const addButton = addButtons[environment.direction];
			if (addButton && "$el" in addButton && addButton.$el instanceof HTMLElement) addButton.$el.focus();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SettingsLayout_default), { class: normalizeClass(_ctx.$style.layout) }, {
				default: withCtx(() => [
					createVNode(unref(SettingsPageHeader_default), {
						title: unref(i18n).baseText("settings.promotions.title"),
						description: unref(i18n).baseText("settings.promotions.description"),
						"docs-url": unref(ENVIRONMENTS_PLAN_DOCS_URL)
					}, {
						titleTrailing: withCtx(() => [createVNode(unref(PreviewBadge_default), {
							size: "xsmall",
							"data-test-id": "promotions-preview-badge"
						}), unref(settingsStore).isEnterprisePlan ? (openBlock(), createBlock(unref(EnterpriseReadinessBadge_default), {
							key: 0,
							size: "xsmall",
							"data-test-id": "promotions-enterprise-readiness-badge"
						})) : createCommentVNode("", true)]),
						_: 1
					}, 8, [
						"title",
						"description",
						"docs-url"
					]),
					createVNode(unref(SettingsSection_default), { title: unref(i18n).baseText("settings.promotions.environments.title") }, {
						description: withCtx(() => [createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-base"
						}, {
							default: withCtx(() => [createVNode(unref(I18nT), {
								keypath: "settings.promotions.environments.description",
								tag: "span",
								scope: "global"
							}, {
								environments: withCtx(() => [createVNode(unref(N8nExternalLink_default), {
									inline: "",
									size: "small",
									href: unref(ENVIRONMENTS_DOCS_URL)
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.promotions.environments.description.link")), 1)]),
									_: 1
								}, 8, ["href"])]),
								_: 1
							})]),
							_: 1
						})]),
						default: withCtx(() => [isInitialLoading.value ? (openBlock(), createBlock(unref(Loading_default), {
							key: 0,
							rows: 2,
							"shrink-last": false
						})) : loadError.value ? (openBlock(), createBlock(unref(N8nEmptyState_default), {
							key: 1,
							heading: unref(i18n).baseText("settings.promotions.environments.error.title"),
							description: unref(i18n).baseText("settings.promotions.environments.error.description"),
							"button-text": unref(i18n).baseText("generic.retry"),
							"data-test-id": "promotion-environments-load-error",
							"onClick:button": load
						}, null, 8, [
							"heading",
							"description",
							"button-text"
						])) : (openBlock(), createBlock(unref(SettingsRowGroup_default), { key: 2 }, {
							default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.columns) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(promotionDirectionSchema).options, (direction) => {
								return openBlock(), createElementBlock(Fragment, { key: direction }, [environments.value[direction] ? (openBlock(), createBlock(PromotionEnvironmentCard_default, {
									key: environments.value[direction].id,
									class: normalizeClass(_ctx.$style.column),
									environment: environments.value[direction],
									busy: busy.get(environments.value[direction].id),
									"connect-error": unref(connectErrors).get(environments.value[direction].id),
									"can-connect": unref(canConnect),
									"data-test-id": `promotion-environment-card-${direction}`,
									onConnect: ($event) => testConnection(environments.value[direction]),
									onEdit: ($event) => unref(router).push({
										name: unref(PROMOTIONS_ENVIRONMENT_EDIT_VIEW),
										params: { environmentId: environments.value[direction].id }
									}),
									onRemove: ($event) => remove(environments.value[direction])
								}, null, 8, [
									"class",
									"environment",
									"busy",
									"connect-error",
									"can-connect",
									"data-test-id",
									"onConnect",
									"onEdit",
									"onRemove"
								])) : (openBlock(), createElementBlock("div", {
									key: 1,
									class: normalizeClass(_ctx.$style.column)
								}, [createVNode(unref(SettingsRow_default), {
									title: unref(i18n).baseText(`settings.promotions.environments.${direction}.title`),
									"show-divider": false
								}, null, 8, ["title"]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.empty) }, [createVNode(unref(N8nButton_default), {
									ref_for: true,
									ref: (button) => addButtons[direction] = button,
									variant: "outline",
									icon: "plus",
									"data-test-id": `promotion-environment-add-${direction}`,
									onClick: ($event) => unref(router).push({
										name: unref(PROMOTIONS_ENVIRONMENT_ADD_VIEW),
										params: { direction }
									})
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.promotions.environments.add")), 1)]),
									_: 1
								}, 8, ["data-test-id", "onClick"])], 2)], 2))], 64);
							}), 128))], 2)]),
							_: 1
						})), createVNode(unref(SettingsRowGroup_default), null, {
							default: withCtx(() => [createVNode(unref(SettingsRow_default), {
								title: unref(i18n).baseText("settings.sourceControl.protected.bold"),
								description: unref(i18n).baseText("settings.promotions.protected.description")
							}, {
								action: withCtx(() => [createVNode(unref(N8nSwitch_default), {
									"model-value": unref(isProtected),
									disabled: unref(protectionBusy),
									"aria-label": unref(i18n).baseText("settings.sourceControl.protected.bold"),
									"data-test-id": "promotion-protected-instance-switch",
									"onUpdate:modelValue": unref(setProtected)
								}, null, 8, [
									"model-value",
									"disabled",
									"aria-label",
									"onUpdate:modelValue"
								])]),
								_: 1
							}, 8, ["title", "description"])]),
							_: 1
						})]),
						_: 1
					}, 8, ["title"]),
					unref(canSwitchBack) ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						tag: "p",
						size: "small",
						color: "text-light",
						class: "mt-2xl",
						"data-test-id": "promotions-switch-back"
					}, {
						default: withCtx(() => [createVNode(unref(I18nT), {
							keypath: "settings.promotions.switchBack.text",
							tag: "span",
							scope: "global"
						}, {
							action: withCtx(() => [createBaseVNode("button", {
								type: "button",
								class: normalizeClass(_ctx.$style.switchBack),
								disabled: unref(switchBusy),
								"data-test-id": "promotions-switch-to-v1",
								onClick: _cache[0] || (_cache[0] = ($event) => unref(switchEnvironmentsVersion)("v1"))
							}, toDisplayString(unref(i18n).baseText("settings.promotions.switchBack.button")), 11, _hoisted_1)]),
							_: 1
						})]),
						_: 1
					})) : createCommentVNode("", true)
				]),
				_: 1
			}, 8, ["class"]);
		};
	}
}), [["__cssModules", { "$style": {
	layout: "_layout_3cw8z_1",
	columns: "_columns_3cw8z_6",
	column: "_column_3cw8z_6",
	switchBack: "_switchBack_3cw8z_30",
	empty: "_empty_3cw8z_40"
} }]]);
//#endregion
export { PromotionsSettingsView_default as default };
