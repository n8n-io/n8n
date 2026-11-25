import { $d as init_runtime_core_esm_bundler, $u as useStorage, Bd as createBlock, Df as withCtx, Ef as watchEffect, Gd as createTextVNode, Gf as toRaw, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Md as withKeys, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, af as onBeforeMount, b as script, cd as refDebounced, ff as openBlock, if as nextTick, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, rf as mergeProps, x as script$1, yp as normalizeStyle, zd as createBaseVNode, zf as reactive } from "./vendor-Hx42-oQF.js";
import { Kj as N8nNotice_default, LM as N8nCallout_default, Nj as N8nPopover_default, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, _C as useUsersStore, _E as SOURCE_CONTROL_FILE_LOCATION, _M as Checkbox_default, _N as N8nText_default, bd as useLoadingService, bm as useSourceControlStore, cN as Input_default, dC as useToast, fC as VIEWS, fN as N8nTooltip_default, fT as ROLE, gM as N8nInputLabel_default, gm as useAvailableProjectSearch, hC as useTelemetry, hM as N8nLink_default, h_ as SOURCE_CONTROL_PUSH_MODAL_KEY, jN as useI18n, lm as ResourceType, mM as N8nOption_default, nD as getResourcePermissions, nN as N8nBadge_default, pM as N8nSelect_default, tM as N8nInfoTip_default, vE as SOURCE_CONTROL_FILE_STATUS, vN as N8nIconButton_default, vm as useProjectsStore, xN as N8nIcon_default, yC as useSettingsStore, yE as SOURCE_CONTROL_FILE_TYPE, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
import { t as ProjectSharing_default } from "./ProjectSharing-CHLhYej8.js";
import { t as ProjectCardBadge_default } from "./ProjectCardBadge-OjdBsJc2.js";
import { c as getStatusTheme, o as getPushPriorityByStatus, r as formatSourceControlUpdatedAt, s as getStatusText, t as buildFolderFilterOptions } from "./sourceControl.utils-wyA1x_2k.js";
import { n as useSourceControlFileList, t as useWorkflowTreeRows } from "./useWorkflowTreeRows-BRGgmyBz.js";
//#region src/features/integrations/sourceControl.ee/composables/useRevealWorkflowInScroller.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function useRevealWorkflowInScroller({ visibleWorkflowRows, workflowScroller, activeTab, workflowTabValue, currentWorkflowId, isLoading, expandAncestorFolders }) {
	const hasScrolledCurrentWorkflow = ref(false);
	const isRevealInProgress = ref(false);
	function getCurrentWorkflowRowElement(workflowId) {
		const scrollerRoot = workflowScroller.value?.$el;
		if (!(scrollerRoot instanceof Element)) return null;
		return scrollerRoot.querySelector(`[data-workflow-id="${workflowId}"]`);
	}
	async function revealAndScrollToCurrentWorkflow() {
		const isWorkflowTab = activeTab.value === workflowTabValue;
		if (isRevealInProgress.value || hasScrolledCurrentWorkflow.value || !isWorkflowTab || !currentWorkflowId.value || isLoading.value) return;
		isRevealInProgress.value = true;
		try {
			expandAncestorFolders(currentWorkflowId.value);
			for (let attempt = 0; attempt < 6; attempt++) {
				if (attempt > 0) await nextTick();
				const visibleIndex = visibleWorkflowRows.value.findIndex((row) => row.type === "file" && row.file.id === currentWorkflowId.value);
				const scroller = workflowScroller.value;
				if (visibleIndex >= 0 && scroller) {
					scroller.scrollToItem(visibleIndex);
					const workflowRowElement = getCurrentWorkflowRowElement(currentWorkflowId.value);
					if (!workflowRowElement) continue;
					workflowRowElement.scrollIntoView({
						block: "center",
						inline: "nearest"
					});
					hasScrolledCurrentWorkflow.value = true;
					return;
				}
			}
		} finally {
			isRevealInProgress.value = false;
		}
	}
	return { revealAndScrollToCurrentWorkflow };
}
//#endregion
//#region src/features/integrations/sourceControl.ee/components/SourceControlPushModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = {
	key: 0,
	class: "mt-s"
};
var _hoisted_2 = { style: {
	"display": "flex",
	"height": "100%"
} };
var _hoisted_3 = ["data-test-id", "onClick"];
var _hoisted_4 = { style: { "flex": "1" } };
var _hoisted_5 = { style: {
	"flex": "1",
	"overflow": "hidden"
} };
var _hoisted_6 = ["onClick"];
var _hoisted_7 = ["data-workflow-id"];
var _hoisted_8 = { key: 0 };
var SourceControlPushModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SourceControlPushModal",
	props: { data: {} },
	setup(__props) {
		const props = __props;
		const loadingService = useLoadingService();
		const toast = useToast();
		const i18n = useI18n();
		const sourceControlStore = useSourceControlStore();
		const projectsStore = useProjectsStore();
		const route = useRoute();
		const router = useRouter();
		const telemetry = useTelemetry();
		const usersStore = useUsersStore();
		const settingsStore = useSettingsStore();
		const isWorkflowDiffsEnabled = computed(() => settingsStore.settings.enterprise.workflowDiffs);
		const status = ref(props.data.status ?? []);
		const isLoading = ref(false);
		async function loadSourceControlStatus() {
			if (isLoading.value) return;
			isLoading.value = true;
			loadingService.startLoading();
			loadingService.setLoadingText(i18n.baseText("settings.sourceControl.loading.checkingForChanges"));
			try {
				const freshStatus = await sourceControlStore.getAggregatedStatus();
				if (!freshStatus.length) {
					toast.showMessage({
						title: i18n.baseText("settings.sourceControl.modals.push.noChanges.title"),
						message: i18n.baseText("settings.sourceControl.modals.push.everythingIsUpToDate"),
						type: "info"
					});
					close();
					return;
				}
				status.value = freshStatus;
				freshStatus.forEach((file) => {
					if (file.type === "credential") selectedCredentials.add(file.id);
					if (file.type === "datatable") selectedDataTables.add(file.id);
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("error"));
				close();
			} finally {
				loadingService.stopLoading();
				loadingService.setLoadingText(i18n.baseText("genericHelpers.loading"));
				isLoading.value = false;
			}
		}
		const projectAdminCalloutDismissed = useStorage("SOURCE_CONTROL_PROJECT_ADMIN_CALLOUT_DISMISSED", false, localStorage);
		const searchFnForFilters = useAvailableProjectSearch();
		const filterFnForFilters = (project) => Boolean(getResourcePermissions(project.scopes)?.sourceControl?.push);
		onBeforeMount(async () => {
			await projectsStore.getAvailableProjects();
		});
		const concatenateWithAnd = (messages) => new Intl.ListFormat(i18n.locale, {
			style: "long",
			type: "conjunction"
		}).format(messages);
		const classifyFilesByType = (files, currentWorkflowId) => files.reduce((acc, file) => {
			const project = projectsStore.availableProjects.find(({ id }) => id === file.owner?.projectId);
			if (file.location === SOURCE_CONTROL_FILE_LOCATION.remote && file.type === SOURCE_CONTROL_FILE_TYPE.workflow && file.status === SOURCE_CONTROL_FILE_STATUS.created) return acc;
			if (file.type === SOURCE_CONTROL_FILE_TYPE.variables) {
				acc.variables.push({
					...file,
					project
				});
				return acc;
			}
			if (file.type === SOURCE_CONTROL_FILE_TYPE.datatable) {
				acc.datatable.push({
					...file,
					project
				});
				return acc;
			}
			if (file.type === SOURCE_CONTROL_FILE_TYPE.tags) {
				acc.tags.push({
					...file,
					project
				});
				return acc;
			}
			if (file.type === SOURCE_CONTROL_FILE_TYPE.folders) {
				acc.folders.push({
					...file,
					project
				});
				return acc;
			}
			if (file.type === SOURCE_CONTROL_FILE_TYPE.workflow && currentWorkflowId === file.id) acc.currentWorkflow = {
				...file,
				project
			};
			if (file.type === SOURCE_CONTROL_FILE_TYPE.workflow) {
				acc.workflow.push({
					...file,
					project
				});
				return acc;
			}
			if (file.type === SOURCE_CONTROL_FILE_TYPE.credential) {
				acc.credential.push({
					...file,
					project
				});
				return acc;
			}
			if (file.type === SOURCE_CONTROL_FILE_TYPE.project) {
				acc.projects.push({
					...file,
					project
				});
				return acc;
			}
			return acc;
		}, {
			tags: [],
			variables: [],
			datatable: [],
			credential: [],
			workflow: [],
			folders: [],
			projects: [],
			currentWorkflow: void 0
		});
		const userNotices = computed(() => {
			const messages = [];
			if (changes.value.variables.length) messages.push({
				title: "Variables",
				content: "at least one new or modified"
			});
			if (changes.value.tags.length) messages.push({
				title: "Tags",
				content: "at least one new or modified"
			});
			if (changes.value.folders.length) messages.push({
				title: "Folders",
				content: "at least one new or modified"
			});
			if (changes.value.projects.length) messages.push({
				title: "Projects",
				content: "at least one new or modified"
			});
			return messages;
		});
		const hasModifiedCredentialsSelected = computed(() => {
			return changes.value.credential.some((credential) => selectedCredentials.has(credential.id) && credential.status === "modified");
		});
		const workflowId = computed(() => [VIEWS.WORKFLOW].includes(route.name) && route.params.workflowId?.toString() || void 0);
		const changes = computed(() => classifyFilesByType(status.value, workflowId.value));
		const selectedWorkflows = reactive(/* @__PURE__ */ new Set());
		const maybeSelectCurrentWorkflow = (workflow) => workflow && selectedWorkflows.add(workflow.id);
		const filters = ref({
			project: null,
			folder: ""
		});
		const filtersApplied = computed(() => Boolean(search.value) || Boolean(Object.values(filters.value).filter(Boolean).length));
		const resetFilters = () => {
			filters.value = {
				project: null,
				folder: ""
			};
			search.value = "";
		};
		function clearProjectFilter() {
			filters.value.project = null;
		}
		const statusFilterOptions = [
			{
				label: i18n.baseText("generic.new"),
				value: SOURCE_CONTROL_FILE_STATUS.created
			},
			{
				label: "Modified",
				value: SOURCE_CONTROL_FILE_STATUS.modified
			},
			{
				label: "Deleted",
				value: SOURCE_CONTROL_FILE_STATUS.deleted
			}
		];
		const search = ref("");
		const debouncedSearch = refDebounced(search, 250);
		const filterCount = computed(() => Object.values(filters.value).reduce((acc, item) => item ? acc + 1 : acc, 0));
		const folderFilterOptions = computed(() => buildFolderFilterOptions(changes.value.workflow));
		const sortedWorkflows = useSourceControlFileList({
			files: computed(() => changes.value.workflow),
			sortBy: [
				({ folderPath }) => folderPath?.join("/") ?? "",
				({ status }) => getPushPriorityByStatus(status),
				"updatedAt"
			],
			sortOrder: [
				"asc",
				"asc",
				"desc"
			],
			filter: (workflow) => {
				const searchQuery = debouncedSearch.value.toLocaleLowerCase().trim();
				const nameMatches = workflow.name.toLocaleLowerCase().includes(searchQuery);
				const folderPathMatches = (workflow.folderPath ?? []).some((segment) => segment.toLocaleLowerCase().includes(searchQuery));
				if (searchQuery && !nameMatches && !folderPathMatches) return false;
				if (filters.value.project && workflow.project?.id !== filters.value.project.id) return false;
				if (filters.value.status && filters.value.status !== workflow.status) return false;
				const folderFilter = filters.value.folder?.trim();
				if (!folderFilter) return true;
				const matchesFolder = (path) => {
					const workflowPath = (path ?? []).join("/");
					return workflowPath === folderFilter || workflowPath.startsWith(`${folderFilter}/`);
				};
				return matchesFolder(workflow.folderPath) || matchesFolder(workflow.remoteFolderPath);
			}
		});
		const activeTab = ref(SOURCE_CONTROL_FILE_TYPE.workflow);
		const workflowScroller = ref(null);
		const { workflowTreeRows, visibleWorkflowRows, isFolderCollapsed, toggleFolderCollapse, expandFolders, getAncestorFolderIdsForWorkflow } = useWorkflowTreeRows(sortedWorkflows);
		const { revealAndScrollToCurrentWorkflow } = useRevealWorkflowInScroller({
			visibleWorkflowRows,
			workflowScroller,
			activeTab,
			workflowTabValue: SOURCE_CONTROL_FILE_TYPE.workflow,
			currentWorkflowId: computed(() => changes.value.currentWorkflow?.id),
			isLoading,
			expandAncestorFolders: (workflowId) => {
				expandFolders(getAncestorFolderIdsForWorkflow(workflowId));
			}
		});
		const folderChildrenMap = computed(() => {
			const childrenByFolderId = /* @__PURE__ */ new Map();
			const rows = workflowTreeRows.value;
			for (const [index, row] of rows.entries()) {
				if (row.type !== "folder") continue;
				const childWorkflowIds = [];
				for (let next = index + 1; next < rows.length; next++) {
					const candidate = rows[next];
					if (candidate.depth <= row.depth) break;
					if (candidate.type === "file") childWorkflowIds.push(candidate.file.id);
				}
				childrenByFolderId.set(row.id, childWorkflowIds);
			}
			return childrenByFolderId;
		});
		const selectedCredentials = reactive(/* @__PURE__ */ new Set());
		const selectedDataTables = reactive(/* @__PURE__ */ new Set());
		const sortedCredentials = useSourceControlFileList({
			files: computed(() => changes.value.credential),
			sortBy: [({ status }) => getPushPriorityByStatus(status), "updatedAt"],
			sortOrder: ["asc", "desc"],
			filter: (credential) => {
				const searchQuery = debouncedSearch.value.toLocaleLowerCase().trim();
				if (searchQuery && !credential.name.toLocaleLowerCase().includes(searchQuery)) return false;
				if (filters.value.project && credential.project?.id !== filters.value.project.id) return false;
				if (filters.value.status && filters.value.status !== credential.status) return false;
				return true;
			}
		});
		const sortedDataTables = useSourceControlFileList({
			files: computed(() => changes.value.datatable),
			sortBy: [({ status }) => getPushPriorityByStatus(status), "updatedAt"],
			sortOrder: ["asc", "desc"],
			filter: (dataTable) => {
				const searchQuery = debouncedSearch.value.toLocaleLowerCase().trim();
				if (searchQuery && !dataTable.name.toLocaleLowerCase().includes(searchQuery)) return false;
				if (filters.value.project && dataTable.project?.id !== filters.value.project.id) return false;
				if (filters.value.status && filters.value.status !== dataTable.status) return false;
				return true;
			}
		});
		const commitMessage = ref("");
		const isSubmitDisabled = computed(() => {
			if (!commitMessage.value.trim()) return true;
			return selectedCredentials.size + selectedDataTables.size + changes.value.tags.length + changes.value.variables.length + changes.value.folders.length + changes.value.projects.length + selectedWorkflows.size <= 0;
		});
		const selectAllIndeterminate = computed(() => {
			if (!activeSelection.value.size) return false;
			if (toRaw(activeSelection.value).intersection(new Set(activeDataSourceFiltered.value.map(({ id }) => id))).size === 0) return false;
			return !allVisibleItemsSelected.value;
		});
		const selectedCount = computed(() => selectedWorkflows.size + selectedCredentials.size + selectedDataTables.size);
		function onToggleSelectAll() {
			if (allVisibleItemsSelected.value) {
				const diff = toRaw(activeSelection.value).difference(new Set(activeDataSourceFiltered.value.map(({ id }) => id)));
				activeSelection.value.clear();
				diff.forEach((id) => activeSelection.value.add(id));
			} else activeDataSourceFiltered.value.forEach((file) => activeSelection.value.add(file.id));
		}
		function close() {
			router.back();
		}
		function renderUpdatedAt(file) {
			return formatSourceControlUpdatedAt(file.updatedAt);
		}
		function renderMovedTooltip(file) {
			const to = (file.folderPath ?? []).join("/");
			const from = (file.remoteFolderPath ?? []).join("/");
			if (file.remoteFolderPath === void 0 || from === to) return "";
			return i18n.baseText("settings.sourceControl.modals.push.movedWorkflow", { interpolate: {
				from: from || "/",
				to: to || "/"
			} });
		}
		async function onCommitKeyDownEnter() {
			if (!isSubmitDisabled.value) await commitAndPush();
		}
		const successNotificationMessage = () => {
			const messages = [];
			if (selectedWorkflows.size) messages.push(i18n.baseText("generic.workflow", {
				adjustToNumber: selectedWorkflows.size,
				interpolate: { count: selectedWorkflows.size }
			}));
			if (selectedCredentials.size) messages.push(i18n.baseText("generic.credential", {
				adjustToNumber: selectedCredentials.size,
				interpolate: { count: selectedCredentials.size }
			}));
			if (changes.value.variables.length) messages.push(i18n.baseText("generic.variable_plural"));
			if (selectedDataTables.size) messages.push(i18n.baseText("generic.datatable", {
				adjustToNumber: selectedDataTables.size,
				interpolate: { count: selectedDataTables.size }
			}));
			if (changes.value.folders.length) messages.push(i18n.baseText("generic.folders_plural"));
			if (changes.value.tags.length) messages.push(i18n.baseText("generic.tag_plural"));
			if (changes.value.projects.length) messages.push(i18n.baseText("generic.projects"));
			const totalCount = selectedWorkflows.size + selectedCredentials.size + changes.value.variables.length + selectedDataTables.size + changes.value.folders.length + changes.value.tags.length + changes.value.projects.length;
			return [concatenateWithAnd(messages), i18n.baseText("settings.sourceControl.modals.push.success.description", { adjustToNumber: totalCount })].join(" ");
		};
		async function commitAndPush() {
			const files = changes.value.tags.concat(changes.value.variables).concat(changes.value.datatable.filter((file) => selectedDataTables.has(file.id))).concat(changes.value.credential.filter((file) => selectedCredentials.has(file.id))).concat(changes.value.folders).concat(changes.value.projects).concat(changes.value.workflow.filter((file) => selectedWorkflows.has(file.id)));
			loadingService.startLoading(i18n.baseText("settings.sourceControl.loading.push"));
			close();
			try {
				await sourceControlStore.pushWorkfolder({
					force: true,
					commitMessage: commitMessage.value,
					fileNames: files
				});
				toast.showToast({
					title: i18n.baseText("settings.sourceControl.modals.push.success.title"),
					message: successNotificationMessage(),
					type: "success"
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("error"));
			} finally {
				loadingService.stopLoading();
			}
		}
		const modalHeight = computed(() => changes.value.workflow.length ? "min(80vh, 850px)" : "auto");
		watch(() => filters.value.status, (status) => {
			telemetry.track("User filtered by status in commit modal", { status });
		});
		watch(refDebounced(search, 500), (term) => {
			telemetry.track("User searched workflows in commit modal", { search: term });
		});
		const allVisibleItemsSelected = computed(() => {
			if (!activeSelection.value.size) return false;
			if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.workflow) {
				const workflowsSet = new Set(sortedWorkflows.value.map(({ id }) => id));
				if (!workflowsSet.size) return false;
				return !workflowsSet.difference(toRaw(activeSelection.value)).size;
			}
			if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.credential) {
				const credentialsSet = new Set(sortedCredentials.value.map(({ id }) => id));
				if (!credentialsSet.size) return false;
				return !credentialsSet.difference(toRaw(activeSelection.value)).size;
			}
			if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.datatable) {
				const dataTablesSet = new Set(sortedDataTables.value.map(({ id }) => id));
				if (!dataTablesSet.size) return false;
				return !dataTablesSet.difference(toRaw(activeSelection.value)).size;
			}
			return false;
		});
		function toggleSelected(id) {
			if (activeSelection.value.has(id)) activeSelection.value.delete(id);
			else activeSelection.value.add(id);
		}
		function isFolderSelected(folderId) {
			const folderChildren = folderChildrenMap.value.get(folderId) ?? [];
			if (!folderChildren.length) return false;
			return folderChildren.every((childId) => selectedWorkflows.has(childId));
		}
		function isFolderSelectionIndeterminate(folderId) {
			const folderChildren = folderChildrenMap.value.get(folderId) ?? [];
			if (!folderChildren.length) return false;
			const selectedChildrenCount = folderChildren.filter((childId) => selectedWorkflows.has(childId)).length;
			return selectedChildrenCount > 0 && selectedChildrenCount < folderChildren.length;
		}
		function toggleFolderSelection(folderId) {
			const folderChildren = folderChildrenMap.value.get(folderId) ?? [];
			if (!folderChildren.length) return;
			if (isFolderSelected(folderId)) {
				folderChildren.forEach((childId) => selectedWorkflows.delete(childId));
				return;
			}
			folderChildren.forEach((childId) => selectedWorkflows.add(childId));
		}
		const activeDataSource = computed(() => {
			if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.workflow) return changes.value.workflow;
			if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.credential) return changes.value.credential;
			if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.datatable) return changes.value.datatable;
			return [];
		});
		const activeDataSourceFiltered = computed(() => {
			if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.workflow) return sortedWorkflows.value;
			if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.credential) return sortedCredentials.value;
			if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.datatable) return sortedDataTables.value;
			return [];
		});
		const activeRows = computed(() => {
			if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.workflow) return visibleWorkflowRows.value;
			return activeDataSourceFiltered.value.map((file) => ({
				id: `file:${file.id}`,
				type: "file",
				file,
				depth: 0
			}));
		});
		const activeEntityLocale = computed(() => {
			if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.workflow) return "generic.workflows";
			if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.credential) return "generic.credentials";
			return "generic.datatable";
		});
		const activeSelection = computed(() => {
			if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.workflow) return selectedWorkflows;
			if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.credential) return selectedCredentials;
			if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.datatable) return selectedDataTables;
			return /* @__PURE__ */ new Set();
		});
		const tabs = computed(() => {
			return [
				{
					label: i18n.baseText("settings.sourceControl.modals.tabs.workflows"),
					value: SOURCE_CONTROL_FILE_TYPE.workflow,
					selected: selectedWorkflows.size,
					total: changes.value.workflow.length
				},
				{
					label: i18n.baseText("settings.sourceControl.modals.tabs.credentials"),
					value: SOURCE_CONTROL_FILE_TYPE.credential,
					selected: selectedCredentials.size,
					total: changes.value.credential.length
				},
				{
					label: i18n.baseText("settings.sourceControl.modals.tabs.dataTables"),
					value: SOURCE_CONTROL_FILE_TYPE.datatable,
					selected: selectedDataTables.size,
					total: changes.value.datatable.length
				}
			];
		});
		const filtersNoResultText = computed(() => {
			if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.workflow) return i18n.baseText("workflows.noResults");
			if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.credential) return i18n.baseText("credentials.noResults");
			if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.datatable) return i18n.baseText("dataTables.noResults");
			return i18n.baseText("workflows.noResults");
		});
		function castType(type) {
			if (type === SOURCE_CONTROL_FILE_TYPE.workflow) return ResourceType.Workflow;
			return ResourceType.Credential;
		}
		function castProject(project) {
			return {
				homeProject: project,
				id: "",
				name: "",
				active: false,
				activeVersionId: null,
				createdAt: "",
				updatedAt: "",
				isArchived: false,
				readOnly: false,
				resourceType: "workflow",
				sharedWithProjects: []
			};
		}
		function openDiffModal(id, workflowStatus) {
			telemetry.track("User clicks compare workflows", {
				workflow_id: id,
				context: "source_control_push"
			});
			router.push({ query: {
				...route.query,
				diff: id,
				workflowStatus,
				direction: "push"
			} });
		}
		watchEffect(() => {
			if (changes.value.currentWorkflow && !selectedWorkflows.has(changes.value.currentWorkflow.id)) maybeSelectCurrentWorkflow(changes.value.currentWorkflow);
		});
		watch([
			() => changes.value.currentWorkflow?.id,
			() => activeTab.value,
			() => visibleWorkflowRows.value.length,
			() => workflowScroller.value,
			() => isLoading.value
		], () => {
			revealAndScrollToCurrentWorkflow();
		}, {
			immediate: true,
			flush: "post"
		});
		onMounted(async () => {
			await loadSourceControlStatus();
		});
		return (_ctx, _cache) => {
			return !isLoading.value ? (openBlock(), createBlock(Modal_default, {
				key: 0,
				width: "812px",
				"event-bus": __props.data.eventBus,
				name: unref(SOURCE_CONTROL_PUSH_MODAL_KEY),
				height: modalHeight.value,
				"custom-class": _ctx.$style.sourceControlPush,
				"before-close": close
			}, {
				header: withCtx(() => [
					createVNode(unref(N8nHeading_default), {
						tag: "h1",
						size: "xlarge"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.push.title")), 1)]),
						_: 1
					}),
					changes.value.workflow.length || changes.value.credential.length || changes.value.datatable.length ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass([[_ctx.$style.filtersRow], "mt-l"])
					}, [createBaseVNode("div", { class: normalizeClass([_ctx.$style.filters]) }, [createVNode(unref(Input_default), {
						modelValue: search.value,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => search.value = $event),
						"data-test-id": "source-control-push-search",
						placeholder: unref(i18n).baseText("settings.sourceControl.modals.push.search.placeholder"),
						clearable: "",
						style: { "width": "234px" }
					}, {
						prefix: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "search" })]),
						_: 1
					}, 8, ["modelValue", "placeholder"]), createVNode(unref(N8nPopover_default), {
						width: "304px",
						"content-class": _ctx.$style["popover-content"],
						style: { "align-self": "normal" },
						"z-index": "2000"
					}, {
						trigger: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "outline",
							icon: "funnel",
							class: normalizeClass(_ctx.$style.filterButton),
							active: Boolean(filterCount.value),
							"data-test-id": "source-control-filter-dropdown"
						}, {
							default: withCtx(() => [filterCount.value ? (openBlock(), createBlock(unref(N8nBadge_default), {
								key: 0,
								variant: "primary",
								class: "mr-4xs"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(filterCount.value), 1)]),
								_: 1
							})) : createCommentVNode("", true)]),
							_: 1
						}, 8, ["class", "active"])]),
						content: withCtx(() => [
							createVNode(unref(N8nInputLabel_default), {
								label: unref(i18n).baseText("workflows.filters.status"),
								bold: false,
								size: "small",
								color: "text-base",
								class: "mb-3xs"
							}, null, 8, ["label"]),
							createVNode(unref(N8nSelect_default), {
								modelValue: filters.value.status,
								"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => filters.value.status = $event),
								"data-test-id": "source-control-status-filter",
								clearable: ""
							}, {
								default: withCtx(() => [(openBlock(), createElementBlock(Fragment, null, renderList(statusFilterOptions, (option) => {
									return createVNode(unref(N8nOption_default), mergeProps({
										key: option.label,
										"data-test-id": "source-control-status-filter-option"
									}, { ref_for: true }, option), null, 16);
								}), 64))]),
								_: 1
							}, 8, ["modelValue"]),
							createVNode(unref(N8nInputLabel_default), {
								label: unref(i18n).baseText("forms.resourceFiltersDropdown.owner"),
								bold: false,
								size: "small",
								color: "text-base",
								class: "mb-3xs mt-3xs"
							}, null, 8, ["label"]),
							createVNode(ProjectSharing_default, {
								modelValue: filters.value.project,
								"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => filters.value.project = $event),
								"data-test-id": "source-control-push-modal-project-search",
								clearable: "",
								"search-fn": unref(searchFnForFilters),
								"filter-fn": filterFnForFilters,
								placeholder: unref(i18n).baseText("forms.resourceFiltersDropdown.owner.placeholder"),
								"empty-options-text": unref(i18n).baseText("projects.sharing.noMatchingProjects"),
								onClear: clearProjectFilter
							}, null, 8, [
								"modelValue",
								"search-fn",
								"placeholder",
								"empty-options-text"
							]),
							createVNode(unref(N8nInputLabel_default), {
								label: unref(i18n).baseText("generic.folder"),
								bold: false,
								size: "small",
								color: "text-base",
								class: "mb-3xs mt-3xs"
							}, null, 8, ["label"]),
							createVNode(unref(N8nSelect_default), {
								modelValue: filters.value.folder,
								"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => filters.value.folder = $event),
								"data-test-id": "source-control-folder-filter",
								clearable: "",
								filterable: "",
								placeholder: unref(i18n).baseText("generic.folder")
							}, {
								default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(folderFilterOptions.value, (option) => {
									return openBlock(), createBlock(unref(N8nOption_default), {
										key: option.value,
										label: option.label,
										value: option.value
									}, null, 8, ["label", "value"]);
								}), 128))]),
								_: 1
							}, 8, ["modelValue", "placeholder"]),
							filterCount.value ? (openBlock(), createElementBlock("div", _hoisted_1, [createVNode(unref(N8nLink_default), { onClick: resetFilters }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("forms.resourceFiltersDropdown.reset")), 1)]),
								_: 1
							})])) : createCommentVNode("", true)
						]),
						_: 1
					}, 8, ["content-class"])], 2)], 2)) : createCommentVNode("", true),
					unref(usersStore).currentUser && unref(usersStore).currentUser.role ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [unref(usersStore).currentUser.role !== unref(ROLE).Owner && unref(usersStore).currentUser.role !== unref(ROLE).Admin ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [!unref(projectAdminCalloutDismissed) ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 0,
						theme: "secondary",
						class: "mt-s"
					}, {
						trailingContent: withCtx(() => [createVNode(unref(N8nIcon_default), {
							icon: "x",
							title: unref(i18n).baseText("generic.dismiss"),
							size: "medium",
							type: "secondary",
							onClick: _cache[4] || (_cache[4] = ($event) => projectAdminCalloutDismissed.value = true)
						}, null, 8, ["title"])]),
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.push.projectAdmin.callout")) + " ", 1)]),
						_: 1
					})) : createCommentVNode("", true)], 64)) : createCommentVNode("", true)], 64)) : createCommentVNode("", true)
				]),
				content: withCtx(() => [createBaseVNode("div", _hoisted_2, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.tabs) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(tabs.value, (tab) => {
					return openBlock(), createElementBlock("button", {
						key: tab.value,
						type: "button",
						class: normalizeClass([_ctx.$style.tab, { [_ctx.$style.tabActive]: activeTab.value === tab.value }]),
						"data-test-id": `source-control-push-modal-tab-${tab.value}`,
						onClick: ($event) => activeTab.value = tab.value
					}, [createBaseVNode("div", null, toDisplayString(tab.label), 1), createVNode(unref(N8nText_default), {
						tag: "div",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.push.selectedCount", { interpolate: {
							selected: `${tab.selected}`,
							total: `${tab.total}`
						} })), 1)]),
						_: 2
					}, 1024)], 10, _hoisted_3);
				}), 128))], 2), createBaseVNode("div", _hoisted_4, [createBaseVNode("div", { class: normalizeClass([_ctx.$style.table]) }, [createBaseVNode("div", { class: normalizeClass([_ctx.$style.tableHeader]) }, [createVNode(unref(Checkbox_default), {
					class: normalizeClass(_ctx.$style.selectAll),
					indeterminate: selectAllIndeterminate.value,
					"model-value": allVisibleItemsSelected.value,
					"data-test-id": "source-control-push-modal-toggle-all",
					disabled: activeDataSourceFiltered.value.length === 0,
					"onUpdate:modelValue": onToggleSelectAll
				}, {
					label: withCtx(() => [createVNode(unref(N8nText_default), null, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.tableHeader.title")), 1)]),
						_: 1
					})]),
					_: 1
				}, 8, [
					"class",
					"indeterminate",
					"model-value",
					"disabled"
				]), filtersApplied.value ? (openBlock(), createBlock(unref(N8nInfoTip_default), {
					key: 0,
					class: normalizeClass(["p-xs", _ctx.$style.filtersApplied]),
					bold: false
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.push.filter", { interpolate: {
						count: `${activeDataSourceFiltered.value.length} / ${activeDataSource.value.length}`,
						entity: unref(i18n).baseText(activeEntityLocale.value).toLowerCase()
					} })) + " ", 1), createVNode(unref(N8nLink_default), {
						size: "small",
						"data-test-id": "source-control-filters-reset",
						onClick: resetFilters
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflows.filters.active.reset")), 1)]),
						_: 1
					})]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true)], 2), createBaseVNode("div", _hoisted_5, [!activeDataSourceFiltered.value.length ? (openBlock(), createBlock(unref(N8nInfoTip_default), {
					key: 0,
					class: "p-xs",
					bold: false
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(filtersNoResultText.value), 1)]),
					_: 1
				})) : createCommentVNode("", true), activeRows.value.length ? (openBlock(), createBlock(unref(script$1), {
					key: 1,
					ref_key: "workflowScroller",
					ref: workflowScroller,
					class: normalizeClass([_ctx.$style.scroller]),
					items: activeRows.value,
					"min-item-size": 57,
					"item-class": "scrollerItem"
				}, {
					default: withCtx(({ item: row, active, index }) => [createVNode(unref(script), {
						item: row,
						active,
						"size-dependencies": [
							row.type,
							row.type === "file" ? row.file.name : row.name,
							row.id,
							row.depth
						],
						"data-index": index
					}, {
						default: withCtx(() => [row.type === "folder" ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: normalizeClass([_ctx.$style.folderRow, { [_ctx.$style.rowNoBorder]: index === activeRows.value.length - 1 }]),
							style: normalizeStyle({ paddingLeft: `${16 + row.depth * 16}px` })
						}, [createVNode(unref(Checkbox_default), {
							class: normalizeClass(_ctx.$style.folderCheckbox),
							"data-test-id": "source-control-push-modal-folder-checkbox",
							"model-value": isFolderSelected(row.id),
							indeterminate: isFolderSelectionIndeterminate(row.id),
							"onUpdate:modelValue": ($event) => toggleFolderSelection(row.id)
						}, {
							label: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.folderLabel) }, [
								createVNode(unref(N8nIcon_default), {
									icon: "folder",
									color: "text-light",
									size: "small"
								}),
								createVNode(unref(N8nText_default), {
									tag: "span",
									color: "text-light"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(row.name), 1)]),
									_: 2
								}, 1024),
								createBaseVNode("button", {
									type: "button",
									class: normalizeClass(_ctx.$style.folderToggle),
									"data-test-id": "source-control-push-modal-folder-toggle",
									onClick: withModifiers(($event) => unref(toggleFolderCollapse)(row.id), ["stop", "prevent"]),
									onMousedown: _cache[5] || (_cache[5] = withModifiers(() => {}, ["stop", "prevent"])),
									onMouseup: _cache[6] || (_cache[6] = withModifiers(() => {}, ["stop", "prevent"])),
									onPointerdown: _cache[7] || (_cache[7] = withModifiers(() => {}, ["stop", "prevent"]))
								}, [createVNode(unref(N8nIcon_default), {
									icon: unref(isFolderCollapsed)(row.id) ? "chevron-right" : "chevron-down",
									color: "text-light",
									size: "small"
								}, null, 8, ["icon"])], 42, _hoisted_6)
							], 2)]),
							_: 2
						}, 1032, [
							"class",
							"model-value",
							"indeterminate",
							"onUpdate:modelValue"
						])], 6)) : (openBlock(), createElementBlock("div", {
							key: 1,
							class: normalizeClass([_ctx.$style.fileRow, { [_ctx.$style.rowNoBorder]: index === activeRows.value.length - 1 }]),
							style: normalizeStyle({ paddingLeft: `${row.depth * 16}px` }),
							"data-workflow-id": row.file.type === unref(SOURCE_CONTROL_FILE_TYPE).workflow ? row.file.id : void 0
						}, [createVNode(unref(Checkbox_default), {
							class: normalizeClass([_ctx.$style.listItem]),
							"data-test-id": "source-control-push-modal-file-checkbox",
							"model-value": activeSelection.value.has(row.file.id),
							"onUpdate:modelValue": ($event) => toggleSelected(row.file.id)
						}, {
							label: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.listItemContent) }, [createBaseVNode("span", null, [createVNode(unref(N8nText_default), {
								tag: "div",
								bold: "",
								color: "text-dark",
								class: normalizeClass([_ctx.$style.listItemName])
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(row.file.name || row.file.id), 1)]),
								_: 2
							}, 1032, ["class"]), row.file.updatedAt ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 0,
								tag: "p",
								class: "mt-0",
								color: "text-light",
								size: "small"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(renderUpdatedAt(row.file)), 1)]),
								_: 2
							}, 1024)) : createCommentVNode("", true)]), createBaseVNode("span", { class: normalizeClass([_ctx.$style.badges]) }, [
								changes.value.currentWorkflow && row.file.id === changes.value.currentWorkflow.id ? (openBlock(), createBlock(unref(N8nBadge_default), {
									key: 0,
									class: "mr-2xs"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.push.currentWorkflow")), 1)]),
									_: 1
								})) : createCommentVNode("", true),
								row.file.type === unref(SOURCE_CONTROL_FILE_TYPE).workflow || row.file.type === unref(SOURCE_CONTROL_FILE_TYPE).credential || row.file.type === unref(SOURCE_CONTROL_FILE_TYPE).datatable ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [row.file.project ? (openBlock(), createBlock(ProjectCardBadge_default, {
									key: 0,
									"data-test-id": "source-control-push-modal-project-badge",
									resource: castProject(row.file.project),
									"resource-type": castType(row.file.type),
									"resource-type-label": unref(i18n).baseText(`generic.${row.file.type}`).toLowerCase(),
									"personal-project": unref(projectsStore).personalProject,
									"show-badge-border": false
								}, null, 8, [
									"resource",
									"resource-type",
									"resource-type-label",
									"personal-project"
								])) : createCommentVNode("", true)], 64)) : createCommentVNode("", true),
								createVNode(unref(N8nTooltip_default), {
									content: renderMovedTooltip(row.file),
									disabled: !renderMovedTooltip(row.file),
									placement: "top"
								}, {
									default: withCtx(() => [createVNode(unref(N8nBadge_default), {
										variant: unref(getStatusTheme)(row.file.status),
										size: "xsmall"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(getStatusText)(row.file.status)), 1)]),
										_: 2
									}, 1032, ["variant"])]),
									_: 2
								}, 1032, ["content", "disabled"]),
								isWorkflowDiffsEnabled.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [row.file.type === unref(SOURCE_CONTROL_FILE_TYPE).workflow ? (openBlock(), createBlock(unref(N8nTooltip_default), {
									key: 0,
									content: unref(i18n).baseText("workflowDiff.compare"),
									placement: "top"
								}, {
									default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
										variant: "outline",
										"data-test-id": "source-control-workflow-diff-button",
										icon: "file-diff",
										onClick: ($event) => openDiffModal(row.file.id, row.file.status)
									}, null, 8, ["onClick"])]),
									_: 2
								}, 1032, ["content"])) : createCommentVNode("", true)], 64)) : createCommentVNode("", true)
							], 2)], 2)]),
							_: 2
						}, 1032, [
							"class",
							"model-value",
							"onUpdate:modelValue"
						])], 14, _hoisted_7))]),
						_: 2
					}, 1032, [
						"item",
						"active",
						"size-dependencies",
						"data-index"
					])]),
					_: 1
				}, 8, ["class", "items"])) : createCommentVNode("", true)])], 2)])])]),
				footer: withCtx(() => [
					userNotices.value.length || hasModifiedCredentialsSelected.value ? (openBlock(), createBlock(unref(N8nNotice_default), {
						key: 0,
						id: "source-control-push-modal-notice",
						compact: false,
						class: "mt-0"
					}, {
						default: withCtx(() => [userNotices.value.length ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
							createVNode(unref(N8nText_default), {
								bold: "",
								size: "medium"
							}, {
								default: withCtx(() => [..._cache[9] || (_cache[9] = [createTextVNode("Changes to variables, tags, folders and projects ", -1)])]),
								_: 1
							}),
							_cache[10] || (_cache[10] = createBaseVNode("br", null, null, -1)),
							(openBlock(true), createElementBlock(Fragment, null, renderList(userNotices.value, ({ title, content }) => {
								return openBlock(), createElementBlock(Fragment, { key: title }, [createVNode(unref(N8nText_default), {
									bold: "",
									size: "small"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(title), 1)]),
									_: 2
								}, 1024), createVNode(unref(N8nText_default), { size: "small" }, {
									default: withCtx(() => [createTextVNode(": " + toDisplayString(content) + ". ", 1)]),
									_: 2
								}, 1024)], 64);
							}), 128)),
							hasModifiedCredentialsSelected.value ? (openBlock(), createElementBlock("br", _hoisted_8)) : createCommentVNode("", true)
						], 64)) : createCommentVNode("", true), hasModifiedCredentialsSelected.value ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 1,
							size: "small"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.push.modifiedCredentialsNotice")), 1)]),
							_: 1
						})) : createCommentVNode("", true)]),
						_: 1
					})) : createCommentVNode("", true),
					createVNode(unref(N8nText_default), {
						bold: "",
						tag: "p"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.push.commitMessage")), 1)]),
						_: 1
					}),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [createVNode(unref(Input_default), {
						modelValue: commitMessage.value,
						"onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => commitMessage.value = $event),
						class: "mr-2xs",
						"data-test-id": "source-control-push-modal-commit",
						placeholder: unref(i18n).baseText("settings.sourceControl.modals.push.commitMessage.placeholder"),
						onKeydown: withKeys(withModifiers(onCommitKeyDownEnter, ["stop"]), ["enter"])
					}, null, 8, [
						"modelValue",
						"placeholder",
						"onKeydown"
					]), createVNode(unref(N8nButton_default), {
						variant: "solid",
						"data-test-id": "source-control-push-modal-submit",
						disabled: isSubmitDisabled.value,
						size: "large",
						onClick: commitAndPush
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.push.buttons.save")) + " " + toDisplayString(selectedCount.value ? `(${selectedCount.value})` : void 0), 1)]),
						_: 1
					}, 8, ["disabled"])], 2)
				]),
				_: 1
			}, 8, [
				"event-bus",
				"name",
				"height",
				"custom-class"
			])) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	filterButton: "_filterButton_ut4gg_1",
	filtersRow: "_filtersRow_ut4gg_6",
	filters: "_filters_ut4gg_6",
	selectAll: "_selectAll_ut4gg_19",
	filtersApplied: "_filtersApplied_ut4gg_25",
	scroller: "_scroller_ut4gg_29",
	listItem: "_listItem_ut4gg_35",
	listItemContent: "_listItemContent_ut4gg_42",
	listItemName: "_listItemName_ut4gg_48",
	folderRow: "_folderRow_ut4gg_58",
	folderCheckbox: "_folderCheckbox_ut4gg_65",
	folderToggle: "_folderToggle_ut4gg_72",
	folderLabel: "_folderLabel_ut4gg_85",
	fileRow: "_fileRow_ut4gg_91",
	rowNoBorder: "_rowNoBorder_ut4gg_97",
	badges: "_badges_ut4gg_101",
	footer: "_footer_ut4gg_107",
	sourceControlPush: "_sourceControlPush_ut4gg_114",
	table: "_table_ut4gg_121",
	tableHeader: "_tableHeader_ut4gg_131",
	tabs: "_tabs_ut4gg_137",
	tab: "_tab_ut4gg_121",
	tabActive: "_tabActive_ut4gg_165",
	"popover-content": "_popover-content_ut4gg_170"
} }]]);
//#endregion
export { SourceControlPushModal_default as default };
