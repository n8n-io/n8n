import "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Jf as toValue, Kd as createVNode, Nf as init_reactivity_esm_bundler, Of as withDirectives, Pd as Fragment, Rd as computed, Sp as toDisplayString, Tf as watch, Vd as createCommentVNode, Vf as ref, Wf as shallowRef, Xf as unref, Xo as useRouter, Yo as useRoute, _f as resolveDirective, _p as normalizeClass, ff as openBlock, gf as resolveComponent, if as nextTick, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, pf as provide, pu as ElTag, uf as onUnmounted, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $M as DropdownMenu_default, $u as canvasEventBus, BO as isTerminalExecutionStatus, Cd as useWorkflowHistoryStore, Fd as getExecutionErrorToastConfiguration, GS as EnterpriseEditionFeature, Gp as disposeNDVStore, Hl as useExecutionsStore, Ik as deepCopy, Jb as ADD_EXECUTION_TO_DATASET_MODAL_KEY, Jd as createExecutionPreviewDocumentId, Jg as useUIStore, Jl as useWorkflowNormalization, Jp as useNDVStore, Mn as convertToDisplayDate, Od as useWorkflowsStore, PA as useMessage, Qd as disposeWorkflowDocumentStore, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, Ur as useInjectWorkflowId, Vd as useWorkflowExecutionStateStore, Wp as useWorkflowsListStore, Xd as createWorkflowDocumentId, Yd as createExecutionPreviewDocumentVersion, _N as N8nText_default, _g as hasExecutionDataStore, _l as useLogsStore, bN as N8nSpinner_default, ct as WORKFLOW_ERROR_NUDGE_TOAST_CUSTOM_CLASS, dC as useToast, dt as useWorkflowErrorNudge, fC as VIEWS, fN as N8nTooltip_default, ff as useEvaluationStore, gS as WorkflowIdKey, gg as disposeExecutionDataStore, hC as useTelemetry, hS as WorkflowDocumentStoreKey, hg as createExecutionDataId, jM as createEventBus, jN as useI18n, jn as useExecutionHelpers, lt as dismissWorkflowErrorNudge, nD as getResourcePermissions, nN as N8nBadge_default, nf as useWorkflowDocumentStore, oS as EditorEnabledFeaturesKey, ut as releaseWorkflowErrorNudge, vN as N8nIconButton_default, vd as useExternalHooks, vg as useExecutionDataStore, wN as formatBytes, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default, zd as disposeWorkflowExecutionStateStore } from "./app-D5flEmb-.js";
import { n as LogsPanel_default, t as useExecutionDebugging } from "./useExecutionDebugging-ZPJd0V5q.js";
import { n as useEvaluationsWizardSidepanelStore, t as NodeView_default } from "./NodeView-7CG1OaAA.js";
import { n as useEvaluationsWizardSidepanelExperiment } from "./EvaluationsPaywall-DgFwmTY8.js";
import { t as AnnotationTagsDropdown_ee_default } from "./AnnotationTagsDropdown.ee-WLGs3CYQ.js";
//#region src/features/execution/executions/components/workflow/WorkflowExecutionAnnotationPanel.ee.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var WorkflowExecutionAnnotationPanel_ee_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowExecutionAnnotationPanel.ee",
	props: { execution: {} },
	setup(__props) {
		const props = __props;
		const workflowsListStore = useWorkflowsListStore();
		const i18n = useI18n();
		const annotationDropdownRef = ref(null);
		const isDropdownVisible = ref(false);
		const workflowId = useInjectWorkflowId();
		const workflowPermissions = computed(() => getResourcePermissions(workflowsListStore.getWorkflowById(workflowId.value)?.scopes).workflow);
		const customDataLength = computed(() => {
			return props.execution?.customData ? Object.keys(props.execution?.customData).length : 0;
		});
		function onEllipsisButtonBlur(event) {
			if (annotationDropdownRef.value && event.relatedTarget === null) annotationDropdownRef.value.close();
		}
		return (_ctx, _cache) => {
			const _directive_n8n_html = resolveDirective("n8n-html");
			return __props.execution ? (openBlock(), createBlock(unref(DropdownMenu_default), {
				key: 0,
				ref_key: "annotationDropdownRef",
				ref: annotationDropdownRef,
				modelValue: isDropdownVisible.value,
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isDropdownVisible.value = $event),
				items: [],
				placement: "bottom-end",
				width: "250px",
				"extra-popper-class": _ctx.$style.menu
			}, {
				trigger: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "outline",
					title: unref(i18n).baseText("executionDetails.additionalActions"),
					disabled: !workflowPermissions.value.update,
					icon: "list-checks",
					"icon-only": customDataLength.value === 0,
					class: normalizeClass({ [_ctx.$style.highlightDataButtonOpen]: isDropdownVisible.value }),
					size: "small",
					"data-test-id": "execution-preview-ellipsis-button",
					onBlur: onEllipsisButtonBlur
				}, {
					default: withCtx(() => [customDataLength.value > 0 ? (openBlock(), createBlock(unref(N8nBadge_default), {
						key: 0,
						class: normalizeClass(_ctx.$style.badge),
						variant: "primary"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(customDataLength.value.toString()), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true)]),
					_: 1
				}, 8, [
					"title",
					"disabled",
					"icon-only",
					"class"
				])]),
				content: withCtx(() => [createBaseVNode("div", {
					ref: "container",
					class: normalizeClass(["execution-annotation-panel", _ctx.$style.container]),
					"data-test-id": "execution-annotation-panel"
				}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.section) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.heading) }, [createVNode(unref(N8nHeading_default), {
					tag: "h3",
					size: "small",
					color: "text-dark"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.annotationData")), 1)]),
					_: 1
				})], 2), __props.execution?.customData && Object.keys(__props.execution?.customData).length > 0 ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.metadata)
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(Object.keys(__props.execution?.customData), (attr) => {
					return openBlock(), createElementBlock("div", {
						key: attr,
						class: normalizeClass(_ctx.$style.customDataEntry)
					}, [createVNode(unref(N8nText_default), {
						class: normalizeClass(_ctx.$style.key),
						size: "small",
						color: "text-base"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(attr), 1)]),
						_: 2
					}, 1032, ["class"]), createVNode(unref(N8nText_default), {
						class: normalizeClass(_ctx.$style.value),
						size: "small",
						color: "text-base"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(__props.execution?.customData[attr]), 1)]),
						_: 2
					}, 1032, ["class"])], 2);
				}), 128))], 2)) : (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.noResultsContainer),
					"data-test-id": "execution-annotation-data-empty"
				}, [createVNode(unref(N8nText_default), {
					color: "text-base",
					size: "small",
					align: "center"
				}, {
					default: withCtx(() => [withDirectives(createBaseVNode("span", null, null, 512), [[_directive_n8n_html, unref(i18n).baseText("executionAnnotationView.data.notFound")]])]),
					_: 1
				})], 2))], 2)], 2)]),
				_: 1
			}, 8, ["modelValue", "extra-popper-class"])) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	highlightDataButtonOpen: "_highlightDataButtonOpen_4n8an_1",
	badge: "_badge_4n8an_7",
	menu: "_menu_4n8an_11",
	container: "_container_4n8an_16",
	section: "_section_4n8an_25",
	metadata: "_metadata_4n8an_34",
	heading: "_heading_4n8an_38",
	controls: "_controls_4n8an_45",
	customDataEntry: "_customDataEntry_4n8an_57",
	key: "_key_4n8an_64",
	noResultsContainer: "_noResultsContainer_4n8an_68",
	"execution-annotation-panel": "_execution-annotation-panel_4n8an_73",
	"el-skeleton__item": "_el-skeleton__item_4n8an_73"
} }]]);
//#endregion
//#region src/features/execution/executions/components/workflow/WorkflowExecutionAnnotationTags.ee.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = { key: 1 };
var WorkflowExecutionAnnotationTags_ee_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowExecutionAnnotationTags.ee",
	props: { execution: {} },
	setup(__props) {
		const props = __props;
		const locale = useI18n();
		const telemetry = useTelemetry();
		const { showError } = useToast();
		const executionsStore = useExecutionsStore();
		const tagIds = computed(() => props.execution.annotation?.tags.map((tag) => tag.id) ?? []);
		const tags = computed(() => props.execution.annotation?.tags);
		const tagsEventBus = createEventBus();
		const isTagsEditEnabled = ref(false);
		const appliedTagIds = ref([]);
		const tagsSaving = ref(false);
		const tagsHasChanged = (prev, curr) => {
			if (prev.length !== curr.length) return true;
			const set = new Set(prev);
			return curr.reduce((acc, val) => acc || !set.has(val), false);
		};
		const onTagsEditEnable = () => {
			appliedTagIds.value = tagIds.value;
			isTagsEditEnabled.value = true;
			tagsEventBus.emit("focus");
		};
		const onTagsBlur = async () => {
			if (!props.execution) return;
			const currentTagIds = tagIds.value ?? [];
			const newTagIds = appliedTagIds.value;
			if (!tagsHasChanged(currentTagIds, newTagIds)) {
				isTagsEditEnabled.value = false;
				return;
			}
			if (tagsSaving.value) return;
			tagsSaving.value = true;
			try {
				await executionsStore.annotateExecution(props.execution.id, { tags: newTagIds });
				if (newTagIds.length > 0) telemetry.track("User added execution annotation tag", {
					tag_ids: newTagIds,
					execution_id: props.execution.id
				});
			} catch (e) {
				showError(e, "executionAnnotationView.tag.error");
			}
			tagsSaving.value = false;
			isTagsEditEnabled.value = false;
		};
		const onTagsEditEsc = () => {
			isTagsEditEnabled.value = false;
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.executionDetailsTags) }, [createBaseVNode("span", {
				class: normalizeClass(_ctx.$style.tags),
				"data-test-id": "annotation-tags-container"
			}, [isTagsEditEnabled.value ? (openBlock(), createBlock(AnnotationTagsDropdown_ee_default, {
				key: 0,
				ref: "dropdown",
				modelValue: appliedTagIds.value,
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => appliedTagIds.value = $event),
				"create-enabled": true,
				"event-bus": unref(tagsEventBus),
				placeholder: unref(locale).baseText("executionAnnotationView.chooseOrCreateATag"),
				class: "tags-edit",
				"data-test-id": "workflow-tags-dropdown",
				onBlur: onTagsBlur,
				onEsc: onTagsEditEsc
			}, null, 8, [
				"modelValue",
				"event-bus",
				"placeholder"
			])) : tagIds.value.length === 0 ? (openBlock(), createElementBlock("div", _hoisted_1$1, [createVNode(unref(N8nButton_default), {
				variant: "outline",
				class: normalizeClass([_ctx.$style.addTagButton, "clickable"]),
				label: unref(locale).baseText("executionAnnotationView.addTag"),
				size: "xsmall",
				"data-test-id": "new-tag-link",
				icon: "plus",
				onClick: onTagsEditEnable
			}, null, 8, ["class", "label"])])) : (openBlock(), createElementBlock("span", {
				key: 2,
				class: normalizeClass(["tags-container", _ctx.$style.tagsContainer]),
				"data-test-id": "execution-annotation-tags",
				onClick: onTagsEditEnable
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(tags.value, (tag) => {
				return openBlock(), createElementBlock("span", {
					key: tag.id,
					class: "clickable"
				}, [createVNode(unref(ElTag), {
					title: tag.name,
					type: "info",
					size: "small",
					"disable-transitions": true
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(tag.name), 1)]),
					_: 2
				}, 1032, ["title"])]);
			}), 128)), createBaseVNode("span", { class: normalizeClass(_ctx.$style.addTagWrapper) }, [createVNode(unref(N8nButton_default), {
				variant: "outline",
				class: normalizeClass([
					_ctx.$style.addTagButton,
					_ctx.$style.addTagButtonIconOnly,
					"clickable"
				]),
				size: "xsmall",
				"icon-only": "",
				"aria-label": unref(locale).baseText("executionAnnotationView.addTag"),
				"data-test-id": "new-tag-link",
				icon: "plus",
				onClick: onTagsEditEnable
			}, null, 8, ["class", "aria-label"])], 2)], 2))], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	tags: "_tags_ikdar_1",
	addTagButton: "_addTagButton_ikdar_6",
	addTagButtonIconOnly: "_addTagButtonIconOnly_ikdar_17",
	tagsContainer: "_tagsContainer_ikdar_22"
} }]]);
//#endregion
//#region src/features/execution/executions/composables/useExecutionPreviewDocument.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* Loads an execution for read-only preview into a fully isolated set of
* stores, keyed by the synthetic `{workflowId}@execution-preview` document id.
*
* This is the side-effect-free counterpart of
* `useCanvasOperations.openExecution()` (which serves "Debug in editor" and
* deliberately writes the editor's `{workflowId}@latest` stores): it performs
* NO `resetWorkspace`, NO `initState`, NO `workflowsStore.setWorkflowId`, and
* NO `uiStore.markStateClean` — loading a preview must never affect the
* editor's (possibly dirty) state, which stays alive across the
* editor/executions tab switch (`keepWorkflowAlive`).
*/
function useExecutionPreviewDocument(options) {
	const i18n = useI18n();
	const toast = useToast();
	const { triggerOnWorkflowError } = useWorkflowErrorNudge();
	const telemetry = useTelemetry();
	const externalHooks = useExternalHooks();
	const workflowsStore = useWorkflowsStore();
	const logsStore = useLogsStore();
	const { normalizeWorkflowData } = useWorkflowNormalization();
	/** Provide this under `WorkflowDocumentStoreKey`; null until the first load completes. */
	const documentStore = shallowRef(null);
	const execution = shallowRef(null);
	const isLoading = ref(false);
	const loadError = ref(null);
	/**
	* Every execution id this preview session has loaded. Per-execution data
	* stores are keyed app-wide by bare execution id, so previously viewed
	* executions render instantly when re-selected — they are released in
	* `dispose()`, except ids the editor's own state store still references.
	*/
	const loadedExecutionIds = /* @__PURE__ */ new Set();
	/**
	* Every preview document id this session has hydrated — one per distinct
	* executed workflow version (executions of the same version share a store).
	* All are released in `dispose()`.
	*/
	const loadedDocumentIds = /* @__PURE__ */ new Set();
	let latestLoadRequestId = 0;
	/**
	* The workflow id shared by every execution this session previews (all
	* documents/executions belong to the executions-tab workflow). Captured on
	* each successful load so `dispose()` can still resolve the editor-referenced
	* ids to protect even after a failed load nulled `documentStore`.
	*/
	let previewWorkflowId;
	/**
	* Marks an execution as most-recently-used. `Set` preserves insertion order
	* but `add()` is a no-op for an existing key, so re-add it to move it to the
	* tail (the front is then the least-recently-used eviction candidate).
	*/
	function touchLoadedExecution(executionId) {
		loadedExecutionIds.delete(executionId);
		loadedExecutionIds.add(executionId);
	}
	/**
	* Caps retained per-execution data stores at `MAX_PREVIEW_EXECUTIONS_IN_MEMORY`
	* by disposing the least-recently-used ones. Never evicts the execution just
	* loaded, nor any the editor's `{workflowId}@latest` session still references
	* (disposing those would blank the editor's run data) — when all retained ids
	* are protected the count simply stays above the cap.
	*/
	function evictLeastRecentlyUsedExecutions(currentExecutionId, workflowId) {
		const protectedExecutionIds = getEditorReferencedExecutionIds(workflowId);
		protectedExecutionIds.add(currentExecutionId);
		let retainedCount = loadedExecutionIds.size;
		for (const candidateExecutionId of [...loadedExecutionIds]) {
			if (retainedCount <= 10) break;
			if (protectedExecutionIds.has(candidateExecutionId)) continue;
			disposeExecutionDataStore(useExecutionDataStore(createExecutionDataId(candidateExecutionId)));
			loadedExecutionIds.delete(candidateExecutionId);
			retainedCount -= 1;
		}
	}
	/**
	* Production executions hide pin data and render production-only UI.
	* Derived from the execution itself (the per-instance
	* `useNodeHelpers().isProductionExecutionPreview` ref never reliably
	* crossed composable instances).
	*/
	const isProductionExecutionPreview = computed(() => execution.value !== null && !["manual", "evaluation"].includes(execution.value.mode));
	function getReusableExecution(executionId) {
		if (!loadedExecutionIds.has(executionId)) return null;
		const executionDataId = createExecutionDataId(executionId);
		if (!hasExecutionDataStore(executionDataId)) return null;
		const snapshot = useExecutionDataStore(executionDataId).getExecutionSnapshot();
		return snapshot && isTerminalExecutionStatus(snapshot.status) ? snapshot : null;
	}
	function showExecutionErrorToast(executionId, workflowId, title, message) {
		toast.showMessage({
			title,
			message,
			type: "error",
			duration: 0,
			customClass: WORKFLOW_ERROR_NUDGE_TOAST_CUSTOM_CLASS,
			onClose: () => releaseWorkflowErrorNudge(executionId)
		});
		triggerOnWorkflowError(executionId, workflowId, { reopen: true });
	}
	async function load() {
		const executionId = toValue(options.executionId);
		const requestId = ++latestLoadRequestId;
		isLoading.value = true;
		loadError.value = null;
		dismissWorkflowErrorNudge();
		try {
			const data = getReusableExecution(executionId) ?? await workflowsStore.getExecution(executionId);
			if (requestId !== latestLoadRequestId) return;
			if (data === void 0) throw new Error(`Execution with id "${executionId}" could not be found!`);
			const resultData = data.data?.resultData;
			if (data.status === "error" && resultData?.error) {
				const { title, message } = getExecutionErrorToastConfiguration({
					error: resultData.error,
					lastNodeExecuted: resultData.lastNodeExecuted
				});
				showExecutionErrorToast(executionId, data.workflowData.id, title, message);
			} else if (!data.finished && resultData?.error) {
				if (!Object.values(resultData.runData ?? {}).some((tasks) => tasks.some((task) => task.error))) showExecutionErrorToast(executionId, data.workflowData.id, i18n.baseText("nodeView.showError.workflowError"), resultData.error.message);
			}
			const workflowId = data.workflowData.id;
			previewWorkflowId = workflowId;
			const documentVersion = createExecutionPreviewDocumentVersion(data.workflowData.versionId);
			const documentId = createExecutionPreviewDocumentId(workflowId, data.workflowData.versionId);
			const scopedDocumentStore = useWorkflowDocumentStore(documentId);
			const { nodes, connections } = normalizeWorkflowData(data.workflowData);
			scopedDocumentStore.hydrate({
				...data.workflowData,
				nodes,
				connections,
				versionId: documentVersion
			});
			useWorkflowExecutionStateStore(documentId).setWorkflowExecutionData(data);
			touchLoadedExecution(executionId);
			evictLeastRecentlyUsedExecutions(executionId, workflowId);
			loadedDocumentIds.add(documentId);
			if (!["manual", "evaluation"].includes(data.mode)) scopedDocumentStore.setPinData({});
			execution.value = data;
			documentStore.value = scopedDocumentStore;
			if (data.dataTooLargeToDisplay) logsStore.toggleOpen(true);
			externalHooks.run("execution.open", {
				workflowId: data.workflowData.id,
				workflowName: data.workflowData.name,
				executionId
			});
			telemetry.track("User opened read-only execution", {
				workflow_id: data.workflowData.id,
				execution_mode: data.mode,
				execution_finished: data.finished
			});
		} catch (error) {
			if (requestId === latestLoadRequestId) {
				loadError.value = error instanceof Error ? error : new Error(String(error));
				documentStore.value = null;
				execution.value = null;
			}
		} finally {
			if (requestId === latestLoadRequestId) isLoading.value = false;
		}
	}
	/**
	* Execution ids the editor's `{workflowId}@latest` session still references
	* — e.g. the user ran the workflow manually and then previewed that same
	* execution. Releasing those would blank the editor's displayed run data.
	*/
	function getEditorReferencedExecutionIds(workflowId) {
		const editorStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId(workflowId));
		const ids = /* @__PURE__ */ new Set();
		for (const id of [
			editorStateStore.activeExecutionId,
			editorStateStore.displayedExecutionId,
			editorStateStore.previousExecutionId,
			editorStateStore.lastSuccessfulExecutionId
		]) if (typeof id === "string") ids.add(id);
		return ids;
	}
	function dispose() {
		latestLoadRequestId += 1;
		if (previewWorkflowId !== void 0) {
			const editorReferencedIds = getEditorReferencedExecutionIds(previewWorkflowId);
			for (const executionId of loadedExecutionIds) {
				if (editorReferencedIds.has(executionId)) continue;
				disposeExecutionDataStore(useExecutionDataStore(createExecutionDataId(executionId)));
			}
		}
		for (const documentId of loadedDocumentIds) {
			disposeNDVStore(useNDVStore(documentId));
			disposeWorkflowExecutionStateStore(useWorkflowExecutionStateStore(documentId));
			disposeWorkflowDocumentStore(useWorkflowDocumentStore(documentId));
		}
		loadedDocumentIds.clear();
		loadedExecutionIds.clear();
		previewWorkflowId = void 0;
		documentStore.value = null;
		execution.value = null;
		loadError.value = null;
		isLoading.value = false;
	}
	return {
		documentStore,
		execution,
		isLoading,
		loadError,
		isProductionExecutionPreview,
		load,
		dispose
	};
}
//#endregion
//#region src/features/execution/executions/components/workflow/ExecutionPreviewHost.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ExecutionPreviewHost_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ExecutionPreviewHost",
	props: {
		workflowId: {},
		executionId: {},
		nodeId: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		provide(WorkflowIdKey, computed(() => props.workflowId));
		const preview = useExecutionPreviewDocument({ executionId: () => props.executionId });
		provide(WorkflowDocumentStoreKey, preview.documentStore);
		provide(EditorEnabledFeaturesKey, computed(() => ({
			readOnly: true,
			aiAssistant: false,
			aiBuilder: false,
			askAi: false,
			executionSuccessToasts: false,
			executionErrorToasts: false,
			expandGroups: "errored"
		})));
		const isReady = computed(() => preview.documentStore.value !== null);
		const hasExecutionData = computed(() => preview.execution.value !== null);
		const hasLoadError = computed(() => preview.loadError.value !== null && !preview.isLoading.value);
		function openDeepLinkedNode() {
			const documentStore = preview.documentStore.value;
			if (!documentStore || !props.nodeId) return;
			const node = documentStore.getNodeById(props.nodeId);
			if (node) useNDVStore(documentStore.documentId).setActiveNodeName(node.name, "other");
		}
		async function loadExecution() {
			const previousDocumentId = preview.documentStore.value?.documentId;
			if (previousDocumentId) useNDVStore(previousDocumentId).unsetActiveNodeName();
			await preview.load();
			const documentStore = preview.documentStore.value;
			if (!documentStore) return;
			openDeepLinkedNode();
			if (previousDocumentId !== void 0 && previousDocumentId !== documentStore.documentId) {
				const connections = deepCopy(documentStore.connectionsBySourceNode);
				documentStore.setConnections({});
				canvasEventBus.emit("setConnections:onNodesInit", connections);
				canvasEventBus.emit("fitView:onNodesInit");
			} else {
				await nextTick();
				canvasEventBus.emit("fitView");
			}
		}
		onMounted(loadExecution);
		watch(() => props.executionId, loadExecution);
		watch(() => props.nodeId, openDeepLinkedNode);
		onUnmounted(() => {
			preview.dispose();
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.host),
				"data-test-id": "execution-preview-host"
			}, [isReady.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.canvas) }, [createVNode(NodeView_default), unref(preview).isLoading.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.loadingOverlay)
			}, [createVNode(unref(N8nSpinner_default), {
				type: "brand",
				size: "xxlarge"
			})], 2)) : createCommentVNode("", true)], 2), hasExecutionData.value ? (openBlock(), createBlock(LogsPanel_default, {
				key: 0,
				class: normalizeClass(_ctx.$style.logs),
				"is-read-only": true
			}, null, 8, ["class"])) : createCommentVNode("", true)], 64)) : hasLoadError.value ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.centerState),
				"data-test-id": "execution-preview-error"
			}, [createVNode(unref(N8nIcon_default), {
				icon: "triangle-alert",
				color: "danger",
				size: 48
			}), createVNode(unref(N8nText_default), {
				color: "text-dark",
				bold: true
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("nodeView.showError.openExecution.title")), 1)]),
				_: 1
			})], 2)) : (openBlock(), createElementBlock("div", {
				key: 2,
				class: normalizeClass(_ctx.$style.centerState)
			}, [createVNode(unref(N8nSpinner_default), {
				type: "brand",
				size: "xxlarge"
			})], 2))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	host: "_host_1i4fh_1",
	canvas: "_canvas_1i4fh_11",
	loadingOverlay: "_loadingOverlay_1i4fh_18",
	logs: "_logs_1i4fh_28",
	centerState: "_centerState_1i4fh_32"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/composables/useAddExecutionToDataset.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* Gating + open logic for adding a successful execution to an evaluation
