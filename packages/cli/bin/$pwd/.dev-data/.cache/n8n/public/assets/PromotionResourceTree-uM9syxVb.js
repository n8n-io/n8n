const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/PromotionWorkflowDiff-ujPnL2EU.js","assets/vendor-Hx42-oQF.js","assets/rolldown-runtime-EITvVbkG.js","assets/vendor-CB64RKTG.css","assets/app-D5flEmb-.js","assets/app-jHnVG3bN.css","assets/PromotionWorkflowSideLabel-B4SmfFXl.js","assets/PromotionWorkflowSideLabel-CLidyhtm.css","assets/PromotionWorkflowDiff-CnCLsx9r.css"])))=>i.map(i=>d[i]);
import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Id as Suspense, Il as CollapsibleTrigger_default, Jd as defineComponent, Kd as createVNode, Ll as CollapsibleContent_default, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Rl as CollapsibleRoot_default, Sp as toDisplayString, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, bd as I18nT, ef as inject, ff as openBlock, if as nextTick, ip as init_shared_esm_bundler, mf as renderList, nf as mergeModels, qd as defineAsyncComponent, vf as resolveDynamicComponent, xf as useModel, yp as normalizeStyle, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { DN as __vitePreload, LM as N8nCallout_default, SN as _plugin_vue_export_helper_default, _M as Checkbox_default, _N as N8nText_default, fN as N8nTooltip_default, jN as useI18n, s_ as get, tN as N8nLoading_default, xN as N8nIcon_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as require_chunk } from "./chunk-DalcE5hN.js";
import { _ as isContainer, g as flattenPreviewTree, n as availableKeys, u as selectionCheck, v as resourceIcon } from "./promotionPreview.selection-D6KzwuTA.js";
import { c as describeFieldChanges, d as isStaleDetail, f as sideState, l as describeWorkflowFieldChanges, o as PromotionAbsentSideLabelsKey, r as hasWorkflowDiff, s as describeDataTable, t as PromotionWorkflowSideLabel_default, u as hasUnreadableSide } from "./PromotionWorkflowSideLabel-B4SmfFXl.js";
//#region ../../modules/promotions/frontend/src/composables/usePromotionResourceDetails.ts
var import_chunk = /* @__PURE__ */ __toESM(require_chunk(), 1);
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
/**
* Loads the before and after content of the changed resources with each preview, in batches
* that the endpoint accepts. A workflow loads only when the user activates its diff.
*/
function usePromotionResourceDetails(fetchDetails, preview, graph, activeWorkflowKey) {
	const entries = ref(/* @__PURE__ */ new Map());
	let generation = 0;
	watch(preview, async () => {
		generation++;
		entries.value = /* @__PURE__ */ new Map();
		await request([...graph.value?.resources.values() ?? []].filter((resource) => resource.change !== "unchanged" && (resource.type !== "workflow" || resource.key === activeWorkflowKey.value)).map((resource) => resource.key));
	});
	watch(activeWorkflowKey, async (key) => {
		if (key) await request([key]);
	});
	async function fetchBatch(keys, batchGeneration) {
		try {
			const { details, missingKeys } = await fetchDetails(keys);
			if (batchGeneration !== generation) return;
			for (const detail of details) entries.value.set(detail.key, {
				status: "loaded",
				detail
			});
			for (const key of missingKeys) entries.value.set(key, { status: "missing" });
		} catch {
			if (batchGeneration !== generation) return;
			for (const key of keys) entries.value.set(key, { status: "error" });
		}
	}
	/** Loads the keys that have a file on either side and are not loaded yet. */
	async function request(keys) {
		if (!preview.value) return;
		const pending = keys.filter((key) => {
			const resource = graph.value?.resources.get(key);
			return resource && (resource.revision.before !== null || resource.revision.after !== null) && !entries.value.has(key);
		});
		for (const key of pending) entries.value.set(key, { status: "loading" });
		const batchGeneration = generation;
		await Promise.all((0, import_chunk.default)(pending, 50).map(async (batch) => await fetchBatch(batch, batchGeneration)));
	}
	async function retry(key) {
		entries.value.delete(key);
		await request([key]);
	}
	return {
		entries,
		request,
		retry
	};
}
//#endregion
//#region ../../modules/promotions/frontend/src/promotionOperation.ts
/**
* What users selected. The server adds the project, the dependencies and the folders above, so
* a selection of only the project sends no ids.
*/
function toOperationRequest(graph, selected) {
	const workflowIds = /* @__PURE__ */ new Set();
	const folderIds = /* @__PURE__ */ new Set();
	for (const key of selected) {
		const resource = graph.resources.get(key);
		if (resource?.type === "workflow") workflowIds.add(resource.id);
		if (resource?.type === "folder") folderIds.add(resource.id);
	}
	return {
		workflowIds: [...workflowIds].sort(),
		folderIds: [...folderIds].sort()
	};
}
var isBlocking = ({ kind }) => kind !== "destructive" && kind !== "warning";
var workflowKey = (id) => `workflow:${id}`;
function variableKey(name, scope) {
	const encoded = encodeURIComponent(name);
	return scope.kind === "global" ? `variable:global:${encoded}` : `variable:project:${scope.project.id}:${encoded}`;
}
var consumerKeys = (consumers) => consumers.flatMap(({ workflows }) => workflows.map(({ id }) => workflowKey(id)));
/**
* Keeps the blockers of workflows that the preview lists. The check also covers unchanged
* workflows, which users cannot select, so their blockers stop nothing on the page.
*/
function scopeCheck(check, graph) {
	const listed = (id) => graph.resources.has(workflowKey(id));
	const scope = (entries) => entries.flatMap((entry) => {
		const consumers = entry.consumers.flatMap((consumer) => {
			const workflows = consumer.workflows.filter(({ id }) => listed(id));
			return workflows.length > 0 ? [{
				...consumer,
				workflows
			}] : [];
		});
		return consumers.length > 0 ? [{
			...entry,
			consumers
		}] : [];
	});
	return {
		...check,
		missingBindings: scope(check.missingBindings),
		accessRequirements: scope(check.accessRequirements),
		conflicts: check.conflicts.flatMap((conflict) => {
			if ("consumers" in conflict) return scope([conflict]);
			if (conflict.code === "project-not-team") return conflict.workflows.some(({ id }) => listed(id)) ? [conflict] : [];
			return [conflict];
		}),
		warnings: scope(check.warnings),
		movedWorkflows: check.movedWorkflows.filter(({ id }) => listed(id)),
		movedFolders: check.movedFolders
	};
}
/** The blockers of the check. A project-wide conflict blocks every key in `listedKeys`. */
function listBlockers({ missingBindings, accessRequirements, conflicts, warnings, movedWorkflows, movedFolders }, listedKeys) {
	const blockers = [];
	for (const binding of missingBindings) blockers.push({
		kind: "missing",
		resourceKey: binding.kind === "credential" ? `credential:${binding.sourceId}` : variableKey(binding.name, binding.scope),
		workflowKeys: consumerKeys(binding.consumers)
	});
	for (const access of accessRequirements) blockers.push({
		kind: "access",
		resourceKey: `credential:${access.sourceId}`,
		workflowKeys: consumerKeys(access.consumers)
	});
	for (const conflict of conflicts) {
		if (conflict.code === "moved") continue;
		if (conflict.code === "destructive-change") blockers.push({
			kind: "destructive",
			resourceKey: `dataTable:${conflict.id}`,
			workflowKeys: consumerKeys(conflict.consumers)
		});
		else if (conflict.code === "project-not-team") blockers.push({
			kind: "conflict",
			resourceKey: `project:${conflict.project.id}`,
			workflowKeys: conflict.workflows.map(({ id }) => workflowKey(id))
		});
		else if (conflict.kind === "credential") blockers.push({
			kind: "conflict",
			resourceKey: conflict.sourceId === null ? null : `credential:${conflict.sourceId}`,
			workflowKeys: consumerKeys(conflict.consumers)
		});
		else if (conflict.kind === "variable" || conflict.kind === "workflow") blockers.push({
			kind: "conflict",
			resourceKey: null,
			workflowKeys: consumerKeys(conflict.consumers)
		});
		else if (conflict.kind === "data-table" || conflict.kind === "tag") {
			const type = conflict.kind === "tag" ? "tag" : "dataTable";
			blockers.push({
				kind: "conflict",
				resourceKey: conflict.id === void 0 ? null : `${type}:${conflict.id}`,
				workflowKeys: consumerKeys(conflict.consumers)
			});
		} else if (conflict.code !== "project-deletion") blockers.push({
			kind: "conflict",
			resourceKey: `project:${conflict.project.id}`,
			workflowKeys: listedKeys
		});
	}
	for (const warning of warnings) blockers.push({
		kind: "warning",
		resourceKey: variableKey(warning.name, warning.scope),
		workflowKeys: consumerKeys(warning.consumers)
	});
	for (const { id } of movedWorkflows) blockers.push({
		kind: "moved",
		resourceKey: workflowKey(id),
		workflowKeys: [workflowKey(id)]
	});
	for (const { id } of movedFolders) blockers.push({
		kind: "moved",
		resourceKey: `folder:${id}`,
		workflowKeys: []
	});
	return blockers;
}
/** Workflows that moved between projects on this instance, in either direction. Promote refuses them. */
function crossProjectMoveBlockers(graph) {
	return [...graph.resources.values()].flatMap(({ key, movedToProject, movedFromProject }) => movedToProject || movedFromProject ? [{
		kind: "moved",
		resourceKey: key,
		workflowKeys: [key]
	}] : []);
}
function push(map, key, blocker) {
	const list = map.get(key);
	if (!list) map.set(key, [blocker]);
	else if (!list.includes(blocker)) list.push(blocker);
}
function indexBlockers(blockers) {
	const byWorkflow = /* @__PURE__ */ new Map();
	const byResource = /* @__PURE__ */ new Map();
	const blocked = /* @__PURE__ */ new Set();
	for (const blocker of blockers) {
		if (blocker.resourceKey !== null) push(byResource, blocker.resourceKey, blocker);
		for (const key of blocker.workflowKeys) {
			push(byWorkflow, key, blocker);
			if (isBlocking(blocker)) blocked.add(key);
		}
	}
	return {
		byWorkflow,
		byResource,
		blocked
	};
}
/** The blockers that a tree row or a card shows: a workflow shows what stops it. */
var blockersOf = (index, { key, type }) => type === "workflow" ? index.byWorkflow.get(key) : index.byResource.get(key);
/** True when the apply of these workflows removes data table values. */
function touchesDestructiveChange(index, keys) {
	for (const key of keys) if (index.byWorkflow.get(key)?.some(({ kind }) => kind === "destructive")) return true;
	return false;
}
//#endregion
//#region ../../modules/promotions/frontend/src/composables/usePromotionPreviewLabels.ts
/** Apply keeps these resources as they are on the instance. It does not create them. */
var KEPT_BY_APPLY = /* @__PURE__ */ new Set(["credential", "variable"]);
var MOVED_DETAIL = {
	workflow: {
		existing: "promotions.preview.blockers.movedWorkflow",
		newProject: "promotions.preview.blockers.movedWorkflow.newProject"
	},
	folder: {
		existing: "promotions.preview.blockers.movedFolder",
		newProject: "promotions.preview.blockers.movedFolder.newProject"
	}
};
/** Labels for change details and blockers in the promotion preview. */
function usePromotionPreviewLabels() {
	const i18n = useI18n();
	function changeLabel(resource, direction) {
		switch (resource.change) {
			case "added": return direction === "apply" && KEPT_BY_APPLY.has(resource.type) ? i18n.baseText("promotions.preview.side.notOnInstance") : i18n.baseText("promotions.preview.change.added");
			case "archived": return i18n.baseText("promotions.preview.change.archived");
			case "deleted": return i18n.baseText("promotions.preview.change.deleted");
			case "modified":
				if (resource.previousParentKey !== void 0) return i18n.baseText("promotions.preview.change.moved");
				if (resource.previousId !== void 0) return i18n.baseText("promotions.preview.change.linked");
				if (resource.previousName !== void 0) return i18n.baseText("promotions.preview.change.renamed");
				return i18n.baseText("promotions.preview.change.modified");
			case "unchanged": return;
		}
	}
	/** Why the resource stops the operation. `undefined` when it does not. */
	function blockerMessage(resource, blockers = []) {
		const blocking = blockers.filter(isBlocking);
		if (blocking.length === 0) return void 0;
		if (resource.type === "workflow") {
			if (resource.movedToProject) return i18n.baseText("promotions.preview.marker.movedOut", { interpolate: { project: resource.movedToProject.name ?? i18n.baseText("promotions.preview.personalProject") } });
			if (resource.movedFromProject) return i18n.baseText("promotions.preview.marker.movedIn", { interpolate: { project: resource.movedFromProject.name } });
			return i18n.baseText("promotions.preview.marker.workflow", {
				adjustToNumber: blocking.length,
				interpolate: { count: String(blocking.length) }
			});
		}
		const [first] = blocking;
		if (first.kind === "moved" && resource.type === "folder") return i18n.baseText("promotions.preview.marker.movedFolder");
		const count = new Set(blocking.flatMap(({ workflowKeys }) => workflowKeys)).size;
		const options = {
			adjustToNumber: count,
			interpolate: { count: String(count) }
		};
		if (first.kind === "access") return i18n.baseText("promotions.preview.marker.access", options);
		if (first.kind === "missing" && resource.type === "credential") return i18n.baseText("promotions.preview.marker.missingCredential", options);
		if (first.kind === "missing" && resource.type === "variable") return i18n.baseText("promotions.preview.marker.missingVariable", options);
		return i18n.baseText("promotions.preview.marker.conflict", options);
	}
	/** The checkbox of a project or folder selects it and everything inside it. */
	function selectLabel(resource) {
		const interpolate = { name: resource.name };
		return isContainer(resource) ? i18n.baseText("promotions.preview.selectContainer", { interpolate }) : i18n.baseText("promotions.preview.select", { interpolate });
	}
	/** Names both projects of a move between projects, and how to fix it. */
	function moveDetail(type, move) {
		return i18n.baseText(MOVED_DETAIL[type][move.projectExists ? "existing" : "newProject"], { interpolate: {
			project: move.project.name,
			instanceProject: move.instanceProject.name ?? i18n.baseText("promotions.preview.personalProject")
		} });
	}
	return {
		changeLabel,
		blockerMessage,
		selectLabel,
		moveDetail
	};
}
//#endregion
//#region ../../modules/promotions/frontend/src/components/preview/DataTableChangeDetails.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var DataTableChangeDetails_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "DataTableChangeDetails",
	props: { description: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const typeLabel = (type) => type === "date" ? "datetime" : type;
		const removesData = (change) => props.description.warnsAboutDataLoss && change.destructive;
		function changeText(change) {
			switch (change.kind) {
				case "add-column": return {
					keypath: "promotions.preview.dataTable.addColumn",
					names: {
						column: change.column,
						type: typeLabel(change.type)
					}
				};
				case "remove-column": return {
					keypath: removesData(change) ? "promotions.preview.dataTable.removeColumnWithValues" : "promotions.preview.dataTable.removeColumn",
					names: { column: change.column }
				};
				case "change-column-type": return {
					keypath: "promotions.preview.dataTable.changeColumnType",
					names: {
						column: change.column,
						from: typeLabel(change.from),
						to: typeLabel(change.to)
					}
				};
				case "rename-column": return {
					keypath: "promotions.preview.dataTable.renameColumn",
					names: {
						from: change.from,
						to: change.to
					}
				};
				case "reorder-columns": return {
					keypath: "promotions.preview.dataTable.reorderColumns",
					names: {}
				};
				case "rename-table": return {
					keypath: "promotions.preview.dataTable.renameTable",
					names: {
						from: change.from,
						to: change.to
					}
				};
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.details),
				"data-test-id": "promotion-preview-data-table"
			}, [__props.description.changes.length > 0 ? (openBlock(), createElementBlock("ul", {
				key: 0,
				class: normalizeClass(_ctx.$style.list)
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.description.changes, (change, index) => {
				return openBlock(), createElementBlock("li", {
					key: index,
					class: normalizeClass(_ctx.$style.change),
					"data-test-id": "promotion-preview-data-table-change"
				}, [createVNode(unref(N8nIcon_default), {
					icon: removesData(change) ? "triangle-alert" : "dot",
					size: "small",
					class: normalizeClass(removesData(change) ? _ctx.$style.destructive : _ctx.$style.marker)
				}, null, 8, ["icon", "class"]), createVNode(unref(N8nText_default), {
					step: "xs",
					class: normalizeClass(_ctx.$style.wrap)
				}, {
					default: withCtx(() => [createVNode(unref(I18nT), {
						keypath: changeText(change).keypath,
						scope: "global"
					}, createSlots({ _: 2 }, [renderList(changeText(change).names, (name, slot) => {
						return {
							name: slot,
							fn: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.name) }, toDisplayString(name), 3)])
						};
					})]), 1032, ["keypath"])]),
					_: 2
				}, 1032, ["class"])], 2);
			}), 128))], 2)) : createCommentVNode("", true), __props.description.addedColumns.length > 0 ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
				createVNode(unref(N8nText_default), {
					step: "2xs",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("promotions.preview.dataTable.columns")), 1)]),
					_: 1
				}),
				createBaseVNode("ul", { class: normalizeClass(_ctx.$style.list) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.description.addedColumns, (column) => {
					return openBlock(), createElementBlock("li", {
						key: column.name,
						class: normalizeClass(_ctx.$style.change)
					}, [createVNode(unref(N8nText_default), {
						step: "xs",
						class: normalizeClass(_ctx.$style.wrap)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(column.name), 1)]),
						_: 2
					}, 1032, ["class"]), createVNode(unref(N8nText_default), {
						step: "2xs",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(typeLabel(column.type)), 1)]),
						_: 2
					}, 1024)], 2);
				}), 128))], 2),
				createVNode(unref(N8nText_default), {
					step: "2xs",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("promotions.preview.dataTable.rowsNotCopied")), 1)]),
					_: 1
				})
			], 64)) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	details: "_details_1s0zi_1",
	list: "_list_1s0zi_7",
	change: "_change_1s0zi_16",
	name: "_name_1s0zi_22",
	wrap: "_wrap_1s0zi_27",
	marker: "_marker_1s0zi_32",
	destructive: "_destructive_1s0zi_36"
} }]]);
//#endregion
//#region ../../modules/promotions/frontend/src/components/preview/PromotionFieldChanges.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var PromotionFieldChanges_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PromotionFieldChanges",
	props: {
		changes: {},
		direction: {},
		absentSides: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const CodeDiff = computed(() => get("code-diff"));
		const absentLabels = inject(PromotionAbsentSideLabelsKey, void 0);
		const absentText = (side) => absentLabels?.[side] ?? i18n.baseText(side === (props.direction === "promote" ? "before" : "after") ? "promotions.preview.side.notOnBranch" : "promotions.preview.side.notOnInstance");
		const columnChanges = computed(() => props.changes.filter((change) => change.field !== "data"));
		const dataChange = computed(() => props.changes.find((change) => change.field === "data"));
		const showFieldLabels = computed(() => columnChanges.value.length > 1 || columnChanges.value[0]?.field !== "name");
		const sides = computed(() => ["before", "after"].map((side) => ({
			side,
			label: i18n.baseText(`promotions.preview.field.${side}`),
			absent: props.absentSides.includes(side)
		})));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [columnChanges.value.length > 0 || __props.absentSides.length > 0 ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.columns),
				"data-test-id": "promotion-preview-field-changes"
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(sides.value, (column) => {
				return openBlock(), createElementBlock("div", {
					key: column.side,
					class: normalizeClass(_ctx.$style.column)
				}, [createVNode(unref(N8nText_default), {
					step: "2xs",
					bold: "",
					color: "text-base"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(column.label), 1)]),
					_: 2
				}, 1024), column.absent ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					step: "xs",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(absentText(column.side)), 1)]),
					_: 2
				}, 1024)) : (openBlock(true), createElementBlock(Fragment, { key: 1 }, renderList(columnChanges.value, (change) => {
					return openBlock(), createElementBlock("div", {
						key: change.field,
						class: normalizeClass(_ctx.$style.field)
					}, [showFieldLabels.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						step: "2xs",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(`promotions.preview.field.${change.field}`)), 1)]),
						_: 2
					}, 1024)) : createCommentVNode("", true), createVNode(unref(N8nText_default), {
						step: "xs",
						color: change[column.side] === void 0 ? "text-light" : "text-dark",
						class: normalizeClass(_ctx.$style.value)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(change[column.side] ?? unref(i18n).baseText("promotions.preview.field.empty")), 1)]),
						_: 2
					}, 1032, ["color", "class"])], 2);
				}), 128))], 2);
			}), 128))], 2)) : createCommentVNode("", true), dataChange.value ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.data),
				"data-test-id": "promotion-preview-data-diff"
			}, [createVNode(unref(N8nText_default), {
				step: "2xs",
				bold: "",
				color: "text-base"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("promotions.preview.field.data")), 1)]),
				_: 1
			}), CodeDiff.value ? (openBlock(), createBlock(resolveDynamicComponent(CodeDiff.value), {
				key: 0,
				"old-string": dataChange.value.before ?? "",
				"new-string": dataChange.value.after ?? ""
			}, null, 8, ["old-string", "new-string"])) : createCommentVNode("", true)], 2)) : createCommentVNode("", true)]);
		};
	}
}), [["__cssModules", { "$style": {
	columns: "_columns_sx3v6_1",
	column: "_column_sx3v6_1",
	field: "_field_sx3v6_16",
	value: "_value_sx3v6_22",
	data: "_data_sx3v6_26"
} }]]);
//#endregion
//#region ../../modules/promotions/frontend/src/components/preview/PromotionWorkflowShell.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
//#endregion
//#region ../../modules/promotions/frontend/src/components/preview/PromotionWorkflowShell.vue
var PromotionWorkflowShell_default = /* @__PURE__ */ defineComponent({
	__name: "PromotionWorkflowShell",
	props: {
		status: {},
		workflowName: {}
	},
	emits: [
		"activate",
		"retry",
		"refresh"
	],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const i18n = useI18n();
		const WorkflowDiffPlaceholder = computed(() => get("workflow-diff-placeholder"));
		return (_ctx, _cache) => {
			return WorkflowDiffPlaceholder.value ? (openBlock(), createBlock(resolveDynamicComponent(WorkflowDiffPlaceholder.value), {
				key: 0,
				"hide-illustration": __props.status === "loading"
			}, {
				sourceLabel: withCtx(() => [createVNode(PromotionWorkflowSideLabel_default, { side: "before" })]),
				targetLabel: withCtx(() => [createVNode(PromotionWorkflowSideLabel_default, { side: "after" })]),
				default: withCtx(() => [__props.status === "idle" ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					variant: "outline",
					size: "xlarge",
					"aria-label": unref(i18n).baseText("promotions.preview.workflow.showDiffOf", { interpolate: { name: __props.workflowName } }),
					onClick: _cache[0] || (_cache[0] = ($event) => emit("activate"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("promotions.preview.workflow.showDiff")), 1)]),
					_: 1
				}, 8, ["aria-label"])) : __props.status === "loading" ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 1,
					variant: "outline",
					loading: "",
					disabled: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("promotions.preview.workflow.loadingDiff")), 1)]),
					_: 1
				})) : __props.status === "error" ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [createVNode(unref(N8nText_default), { color: "text-light" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("promotions.preview.card.loadFailed")), 1)]),
					_: 1
				}), createVNode(unref(N8nButton_default), {
					variant: "outline",
					onClick: _cache[1] || (_cache[1] = ($event) => emit("retry"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("promotions.preview.state.retry")), 1)]),
					_: 1
				})], 64)) : __props.status === "missing" ? (openBlock(), createElementBlock(Fragment, { key: 3 }, [createVNode(unref(N8nText_default), { color: "text-light" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("promotions.preview.card.missing")), 1)]),
					_: 1
				}), createVNode(unref(N8nButton_default), {
					variant: "outline",
					onClick: _cache[2] || (_cache[2] = ($event) => emit("refresh"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("promotions.preview.refresh")), 1)]),
					_: 1
				})], 64)) : (openBlock(), createBlock(unref(N8nText_default), {
					key: 4,
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("promotions.preview.card.unreadable")), 1)]),
					_: 1
				}))]),
				_: 1
			}, 8, ["hide-illustration"])) : createCommentVNode("", true);
		};
	}
});
//#endregion
//#region ../../modules/promotions/frontend/src/components/preview/PromotionWorkflowPreview.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var PromotionWorkflowPreview_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PromotionWorkflowPreview",
	props: {
		active: { type: Boolean },
		entry: {},
		resourceKey: {},
		workflowName: {},
		direction: {},
		graph: {}
	},
	emits: [
		"activate",
		"retry",
		"refresh"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const detail = computed(() => props.entry?.status === "loaded" && props.entry.detail.type === "workflow" ? props.entry.detail : void 0);
		const unreadable = computed(() => !!detail.value && hasUnreadableSide(detail.value));
		const status = computed(() => {
			if (!props.active) return "idle";
			if (unreadable.value) return "unreadable";
			if (props.entry?.status === "error" || props.entry?.status === "missing") return props.entry.status;
			return "loading";
		});
		const PromotionWorkflowDiff = defineAsyncComponent(async () => await __vitePreload(() => import("./PromotionWorkflowDiff-ujPnL2EU.js"), __vite__mapDeps([0,1,2,3,4,5,6,7,8])));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.preview),
				"data-test-id": "promotion-workflow-preview"
			}, [__props.active && detail.value && !unreadable.value ? (openBlock(), createBlock(Suspense, { key: 0 }, {
				fallback: withCtx(() => [createVNode(PromotionWorkflowShell_default, {
					status: "loading",
					"workflow-name": __props.workflowName
				}, null, 8, ["workflow-name"])]),
				default: withCtx(() => [createVNode(unref(PromotionWorkflowDiff), {
					detail: detail.value,
					"resource-key": __props.resourceKey,
					direction: __props.direction,
					graph: __props.graph
				}, null, 8, [
					"detail",
					"resource-key",
					"direction",
					"graph"
				])]),
				_: 1
			})) : (openBlock(), createBlock(PromotionWorkflowShell_default, {
				key: 1,
				status: status.value,
				"workflow-name": __props.workflowName,
				onActivate: _cache[0] || (_cache[0] = ($event) => emit("activate")),
				onRetry: _cache[1] || (_cache[1] = ($event) => emit("retry")),
				onRefresh: _cache[2] || (_cache[2] = ($event) => emit("refresh"))
			}, null, 8, ["status", "workflow-name"]))], 2);
		};
	}
}), [["__cssModules", { "$style": { preview: "_preview_cqo6c_1" } }]]);
//#endregion
//#region ../../modules/promotions/frontend/src/components/preview/PromotionWorkflowLinks.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$2 = ["onClick"];
var _hoisted_2$2 = { key: 1 };
var _hoisted_3$1 = ["onClick"];
var PromotionWorkflowLinks_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PromotionWorkflowLinks",
	props: {
		workflows: {},
		list: { type: Boolean }
	},
	emits: ["inspect"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const parts = computed(() => {
			const names = new Map(props.workflows.map(({ key, name }) => [key, name]));
			return new Intl.ListFormat(i18n.locale, {
				style: "long",
				type: "conjunction"
			}).formatToParts(props.workflows.map(({ key }) => key)).map((part) => part.type === "element" ? {
				key: part.value,
				text: names.get(part.value) ?? part.value
			} : { text: part.value });
		});
		return (_ctx, _cache) => {
			return __props.list ? (openBlock(), createElementBlock("span", {
				key: 0,
				class: normalizeClass(_ctx.$style.list)
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.workflows, (workflow) => {
				return openBlock(), createElementBlock("button", {
					key: workflow.key,
					type: "button",
					class: normalizeClass(_ctx.$style.link),
					"data-test-id": "promotion-preview-workflow-link",
					onClick: ($event) => emit("inspect", workflow.key)
				}, toDisplayString(workflow.name), 11, _hoisted_1$2);
			}), 128))], 2)) : (openBlock(), createElementBlock("span", _hoisted_2$2, [(openBlock(true), createElementBlock(Fragment, null, renderList(parts.value, (part, index) => {
				return openBlock(), createElementBlock(Fragment, { key: index }, [part.key ? (openBlock(), createElementBlock("button", {
					key: 0,
					type: "button",
					class: normalizeClass(_ctx.$style.link),
					"data-test-id": "promotion-preview-workflow-link",
					onClick: ($event) => part.key && emit("inspect", part.key)
				}, toDisplayString(part.text), 11, _hoisted_3$1)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createTextVNode(toDisplayString(part.text), 1)], 64))], 64);
			}), 128))]));
		};
	}
}), [["__cssModules", { "$style": {
	list: "_list_10bqc_1",
	link: "_link_10bqc_9"
} }]]);
//#endregion
//#region ../../modules/promotions/frontend/src/components/preview/PromotionChangeCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = ["data-resource-key"];
var _hoisted_2$1 = ["aria-label"];
var PromotionChangeCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PromotionChangeCard",
	props: /*@__PURE__*/ mergeModels({
		resource: {},
		graph: {},
		direction: {},
		selection: {},
		entry: {},
		inspected: { type: Boolean },
		blockers: {},
		diffActive: { type: Boolean },
		selectable: {
			type: Boolean,
			default: true
		}
	}, {
		"open": {
			type: Boolean,
			default: true
		},
		"openModifiers": {}
	}),
	emits: /*@__PURE__*/ mergeModels([
		"inspect",
		"toggle",
		"retry",
		"refresh",
		"activateDiff",
		"deactivateDiff"
	], ["update:open"]),
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const nameOf = (key) => props.graph.resources.get(key)?.name ?? key;
		const { changeLabel, blockerMessage, selectLabel } = usePromotionPreviewLabels();
		const blocker = computed(() => blockerMessage(props.resource, props.blockers));
		const open = useModel(__props, "open");
		watch(() => props.inspected, (inspected) => {
			if (inspected) open.value = true;
		});
		watch(open, (isOpen) => {
			if (!isOpen && props.diffActive) emit("deactivateDiff");
		});
		const scope = computed(() => props.resource.key.startsWith("variable:global:") ? i18n.baseText("promotions.preview.card.globalScope") : void 0);
		const footer = computed(() => {
			const { resource, graph } = props;
			if (resource.selectable || isContainer(resource)) return void 0;
			const users = graph.requiredBy.get(resource.key) ?? [];
			const callers = graph.calledBy.get(resource.key) ?? [];
			const named = (keys) => keys.map((key) => ({
				key,
				name: nameOf(key)
			}));
			if (users.length > 0) return {
				keypath: "promotions.preview.card.usedBy",
				workflows: named(users)
			};
			if (callers.length > 0) return {
				keypath: "promotions.preview.card.calledBy",
				workflows: named(callers)
			};
		});
		const detail = computed(() => props.entry?.status === "loaded" ? props.entry.detail : void 0);
		const hasDiff = computed(() => hasWorkflowDiff(props.resource));
		const stale = computed(() => !!detail.value && isStaleDetail(detail.value, props.resource));
		const fieldChanges = computed(() => {
			const context = {
				direction: props.direction,
				resource: props.resource,
				containerName: nameOf
			};
			if (props.resource.type === "workflow") return describeWorkflowFieldChanges(context);
			return detail.value ? describeFieldChanges(detail.value, context) : [];
		});
		const dataTable = computed(() => detail.value?.type === "dataTable" ? describeDataTable(detail.value, props.resource, props.direction) : void 0);
		const absentSides = computed(() => {
			const current = detail.value;
			if (!current) return [];
			return ["before", "after"].filter((side) => sideState(current, side).kind === "absent");
		});
		const tagNote = computed(() => {
			const { direction, resource } = props;
			if (direction !== "apply" || resource.type !== "tag" || resource.change !== "modified") return;
			if (resource.previousId !== void 0) return i18n.baseText("promotions.preview.tag.linked");
			if (resource.previousName !== void 0) return i18n.baseText("promotions.preview.tag.renamed");
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(CollapsibleRoot_default), {
				open: open.value,
				"onUpdate:open": _cache[8] || (_cache[8] = ($event) => open.value = $event),
				"as-child": ""
			}, {
				default: withCtx(() => [createBaseVNode("article", {
					class: normalizeClass([_ctx.$style.card, { [_ctx.$style.inspected]: __props.inspected }]),
					"data-test-id": "promotion-preview-card",
					"data-resource-key": __props.resource.key
				}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [__props.selectable ? (openBlock(), createBlock(unref(Checkbox_default), {
					key: 0,
					"model-value": __props.selection.checked,
					indeterminate: __props.selection.indeterminate,
					disabled: __props.selection.disabled,
					"aria-label": unref(selectLabel)(__props.resource),
					"data-test-id": "promotion-preview-card-checkbox",
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => emit("toggle"))
				}, null, 8, [
					"model-value",
					"indeterminate",
					"disabled",
					"aria-label"
				])) : createCommentVNode("", true), createVNode(unref(CollapsibleTrigger_default), {
					class: normalizeClass(_ctx.$style.trigger),
					"data-test-id": "promotion-preview-card-toggle"
				}, {
					default: withCtx(() => [
						createVNode(unref(N8nIcon_default), {
							icon: unref(resourceIcon)(__props.resource.type),
							size: "small",
							class: normalizeClass(_ctx.$style.icon)
						}, null, 8, ["icon", "class"]),
						createBaseVNode("span", { class: normalizeClass(_ctx.$style.heading) }, [createVNode(unref(N8nText_default), {
							bold: "",
							size: "medium",
							color: "text-dark",
							title: __props.resource.name,
							class: normalizeClass(_ctx.$style.title)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(__props.resource.name), 1)]),
							_: 1
						}, 8, ["title", "class"]), unref(changeLabel)(__props.resource, __props.direction) ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							step: "xs",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(changeLabel)(__props.resource, __props.direction)), 1)]),
							_: 1
						})) : createCommentVNode("", true)], 2),
						createVNode(unref(N8nIcon_default), {
							icon: "chevron-down",
							size: "small",
							class: normalizeClass(_ctx.$style.chevron)
						}, null, 8, ["class"]),
						blocker.value ? (openBlock(), createBlock(unref(N8nTooltip_default), {
							key: 0,
							"as-child": ""
						}, {
							content: withCtx(() => [createTextVNode(toDisplayString(blocker.value), 1)]),
							default: withCtx(() => [createBaseVNode("span", {
								role: "img",
								"aria-label": blocker.value,
								class: normalizeClass(_ctx.$style.blocker),
								"data-test-id": "promotion-preview-card-blocker"
							}, [createVNode(unref(N8nIcon_default), {
								icon: "circle-alert",
								size: "medium",
								color: "--icon-color--warning"
							})], 10, _hoisted_2$1)]),
							_: 1
						})) : createCommentVNode("", true)
					]),
					_: 1
				}, 8, ["class"])], 2), createVNode(unref(CollapsibleContent_default), null, {
					default: withCtx(() => [
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.notices) }, [
							!hasDiff.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [__props.entry?.status === "missing" ? (openBlock(), createBlock(unref(N8nCallout_default), {
								key: 0,
								theme: "warning",
								slim: ""
							}, {
								trailingContent: withCtx(() => [createVNode(unref(N8nButton_default), {
									variant: "outline",
									size: "small",
									onClick: _cache[1] || (_cache[1] = ($event) => emit("refresh"))
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("promotions.preview.refresh")), 1)]),
									_: 1
								})]),
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("promotions.preview.card.missing")) + " ", 1)]),
								_: 1
							})) : __props.entry?.status === "error" ? (openBlock(), createBlock(unref(N8nCallout_default), {
								key: 1,
								theme: "danger",
								slim: ""
							}, {
								trailingContent: withCtx(() => [createVNode(unref(N8nButton_default), {
									variant: "outline",
									size: "small",
									onClick: _cache[2] || (_cache[2] = ($event) => emit("retry"))
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("promotions.preview.state.retry")), 1)]),
									_: 1
								})]),
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("promotions.preview.card.loadFailed")) + " ", 1)]),
								_: 1
							})) : createCommentVNode("", true)], 64)) : createCommentVNode("", true),
							stale.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
								key: 1,
								theme: "warning",
								slim: "",
								"data-test-id": "promotion-preview-card-stale"
							}, {
								trailingContent: withCtx(() => [createVNode(unref(N8nButton_default), {
									variant: "outline",
									size: "small",
									onClick: _cache[3] || (_cache[3] = ($event) => emit("refresh"))
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("promotions.preview.refresh")), 1)]),
									_: 1
								})]),
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("promotions.preview.card.stale")) + " ", 1)]),
								_: 1
							})) : createCommentVNode("", true),
							!hasDiff.value && detail.value && unref(hasUnreadableSide)(detail.value) ? (openBlock(), createBlock(unref(N8nCallout_default), {
								key: 2,
								theme: "info",
								slim: ""
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("promotions.preview.card.unreadable")), 1)]),
								_: 1
							})) : createCommentVNode("", true)
						], 2),
						__props.resource.change === "unchanged" ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							step: "xs",
							color: "text-light",
							class: normalizeClass(_ctx.$style.padded)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("promotions.preview.card.noChanges")), 1)]),
							_: 1
						}, 8, ["class"])) : __props.entry?.status === "loading" && !hasDiff.value ? (openBlock(), createBlock(unref(N8nLoading_default), {
							key: 1,
							rows: 2,
							class: normalizeClass(_ctx.$style.padded)
						}, null, 8, ["class"])) : (openBlock(), createElementBlock(Fragment, { key: 2 }, [
							dataTable.value ? (openBlock(), createBlock(DataTableChangeDetails_default, {
								key: 0,
								class: normalizeClass(_ctx.$style.padded),
								description: dataTable.value
							}, null, 8, ["class", "description"])) : fieldChanges.value.length > 0 ? (openBlock(), createBlock(PromotionFieldChanges_default, {
								key: 1,
								changes: fieldChanges.value,
								direction: __props.direction,
								"absent-sides": absentSides.value
							}, null, 8, [
								"changes",
								"direction",
								"absent-sides"
							])) : createCommentVNode("", true),
							hasDiff.value ? (openBlock(), createBlock(PromotionWorkflowPreview_default, {
								key: 2,
								active: !!__props.diffActive && open.value,
								entry: __props.entry,
								"resource-key": __props.resource.key,
								"workflow-name": __props.resource.name,
								direction: __props.direction,
								graph: __props.graph,
								onActivate: _cache[4] || (_cache[4] = ($event) => emit("activateDiff")),
								onRetry: _cache[5] || (_cache[5] = ($event) => emit("retry")),
								onRefresh: _cache[6] || (_cache[6] = ($event) => emit("refresh"))
							}, null, 8, [
								"active",
								"entry",
								"resource-key",
								"workflow-name",
								"direction",
								"graph"
							])) : createCommentVNode("", true),
							detail.value?.type === "variable" && detail.value.valueHidden ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 3,
								step: "2xs",
								color: "text-light",
								class: normalizeClass(_ctx.$style.padded)
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("promotions.preview.variable.valueHidden")), 1)]),
								_: 1
							}, 8, ["class"])) : createCommentVNode("", true),
							tagNote.value ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 4,
								step: "2xs",
								color: "text-light",
								class: normalizeClass(_ctx.$style.padded)
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(tagNote.value), 1)]),
								_: 1
							}, 8, ["class"])) : createCommentVNode("", true)
						], 64)),
						footer.value || scope.value ? (openBlock(), createElementBlock("footer", {
							key: 3,
							class: normalizeClass(_ctx.$style.footer)
						}, [scope.value ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							step: "2xs",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(scope.value), 1)]),
							_: 1
						})) : createCommentVNode("", true), footer.value ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 1,
							step: "2xs",
							color: "text-light",
							"data-test-id": "promotion-preview-card-inclusion"
						}, {
							default: withCtx(() => [createVNode(unref(I18nT), {
								keypath: footer.value.keypath,
								scope: "global"
							}, {
								names: withCtx(() => [createVNode(PromotionWorkflowLinks_default, {
									workflows: footer.value.workflows,
									onInspect: _cache[7] || (_cache[7] = ($event) => emit("inspect", $event))
								}, null, 8, ["workflows"])]),
								_: 1
							}, 8, ["keypath"])]),
							_: 1
						})) : createCommentVNode("", true)], 2)) : createCommentVNode("", true)
					]),
					_: 1
				})], 10, _hoisted_1$1)]),
				_: 1
			}, 8, ["open"]);
		};
	}
}), [["__cssModules", { "$style": {
	card: "_card_lbsv6_451",
	inspected: "_inspected_lbsv6_462",
	header: "_header_lbsv6_466",
	trigger: "_trigger_lbsv6_477",
	chevron: "_chevron_lbsv6_495",
	icon: "_icon_lbsv6_510",
	heading: "_heading_lbsv6_515",
	title: "_title_lbsv6_522",
	notices: "_notices_lbsv6_529",
	padded: "_padded_lbsv6_539",
	footer: "_footer_lbsv6_545",
	blocker: "_blocker_lbsv6_559",
	shimmer: "_shimmer_lbsv6_1",
	spin: "_spin_lbsv6_1",
	"skeleton-pulse": "_skeleton-pulse_lbsv6_1",
	opacityPulse: "_opacityPulse_lbsv6_1",
	popoverIn: "_popoverIn_lbsv6_1",
	fadeIn: "_fadeIn_lbsv6_1",
	collapsibleSlideDown: "_collapsibleSlideDown_lbsv6_1",
	collapsibleSlideUp: "_collapsibleSlideUp_lbsv6_1",
	collapsibleSlideDownBlurred: "_collapsibleSlideDownBlurred_lbsv6_1",
	collapsibleSlideUpBlurred: "_collapsibleSlideUpBlurred_lbsv6_1",
	blurSwapIn: "_blurSwapIn_lbsv6_1",
	blurSwapOut: "_blurSwapOut_lbsv6_1",
	pulse: "_pulse_lbsv6_1",
	pulseGlow: "_pulseGlow_lbsv6_1",
	pulseGlowDelayed: "_pulseGlowDelayed_lbsv6_1",
	fade: "_fade_lbsv6_1",
	fadeInUp: "_fadeInUp_lbsv6_1",
	fadeInDown: "_fadeInDown_lbsv6_1",
	fadeInLeft: "_fadeInLeft_lbsv6_1",
	fadeInRight: "_fadeInRight_lbsv6_1",
	fadeOut: "_fadeOut_lbsv6_1",
	fadeOutDown: "_fadeOutDown_lbsv6_1",
	fadeOutUp: "_fadeOutUp_lbsv6_1",
	fadeOutLeft: "_fadeOutLeft_lbsv6_1",
	fadeOutRight: "_fadeOutRight_lbsv6_1",
	ping: "_ping_lbsv6_1",
	blinkBackground: "_blinkBackground_lbsv6_1",
	typingBlink: "_typingBlink_lbsv6_1"
} }]]);
//#endregion
//#region ../../modules/promotions/frontend/src/components/preview/PromotionChangeCards.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var PromotionChangeCards_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PromotionChangeCards",
	props: /*@__PURE__*/ mergeModels({
		order: {},
		graph: {},
		direction: {},
		selected: {},
		inclusion: {},
		disabled: {},
		locked: { type: Boolean },
		entries: {},
		inspectedKey: {},
		blockers: {},
		selectable: {
			type: Boolean,
			default: true
		}
	}, {
		"activeWorkflow": {},
		"activeWorkflowModifiers": {}
	}),
	emits: /*@__PURE__*/ mergeModels([
		"retry",
		"refresh",
		"inspect",
		"toggle",
		"toggleContainer"
	], ["update:activeWorkflow"]),
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const activeWorkflow = useModel(__props, "activeWorkflow");
		const emit = __emit;
		const check = (resource) => selectionCheck(props.graph, resource, {
			selected: props.selected,
			inclusion: props.inclusion,
			disabled: props.disabled,
			locked: props.locked
		});
		function onToggle(resource) {
			if (isContainer(resource)) emit("toggleContainer", resource.key);
			else emit("toggle", resource.key);
		}
		const list = ref(null);
		const resources = computed(() => props.order.flatMap((key) => {
			const resource = props.graph.resources.get(key);
			return resource ? [resource] : [];
		}));
		async function scrollToCard(key) {
			if (!key) return;
			await nextTick();
			list.value?.querySelector(`[data-resource-key="${CSS.escape(key)}"]`)?.scrollIntoView({ block: "start" });
		}
		watch(() => props.inspectedKey, scrollToCard, { immediate: true });
		__expose({ scrollToCard });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "list",
				ref: list,
				class: normalizeClass(_ctx.$style.list),
				"data-test-id": "promotion-preview-cards"
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(resources.value, (resource) => {
				return openBlock(), createBlock(PromotionChangeCard_default, {
					key: resource.key,
					resource,
					graph: __props.graph,
					direction: __props.direction,
					selection: check(resource),
					entry: __props.entries.get(resource.key),
					inspected: __props.inspectedKey === resource.key,
					blockers: unref(blockersOf)(__props.blockers, resource),
					"diff-active": activeWorkflow.value === resource.key,
					selectable: __props.selectable,
					onActivateDiff: ($event) => activeWorkflow.value = resource.key,
					onDeactivateDiff: _cache[0] || (_cache[0] = ($event) => activeWorkflow.value = void 0),
					onInspect: _cache[1] || (_cache[1] = ($event) => emit("inspect", $event)),
					onToggle: ($event) => onToggle(resource),
					onRetry: ($event) => emit("retry", resource.key),
					onRefresh: _cache[2] || (_cache[2] = ($event) => emit("refresh"))
				}, null, 8, [
					"resource",
					"graph",
					"direction",
					"selection",
					"entry",
					"inspected",
					"blockers",
					"diff-active",
					"selectable",
					"onActivateDiff",
					"onToggle",
					"onRetry"
				]);
			}), 128))], 2);
		};
	}
}), [["__cssModules", { "$style": { list: "_list_17cy6_1" } }]]);
//#endregion
//#region ../../modules/promotions/frontend/src/components/preview/PromotionResourceTree.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = ["data-resource-key"];
var _hoisted_2 = ["aria-current", "onClick"];
var _hoisted_3 = ["aria-label"];
var PromotionResourceTree_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PromotionResourceTree",
	props: {
		tree: {},
		graph: {},
		selected: {},
		inclusion: {},
		includedChanges: {},
		totalChanges: {},
		inspectedKey: {},
		disabled: {},
		locked: { type: Boolean },
		direction: {},
		blockers: {},
		selectable: {
			type: Boolean,
			default: true
		}
	},
	emits: [
		"toggle",
		"toggleContainer",
		"selectAll",
		"clear",
		"inspect",
		"showBlockers"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const { blockerMessage, selectLabel } = usePromotionPreviewLabels();
		function markers(resource) {
			const blockers = blockersOf(props.blockers, resource);
			const blocked = blockerMessage(resource, blockers);
			const meta = resource.type !== "workflow" && blockers?.some(({ kind }) => kind === "warning") ? i18n.baseText("promotions.preview.marker.warning") : void 0;
			return {
				blocked,
				meta: blocked ? void 0 : meta
			};
		}
		const rows = computed(() => flattenPreviewTree(props.tree).map(({ item, indent }) => {
			const resource = props.graph.resources.get(item.id);
			return {
				item,
				indent,
				resource,
				check: resource ? selectionCheck(props.graph, resource, {
					selected: props.selected,
					inclusion: props.inclusion,
					disabled: props.disabled,
					locked: props.locked
				}) : void 0,
				marker: resource ? markers(resource) : void 0
			};
		}));
		const available = computed(() => availableKeys(props.graph, props.disabled));
		const allState = computed(() => {
			if (props.selected.size === 0) return "unchecked";
			return available.value.every((key) => props.selected.has(key)) ? "checked" : "indeterminate";
		});
		function onToggle(resource) {
			if (isContainer(resource)) emit("toggleContainer", resource.key);
			else emit("toggle", resource.key);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.tree),
				"data-test-id": "promotion-preview-tree"
			}, [__props.selectable ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.row)
			}, [createVNode(unref(Checkbox_default), {
				"model-value": allState.value === "checked",
				indeterminate: allState.value === "indeterminate",
				disabled: __props.locked || available.value.length === 0 && allState.value === "unchecked",
				"aria-label": unref(i18n).baseText("promotions.preview.tree.selectAll"),
				"data-test-id": "promotion-preview-select-all",
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => allState.value === "checked" ? emit("clear") : emit("selectAll"))
			}, null, 8, [
				"model-value",
				"indeterminate",
				"disabled",
				"aria-label"
			]), createVNode(unref(N8nText_default), {
				step: "xs",
				color: "text-base",
				"data-test-id": "promotion-preview-counts"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("promotions.preview.tree.selectedOfTotal", {
					adjustToNumber: __props.totalChanges,
					interpolate: {
						selected: String(__props.includedChanges),
						total: String(__props.totalChanges)
					}
				})), 1)]),
				_: 1
			})], 2)) : createCommentVNode("", true), createBaseVNode("ul", {
				class: normalizeClass(_ctx.$style.list),
				role: "list"
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(rows.value, ({ item, indent, resource, check, marker }) => {
				return openBlock(), createElementBlock(Fragment, { key: item.id }, [item.kind === "section" ? (openBlock(), createElementBlock("li", {
					key: 0,
					class: normalizeClass(_ctx.$style.heading)
				}, [createVNode(unref(N8nText_default), {
					step: "2xs",
					bold: "",
					color: "text-base"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(item.label), 1)]),
					_: 2
				}, 1024)], 2)) : resource && check && marker ? (openBlock(), createElementBlock("li", {
					key: 1,
					class: normalizeClass([
						_ctx.$style.row,
						_ctx.$style.resource,
						{
							[_ctx.$style.inspected]: __props.inspectedKey === item.id,
							[_ctx.$style.blocked]: marker.blocked
						}
					]),
					"data-test-id": "promotion-preview-tree-row",
					"data-resource-key": item.id
				}, [
					__props.selectable ? (openBlock(), createBlock(unref(Checkbox_default), {
						key: 0,
						"model-value": check.checked,
						indeterminate: check.indeterminate,
						disabled: check.disabled,
						"aria-label": unref(selectLabel)(resource),
						"data-test-id": "promotion-preview-tree-checkbox",
						"onUpdate:modelValue": ($event) => onToggle(resource)
					}, null, 8, [
						"model-value",
						"indeterminate",
						"disabled",
						"aria-label",
						"onUpdate:modelValue"
					])) : createCommentVNode("", true),
					createBaseVNode("button", {
						type: "button",
						class: normalizeClass(_ctx.$style.name),
						style: normalizeStyle({ "--preview-tree--indent": indent }),
						"aria-current": __props.inspectedKey === item.id ? "true" : void 0,
						onClick: ($event) => emit("inspect", item.id)
					}, [item.icon ? (openBlock(), createBlock(unref(N8nIcon_default), {
						key: 0,
						icon: item.icon,
						size: "small",
						class: normalizeClass(_ctx.$style.icon)
					}, null, 8, ["icon", "class"])) : createCommentVNode("", true), createBaseVNode("span", { class: normalizeClass(_ctx.$style.text) }, [createVNode(unref(N8nText_default), {
						step: "xs",
						color: "text-dark",
						class: normalizeClass(_ctx.$style.label)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(item.label), 1)]),
						_: 2
					}, 1032, ["class"]), marker.meta ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						step: "2xs",
						color: "text-light",
						class: normalizeClass(_ctx.$style.meta)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(marker.meta), 1)]),
						_: 2
					}, 1032, ["class"])) : createCommentVNode("", true)], 2)], 14, _hoisted_2),
					marker.blocked ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 1,
						placement: "right",
						"as-child": ""
					}, {
						content: withCtx(() => [createTextVNode(toDisplayString(marker.blocked), 1)]),
						default: withCtx(() => [__props.direction === "apply" ? (openBlock(), createBlock(unref(N8nButton_default), {
							key: 0,
							variant: "ghost",
							size: "xsmall",
							"icon-only": "",
							"aria-label": marker.blocked,
							"data-test-id": "promotion-preview-tree-blocker",
							onClick: _cache[1] || (_cache[1] = ($event) => emit("showBlockers"))
						}, {
							icon: withCtx(() => [createVNode(unref(N8nIcon_default), {
								icon: "circle-alert",
								size: "small",
								color: "warning"
							})]),
							_: 1
						}, 8, ["aria-label"])) : (openBlock(), createElementBlock("span", {
							key: 1,
							role: "img",
							tabindex: "0",
							"aria-label": marker.blocked,
							class: normalizeClass(_ctx.$style.blockerMarker),
							"data-test-id": "promotion-preview-tree-blocker"
						}, [createVNode(unref(N8nIcon_default), {
							icon: "circle-alert",
							size: "small",
							color: "warning"
						})], 10, _hoisted_3))]),
						_: 2
					}, 1024)) : createCommentVNode("", true)
				], 10, _hoisted_1)) : createCommentVNode("", true)], 64);
			}), 128))], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	tree: "_tree_9gi87_1",
	list: "_list_9gi87_10",
	row: "_row_9gi87_16",
	resource: "_resource_9gi87_27",
	inspected: "_inspected_9gi87_31",
	blocked: "_blocked_9gi87_36",
	heading: "_heading_9gi87_40",
	name: "_name_9gi87_51",
	icon: "_icon_9gi87_70",
	text: "_text_9gi87_75",
	label: "_label_9gi87_82",
	blockerMarker: "_blockerMarker_9gi87_88",
	meta: "_meta_9gi87_97"
} }]]);
//#endregion
export { crossProjectMoveBlockers as a, listBlockers as c, touchesDestructiveChange as d, usePromotionResourceDetails as f, usePromotionPreviewLabels as i, scopeCheck as l, PromotionChangeCards_default as n, indexBlockers as o, PromotionWorkflowLinks_default as r, isBlocking as s, PromotionResourceTree_default as t, toOperationRequest as u };
