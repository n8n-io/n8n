import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Nf as init_reactivity_esm_bundler, Rd as computed, Vf as ref } from "./vendor-Hx42-oQF.js";
import { t as require_orderBy } from "./orderBy-qvd4mxOh.js";
import { n as buildWorkflowTreeRows } from "./sourceControl.utils-wyA1x_2k.js";
//#region src/features/integrations/sourceControl.ee/composables/useSourceControlFileList.ts
var import_orderBy = /* @__PURE__ */ __toESM(require_orderBy(), 1);
init_runtime_core_esm_bundler();
function useSourceControlFileList({ files, sortBy, sortOrder, filter }) {
	return computed(() => {
		const filtered = filter ? files.value.filter(filter) : files.value;
		return (0, import_orderBy.default)(filtered, sortBy, sortOrder);
	});
}
//#endregion
//#region src/features/integrations/sourceControl.ee/composables/useWorkflowTreeRows.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function useWorkflowTreeRows(workflows) {
	const collapsedFolderIds = ref(/* @__PURE__ */ new Set());
	const workflowTreeRows = computed(() => buildWorkflowTreeRows(workflows.value));
	const visibleWorkflowRows = computed(() => {
		const visibleRows = [];
		const collapsedDepths = [];
		for (const row of workflowTreeRows.value) {
			while (collapsedDepths.length && row.depth <= collapsedDepths[collapsedDepths.length - 1]) collapsedDepths.pop();
			if (collapsedDepths.length) continue;
			visibleRows.push(row);
			if (row.type === "folder" && collapsedFolderIds.value.has(row.id)) collapsedDepths.push(row.depth);
		}
		return visibleRows;
	});
	function isFolderCollapsed(folderId) {
		return collapsedFolderIds.value.has(folderId);
	}
	function toggleFolderCollapse(folderId) {
		if (collapsedFolderIds.value.has(folderId)) {
			collapsedFolderIds.value.delete(folderId);
			return;
		}
		collapsedFolderIds.value.add(folderId);
	}
	function expandFolders(folderIds) {
		for (const folderId of folderIds) collapsedFolderIds.value.delete(folderId);
	}
	function getAncestorFolderIdsForWorkflow(workflowId) {
		const ancestorStack = [];
		for (const row of workflowTreeRows.value) {
			while (ancestorStack.length && row.depth <= ancestorStack[ancestorStack.length - 1].depth) ancestorStack.pop();
			if (row.type === "folder") {
				ancestorStack.push({
					id: row.id,
					depth: row.depth
				});
				continue;
			}
			if (row.file.id === workflowId) return ancestorStack.map(({ id }) => id);
		}
		return [];
	}
	return {
		collapsedFolderIds,
		workflowTreeRows,
		visibleWorkflowRows,
		isFolderCollapsed,
		toggleFolderCollapse,
		expandFolders,
		getAncestorFolderIdsForWorkflow
	};
}
//#endregion
export { useSourceControlFileList as n, useWorkflowTreeRows as t };
