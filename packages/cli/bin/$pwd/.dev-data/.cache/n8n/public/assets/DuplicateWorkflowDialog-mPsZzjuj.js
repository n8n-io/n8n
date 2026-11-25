import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, ff as openBlock, if as nextTick, ip as init_shared_esm_bundler, lf as onMounted, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Fp as useWorkflowHelpers, Ju as useWorkflowSaving, Mp as useCredentialsStore, Od as useWorkflowsStore, SN as _plugin_vue_export_helper_default, Td as useEmptyCanvasGroupsFlag, Wp as useWorkflowsListStore, cN as Input_default, dC as useToast, hC as useTelemetry, jM as createEventBus, jN as useI18n, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
import { t as WorkflowTagsDropdown_default } from "./WorkflowTagsDropdown-ByJ87hQb.js";
//#region src/features/workflows/components/DuplicateWorkflowDialog.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var DuplicateWorkflowDialog_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "DuplicateWorkflowDialog",
	props: {
		modalName: {},
		isActive: { type: Boolean },
		data: {}
	},
	setup(__props) {
		const props = __props;
		const router = useRouter();
		const workflowSaving = useWorkflowSaving({ router });
		const emptyCanvasGroupsEnabled = useEmptyCanvasGroupsFlag();
		const workflowHelpers = useWorkflowHelpers();
		const { showMessage, showError } = useToast();
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const credentialsStore = useCredentialsStore();
		const settingsStore = useSettingsStore();
		const workflowsStore = useWorkflowsStore();
		const workflowsListStore = useWorkflowsListStore();
		const name = ref("");
		const currentTagIds = ref(props.data.tags);
		const isSaving = ref(false);
		const prevTagIds = ref(currentTagIds.value);
		const modalBus = createEventBus();
		const dropdownBus = createEventBus();
		const nameInputRef = ref();
		const focusOnSelect = () => {
			dropdownBus.emit("focus");
		};
		const focusOnNameInput = () => {
			if (nameInputRef.value?.focus) nameInputRef.value.focus();
		};
		const onTagsBlur = () => {
			prevTagIds.value = currentTagIds.value;
		};
		const onTagsEsc = () => {
			currentTagIds.value = prevTagIds.value;
		};
		const closeDialog = () => {
			modalBus.emit("close");
		};
		const save = async () => {
			const workflowName = name.value.trim();
			if (!workflowName) {
				showMessage({
					title: i18n.baseText("duplicateWorkflowDialog.errors.missingName.title"),
					message: i18n.baseText("duplicateWorkflowDialog.errors.missingName.message"),
					type: "error"
				});
				return;
			}
			const parentFolderId = props.data.parentFolderId;
			const currentWorkflowId = props.data.id;
			isSaving.value = true;
			try {
				let workflowToCreate;
				if (workflowsStore.isWorkflowSaved[props.data.id]) {
					const { createdAt, updatedAt, usedCredentials, id, homeProject, sharedWithProjects, activeVersionId, activeVersion, active, parentFolder, ...workflow } = await workflowsListStore.fetchWorkflow(props.data.id);
					workflowToCreate = {
						...workflow,
						projectId: homeProject?.id
					};
					workflowHelpers.removeForeignCredentialsFromWorkflow(workflowToCreate, credentialsStore.allCredentials);
				}
				if (await workflowSaving.saveAsNewWorkflow({
					name: workflowName,
					data: workflowToCreate,
					tags: currentTagIds.value,
					resetWebhookUrls: true,
					openInNewWindow: true,
					resetNodeIds: true,
					requestNewId: true,
					parentFolderId,
					stripEmptyCanvasGroups: !emptyCanvasGroupsEnabled.value
				})) {
					closeDialog();
					telemetry.track("User duplicated workflow", {
						old_workflow_id: currentWorkflowId,
						workflow_id: props.data.id,
						sharing_role: workflowHelpers.getWorkflowProjectRole(props.data.id)
					});
					props.data.externalEventBus?.emit("workflow-duplicated", { id: props.data.id });
				}
			} catch (error) {
				if (error.httpStatusCode === 403) {
					error.message = i18n.baseText("duplicateWorkflowDialog.errors.forbidden.message");
					showError(error, i18n.baseText("duplicateWorkflowDialog.errors.forbidden.title"));
				} else showError(error, i18n.baseText("duplicateWorkflowDialog.errors.generic.title"));
			} finally {
				isSaving.value = false;
			}
		};
		watch(() => props.isActive, (active) => {
			if (active) focusOnSelect();
		});
		onMounted(async () => {
			name.value = await workflowsStore.getDuplicateCurrentWorkflowName(props.data.name);
			await nextTick();
			focusOnNameInput();
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				name: __props.modalName,
				"event-bus": unref(modalBus),
				title: unref(i18n).baseText("duplicateWorkflowDialog.duplicateWorkflow"),
				center: true,
				width: "420px",
				onEnter: save
			}, {
				content: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [createVNode(unref(Input_default), {
					ref_key: "nameInputRef",
					ref: nameInputRef,
					modelValue: name.value,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => name.value = $event),
					placeholder: unref(i18n).baseText("duplicateWorkflowDialog.enterWorkflowName"),
					maxlength: unref(128)
				}, null, 8, [
					"modelValue",
					"placeholder",
					"maxlength"
				]), unref(settingsStore).areTagsEnabled ? (openBlock(), createBlock(WorkflowTagsDropdown_default, {
					key: 0,
					ref: "dropdown",
					modelValue: currentTagIds.value,
					"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => currentTagIds.value = $event),
					"create-enabled": true,
					"event-bus": unref(dropdownBus),
					placeholder: unref(i18n).baseText("duplicateWorkflowDialog.chooseOrCreateATag"),
					onBlur: onTagsBlur,
					onEsc: onTagsEsc
				}, null, 8, [
					"modelValue",
					"event-bus",
					"placeholder"
				])) : createCommentVNode("", true)], 2)]),
				footer: withCtx(({ close }) => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [createVNode(unref(N8nButton_default), {
					variant: "outline",
					disabled: isSaving.value,
					label: unref(i18n).baseText("duplicateWorkflowDialog.cancel"),
					onClick: close
				}, null, 8, [
					"disabled",
					"label",
					"onClick"
				]), createVNode(unref(N8nButton_default), {
					loading: isSaving.value,
					label: unref(i18n).baseText("duplicateWorkflowDialog.save"),
					onClick: save
				}, null, 8, ["loading", "label"])], 2)]),
				_: 1
			}, 8, [
				"name",
				"event-bus",
				"title"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	content: "_content_1hg8t_1",
	footer: "_footer_1hg8t_5"
} }]]);
//#endregion
export { DuplicateWorkflowDialog_default as default };
