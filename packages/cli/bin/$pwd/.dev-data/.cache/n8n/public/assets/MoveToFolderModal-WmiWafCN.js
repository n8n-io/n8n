import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, Zd as h, _p as normalizeClass, bd as I18nT, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { BC as ProjectTypes, GS as EnterpriseEditionFeature, If as TransferPolicyWarning_default, Jg as useUIStore, LM as N8nCallout_default, Lf as useTransferPreview, Mp as useCredentialsStore, Od as useWorkflowsStore, P_ as MOVE_FOLDER_MODAL_KEY, Qu as usePolicyViolationLabels, Rf as PolicyViolationList_default, SN as _plugin_vue_export_helper_default, Wp as useWorkflowsListStore, _M as Checkbox_default, _N as N8nText_default, dC as useToast, fN as N8nTooltip_default, gm as useAvailableProjectSearch, hm as splitName, jM as createEventBus, jN as useI18n, lm as ResourceType, nD as getResourcePermissions, oc as useFoldersStore, pm as getTruncatedProjectName, vm as useProjectsStore, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
import { t as ProjectSharing_default } from "./ProjectSharing-CHLhYej8.js";
import { t as useDependencies } from "./useDependencies-C0z0nXRY.js";
import { t as MoveToFolderDropdown_default } from "./MoveToFolderDropdown-D_YeLgLU.js";
import { n as ProjectMoveResourceModalCredentialsList_default, t as PolicyViolationTypeIcon_default } from "./PolicyViolationTypeIcon-Cl9v5i_P.js";
//#region src/app/components/RepublishFailureList.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var RepublishFailureList_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "RepublishFailureList",
	props: { failures: {} },
	setup(__props) {
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("section", { class: normalizeClass(_ctx.$style.section) }, [createBaseVNode("p", null, toDisplayString(unref(i18n).baseText("projects.move.republishFailed.folder.message")), 1), createBaseVNode("ul", { class: normalizeClass(_ctx.$style.items) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.failures, (failure) => {
				return openBlock(), createElementBlock("li", {
					key: failure.id,
					class: normalizeClass(_ctx.$style.item),
					"data-test-id": "republish-failure"
				}, [createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-dark"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("projects.move.republishFailed.folder.item", { interpolate: {
						name: failure.name,
						reason: failure.reason
					} })), 1)]),
					_: 2
				}, 1024)], 2);
			}), 128))], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	section: "_section_1g0z0_1",
	items: "_items_1g0z0_8",
	item: "_item_1g0z0_8"
} }]]);
//#endregion
//#region src/app/composables/useUnpublishedByMoveToast.ts
init_runtime_core_esm_bundler();
/** Warns that a move unpublished workflows, and why: a destination policy or a failed republish. */
function useUnpublishedByMoveToast() {
	const i18n = useI18n();
	const toast = useToast();
	const { labelOf } = usePolicyViolationLabels();
	function showForWorkflow(result, workflowName, projectName) {
		if (!result) return;
		const message = "unpublishReasons" in result ? h("div", [h("p", i18n.baseText("typeAvailabilityPolicies.transfer.unpublished.workflow.message", { interpolate: {
			name: workflowName,
			project: projectName
		} })), h(PolicyViolationList_default, {
			violations: result.unpublishReasons,
			labelOf
		})]) : h("p", i18n.baseText("projects.move.republishFailed.workflow.message", { interpolate: {
			name: workflowName,
			reason: result.error.message
		} }));
		toast.showMessage({
			type: "warning",
			duration: 0,
			title: i18n.baseText("typeAvailabilityPolicies.transfer.unpublished.workflow.title"),
			message
		});
	}
	function showForFolder(result, projectName) {
		if (!result?.unpublishedWorkflows.length) return;
		const refused = result.unpublishedWorkflows.filter((w) => "unpublishReasons" in w);
		const failed = result.unpublishedWorkflows.flatMap((w) => "error" in w ? [{
			id: w.id,
			name: w.name,
			reason: w.error.message
		}] : []);
		const quotedNames = refused.map(({ name }) => `'${name}'`).join(", ");
		const violations = result.unpublishedWorkflows.flatMap((w) => "unpublishReasons" in w ? w.unpublishReasons : []);
		toast.showMessage({
			type: "warning",
			duration: 0,
			title: i18n.baseText("typeAvailabilityPolicies.transfer.unpublished.folder.title"),
			message: h("div", [
				refused.length > 0 && h("p", i18n.baseText("typeAvailabilityPolicies.transfer.unpublished.folder.message", { interpolate: {
					project: projectName,
					names: quotedNames
				} })),
				refused.length > 0 && h(PolicyViolationList_default, {
					violations,
					labelOf
				}),
				failed.length > 0 && h(RepublishFailureList_default, { failures: failed })
			])
		});
	}
	return {
		showForWorkflow,
		showForFolder
	};
}
//#endregion
//#region src/features/core/folders/components/MoveToFolderModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var MoveToFolderModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "MoveToFolderModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const modalBus = createEventBus();
		const foldersStore = useFoldersStore();
		const projectsStore = useProjectsStore();
		const uiStore = useUIStore();
		const credentialsStore = useCredentialsStore();
		const workflowsListStore = useWorkflowsListStore();
		const workflowsStore = useWorkflowsStore();
		const settingsStore = useSettingsStore();
		const { fetchDependencies, fetchFolderDependencies, getDependencies } = useDependencies();
		const toast = useToast();
		const { labelOf } = usePolicyViolationLabels();
		const unpublishedByMoveToast = useUnpublishedByMoveToast();
		const selectedFolder = ref(null);
		const selectedProject = ref(projectsStore.currentProject);
		const loading = ref(false);
		const isPersonalProject = computed(() => {
			return selectedProject.value?.type === ProjectTypes.Personal;
		});
		const isOwnPersonalProject = computed(() => {
			return selectedProject.value?.type === ProjectTypes.Personal && selectedProject.value?.id === projectsStore.personalProject?.id;
		});
		const isTransferringOwnership = computed(() => {
			return selectedProject.value && selectedProject.value?.id !== projectsStore.currentProject?.id;
		});
		const workflowCount = ref(0);
		const subFolderCount = ref(0);
		const isSharingEnabled = computed(() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Sharing]);
		const shareUsedCredentials = ref(false);
		const usedCredentials = ref([]);
		const allCredentials = ref([]);
		const shareableCredentials = computed(() => allCredentials.value.filter((credential) => isTransferringOwnership.value && isSharingEnabled.value && getResourcePermissions(credential.scopes).credential.share && usedCredentials.value.find((uc) => uc.id === credential.id)));
		const unShareableCredentials = computed(() => usedCredentials.value.reduce((acc, uc) => {
			const credential = credentialsStore.getCredentialById(uc.id);
			const credentialPermissions = getResourcePermissions(credential?.scopes).credential;
			if (!credentialPermissions.share || isTransferringOwnership.value && !isSharingEnabled.value) {
				if (credentialPermissions.read) acc.push(credential);
				else acc.push(uc);
			}
			return acc;
		}, []));
		const resourceDependencies = ref([]);
		const searchFn = useAvailableProjectSearch();
		const filterFn = (p) => !p.scopes || !!getResourcePermissions(p.scopes)[props.data.resourceType].create;
		const resourceTypeLabel = computed(() => {
			return i18n.baseText(`generic.${props.data.resourceType}`).toLowerCase();
		});
		const title = computed(() => {
			return i18n.baseText("folders.move.modal.title", { interpolate: {
				folderName: props.data.resource.name,
				resourceTypeLabel: resourceTypeLabel.value
			} });
		});
		const currentFolder = computed(() => {
			if (props.data.resourceType === "workflow") return;
			return {
				id: props.data.resource.id,
				name: props.data.resource.name
			};
		});
		const fetchCurrentFolderContents = async () => {
			if (!currentFolder.value || !projectsStore.currentProject) return;
			const { totalWorkflows, totalSubFolders } = await foldersStore.fetchFolderContent(projectsStore.currentProject.id, currentFolder.value.id);
			workflowCount.value = totalWorkflows;
			subFolderCount.value = totalSubFolders;
		};
		watch(() => [selectedProject.value], () => {
			selectedFolder.value = null;
		});
		watch(() => [currentFolder.value, selectedProject.value], () => {
			fetchCurrentFolderContents();
		}, { immediate: true });
		const onFolderSelected = (payload) => {
			selectedFolder.value = payload;
		};
		const getPersonalProjectLabel = (projectName) => {
			const { name } = splitName(projectName ?? "");
			const personalSpaceText = i18n.baseText("projects.sharing.personalSpace");
			return name ? `${name} (${personalSpaceText})` : personalSpaceText;
		};
		const targetProjectName = computed(() => {
			if (selectedProject.value?.type === ProjectTypes.Personal) return getPersonalProjectLabel(selectedProject.value?.name);
			return getTruncatedProjectName(selectedProject.value?.name);
		});
		const onSubmit = async () => {
			if (!selectedProject.value || loading.value) return;
			const newParent = selectedFolder.value ? {
				id: selectedFolder.value.id,
				name: selectedFolder.value.name,
				type: selectedFolder.value.resource
			} : {
				id: selectedProject.value.id,
				name: targetProjectName.value,
				type: "project"
			};
			const movedToProjectName = targetProjectName.value;
			loading.value = true;
			try {
				if (props.data.resourceType === "folder") {
					if (selectedProject.value.id !== projectsStore.currentProject?.id) {
						const destinationParentFolderId = selectedFolder.value && selectedFolder.value.id !== selectedProject.value.id ? selectedFolder.value.id : void 0;
						const shareCredentials = shareUsedCredentials.value ? shareableCredentials.value.map((c) => c.id) : void 0;
						const result = await foldersStore.moveFolderToProject(projectsStore.currentProject?.id ?? "", props.data.resource.id, selectedProject.value.id, destinationParentFolderId, shareCredentials);
						unpublishedByMoveToast.showForFolder(result, movedToProjectName);
						props.data.workflowListEventBus.emit("folder-transferred", {
							source: {
								projectId: projectsStore.currentProject?.id,
								folder: {
									id: props.data.resource.id,
									name: props.data.resource.name
								}
							},
							destination: {
								projectId: selectedProject.value.id,
								parentFolder: {
									id: destinationParentFolderId,
									name: selectedFolder.value && selectedFolder.value.id !== selectedProject.value.id ? selectedFolder.value.name : targetProjectName.value
								},
								canAccess: isFolderSelectable.value
							}
						});
					} else {
						const newParentId = newParent.type === "folder" ? newParent.id : "0";
						await foldersStore.moveFolder(projectsStore.currentProject?.id ?? "", props.data.resource.id, newParentId);
						props.data.workflowListEventBus.emit("folder-moved", {
							newParent,
							folder: {
								id: props.data.resource.id,
								name: props.data.resource.name
							},
							options: { skipApiCall: true }
						});
					}
				} else if (isTransferringOwnership.value) {
					const destinationParentFolderId = selectedFolder.value && selectedFolder.value.id !== selectedProject.value.id ? selectedFolder.value.id : void 0;
					const shareCredentials = shareUsedCredentials.value ? shareableCredentials.value.map((c) => c.id) : void 0;
					const result = await projectsStore.moveResourceToProject("workflow", props.data.resource.id, selectedProject.value.id, destinationParentFolderId, shareCredentials);
					unpublishedByMoveToast.showForWorkflow(result, props.data.resource.name, movedToProjectName);
					props.data.workflowListEventBus.emit("workflow-transferred", {
						source: {
							projectId: projectsStore.currentProject?.id,
							workflow: {
								id: props.data.resource.id,
								name: props.data.resource.name
							}
						},
						destination: {
							projectId: selectedProject.value.id,
							parentFolder: {
								id: destinationParentFolderId,
								name: selectedFolder.value && selectedFolder.value.id !== selectedProject.value.id ? selectedFolder.value.name : targetProjectName.value
							},
							canAccess: isFolderSelectable.value
						},
						toast: {
							targetProject: selectedProject.value,
							targetProjectName: targetProjectName.value,
							shareUsedCredentials: shareUsedCredentials.value,
							areAllUsedCredentialsShareable: shareableCredentials.value.length === usedCredentials.value.length
						}
					});
				} else {
					const newParentFolderId = newParent.type === "folder" ? newParent.id : "0";
					await workflowsStore.updateWorkflow(props.data.resource.id, { parentFolderId: newParentFolderId });
					props.data.workflowListEventBus.emit("workflow-moved", {
						newParent,
						workflow: {
							id: props.data.resource.id,
							name: props.data.resource.name,
							oldParentId: props.data.resource.parentFolderId
						},
						options: { skipApiCall: true }
					});
				}
				uiStore.closeModal(MOVE_FOLDER_MODAL_KEY);
			} catch (error) {
				const errorTitleKey = props.data.resourceType === "folder" ? "folders.move.error.title" : "folders.move.workflow.error.title";
				toast.showError(error, i18n.baseText(errorTitleKey));
			} finally {
				loading.value = false;
			}
		};
		const descriptionMessage = computed(() => {
			let folderText = "";
			let workflowText = "";
			if (subFolderCount.value > 0) folderText = i18n.baseText("folders.move.modal.folder.count", { interpolate: { count: subFolderCount.value } });
			if (workflowCount.value > 0) workflowText = i18n.baseText("folders.move.modal.workflow.count", { interpolate: { count: workflowCount.value } });
			if (subFolderCount.value > 0 && workflowCount.value > 0) folderText += ` ${i18n.baseText("folder.and.workflow.separator")} `;
			return i18n.baseText("folders.move.modal.description", { interpolate: {
				folders: folderText ? ` ${folderText}` : "",
				workflows: workflowText ? ` ${workflowText}` : ""
			} });
		});
		const isResourceWorkflow = computed(() => props.data.resourceType === ResourceType.Workflow);
		const currentResourceProjectId = computed(() => {
			return projectsStore.currentProject?.id ?? props.data.resource.homeProjectId;
		});
		const isChangingProject = computed(() => selectedProject.value && selectedProject.value.id !== currentResourceProjectId.value);
		const usedDataTables = computed(() => isChangingProject.value ? resourceDependencies.value.filter((dep) => dep.type === "dataTableId" && dep.projectId !== selectedProject.value?.id) : []);
		const transferPreviewTarget = computed(() => {
			if (!isChangingProject.value) return null;
			if (props.data.resourceType === "workflow") return {
				resourceType: "workflow",
				id: props.data.resource.id
			};
			if (!currentResourceProjectId.value) return null;
			return {
				resourceType: "folder",
				id: props.data.resource.id,
				projectId: currentResourceProjectId.value
			};
		});
		const { preview: transferPreview } = useTransferPreview(transferPreviewTarget, () => selectedProject.value?.id);
		const isFolderSelectable = computed(() => {
			return isOwnPersonalProject.value || !isPersonalProject.value;
		});
		onMounted(async () => {
			if (!projectsStore.isTeamProjectFeatureEnabled) selectedProject.value = projectsStore.personalProject;
			if (isResourceWorkflow.value) {
				const [workflow, credentials] = await Promise.all([
					workflowsListStore.fetchWorkflow(props.data.resource.id),
					credentialsStore.fetchAllCredentials(),
					fetchDependencies([props.data.resource.id], "workflow")
				]);
				usedCredentials.value = workflow?.usedCredentials ?? [];
				allCredentials.value = credentials;
				resourceDependencies.value = getDependencies(props.data.resource.id, "workflow")?.dependencies ?? [];
			} else if (projectsStore.currentProject?.id && currentFolder.value?.id) {
				const [used, credentials, dependencies] = await Promise.all([
					foldersStore.fetchFolderUsedCredentials(projectsStore.currentProject.id, currentFolder.value.id),
					credentialsStore.fetchAllCredentials(),
					fetchFolderDependencies(projectsStore.currentProject.id, currentFolder.value.id)
				]);
				usedCredentials.value = used;
				allCredentials.value = credentials;
				resourceDependencies.value = dependencies;
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				name: __props.modalName,
				title: title.value,
				width: "500",
				class: normalizeClass(_ctx.$style.container),
				"event-bus": unref(modalBus)
			}, {
				content: withCtx(() => [
					props.data.resourceType === "folder" && (workflowCount.value > 0 || subFolderCount.value > 0) ? (openBlock(), createElementBlock("p", {
						key: 0,
						class: normalizeClass(_ctx.$style.description),
						"data-test-id": "move-modal-description"
					}, toDisplayString(descriptionMessage.value), 3)) : createCommentVNode("", true),
					unref(projectsStore).isTeamProjectFeatureEnabled ? (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass(_ctx.$style.content)
					}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.block) }, [
						createVNode(unref(N8nText_default), { color: "text-dark" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("folders.move.modal.project.label")), 1)]),
							_: 1
						}),
						createVNode(ProjectSharing_default, {
							modelValue: selectedProject.value,
							"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selectedProject.value = $event),
							class: "pt-2xs",
							"search-fn": unref(searchFn),
							"filter-fn": filterFn,
							placeholder: unref(i18n).baseText("folders.move.modal.project.placeholder")
						}, null, 8, [
							"modelValue",
							"search-fn",
							"placeholder"
						]),
						unref(transferPreview) && selectedProject.value ? (openBlock(), createBlock(unref(TransferPolicyWarning_default), {
							key: 0,
							class: normalizeClass(_ctx.$style.calloutSpacing),
							preview: unref(transferPreview),
							"resource-type": props.data.resourceType,
							"project-id": selectedProject.value.id,
							"project-name": targetProjectName.value,
							"label-of": unref(labelOf)
						}, {
							icon: withCtx(({ violation }) => [createVNode(PolicyViolationTypeIcon_default, { violation }, null, 8, ["violation"])]),
							_: 1
						}, 8, [
							"class",
							"preview",
							"resource-type",
							"project-id",
							"project-name",
							"label-of"
						])) : createCommentVNode("", true)
					], 2), isTransferringOwnership.value ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.block)
					}, [createVNode(unref(N8nText_default), null, {
						default: withCtx(() => [createVNode(unref(I18nT), {
							keypath: "projects.move.resource.modal.message.sharingNote",
							scope: "global"
						}, {
							note: withCtx(() => [createBaseVNode("strong", null, toDisplayString(unref(i18n).baseText("projects.move.resource.modal.message.note")), 1)]),
							resourceTypeLabel: withCtx(() => [createTextVNode(toDisplayString(resourceTypeLabel.value), 1)]),
							_: 1
						}), props.data.resource.sharedWithProjects?.length ?? false ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: normalizeClass(_ctx.$style.textBlock)
						}, toDisplayString(unref(i18n).baseText("projects.move.resource.modal.message.sharingInfo", {
							adjustToNumber: props.data.resource.sharedWithProjects?.length,
							interpolate: { count: props.data.resource.sharedWithProjects?.length ?? 0 }
						})), 3)) : createCommentVNode("", true)]),
						_: 1
					})], 2)) : createCommentVNode("", true)], 2)) : createCommentVNode("", true),
					selectedProject.value && isFolderSelectable.value ? (openBlock(), createElementBlock("div", {
						key: 2,
						class: normalizeClass(_ctx.$style.block)
					}, [createVNode(unref(N8nText_default), { color: "text-dark" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("folders.move.modal.folder.label")), 1)]),
						_: 1
					}), createVNode(MoveToFolderDropdown_default, {
						"selected-location": selectedFolder.value,
						"selected-project-id": selectedProject.value.id,
						"current-project-id": currentResourceProjectId.value,
						"current-folder-id": currentFolder.value?.id,
						"parent-folder-id": props.data.resource.parentFolderId,
						"exclude-only-parent": props.data.resourceType === "workflow",
						"onLocation:selected": onFolderSelected,
						"onLoad:error": _cache[1] || (_cache[1] = ($event) => unref(toast).showError($event, unref(i18n).baseText("folders.open.error.title")))
					}, null, 8, [
						"selected-location",
						"selected-project-id",
						"current-project-id",
						"current-folder-id",
						"parent-folder-id",
						"exclude-only-parent"
					])], 2)) : createCommentVNode("", true),
					shareableCredentials.value.length ? (openBlock(), createBlock(unref(Checkbox_default), {
						key: 3,
						modelValue: shareUsedCredentials.value,
						"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => shareUsedCredentials.value = $event),
						class: normalizeClass(_ctx.$style.textBlock),
						"data-test-id": "move-modal-share-credentials-checkbox"
					}, {
						label: withCtx(() => [createVNode(unref(I18nT), {
							keypath: __props.data.resourceType === "workflow" ? "folders.move.modal.message.usedCredentials.workflow" : "folders.move.modal.message.usedCredentials.folder",
							scope: "global"
						}, {
							usedCredentials: withCtx(() => [createVNode(unref(N8nTooltip_default), { placement: "top" }, {
								content: withCtx(() => [createVNode(ProjectMoveResourceModalCredentialsList_default, {
									"current-project-id": unref(projectsStore).currentProjectId,
									credentials: shareableCredentials.value
								}, null, 8, ["current-project-id", "credentials"])]),
								default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.tooltipText) }, toDisplayString(unref(i18n).baseText("projects.move.resource.modal.message.usedCredentials.number", {
									adjustToNumber: shareableCredentials.value.length,
									interpolate: { count: shareableCredentials.value.length }
								})), 3)]),
								_: 1
							})]),
							_: 1
						}, 8, ["keypath"])]),
						_: 1
					}, 8, ["modelValue", "class"])) : createCommentVNode("", true),
					shareableCredentials.value.length && !shareUsedCredentials.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 4,
						class: normalizeClass(_ctx.$style.calloutSpacing),
						theme: "warning",
						"data-test-id": "move-modal-used-credentials-warning"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("folders.move.modal.message.usedCredentials.warning")), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true),
					unShareableCredentials.value.length ? (openBlock(), createElementBlock("div", {
						key: 5,
						class: normalizeClass(_ctx.$style.textBlock)
					}, [createVNode(unref(I18nT), {
						keypath: "projects.move.resource.modal.message.unAccessibleCredentials.note",
						scope: "global"
					}, {
						credentials: withCtx(() => [createVNode(unref(N8nTooltip_default), { placement: "top" }, {
							content: withCtx(() => [createVNode(ProjectMoveResourceModalCredentialsList_default, {
								"current-project-id": unref(projectsStore).currentProjectId,
								credentials: unShareableCredentials.value
							}, null, 8, ["current-project-id", "credentials"])]),
							default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.tooltipText) }, toDisplayString(unref(i18n).baseText("projects.move.resource.modal.message.unAccessibleCredentials")), 3)]),
							_: 1
						})]),
						_: 1
					})], 2)) : createCommentVNode("", true),
					usedDataTables.value.length ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 6,
						theme: "warning",
						class: normalizeClass(_ctx.$style.calloutSpacing),
						"data-test-id": "move-modal-data-tables-warning"
					}, {
						default: withCtx(() => [createVNode(unref(I18nT), {
							keypath: __props.data.resourceType === "workflow" ? "folders.move.modal.message.usedDataTables.workflow" : "folders.move.modal.message.usedDataTables.folder",
							scope: "global"
						}, {
							dataTables: withCtx(() => [createVNode(unref(N8nTooltip_default), { placement: "top" }, {
								content: withCtx(() => [createBaseVNode("ul", { class: normalizeClass(_ctx.$style.dataTablesList) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(usedDataTables.value, (dataTable) => {
									return openBlock(), createElementBlock("li", { key: dataTable.id }, toDisplayString(dataTable.name), 1);
								}), 128))], 2)]),
								default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.tooltipText) }, toDisplayString(unref(i18n).baseText("folders.move.modal.message.usedDataTables.count", {
									adjustToNumber: usedDataTables.value.length,
									interpolate: { count: usedDataTables.value.length }
								})), 3)]),
								_: 1
							})]),
							_: 1
						}, 8, ["keypath"])]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true)
				]),
				footer: withCtx(({ close }) => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [createVNode(unref(N8nButton_default), {
					variant: "outline",
					label: unref(i18n).baseText("generic.cancel"),
					disabled: loading.value,
					float: "right",
					"data-test-id": "cancel-move-folder-button",
					onClick: close
				}, null, 8, [
					"label",
					"disabled",
					"onClick"
				]), createVNode(unref(N8nButton_default), {
					disabled: !selectedFolder.value && isFolderSelectable.value || loading.value,
					loading: loading.value,
					label: unref(i18n).baseText("folders.move.modal.confirm", { interpolate: { resourceTypeLabel: resourceTypeLabel.value } }),
					float: "right",
					"data-test-id": "confirm-move-folder-button",
					onClick: onSubmit
				}, null, 8, [
					"disabled",
					"loading",
					"label"
				])], 2)]),
				_: 1
			}, 8, [
				"name",
				"title",
				"class",
				"event-bus"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_njcd4_1",
	description: "_description_njcd4_5",
	block: "_block_njcd4_10",
	footer: "_footer_njcd4_14",
	tooltipText: "_tooltipText_njcd4_20",
	calloutSpacing: "_calloutSpacing_njcd4_24",
	dataTablesList: "_dataTablesList_njcd4_28"
} }]]);
//#endregion
export { MoveToFolderModal_default as default };