* dataset. The action is only available when the config-evals experiment is on,
* and is only enabled once the workflow has at least one data-table-backed
* evaluation config.
*/
function useAddExecutionToDataset(workflowId) {
	const evaluationStore = useEvaluationStore();
	const uiStore = useUIStore();
	const { isFeatureEnabled } = useEvaluationsWizardSidepanelExperiment();
	const dataTableConfigs = ref([]);
	const hasDataTableConfig = computed(() => dataTableConfigs.value.length > 0);
	async function fetchDataTableConfigs() {
		if (!isFeatureEnabled.value) return;
		try {
			const configs = await evaluationStore.fetchEvaluationConfigs(toValue(workflowId));
			dataTableConfigs.value = configs.filter((config) => config.datasetSource === "data_table");
		} catch {
			dataTableConfigs.value = [];
		}
	}
	function openModal(executionId) {
		uiStore.openModalWithData({
			name: ADD_EXECUTION_TO_DATASET_MODAL_KEY,
			data: {
				workflowId: toValue(workflowId),
				executionId,
				configs: dataTableConfigs.value
			}
		});
	}
	return {
		isFeatureEnabled,
		hasDataTableConfig,
		fetchDataTableConfigs,
		openModal
	};
}
//#endregion
//#region src/features/execution/executions/components/workflow/VoteButtons.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var VoteButtons_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "VoteButtons",
	props: { vote: {} },
	emits: ["vote-click"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const onVoteClick = (vote) => {
			emit("vote-click", vote);
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.ratingIcon) }, [createVNode(unref(N8nIconButton_default), {
				variant: "ghost",
				class: normalizeClass([_ctx.$style.icon, __props.vote === "up" && _ctx.$style.up]),
				size: "small",
				icon: "thumbs-up",
				onClick: _cache[0] || (_cache[0] = ($event) => onVoteClick("up"))
			}, null, 8, ["class"]), createVNode(unref(N8nIconButton_default), {
				variant: "ghost",
				class: normalizeClass([_ctx.$style.icon, __props.vote === "down" && _ctx.$style.down]),
				size: "small",
				icon: "thumbs-down",
				onClick: _cache[1] || (_cache[1] = ($event) => onVoteClick("down"))
			}, null, 8, ["class"])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	ratingIcon: "_ratingIcon_hcsh3_1",
	icon: "_icon_hcsh3_5",
	up: "_up_hcsh3_8",
	down: "_down_hcsh3_8"
} }]]);
//#endregion
//#region src/features/execution/executions/components/workflow/WorkflowExecutionsPreview.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = ["data-test-id"];
var _hoisted_2 = { class: "retry-button" };
var WorkflowExecutionsPreview_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowExecutionsPreview",
	props: { execution: {} },
	emits: [
		"deleteCurrentExecution",
		"retryExecution",
		"stopExecution"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const route = useRoute();
		const locale = useI18n();
		const { showError } = useToast();
		const executionHelpers = useExecutionHelpers();
		const message = useMessage();
		const executionDebugging = useExecutionDebugging();
		const workflowsListStore = useWorkflowsListStore();
		const settingsStore = useSettingsStore();
		const retryDropdownRef = ref(null);
		const workflowId = useInjectWorkflowId();
		const workflowPermissions = computed(() => getResourcePermissions(workflowsListStore.getWorkflowById(workflowId.value)?.scopes).workflow);
		const executionPermissions = computed(() => getResourcePermissions(workflowsListStore.getWorkflowById(workflowId.value)?.scopes).execution);
		const executionId = computed(() => route.params.executionId);
		const nodeId = computed(() => route.params.nodeId);
		const executionUIDetails = computed(() => props.execution ? executionHelpers.getUIDetails(props.execution) : null);
		const debugButtonData = computed(() => props.execution?.status === "success" ? {
			text: locale.baseText("executionsList.debug.button.copyToEditor"),
			type: "secondary"
		} : {
			text: locale.baseText("executionsList.debug.button.debugInEditor"),
			type: "primary"
		});
		const isRetriable = computed(() => !!props.execution && executionHelpers.isExecutionRetriable(props.execution));
		const retryItems = computed(() => [{
			id: "current-workflow",
			label: locale.baseText("executionsList.retryWithCurrentlySavedWorkflow")
		}, {
			id: "original-workflow",
			label: locale.baseText("executionsList.retryWithOriginalWorkflow")
		}]);
		const redactionInfo = computed(() => useExecutionDataStore(createExecutionDataId(executionId.value)).execution?.data?.redactionInfo);
		const pinBlockedByRedaction = computed(() => redactionInfo.value?.isRedacted === true && redactionInfo.value.canReveal !== true);
		const { isFeatureEnabled: isAddToDatasetFeatureEnabled } = useAddExecutionToDataset(workflowId);
		const router = useRouter();
		const evaluationsWizardStore = useEvaluationsWizardSidepanelStore();
		const showAddToDataset = computed(() => isAddToDatasetFeatureEnabled.value && props.execution?.status === "success" && props.execution?.mode !== "evaluation");
		async function onAddToDatasetClick() {
			if (!props.execution) return;
			try {
				const full = await executionsStore.fetchExecution(props.execution.id);
				if (!full) return;
				evaluationsWizardStore.setPendingSeedExecution(full);
				await router.push({
					name: VIEWS.WORKFLOW,
					params: { workflowId: workflowId.value }
				});
			} catch (error) {
				showError(error, locale.baseText("evaluations.tests.seedFromExecution.error"));
			}
		}
		const isAnnotationEnabled = computed(() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.AdvancedExecutionFilters]);
		const hasAnnotation = computed(() => !!props.execution?.annotation && (props.execution?.annotation.vote || props.execution?.annotation.tags.length > 0));
		const executionsStore = useExecutionsStore();
		const workflowHistoryStore = useWorkflowHistoryStore();
		const workflowVersion = ref(null);
		const workflowVersionLabel = computed(() => {
			if (!workflowVersion.value) return void 0;
			return workflowVersion.value.name ?? locale.baseText("executionDetails.versionAutosave");
		});
		const workflowVersionTooltip = computed(() => {
			if (!workflowVersion.value) return void 0;
			const { date, time } = convertToDisplayDate(workflowVersion.value.createdAt);
			return locale.baseText("executionDetails.versionTooltip", { interpolate: { date: `${date} ${time}` } });
		});
		const workflowVersionRoute = computed(() => {
			if (!workflowVersion.value) return null;
			return {
				name: VIEWS.WORKFLOW_HISTORY,
				params: {
					workflowId: workflowVersion.value.workflowId,
					versionId: workflowVersion.value.versionId
				}
			};
		});
		const executionMetaText = computed(() => {
			if (!executionUIDetails.value) return null;
			if (executionUIDetails.value.showTimestamp === false) return null;
			if (executionUIDetails.value.name === "running") return locale.baseText("executionDetails.runningTimeRunning", { interpolate: { time: executionUIDetails.value.runningTime } });
			if (executionUIDetails.value.name !== "waiting") return locale.baseText("executionDetails.runningTimeFinished", { interpolate: { time: executionUIDetails.value.runningTime ?? "unknown" } });
			return null;
		});
		const executionDataSize = computed(() => {
			if (!props.execution) return null;
			const total = (props.execution.jsonSizeBytes ?? 0) + (props.execution.binaryDataSizeBytes ?? 0);
			return total > 0 ? formatBytes(total) : null;
		});
		watch(() => props.execution?.workflowVersionId, async (versionId) => {
			workflowVersion.value = null;
			if (!versionId || !props.execution?.workflowId) return;
			try {
				const version = await workflowHistoryStore.getWorkflowVersion(props.execution.workflowId, versionId);
				if (props.execution?.workflowVersionId === versionId) workflowVersion.value = version;
			} catch {}
		}, { immediate: true });
		const activeExecution = computed(() => {
			return executionsStore.activeExecution;
		});
		const vote = computed(() => activeExecution.value?.annotation?.vote || null);
		async function onDeleteExecution() {
			const confirmationText = [hasAnnotation.value && locale.baseText("executionDetails.confirmMessage.annotationsNote"), locale.baseText("executionDetails.confirmMessage.message")].filter(Boolean).join(" ");
			if (await message.confirm(confirmationText, locale.baseText("executionDetails.confirmMessage.headline"), {
				type: "warning",
				confirmButtonText: locale.baseText("executionDetails.confirmMessage.confirmButtonText"),
				cancelButtonText: ""
			}) !== "confirm") return;
			emit("deleteCurrentExecution");
		}
		function handleRetryClick(command) {
			if (props.execution) emit("retryExecution", {
				execution: props.execution,
				command
			});
		}
		function handleStopClick() {
			emit("stopExecution");
		}
		function onRetryButtonBlur(event) {
			if (retryDropdownRef.value && event.relatedTarget === null) retryDropdownRef.value.close();
		}
		const onVoteClick = async (voteValue) => {
			if (!activeExecution.value) return;
			const voteToSet = voteValue === vote.value ? null : voteValue;
			try {
				await executionsStore.annotateExecution(activeExecution.value.id, { vote: voteToSet });
			} catch (e) {
				showError(e, "executionAnnotationView.vote.error");
			}
		};
		return (_ctx, _cache) => {
			const _component_RouterLink = resolveComponent("RouterLink");
			return executionUIDetails.value?.name === "new" ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.newInfo)
			}, [createVNode(unref(N8nText_default), {
				class: normalizeClass(_ctx.$style.newMessage),
				color: "text-light"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("executionDetails.newMessage")), 1)]),
				_: 1
			}, 8, ["class"]), createVNode(unref(N8nButton_default), {
				variant: "outline",
				class: "mt-l",
				onClick: handleStopClick
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("executionsList.stopExecution")), 1)]),
				_: 1
			})], 2)) : executionUIDetails.value?.name === "running" ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.runningInfo)
			}, [
				createBaseVNode("div", null, [createVNode(unref(N8nSpinner_default), {
					type: "brand",
					size: "xxlarge"
				})]),
				createVNode(unref(N8nText_default), {
					class: normalizeClass(_ctx.$style.runningMessage),
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("executionDetails.runningMessage")), 1)]),
					_: 1
				}, 8, ["class"]),
				createVNode(unref(N8nButton_default), {
					variant: "outline",
					"data-test-id": "stop-execution",
					class: "mt-l",
					disabled: !workflowPermissions.value.execute,
					onClick: handleStopClick
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("executionsList.stopExecution")), 1)]),
					_: 1
				}, 8, ["disabled"])
			], 2)) : executionUIDetails.value ? (openBlock(), createElementBlock("div", {
				key: 2,
				class: normalizeClass(_ctx.$style.previewContainer)
			}, [__props.execution ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.executionDetails),
				"data-test-id": `execution-preview-details-${executionId.value}`
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.executionDetailsLeft) }, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.executionTitle) }, [createVNode(unref(N8nText_default), {
					size: "large",
					color: "text-dark",
					bold: true,
					"data-test-id": "execution-time"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(executionUIDetails.value?.startTime), 1)]),
					_: 1
				}), isAnnotationEnabled.value && __props.execution ? (openBlock(), createBlock(VoteButtons_default, {
					key: 0,
					"data-test-id": "execution-preview-vote-buttons",
					vote: vote.value,
					class: normalizeClass(_ctx.$style.voteButtons),
					onVoteClick
				}, null, 8, ["vote", "class"])) : createCommentVNode("", true)], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.executionDetailsInfo) }, [
					executionUIDetails.value?.name === "running" ? (openBlock(), createBlock(unref(N8nSpinner_default), {
						key: 0,
						size: "small",
						class: "mr-4xs"
					})) : createCommentVNode("", true),
					createVNode(unref(N8nText_default), {
						size: "medium",
						class: normalizeClass([_ctx.$style.status, _ctx.$style[executionUIDetails.value.name]]),
						"data-test-id": "execution-preview-label"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(executionUIDetails.value.label), 1)]),
						_: 1
					}, 8, ["class"]),
					_cache[3] || (_cache[3] = createTextVNode(" " + toDisplayString(" ") + " ", -1)),
					executionUIDetails.value?.showTimestamp === false ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 1,
						color: "text-base",
						size: "medium"
					}, {
						default: withCtx(() => [
							executionDataSize.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createTextVNode("| " + toDisplayString(executionDataSize.value), 1)], 64)) : createCommentVNode("", true),
							createTextVNode(" | ID#" + toDisplayString(__props.execution.id) + " ", 1),
							workflowVersionLabel.value && workflowVersionRoute.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [_cache[1] || (_cache[1] = createTextVNode(" | ", -1)), createVNode(unref(N8nText_default), { color: "text-light" }, {
								default: withCtx(() => [createVNode(unref(N8nTooltip_default), {
									content: workflowVersionTooltip.value,
									placement: "bottom"
								}, {
									default: withCtx(() => [createVNode(_component_RouterLink, {
										class: normalizeClass(_ctx.$style.versionLink),
										"data-test-id": "execution-preview-version-link",
										to: workflowVersionRoute.value
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(workflowVersionLabel.value), 1)]),
										_: 1
									}, 8, ["class", "to"])]),
									_: 1
								}, 8, ["content"])]),
								_: 1
							})], 64)) : createCommentVNode("", true)
						]),
						_: 1
					})) : executionMetaText.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 2,
						color: "text-base",
						size: "medium",
						"data-test-id": "execution-preview-id"
					}, {
						default: withCtx(() => [
							createTextVNode(toDisplayString(executionMetaText.value) + " ", 1),
							executionDataSize.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createTextVNode("| " + toDisplayString(executionDataSize.value), 1)], 64)) : createCommentVNode("", true),
							createTextVNode(" | ID#" + toDisplayString(__props.execution.id) + " ", 1),
							workflowVersionLabel.value && workflowVersionRoute.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [_cache[2] || (_cache[2] = createTextVNode(" | ", -1)), createVNode(unref(N8nText_default), { color: "text-light" }, {
								default: withCtx(() => [createVNode(unref(N8nTooltip_default), {
									content: workflowVersionTooltip.value,
									placement: "bottom"
								}, {
									default: withCtx(() => [createVNode(_component_RouterLink, {
										class: normalizeClass(_ctx.$style.versionLink),
										"data-test-id": "execution-preview-version-link",
										to: workflowVersionRoute.value
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(workflowVersionLabel.value), 1)]),
										_: 1
									}, 8, ["class", "to"])]),
									_: 1
								}, 8, ["content"])]),
								_: 1
							})], 64)) : createCommentVNode("", true)
						]),
						_: 1
					})) : createCommentVNode("", true)
				], 2),
				__props.execution.mode === "retry" ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.executionDetailsRetry)
				}, [createVNode(unref(N8nText_default), {
					color: "text-base",
					size: "small"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("executionDetails.retry")) + " ", 1), createVNode(_component_RouterLink, {
						class: normalizeClass(_ctx.$style.executionLink),
						to: {
							name: unref(VIEWS).EXECUTION_PREVIEW,
							params: {
								workflowId: __props.execution.workflowId,
								executionId: __props.execution.retryOf
							}
						}
					}, {
						default: withCtx(() => [createTextVNode(" #" + toDisplayString(__props.execution.retryOf), 1)]),
						_: 1
					}, 8, ["class", "to"])]),
					_: 1
				})], 2)) : createCommentVNode("", true),
				isAnnotationEnabled.value && __props.execution ? (openBlock(), createBlock(WorkflowExecutionAnnotationTags_ee_default, {
					key: 1,
					execution: __props.execution
				}, null, 8, ["execution"])) : createCommentVNode("", true)
			], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.actions) }, [
				createVNode(unref(N8nTooltip_default), {
					content: unref(locale).baseText("executionsList.debug.button.redacted.tooltip"),
					disabled: !pinBlockedByRedaction.value
				}, {
					default: withCtx(() => [createVNode(_component_RouterLink, { to: {
						name: unref(VIEWS).EXECUTION_DEBUG,
						params: {
							workflowId: __props.execution.workflowId,
							executionId: __props.execution.id
						}
					} }, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							size: "medium",
							variant: "outline",
							class: normalizeClass(_ctx.$style.debugLink),
							disabled: !workflowPermissions.value.update || pinBlockedByRedaction.value
						}, {
							default: withCtx(() => [createBaseVNode("span", {
								"data-test-id": "execution-debug-button",
								onClick: _cache[0] || (_cache[0] = (...args) => unref(executionDebugging).handleDebugLinkClick && unref(executionDebugging).handleDebugLinkClick(...args))
							}, toDisplayString(debugButtonData.value.text), 1)]),
							_: 1
						}, 8, ["class", "disabled"])]),
						_: 1
					}, 8, ["to"])]),
					_: 1
				}, 8, ["content", "disabled"]),
				isRetriable.value ? (openBlock(), createBlock(unref(DropdownMenu_default), {
					key: 0,
					ref_key: "retryDropdownRef",
					ref: retryDropdownRef,
					items: retryItems.value,
					placement: "bottom-end",
					onSelect: handleRetryClick
				}, {
					trigger: withCtx(() => [createBaseVNode("span", _hoisted_2, [createVNode(unref(N8nIconButton_default), {
						variant: "outline",
						size: "medium",
						title: unref(locale).baseText("executionsList.retryExecution"),
						disabled: !workflowPermissions.value.update,
						icon: "redo-2",
						"data-test-id": "execution-preview-retry-button",
						onBlur: onRetryButtonBlur
					}, null, 8, ["title", "disabled"])])]),
					_: 1
				}, 8, ["items"])) : createCommentVNode("", true),
				showAddToDataset.value ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 1,
					variant: "outline",
					size: "medium",
					icon: "list-plus",
					disabled: !workflowPermissions.value.update,
					"data-test-id": "execution-preview-add-to-dataset-button",
					onClick: onAddToDatasetClick
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("evaluations.addToDataset.button.label")), 1)]),
					_: 1
				}, 8, ["disabled"])) : createCommentVNode("", true),
				isAnnotationEnabled.value && activeExecution.value ? (openBlock(), createBlock(WorkflowExecutionAnnotationPanel_ee_default, {
					key: 2,
					execution: activeExecution.value
				}, null, 8, ["execution"])) : createCommentVNode("", true),
				createVNode(unref(N8nIconButton_default), {
					variant: "outline",
					title: unref(locale).baseText("executionDetails.deleteExecution"),
					disabled: !executionPermissions.value.delete,
					icon: "trash-2",
					size: "medium",
					"data-test-id": "execution-preview-delete-button",
					onClick: onDeleteExecution
				}, null, 8, ["title", "disabled"])
			], 2)], 10, _hoisted_1)) : createCommentVNode("", true), createVNode(ExecutionPreviewHost_default, {
				class: normalizeClass(_ctx.$style.previewHost),
				"workflow-id": unref(workflowId),
				"execution-id": executionId.value,
				"node-id": nodeId.value
			}, null, 8, [
				"class",
				"workflow-id",
				"execution-id",
				"node-id"
			])], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	previewContainer: "_previewContainer_wkv97_1",
	executionDetails: "_executionDetails_wkv97_8",
	previewHost: "_previewHost_wkv97_22",
	executionDetailsLeft: "_executionDetailsLeft_wkv97_27",
	executionTitle: "_executionTitle_wkv97_33",
	voteButtons: "_voteButtons_wkv97_39",
	running: "_running_wkv97_43",
	waiting: "_waiting_wkv97_47",
	success: "_success_wkv97_51",
	error: "_error_wkv97_55",
	newInfo: "_newInfo_wkv97_59",
	runningInfo: "_runningInfo_wkv97_60",
	newMessage: "_newMessage_wkv97_67",
	runningMessage: "_runningMessage_wkv97_68",
	debugLink: "_debugLink_wkv97_74",
	actions: "_actions_wkv97_79",
	highlightDataButton: "_highlightDataButton_wkv97_84",
	highlightDataButtonActive: "_highlightDataButtonActive_wkv97_89",
	highlightDataButtonOpen: "_highlightDataButtonOpen_wkv97_93",
	versionLink: "_versionLink_wkv97_99",
	badge: "_badge_wkv97_107"
} }]]);
//#endregion
export { WorkflowExecutionsPreview_default as default };
