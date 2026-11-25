import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, bd as I18nT, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { BC as ProjectTypes, If as TransferPolicyWarning_default, Jg as useUIStore, LM as N8nCallout_default, Lf as useTransferPreview, Mp as useCredentialsStore, Qu as usePolicyViolationLabels, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, Wp as useWorkflowsListStore, _M as Checkbox_default, _N as N8nText_default, dC as useToast, fN as N8nTooltip_default, fd as usePrivateCredentials, gm as useAvailableProjectSearch, hC as useTelemetry, hm as splitName, jN as useI18n, lm as ResourceType, mN as truncate, nD as getResourcePermissions, pm as getTruncatedProjectName, vm as useProjectsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
import { t as ProjectSharing_default } from "./ProjectSharing-CHLhYej8.js";
import { t as useMoveResourceToProjectToast } from "./useMoveResourceToProjectToast-oUxtNKaR.js";
import { n as ProjectMoveResourceModalCredentialsList_default, t as PolicyViolationTypeIcon_default } from "./PolicyViolationTypeIcon-Cl9v5i_P.js";
//#region src/features/collaboration/projects/components/ProjectMoveResourceModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ProjectMoveResourceModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ProjectMoveResourceModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const uiStore = useUIStore();
		const toast = useToast();
		const projectsStore = useProjectsStore();
		const searchFn = useAvailableProjectSearch();
		const workflowsListStore = useWorkflowsListStore();
		const credentialsStore = useCredentialsStore();
		const privateCredentials = usePrivateCredentials();
		const telemetry = useTelemetry();
		const { showMoveToProjectToast } = useMoveResourceToProjectToast();
		const { labelOf } = usePolicyViolationLabels();
		const selectedProject = ref(null);
		const shareUsedCredentials = ref(false);
		const usedCredentials = ref([]);
		const allCredentials = ref([]);
		const loading = ref(false);
		const shareableCredentials = computed(() => allCredentials.value.filter((credential) => getResourcePermissions(credential.scopes).credential.share && usedCredentials.value.find((uc) => uc.id === credential.id)));
		const unShareableCredentials = computed(() => usedCredentials.value.reduce((acc, uc) => {
			const credential = credentialsStore.getCredentialById(uc.id);
			const credentialPermissions = getResourcePermissions(credential?.scopes).credential;
			if (!credentialPermissions.share) {
				if (credentialPermissions.read) acc.push(credential);
				else acc.push(uc);
			}
			return acc;
		}, []));
		const homeProjectName = computed(() => processProjectName(props.data.resource.homeProject?.name ?? "") ?? "");
		const isResourceInTeamProject = computed(() => isHomeProjectTeam(props.data.resource));
		const isResourceWorkflow = computed(() => props.data.resourceType === ResourceType.Workflow);
		const isEndUserCredential = computed(() => props.data.resourceType === ResourceType.Credential && props.data.resource.isResolvable === true);
		const isResolvableCredential = computed(() => privateCredentials.isEnabled.value && isEndUserCredential.value);
		const projectFilterFn = (p) => {
			if (isEndUserCredential.value && p.type === ProjectTypes.Personal) return false;
			return !p.scopes || !!getResourcePermissions(p.scopes)[props.data.resourceType].create;
		};
		const targetProjectName = computed(() => {
			return getTruncatedProjectName(selectedProject.value?.name);
		});
		const resourceName = computed(() => truncate(props.data.resource.name, 25));
		const transferPreviewTarget = computed(() => ({
			resourceType: isResourceWorkflow.value ? "workflow" : "credential",
			id: props.data.resource.id
		}));
		const { preview: transferPreview } = useTransferPreview(transferPreviewTarget, () => selectedProject.value?.id);
		const isPersonalSpaceRestricted = computed(() => props.data.resource.homeProject?.type === ProjectTypes.Personal && props.data.resource.homeProject?.id === projectsStore.personalProject?.id);
		const isTargetPersonalProject = computed(() => selectedProject.value?.id === projectsStore.personalProject?.id);
		const isHomeProjectTeam = (resource) => resource.homeProject?.type === ProjectTypes.Team;
		const processProjectName = (projectName) => {
			const { name, email } = splitName(projectName);
			return name ?? email;
		};
		const closeModal = () => {
			uiStore.closeModal(props.modalName);
		};
		const moveResource = async () => {
			if (!selectedProject.value || loading.value) return;
			loading.value = true;
			try {
				await projectsStore.moveResourceToProject(props.data.resourceType, props.data.resource.id, selectedProject.value.id, void 0, shareUsedCredentials.value ? shareableCredentials.value.map((c) => c.id) : void 0);
				closeModal();
				telemetry.track(`User successfully moved ${props.data.resourceType}`, {
					[`${props.data.resourceType}_id`]: props.data.resource.id,
					project_from_type: projectsStore.currentProject?.type ?? projectsStore.personalProject?.type
				});
				showMoveToProjectToast({
					resourceType: props.data.resourceType,
					resourceTypeLabel: props.data.resourceTypeLabel,
					resourceName: resourceName.value,
					targetProject: selectedProject.value,
					targetProjectName: targetProjectName.value,
					shareUsedCredentials: shareUsedCredentials.value,
					areAllUsedCredentialsShareable: shareableCredentials.value.length === usedCredentials.value.length
				});
				if (props.data.eventBus) props.data.eventBus.emit("resource-moved", {
					resourceId: props.data.resource.id,
					resourceType: props.data.resourceType,
					targetProjectId: selectedProject.value.id
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("projects.move.resource.error.title", { interpolate: {
					resourceTypeLabel: props.data.resourceTypeLabel,
					resourceName: resourceName.value
				} }));
			} finally {
				loading.value = false;
			}
		};
		onMounted(async () => {
			telemetry.track(`User clicked to move a ${props.data.resourceType}`, {
				[`${props.data.resourceType}_id`]: props.data.resource.id,
				project_from_type: projectsStore.currentProject?.type ?? projectsStore.personalProject?.type
			});
			if (isResourceWorkflow.value) {
				const [workflow, credentials] = await Promise.all([workflowsListStore.fetchWorkflow(props.data.resource.id), credentialsStore.fetchAllCredentials()]);
				usedCredentials.value = workflow?.usedCredentials ?? [];
				allCredentials.value = credentials ?? [];
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				width: "500px",
				name: props.modalName,
				"data-test-id": "project-move-resource-modal"
			}, {
				header: withCtx(() => [createVNode(unref(N8nHeading_default), {
					tag: "h2",
					size: "xlarge",
					class: "mb-m pr-s"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("projects.move.resource.modal.title", { interpolate: { resourceTypeLabel: props.data.resourceTypeLabel } })), 1)]),
					_: 1
				}), createVNode(unref(N8nText_default), null, {
					default: withCtx(() => [createVNode(unref(I18nT), {
						keypath: "projects.move.resource.modal.message",
						scope: "global"
					}, createSlots({
						resourceName: withCtx(() => [createBaseVNode("strong", null, toDisplayString(resourceName.value), 1)]),
						_: 2
					}, [isResourceInTeamProject.value ? {
						name: "inTeamProject",
						fn: withCtx(() => [createVNode(unref(I18nT), {
							keypath: "projects.move.resource.modal.message.team",
							scope: "global"
						}, {
							resourceHomeProjectName: withCtx(() => [createBaseVNode("strong", null, toDisplayString(homeProjectName.value), 1)]),
							_: 1
						})]),
						key: "0"
					} : {
						name: "inPersonalProject",
						fn: withCtx(() => [createVNode(unref(I18nT), {
							keypath: "projects.move.resource.modal.message.personal",
							scope: "global"
						}, {
							resourceHomeProjectName: withCtx(() => [createBaseVNode("strong", null, toDisplayString(homeProjectName.value), 1)]),
							_: 1
						})]),
						key: "1"
					}]), 1024)]),
					_: 1
				})]),
				content: withCtx(() => [createBaseVNode("div", null, [
					createVNode(ProjectSharing_default, {
						modelValue: selectedProject.value,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selectedProject.value = $event),
						class: "mr-2xs mb-xs",
						"search-fn": unref(searchFn),
						"home-project": props.data.resource.homeProject,
						"filter-fn": projectFilterFn,
						placeholder: unref(i18n).baseText("projects.move.resource.modal.selectPlaceholder"),
						"empty-options-text": unref(i18n).baseText("projects.move.resource.modal.message.noProjects", { interpolate: { resourceTypeLabel: props.data.resourceTypeLabel } }),
						"data-test-id": "project-move-resource-modal-select"
					}, null, 8, [
						"modelValue",
						"search-fn",
						"home-project",
						"placeholder",
						"empty-options-text"
					]),
					unref(transferPreview) && selectedProject.value ? (openBlock(), createBlock(unref(TransferPolicyWarning_default), {
						key: 0,
						class: "mb-xs",
						preview: unref(transferPreview),
						"resource-type": transferPreviewTarget.value.resourceType,
						"project-id": selectedProject.value.id,
						"project-name": targetProjectName.value,
						"label-of": unref(labelOf)
					}, {
						icon: withCtx(({ violation }) => [createVNode(PolicyViolationTypeIcon_default, { violation }, null, 8, ["violation"])]),
						_: 1
					}, 8, [
						"preview",
						"resource-type",
						"project-id",
						"project-name",
						"label-of"
					])) : createCommentVNode("", true),
					createVNode(unref(N8nText_default), null, {
						default: withCtx(() => [
							createVNode(unref(I18nT), {
								keypath: "projects.move.resource.modal.message.sharingNote",
								scope: "global"
							}, {
								note: withCtx(() => [createBaseVNode("strong", null, toDisplayString(unref(i18n).baseText("projects.move.resource.modal.message.note")), 1)]),
								resourceTypeLabel: withCtx(() => [createTextVNode(toDisplayString(props.data.resourceTypeLabel), 1)]),
								_: 1
							}),
							props.data.resource.sharedWithProjects?.length ?? false ? (openBlock(), createElementBlock("span", {
								key: 0,
								class: normalizeClass(_ctx.$style.textBlock)
							}, toDisplayString(unref(i18n).baseText("projects.move.resource.modal.message.sharingInfo", {
								adjustToNumber: props.data.resource.sharedWithProjects?.length,
								interpolate: { count: props.data.resource.sharedWithProjects?.length ?? 0 }
							})), 3)) : createCommentVNode("", true),
							shareableCredentials.value.length && !isTargetPersonalProject.value ? (openBlock(), createBlock(unref(Checkbox_default), {
								key: 1,
								modelValue: shareUsedCredentials.value,
								"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => shareUsedCredentials.value = $event),
								class: normalizeClass(_ctx.$style.textBlock),
								"data-test-id": "project-move-resource-modal-checkbox-all"
							}, {
								label: withCtx(() => [createVNode(unref(I18nT), {
									keypath: "projects.move.resource.modal.message.usedCredentials",
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
								})]),
								_: 1
							}, 8, ["modelValue", "class"])) : createCommentVNode("", true),
							unShareableCredentials.value.length && !isTargetPersonalProject.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
								key: 2,
								theme: "warning",
								class: normalizeClass(_ctx.$style.textBlock)
							}, {
								default: withCtx(() => [createVNode(unref(I18nT), {
									keypath: isPersonalSpaceRestricted.value ? "projects.move.resource.modal.message.unAccessibleCredentials.personalSpaceNote" : "projects.move.resource.modal.message.unAccessibleCredentials.note",
									scope: "global"
								}, {
									credentials: withCtx(() => [createVNode(unref(N8nTooltip_default), { placement: "top" }, {
										content: withCtx(() => [createVNode(ProjectMoveResourceModalCredentialsList_default, {
											"current-project-id": unref(projectsStore).currentProjectId,
											credentials: unShareableCredentials.value
										}, null, 8, ["current-project-id", "credentials"])]),
										default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.tooltipText) }, toDisplayString(unref(i18n).baseText("projects.move.resource.modal.message.unAccessibleCredentials.count", {
											adjustToNumber: unShareableCredentials.value.length,
											interpolate: { count: unShareableCredentials.value.length }
										})), 3)]),
										_: 1
									})]),
									_: 1
								}, 8, ["keypath"])]),
								_: 1
							}, 8, ["class"])) : createCommentVNode("", true)
						]),
						_: 1
					}),
					isResolvableCredential.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 1,
						theme: "warning",
						class: normalizeClass(_ctx.$style.textBlock),
						"data-test-id": "project-move-resource-modal-resolvable-warning"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("projects.move.resource.modal.message.resolvableConnections")), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true)
				])]),
				footer: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.buttons) }, [createVNode(unref(N8nButton_default), {
					variant: "ghost",
					class: "mr-2xs",
					disabled: loading.value,
					onClick: closeModal
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.cancel")), 1)]),
					_: 1
				}, 8, ["disabled"]), createVNode(unref(N8nButton_default), {
					variant: "solid",
					loading: loading.value,
					disabled: !selectedProject.value || loading.value,
					"data-test-id": "project-move-resource-modal-button",
					onClick: moveResource
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("projects.move.resource.modal.button", { interpolate: { resourceTypeLabel: props.data.resourceTypeLabel } })), 1)]),
					_: 1
				}, 8, ["loading", "disabled"])], 2)]),
				_: 1
			}, 8, ["name"]);
		};
	}
}), [["__cssModules", { "$style": {
	buttons: "_buttons_d2ouj_1",
	textBlock: "_textBlock_d2ouj_6",
	tooltipText: "_tooltipText_d2ouj_10"
} }]]);
//#endregion
export { ProjectMoveResourceModal_default as default };
