import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, Yo as useRoute, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { BC as ProjectTypes, MA as RadioGroupItem_default, SN as _plugin_vue_export_helper_default, _N as N8nText_default, cN as Input_default, dC as useToast, gM as N8nInputLabel_default, jA as RadioGroup_default, jM as createEventBus, jN as useI18n, oc as useFoldersStore, vm as useProjectsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
import { t as MoveToFolderDropdown_default } from "./MoveToFolderDropdown-D_YeLgLU.js";
//#region src/features/core/folders/components/DeleteFolderModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { key: 0 };
var _hoisted_2 = {
	key: 0,
	class: "pt-2xs"
};
var _hoisted_3 = {
	key: 0,
	class: "pt-2xs",
	"data-test-id": "delete-data-input"
};
var DeleteFolderModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "DeleteFolderModal",
	props: {
		modalName: {},
		activeId: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const modalBus = createEventBus();
		const { showMessage, showError } = useToast();
		const i18n = useI18n();
		const route = useRoute();
		const foldersStore = useFoldersStore();
		const projectsStore = useProjectsStore();
		const loading = ref(false);
		const operation = ref("");
		const deleteConfirmText = ref("");
		const selectedFolder = ref(null);
		const folderToDelete = computed(() => {
			if (!props.activeId) return null;
			return foldersStore.breadcrumbsCache[props.activeId];
		});
		const isPending = computed(() => {
			return selectedFolder.value ? !selectedFolder.value.name : false;
		});
		const title = computed(() => {
			const folderName = folderToDelete.value?.name ?? "";
			return i18n.baseText("folders.delete.confirm.title", { interpolate: { folderName } });
		});
		const enabled = computed(() => {
			if (isPending.value) return true;
			if (operation.value === "delete" && deleteConfirmText.value === i18n.baseText("folders.delete.typeToConfirm", { interpolate: { folderName: folderToDelete.value?.name ?? "" } })) return true;
			if (operation.value === "transfer" && selectedFolder.value) return true;
			return false;
		});
		const currentProjectName = computed(() => {
			const currentProject = projectsStore.currentProject;
			if (currentProject?.type === ProjectTypes.Personal) return i18n.baseText("projects.menu.personal");
			return currentProject?.name;
		});
		const folderContentWarningMessage = computed(() => {
			const folderCount = props.data.content.subFolderCount ?? 0;
			const workflowCount = props.data.content.workflowCount ?? 0;
			let folderText = "";
			let workflowText = "";
			if (folderCount > 0) folderText = i18n.baseText("folder.count", { interpolate: { count: folderCount } });
			if (workflowCount > 0) workflowText = i18n.baseText("workflow.count", { interpolate: { count: workflowCount } });
			if (folderCount > 0 && workflowCount > 0) folderText += ` ${i18n.baseText("folder.and.workflow.separator")} `;
			return i18n.baseText("folder.delete.modal.confirmation", { interpolate: {
				folders: folderText,
				workflows: workflowText
			} });
		});
		async function onSubmit() {
			if (!enabled.value) return;
			try {
				loading.value = true;
				const newParentId = selectedFolder.value?.resource === "project" ? "0" : selectedFolder.value?.id ?? void 0;
				await foldersStore.deleteFolder(route.params.projectId, props.activeId, newParentId);
				let message = "";
				if (selectedFolder.value) message = i18n.baseText("folders.transfer.confirm.message", { interpolate: { folderName: selectedFolder.value.name ?? "" } });
				showMessage({
					type: "success",
					title: i18n.baseText("folders.delete.success.message"),
					message
				});
				props.data.workflowListEventBus.emit("folder-deleted", {
					folderId: props.activeId,
					workflowCount: props.data.content.workflowCount,
					folderCount: props.data.content.subFolderCount
				});
				modalBus.emit("close");
			} catch (error) {
				showError(error, i18n.baseText("folders.delete.error.message"));
			} finally {
				loading.value = false;
			}
		}
		const onFolderSelected = (payload) => {
			selectedFolder.value = payload;
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				name: __props.modalName,
				title: title.value,
				center: true,
				width: "600",
				"event-bus": unref(modalBus),
				onEnter: onSubmit
			}, {
				content: withCtx(() => [createBaseVNode("div", null, [isPending.value ? (openBlock(), createElementBlock("div", _hoisted_1, [createVNode(unref(N8nText_default), { color: "text-base" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("folders.delete.confirm.message")), 1)]),
					_: 1
				})])) : (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.content)
				}, [createBaseVNode("div", null, [createVNode(unref(N8nText_default), { color: "text-base" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(folderContentWarningMessage.value), 1)]),
					_: 1
				})]), createVNode(unref(RadioGroup_default), {
					modelValue: operation.value,
					"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => operation.value = $event)
				}, {
					default: withCtx(() => [createVNode(unref(RadioGroupItem_default), {
						value: "transfer",
						"data-test-id": "transfer-content-radio"
					}, {
						label: withCtx(() => [currentProjectName.value ? (openBlock(), createBlock(unref(N8nText_default), { key: 0 }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("folders.transfer.action", { interpolate: { projectName: currentProjectName.value } })), 1)]),
							_: 1
						})) : (openBlock(), createBlock(unref(N8nText_default), {
							key: 1,
							color: "text-dark"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("folders.transfer.action.noProject")), 1)]),
							_: 1
						}))]),
						content: withCtx(() => [operation.value === "transfer" ? (openBlock(), createElementBlock("div", _hoisted_2, [createVNode(unref(N8nText_default), { color: "text-dark" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("folders.transfer.selectFolder")), 1)]),
							_: 1
						}), unref(projectsStore).currentProject ? (openBlock(), createBlock(MoveToFolderDropdown_default, {
							key: 0,
							"selected-location": selectedFolder.value,
							"selected-project-id": unref(projectsStore).currentProject?.id,
							"current-project-id": unref(projectsStore).currentProject?.id,
							"current-folder-id": props.activeId,
							"parent-folder-id": folderToDelete.value?.parentFolder,
							"onLocation:selected": onFolderSelected
						}, null, 8, [
							"selected-location",
							"selected-project-id",
							"current-project-id",
							"current-folder-id",
							"parent-folder-id"
						])) : createCommentVNode("", true)])) : createCommentVNode("", true)]),
						_: 1
					}), createVNode(unref(RadioGroupItem_default), {
						value: "delete",
						"data-test-id": "delete-content-radio"
					}, {
						label: withCtx(() => [createVNode(unref(N8nText_default), { color: "text-dark" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("folders.delete.action")), 1)]),
							_: 1
						})]),
						content: withCtx(() => [operation.value === "delete" ? (openBlock(), createElementBlock("div", _hoisted_3, [createVNode(unref(N8nInputLabel_default), { label: unref(i18n).baseText("folders.delete.confirmation.message", { interpolate: { folderName: folderToDelete.value?.name ?? "" } }) }, {
							default: withCtx(() => [createVNode(unref(Input_default), {
								modelValue: deleteConfirmText.value,
								"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => deleteConfirmText.value = $event),
								"data-test-id": "delete-data-input",
								placeholder: unref(i18n).baseText("folders.delete.typeToConfirm", { interpolate: { folderName: folderToDelete.value?.name ?? "" } })
							}, null, 8, ["modelValue", "placeholder"])]),
							_: 1
						}, 8, ["label"])])) : createCommentVNode("", true)]),
						_: 1
					})]),
					_: 1
				}, 8, ["modelValue"])], 2))])]),
				footer: withCtx(() => [createVNode(unref(N8nButton_default), {
					loading: loading.value,
					disabled: !enabled.value,
					label: unref(i18n).baseText("generic.delete"),
					float: "right",
					"data-test-id": "confirm-delete-folder-button",
					onClick: onSubmit
				}, null, 8, [
					"loading",
					"disabled",
					"label"
				])]),
				_: 1
			}, 8, [
				"name",
				"title",
				"event-bus"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	content: "_content_176rm_1",
	innerContent: "_innerContent_176rm_8",
	"folder-select-item": "_folder-select-item_176rm_12"
} }]]);
//#endregion
export { DeleteFolderModal_default as default };
