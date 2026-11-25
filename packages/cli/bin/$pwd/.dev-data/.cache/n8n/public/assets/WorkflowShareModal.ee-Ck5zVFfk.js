import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Of as withDirectives, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, bd as I18nT, ff as openBlock, ip as init_shared_esm_bundler, jd as vShow, lf as onMounted, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { BC as ProjectTypes, Dx as WORKFLOW_SHARE_MODAL_KEY, GS as EnterpriseEditionFeature, Jg as useUIStore, Ju as useWorkflowSaving, Od as useWorkflowsStore, PA as useMessage, Ru as usePageRedirectionHelper, SN as _plugin_vue_export_helper_default, Wp as useWorkflowsListStore, Xd as createWorkflowDocumentId, Zf as useRolesStore, _N as N8nText_default, _m as useRemoteProjectSearch, dC as useToast, jM as createEventBus, jN as useI18n, nD as getResourcePermissions, nf as useWorkflowDocumentStore, p as telemetry, tM as N8nInfoTip_default, vm as useProjectsStore, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
import { t as EnterpriseEdition_ee_default } from "./EnterpriseEdition.ee-Bv-_EZth.js";
import { t as ProjectSharing_default } from "./ProjectSharing-CHLhYej8.js";
import { t as useWorkflowsEEStore } from "./workflows.ee.store-CVTEYmBM.js";
//#region src/features/workflows/components/WorkflowShareModal.ee.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var WorkflowShareModal_ee_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowShareModal.ee",
	props: { data: {} },
	setup(__props) {
		const { data } = __props;
		const workflowsStore = useWorkflowsStore();
		const workflowsListStore = useWorkflowsListStore();
		const settingsStore = useSettingsStore();
		const uiStore = useUIStore();
		const workflowsEEStore = useWorkflowsEEStore();
		const projectsStore = useProjectsStore();
		const rolesStore = useRolesStore();
		const toast = useToast();
		const message = useMessage();
		const pageRedirectionHelper = usePageRedirectionHelper();
		const i18n = useI18n();
		const router = useRouter();
		const route = useRoute();
		const workflowSaving = useWorkflowSaving({ router });
		const workflowDocumentStore = computed(() => useWorkflowDocumentStore(createWorkflowDocumentId(data.id)));
		const workflowListEntry = computed(() => workflowsListStore.workflowsById[data.id]);
		const workflowId = computed(() => data.id);
		const workflowName = computed(() => workflowListEntry.value?.name ?? workflowDocumentStore.value.name);
		const workflowHomeProject = computed(() => workflowListEntry.value?.homeProject ?? workflowDocumentStore.value.homeProject);
		const workflowScopes = computed(() => workflowListEntry.value?.scopes ?? workflowDocumentStore.value.scopes);
		const workflowSharedWithProjects = computed(() => workflowDocumentStore.value?.sharedWithProjects ?? workflowListEntry.value?.sharedWithProjects);
		const loading = ref(true);
		let initializationPromise;
		const isDirty = ref(false);
		const modalBus = createEventBus();
		const sharedWithProjects = ref([...workflowSharedWithProjects.value ?? []]);
		const teamProject = ref(null);
		const isSharingEnabled = computed(() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Sharing]);
		const isHomeTeamProject = computed(() => workflowHomeProject.value?.type === ProjectTypes.Team);
		const modalTitle = computed(() => {
			if (isHomeTeamProject.value) return i18n.baseText("workflows.shareModal.title.static", { interpolate: { projectName: workflowHomeProject.value?.name ?? "" } });
			return i18n.baseText(isSharingEnabled.value ? uiStore.contextBasedTranslationKeys.workflows.sharing.title : uiStore.contextBasedTranslationKeys.workflows.sharing.unavailable.title, { interpolate: { name: workflowName.value } });
		});
		const workflowPermissions = computed(() => {
			return getResourcePermissions(workflowScopes.value).workflow;
		});
		const isPersonalSpaceRestricted = computed(() => workflowHomeProject.value?.type === ProjectTypes.Personal && workflowHomeProject.value?.id === projectsStore.personalProject?.id && !workflowPermissions.value.share);
		const workflowOwnerName = computed(() => workflowsEEStore.getWorkflowOwnerName(`${workflowId.value}`));
		const searchFn = useRemoteProjectSearch({ type: ProjectTypes.Personal });
		const filterFn = (project) => project.type === ProjectTypes.Personal && project.id !== workflowHomeProject.value?.id;
		const numberOfMembersInHomeTeamProject = computed(() => teamProject.value?.relations.length ?? 0);
		const workflowRoleTranslations = computed(() => ({
			"workflow:editor": i18n.baseText("workflows.shareModal.role.editor"),
			"workflow:owner": ""
		}));
		const workflowRoles = computed(() => rolesStore.processedWorkflowRoles.map(({ slug, scopes, displayName, licensed, description, systemRole, roleType }) => ({
			slug,
			displayName: slug in workflowRoleTranslations.value ? workflowRoleTranslations.value[slug] : displayName,
			scopes,
			licensed,
			description,
			systemRole,
			roleType
		})));
		const trackTelemetry = (eventName, data) => {
			telemetry.track(eventName, {
				workflow_id: workflowId.value,
				...data
			});
		};
		const onProjectAdded = (project) => {
			trackTelemetry("User selected sharee to add", {
				project_id_sharer: workflowHomeProject.value?.id,
				project_id_sharee: project.id
			});
		};
		const onProjectRemoved = (project) => {
			trackTelemetry("User selected sharee to remove", {
				project_id_sharer: workflowHomeProject.value?.id,
				project_id_sharee: project.id
			});
		};
		const onSave = async () => {
			if (loading.value) return;
			loading.value = true;
			const saveWorkflowPromise = async () => {
				if (!workflowsStore.isWorkflowSaved[workflowId.value]) {
					const parentFolderId = route.query.folderId;
					const workflowId = await workflowSaving.saveAsNewWorkflow({ parentFolderId });
					if (!workflowId) throw new Error(i18n.baseText("workflows.shareModal.onSave.error.title"));
					return workflowId;
				} else return workflowId.value;
			};
			try {
				const workflowId = await saveWorkflowPromise();
				await workflowsEEStore.saveWorkflowSharedWith({
					workflowId,
					sharedWithProjects: sharedWithProjects.value
				});
				useWorkflowDocumentStore(createWorkflowDocumentId(workflowId)).setSharedWithProjects(sharedWithProjects.value);
				toast.showMessage({ title: i18n.baseText("workflows.shareModal.onSave.success.title") });
				isDirty.value = false;
				modalBus.emit("close");
			} catch (error) {
				toast.showError(error, i18n.baseText("workflows.shareModal.onSave.error.title"));
			} finally {
				loading.value = false;
			}
		};
		const onCloseModal = async () => {
			if (isDirty.value) {
				if (await message.confirm(i18n.baseText("workflows.shareModal.saveBeforeClose.message"), i18n.baseText("workflows.shareModal.saveBeforeClose.title"), {
					type: "warning",
					confirmButtonText: i18n.baseText("workflows.shareModal.saveBeforeClose.confirmButtonText"),
					cancelButtonText: i18n.baseText("workflows.shareModal.saveBeforeClose.cancelButtonText")
				}) === "confirm") {
					await initializationPromise;
					await onSave();
					return false;
				}
			}
			return true;
		};
		const goToUpgrade = () => {
			pageRedirectionHelper.goToUpgrade("workflow_sharing", "upgrade-workflow-sharing");
		};
		const initialize = async () => {
			if (isSharingEnabled.value) {
				if (workflowsStore.isWorkflowSaved[workflowId.value]) await workflowsListStore.fetchWorkflow(workflowId.value);
				if (isHomeTeamProject.value && workflowHomeProject.value) teamProject.value = await projectsStore.fetchProject(workflowHomeProject.value.id);
			}
			loading.value = false;
		};
		onMounted(async () => {
			initializationPromise = initialize();
			await initializationPromise;
		});
		watch(sharedWithProjects, () => {
			isDirty.value = true;
		}, { deep: true });
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				width: "460px",
				"max-height": "75%",
				title: modalTitle.value,
				"event-bus": unref(modalBus),
				name: unref(WORKFLOW_SHARE_MODAL_KEY),
				center: true,
				"before-close": onCloseModal
			}, {
				content: withCtx(() => [!isSharingEnabled.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.container)
				}, [createVNode(unref(N8nText_default), null, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(unref(uiStore).contextBasedTranslationKeys.workflows.sharing.unavailable.description.modal)), 1)]),
					_: 1
				})], 2)) : (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.container)
				}, [!workflowPermissions.value.share && !isHomeTeamProject.value && !isPersonalSpaceRestricted.value ? (openBlock(), createBlock(unref(N8nInfoTip_default), {
					key: 0,
					bold: false,
					class: "mb-s"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflows.shareModal.info.sharee", { interpolate: { workflowOwnerName: workflowOwnerName.value } })), 1)]),
					_: 1
				})) : createCommentVNode("", true), createVNode(EnterpriseEdition_ee_default, {
					features: [unref(EnterpriseEditionFeature).Sharing],
					class: normalizeClass(_ctx.$style.content)
				}, {
					fallback: withCtx(() => [createVNode(unref(N8nText_default), null, {
						default: withCtx(() => [createVNode(unref(I18nT), {
							keypath: unref(uiStore).contextBasedTranslationKeys.workflows.sharing.unavailable.description.tooltip,
							tag: "span",
							scope: "global"
						}, {
							action: withCtx(() => [..._cache[2] || (_cache[2] = [])]),
							_: 1
						}, 8, ["keypath"])]),
						_: 1
					})]),
					default: withCtx(() => [createBaseVNode("div", null, [workflowHomeProject.value ? (openBlock(), createBlock(ProjectSharing_default, {
						key: 0,
						modelValue: sharedWithProjects.value,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => sharedWithProjects.value = $event),
						"home-project": workflowHomeProject.value,
						"search-fn": unref(searchFn),
						"filter-fn": filterFn,
						roles: workflowRoles.value,
						readonly: !workflowPermissions.value.share,
						static: isHomeTeamProject.value || !workflowPermissions.value.share,
						"disabled-tooltip": isPersonalSpaceRestricted.value ? unref(i18n).baseText("workflows.shareModal.info.personalSpaceRestricted") : void 0,
						placeholder: unref(i18n).baseText("workflows.shareModal.select.placeholder"),
						"empty-options-text": unref(i18n).baseText("workflows.shareModel.select.notFound"),
						onProjectAdded,
						onProjectRemoved
					}, null, 8, [
						"modelValue",
						"home-project",
						"search-fn",
						"roles",
						"readonly",
						"static",
						"disabled-tooltip",
						"placeholder",
						"empty-options-text"
					])) : createCommentVNode("", true), isHomeTeamProject.value ? (openBlock(), createBlock(unref(N8nInfoTip_default), {
						key: 1,
						bold: false,
						class: "mt-s"
					}, {
						default: withCtx(() => [createVNode(unref(I18nT), {
							keypath: "workflows.shareModal.info.members",
							tag: "span",
							scope: "global"
						}, {
							projectName: withCtx(() => [createTextVNode(toDisplayString(workflowHomeProject.value?.name), 1)]),
							members: withCtx(() => [createBaseVNode("strong", null, toDisplayString(unref(i18n).baseText("workflows.shareModal.info.members.number", {
								interpolate: { number: String(numberOfMembersInHomeTeamProject.value) },
								adjustToNumber: numberOfMembersInHomeTeamProject.value
							})), 1)]),
							_: 1
						})]),
						_: 1
					})) : createCommentVNode("", true)])]),
					_: 1
				}, 8, ["features", "class"])], 2))]),
				footer: withCtx(() => [!isSharingEnabled.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.actionButtons)
				}, [createVNode(unref(N8nButton_default), { onClick: goToUpgrade }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(unref(uiStore).contextBasedTranslationKeys.workflows.sharing.unavailable.button)), 1)]),
					_: 1
				})], 2)) : (openBlock(), createBlock(EnterpriseEdition_ee_default, {
					key: 1,
					features: [unref(EnterpriseEditionFeature).Sharing],
					class: normalizeClass(_ctx.$style.actionButtons)
				}, {
					default: withCtx(() => [withDirectives(createVNode(unref(N8nText_default), {
						color: "text-light",
						size: "small",
						class: "mr-xs"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflows.shareModal.changesHint")), 1)]),
						_: 1
					}, 512), [[vShow, isDirty.value]]), isHomeTeamProject.value ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 0,
						variant: "outline",
						onClick: _cache[1] || (_cache[1] = ($event) => unref(modalBus).emit("close"))
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.close")), 1)]),
						_: 1
					})) : withDirectives((openBlock(), createBlock(unref(N8nButton_default), {
						key: 1,
						loading: loading.value,
						disabled: !isDirty.value,
						"data-test-id": "workflow-sharing-modal-save-button",
						onClick: onSave
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflows.shareModal.save")), 1)]),
						_: 1
					}, 8, ["loading", "disabled"])), [[vShow, workflowPermissions.value.share]])]),
					_: 1
				}, 8, ["features", "class"]))]),
				_: 1
			}, 8, [
				"title",
				"event-bus",
				"name"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1ujhg_1",
	content: "_content_1ujhg_11",
	usersList: "_usersList_1ujhg_18",
	actionButtons: "_actionButtons_1ujhg_23",
	roleSelect: "_roleSelect_1ujhg_29",
	roleSelectRemoveOption: "_roleSelectRemoveOption_1ujhg_33"
} }]]);
//#endregion
export { WorkflowShareModal_ee_default as default };
