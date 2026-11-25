import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Jg as useUIStore, Od as useWorkflowsStore, Ox as WORKFLOW_DESCRIPTION_MODAL_KEY, SN as _plugin_vue_export_helper_default, Wp as useWorkflowsListStore, Xd as createWorkflowDocumentId, _N as N8nText_default, cN as Input_default, dC as useToast, hC as useTelemetry, jM as createEventBus, jN as useI18n, nf as useWorkflowDocumentStore, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
import { t as WorkflowTagsDropdown_default } from "./WorkflowTagsDropdown-ByJ87hQb.js";
//#region src/features/workflows/components/WorkflowDescriptionModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var WorkflowDescriptionModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowDescriptionModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const modalBus = createEventBus();
		const i18n = useI18n();
		const toast = useToast();
		const telemetry = useTelemetry();
		const settingsStore = useSettingsStore();
		const uiStore = useUIStore();
		const workflowsStore = useWorkflowsStore();
		const workflowsListStore = useWorkflowsListStore();
		const descriptionValue = ref(props.data.workflowDescription ?? "");
		const descriptionInput = useTemplateRef("descriptionInput");
		const isSaving = ref(false);
		const tagIds = ref([...props.data.workflowTags ?? []]);
		const showTags = computed(() => props.data.workflowTags !== void 0 && settingsStore.areTagsEnabled);
		const modalTitle = computed(() => props.data.workflowName || i18n.baseText("generic.description"));
		const normalizedCurrentValue = computed(() => (descriptionValue.value ?? "").trim());
		const normalizedLastSaved = computed(() => (props.data.workflowDescription ?? "").trim());
		const tagsChanged = computed(() => {
			if (!showTags.value) return false;
			const initial = props.data.workflowTags ?? [];
			return tagIds.value.length !== initial.length || tagIds.value.some((id) => !initial.includes(id));
		});
		const canSave = computed(() => normalizedCurrentValue.value !== normalizedLastSaved.value || tagsChanged.value);
		const isMcpEnabled = computed(() => settingsStore.isModuleActive("mcp") && settingsStore.moduleSettings.mcp?.mcpAccessEnabled);
		const textareaTip = computed(() => isMcpEnabled.value ? i18n.baseText("workflow.description.mcp") : i18n.baseText("workflow.description.nomcp"));
		async function saveWorkflowDescription(id, description) {
			if (props.data.isNewWorkflow && !workflowsStore.isWorkflowSaved[id]) {
				const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(id));
				workflowDocumentStore.setDescription(description ?? "");
				if (showTags.value) workflowDocumentStore.setTags(tagIds.value);
				uiStore.markStateDirty("metadata");
				return;
			}
			let currentVersionId = "";
			let currentChecksum = "";
			const isCurrentWorkflow = id === workflowsStore.workflowId;
			if (isCurrentWorkflow) {
				const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(id));
				currentVersionId = workflowDocumentStore.versionId;
				currentChecksum = workflowDocumentStore.checksum;
			} else {
				const cached = workflowsListStore.getWorkflowById(id);
				if (cached?.versionId) currentVersionId = cached.versionId;
				else currentVersionId = (await workflowsListStore.fetchWorkflow(id)).versionId;
			}
			const updated = await workflowsStore.updateWorkflow(id, {
				versionId: currentVersionId,
				description,
				...showTags.value ? { tags: tagIds.value } : {},
				...currentChecksum ? { expectedChecksum: currentChecksum } : {}
			});
			if (workflowsListStore.getWorkflowById(id)) workflowsListStore.updateWorkflowInCache(id, {
				description: updated.description,
				versionId: updated.versionId,
				...showTags.value ? { tags: updated.tags } : {}
			});
			if (isCurrentWorkflow) {
				const workflowDocStore = useWorkflowDocumentStore(createWorkflowDocumentId(id));
				workflowDocStore.setDescription(updated.description ?? "");
				if (showTags.value) workflowDocStore.setTags(tagIds.value);
			}
		}
		const saveDescription = async () => {
			isSaving.value = true;
			try {
				const id = props.data.workflowId;
				const description = normalizedCurrentValue.value ?? null;
				const tagsWereChanged = tagsChanged.value;
				await saveWorkflowDescription(id, description);
				props.data.onSave?.(description);
				telemetry.track("User set workflow description", {
					workflow_id: id,
					description
				});
				if (tagsWereChanged) telemetry.track("User edited workflow tags", {
					workflow_id: id,
					new_tag_count: tagIds.value.length
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("workflow.description.error.title"));
			} finally {
				isSaving.value = false;
			}
		};
		const cancel = () => {
			modalBus.emit("close");
		};
		const save = async () => {
			await saveDescription();
			modalBus.emit("close");
		};
		const handleKeyDown = async (event) => {
			if (event.key === "Escape") {
				event.preventDefault();
				event.stopPropagation();
				cancel();
			}
			if (event.key === "Enter" && !event.shiftKey) {
				if (!canSave.value) return;
				event.preventDefault();
				event.stopPropagation();
				await save();
			}
		};
		onMounted(() => {
			setTimeout(() => {
				descriptionInput.value?.focus();
			}, 150);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				name: unref(WORKFLOW_DESCRIPTION_MODAL_KEY),
				title: modalTitle.value,
				width: "500",
				class: normalizeClass(_ctx.$style.container),
				"event-bus": unref(modalBus),
				"close-on-click-modal": false
			}, {
				content: withCtx(() => [createBaseVNode("div", {
					class: normalizeClass(_ctx.$style["description-edit-content"]),
					"data-test-id": "workflow-description-edit-content"
				}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.field) }, [
					createVNode(unref(N8nText_default), {
						tag: "label",
						bold: true
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.description")), 1)]),
						_: 1
					}),
					createVNode(unref(Input_default), {
						ref_key: "descriptionInput",
						ref: descriptionInput,
						modelValue: descriptionValue.value,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => descriptionValue.value = $event),
						rows: 6,
						"data-test-id": "workflow-description-input",
						type: "textarea",
						onKeydown: handleKeyDown
					}, null, 8, ["modelValue"]),
					createVNode(unref(N8nText_default), {
						size: "small",
						color: "text-base",
						"data-test-id": "descriptionTooltip"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(textareaTip.value), 1)]),
						_: 1
					})
				], 2), showTags.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.field)
				}, [createVNode(unref(N8nText_default), {
					tag: "label",
					bold: true
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.tag_plural")), 1)]),
					_: 1
				}), createVNode(WorkflowTagsDropdown_default, {
					modelValue: tagIds.value,
					"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => tagIds.value = $event),
					placeholder: unref(i18n).baseText("workflowDetails.chooseOrCreateATag"),
					"data-test-id": "workflow-tags-dropdown"
				}, null, 8, ["modelValue", "placeholder"])], 2)) : createCommentVNode("", true)], 2)]),
				footer: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style["popover-footer"]) }, [createVNode(unref(N8nButton_default), {
					variant: "outline",
					label: unref(i18n).baseText("generic.cancel"),
					size: "small",
					disabled: isSaving.value,
					"data-test-id": "workflow-description-cancel-button",
					onClick: cancel
				}, null, 8, ["label", "disabled"]), createVNode(unref(N8nButton_default), {
					variant: "solid",
					label: unref(i18n).baseText("generic.unsavedWork.confirmMessage.confirmButtonText"),
					loading: isSaving.value,
					disabled: !canSave.value || isSaving.value,
					"data-test-id": "workflow-description-save-button",
					onClick: save
				}, null, 8, [
					"label",
					"loading",
					"disabled"
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
	"description-edit-content": "_description-edit-content_q5mpa_1",
	field: "_field_q5mpa_8",
	"popover-footer": "_popover-footer_q5mpa_14"
} }]]);
//#endregion
export { WorkflowDescriptionModal_default as default };
