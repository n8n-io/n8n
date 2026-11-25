import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, af as onBeforeMount, b as script, ff as openBlock, gf as resolveComponent, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, x as script$1, yp as normalizeStyle, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Jg as useUIStore, Kj as N8nNotice_default, LM as N8nCallout_default, Qu as usePolicyViolationLabels, Rf as PolicyViolationList_default, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, Xj as NewBadge_default, _N as N8nText_default, aM as N8nHoverCard_default, aO as shouldAutoPublishWorkflow, bd as useLoadingService, bm as useSourceControlStore, dC as useToast, fC as VIEWS, fN as N8nTooltip_default, hC as useTelemetry, hM as N8nLink_default, jN as useI18n, mM as N8nOption_default, m_ as SOURCE_CONTROL_PULL_RESULT_MODAL_KEY, nN as N8nBadge_default, pM as N8nSelect_default, p_ as SOURCE_CONTROL_PULL_MODAL_KEY, sj as N8nScrollArea_default, tM as N8nInfoTip_default, vN as N8nIconButton_default, vm as useProjectsStore, xN as N8nIcon_default, yC as useSettingsStore, yE as SOURCE_CONTROL_FILE_TYPE, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
import { t as sourceControlEventBus } from "./sourceControl.eventBus-B00O8l0a.js";
import { a as getPullPriorityByStatus, c as getStatusTheme, d as notifyUserAboutPullWorkFolderOutcome, l as isBlockedByPolicy, r as formatSourceControlUpdatedAt, s as getStatusText, u as isPolicyCheckFailed } from "./sourceControl.utils-wyA1x_2k.js";
import { n as useSourceControlFileList, t as useWorkflowTreeRows } from "./useWorkflowTreeRows-BRGgmyBz.js";
//#region src/features/integrations/sourceControl.ee/components/SourceControlPullModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = { style: {
	"display": "flex",
	"flex-direction": "column",
	"height": "100%"
} };
var _hoisted_2 = { style: {
	"display": "flex",
	"flex": "1"
} };
var _hoisted_3 = ["data-test-id", "onClick"];
var _hoisted_4 = { style: {
	"flex": "1",
	"overflow": "hidden"
} };
var _hoisted_5 = ["onClick"];
var _hoisted_6 = { key: 2 };
var _hoisted_7 = {
	key: 1,
	class: "mb-xs"
};
var SourceControlPullModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SourceControlPullModal",
	props: { data: {} },
	setup(__props) {
		const props = __props;
		const telemetry = useTelemetry();
		const loadingService = useLoadingService();
		const toast = useToast();
		const i18n = useI18n();
		const sourceControlStore = useSourceControlStore();
		const projectsStore = useProjectsStore();
		const route = useRoute();
		const router = useRouter();
		const settingsStore = useSettingsStore();
		const uiStore = useUIStore();
		const { labelOf: policyViolationLabelOf } = usePolicyViolationLabels();
		const isWorkflowDiffsEnabled = computed(() => settingsStore.settings.enterprise.workflowDiffs);
		const status = ref(props.data.status || []);
		const isLoading = ref(false);
		const autoPublish = ref("none");
		const autoPublishOptions = computed(() => {
			const hasPublishedWorkflows = status.value.filter((f) => f.type === SOURCE_CONTROL_FILE_TYPE.workflow).some((w) => w.isLocalPublished && w.status !== "created");
			return [
				{
					label: i18n.baseText("settings.sourceControl.modals.pull.autoPublish.options.off"),
					description: i18n.baseText("settings.sourceControl.modals.pull.autoPublish.options.off.description"),
					value: "none"
				},
				{
					label: i18n.baseText("settings.sourceControl.modals.pull.autoPublish.options.published"),
					description: i18n.baseText("settings.sourceControl.modals.pull.autoPublish.options.published.description"),
					value: "published",
					disabled: !hasPublishedWorkflows
				},
				{
					label: i18n.baseText("settings.sourceControl.modals.pull.autoPublish.options.on"),
					description: i18n.baseText("settings.sourceControl.modals.pull.autoPublish.options.on.description"),
					value: "all"
				}
			];
		});
		const hasModifiedWorkflows = computed(() => {
			return status.value.some((f) => f.type === SOURCE_CONTROL_FILE_TYPE.workflow && f.status === "modified" && !isBlockedByPolicy(f));
		});
		const hasModifiedCredentials = computed(() => {
			return status.value.some((f) => f.type === SOURCE_CONTROL_FILE_TYPE.credential && f.status === "modified");
		});
		async function loadSourceControlStatus() {
			if (isLoading.value) return;
			isLoading.value = true;
			loadingService.startLoading();
			loadingService.setLoadingText(i18n.baseText("settings.sourceControl.loading.checkingForChanges"));
			try {
				const freshStatus = await sourceControlStore.getAggregatedStatus({
					direction: "pull",
					preferLocalVersion: false,
					verbose: false
				});
				status.value = freshStatus || [];
				if (status.value.length === 0) {
					toast.showMessage({
						title: i18n.baseText("settings.sourceControl.pull.upToDate.description"),
						type: "success"
					});
					close();
				}
			} catch (error) {
				toast.showError(error, "Error");
				close();
			} finally {
				isLoading.value = false;
				loadingService.stopLoading();
				loadingService.setLoadingText(i18n.baseText("genericHelpers.loading"));
			}
		}
		onBeforeMount(() => {
			projectsStore.getAvailableProjects();
		});
		const activeTab = ref(SOURCE_CONTROL_FILE_TYPE.workflow);
		const groupedFilesByType = computed(() => {
			const grouped = {};
			status.value.forEach((file) => {
				if (!grouped[file.type]) grouped[file.type] = [];
				grouped[file.type].push(file);
			});
			return grouped;
		});
		const baseSortedWorkflows = useSourceControlFileList({
			files: computed(() => groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.workflow] || []),
			sortBy: [
				({ folderPath }) => folderPath?.join("/") ?? "",
				({ status }) => getPullPriorityByStatus(status),
				"updatedAt"
			],
			sortOrder: [
				"asc",
				"asc",
				"desc"
			]
		});
		const sortedWorkflows = computed(() => baseSortedWorkflows.value.map((file) => ({
			...file,
			willBeAutoPublished: file.type === SOURCE_CONTROL_FILE_TYPE.workflow && file.status !== "deleted" && !isBlockedByPolicy(file) && shouldAutoPublishWorkflow({
				isNewWorkflow: file.status === "created",
				isLocalPublished: file.isLocalPublished ?? false,
				isRemoteArchived: file.isRemoteArchived ?? false,
				autoPublish: autoPublish.value
			})
		})));
		const pullableWorkflows = computed(() => sortedWorkflows.value.filter((file) => !isBlockedByPolicy(file)));
		const { visibleWorkflowRows, isFolderCollapsed, toggleFolderCollapse } = useWorkflowTreeRows(pullableWorkflows);
		const sortedCredentials = useSourceControlFileList({
			files: computed(() => groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.credential] || []),
			sortBy: [({ status }) => getPullPriorityByStatus(status), "updatedAt"],
			sortOrder: ["asc", "desc"]
		});
		const sortedDataTables = useSourceControlFileList({
			files: computed(() => groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.datatable] || []),
			sortBy: [({ status }) => getPullPriorityByStatus(status), "updatedAt"],
			sortOrder: ["asc", "desc"]
		});
		const conflictedDataTables = computed(() => {
			return sortedDataTables.value.filter((dt) => {
				return dt.conflict === true && dt.status === "modified";
			});
		});
		const hasDataTableConflicts = computed(() => conflictedDataTables.value.length > 0);
		const dataTableWarningMessage = computed(() => {
			if (!hasDataTableConflicts.value) return "";
			return i18n.baseText("settings.sourceControl.modals.pull.dataTablesWarning", { interpolate: { count: conflictedDataTables.value.length } });
		});
		const policyBlockedCount = computed(() => status.value.filter(isBlockedByPolicy).length);
		const policyCheckFailedCount = computed(() => status.value.filter(isPolicyCheckFailed).length);
		const LISTED_TYPES = [
			SOURCE_CONTROL_FILE_TYPE.workflow,
			SOURCE_CONTROL_FILE_TYPE.credential,
			SOURCE_CONTROL_FILE_TYPE.datatable
		];
		/** Counts only the items listed in the tabs, so the number matches what the user sees. */
		const pullableListedCount = computed(() => status.value.filter((file) => LISTED_TYPES.includes(file.type) && !isBlockedByPolicy(file)).length);
		const activeDataSourceFiltered = computed(() => {
			if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.workflow) return sortedWorkflows.value;
			if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.credential) return sortedCredentials.value;
			if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.datatable) return sortedDataTables.value;
			return [];
		});
		const toFileRow = (file) => ({
			id: `file:${file.id}`,
			type: "file",
			file,
			depth: 0
		});
		/** Blocked items go in their own group at the end, so they read as left out of the pull. */
		const activeRows = computed(() => {
			const files = activeDataSourceFiltered.value;
			const blocked = files.filter(isBlockedByPolicy);
			const pullableRows = activeTab.value === SOURCE_CONTROL_FILE_TYPE.workflow ? visibleWorkflowRows.value : files.filter((file) => !isBlockedByPolicy(file)).map(toFileRow);
			if (blocked.length === 0) return pullableRows;
			return [
				...pullableRows,
				{
					id: "policy-blocked-group",
					type: "policyGroup",
					count: blocked.length,
					depth: 0
				},
				...blocked.map(toFileRow)
			];
		});
		const filtersNoResultText = computed(() => {
			if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.workflow) return i18n.baseText("workflows.noResults");
			if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.credential) return i18n.baseText("credentials.noResults");
			if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.datatable) return i18n.baseText("dataTables.noResults");
			return i18n.baseText("workflows.noResults");
		});
		const tabs = computed(() => {
			return [
				{
					label: i18n.baseText("settings.sourceControl.modals.tabs.workflows"),
					value: SOURCE_CONTROL_FILE_TYPE.workflow,
					total: groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.workflow]?.length || 0
				},
				{
					label: i18n.baseText("settings.sourceControl.modals.tabs.credentials"),
					value: SOURCE_CONTROL_FILE_TYPE.credential,
					total: groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.credential]?.length || 0
				},
				{
					label: i18n.baseText("settings.sourceControl.modals.tabs.dataTables"),
					value: SOURCE_CONTROL_FILE_TYPE.datatable,
					total: groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.datatable]?.length || 0
				}
			];
		});
		const otherFiles = computed(() => {
			const others = [];
			const variables = groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.variables];
			if (variables) others.push.apply(others, variables);
			const tags = groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.tags];
			if (tags) others.push.apply(others, tags);
			const folders = groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.folders];
			if (folders) others.push.apply(others, folders);
			const projects = groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.project];
			if (projects) others.push.apply(others, projects);
			return others;
		});
		const hasNothingToPull = computed(() => policyBlockedCount.value > 0 && pullableListedCount.value === 0 && !otherFiles.value.length);
		const pullButtonLabel = computed(() => {
			const showCount = policyBlockedCount.value > 0 && pullableListedCount.value > 0;
			const count = pullableListedCount.value;
			if (hasModifiedWorkflows.value) return showCount ? i18n.baseText("settings.sourceControl.modals.pull.buttons.saveCount", {
				adjustToNumber: count,
				interpolate: { count: `${count}` }
			}) : i18n.baseText("settings.sourceControl.modals.pull.buttons.save");
			return showCount ? i18n.baseText("settings.sourceControl.modals.pull.buttons.pullCount", {
				adjustToNumber: count,
				interpolate: { count: `${count}` }
			}) : i18n.baseText("settings.sourceControl.modals.pull.buttons.pull");
		});
		const otherFilesText = computed(() => {
			const parts = [];
			const variables = groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.variables];
			if (variables?.length) parts.push(`Variables (${variables.length})`);
			const tags = groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.tags];
			if (tags?.length) parts.push(`Tags (${tags.length})`);
			const folders = groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.folders];
			if (folders?.length) parts.push(`Folders (${folders.length})`);
			const projects = groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.project];
			if (projects?.length) parts.push(`Projects (${projects.length})`);
			return parts.join(", ");
		});
		function close() {
			router.back();
		}
		async function pullWorkfolder() {
			loadingService.startLoading(i18n.baseText("settings.sourceControl.loading.checkingForChanges"));
			const workflowsToAutoPublish = sortedWorkflows.value.filter((w) => w.willBeAutoPublished);
			try {
				const pullStatus = await sourceControlStore.pullWorkfolder(true, autoPublish.value);
				await notifyUserAboutPullWorkFolderOutcome(pullStatus, toast, router);
				sourceControlEventBus.emit("pull");
				if (workflowsToAutoPublish.length > 0) {
					const workflowResults = pullStatus.filter((file) => file.type === SOURCE_CONTROL_FILE_TYPE.workflow && !isBlockedByPolicy(file) && workflowsToAutoPublish.some((w) => w.id === file.id));
					if (workflowResults.length > 0) uiStore.openModalWithData({
						name: SOURCE_CONTROL_PULL_RESULT_MODAL_KEY,
						data: { workflows: workflowResults }
					});
				}
			} catch (error) {
				toast.showError(error, "Error");
			} finally {
				loadingService.stopLoading();
				close();
			}
		}
		function renderUpdatedAt(file) {
			return formatSourceControlUpdatedAt(file.updatedAt);
		}
		function openDiffModal(id) {
			telemetry.track("User clicks compare workflows", {
				workflow_id: id,
				context: "source_control_pull"
			});
			router.push({ query: {
				...route.query,
				diff: id,
				direction: "pull"
			} });
		}
		const modalMinHeight = computed(() => groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.workflow]?.length || groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.credential]?.length ? "min(80vh, 850px)" : void 0);
		onMounted(() => {
			if (!props.data.status || props.data.status.length === 0) loadSourceControlStatus();
		});
		return (_ctx, _cache) => {
			const _component_RouterLink = resolveComponent("RouterLink");
			return !isLoading.value ? (openBlock(), createBlock(Modal_default, {
				key: 0,
				width: "812px",
				"event-bus": __props.data.eventBus,
				name: unref(SOURCE_CONTROL_PULL_MODAL_KEY),
				"min-height": modalMinHeight.value,
				"max-height": "100%",
				"custom-class": _ctx.$style.sourceControlPull,
				"before-close": close
			}, {
				header: withCtx(() => [createVNode(unref(N8nHeading_default), {
					tag: "h1",
					size: "xlarge"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.pull.title")), 1)]),
					_: 1
				}), createBaseVNode("div", { class: normalizeClass([[_ctx.$style.filtersRow], "mt-xs"]) }, [createVNode(unref(N8nText_default), { tag: "div" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.pull.description")) + " ", 1), createVNode(unref(N8nLink_default), { to: unref(i18n).baseText("settings.sourceControl.docs.using.pushPull.url") }, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.push.description.learnMore")), 1)]),
						_: 1
					}, 8, ["to"])]),
					_: 1
				})], 2)]),
				content: withCtx(() => [createBaseVNode("div", _hoisted_1, [
					policyBlockedCount.value > 0 ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 0,
						theme: "warning",
						class: "mb-xs",
						"data-test-id": "source-control-pull-policy-callout"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.pull.policyBlockedCallout", {
							adjustToNumber: policyBlockedCount.value,
							interpolate: { count: `${policyBlockedCount.value}` }
						})), 1)]),
						_: 1
					})) : createCommentVNode("", true),
					policyCheckFailedCount.value > 0 ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 1,
						theme: "warning",
						class: "mb-xs",
						"data-test-id": "source-control-pull-policy-check-failed-callout"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.pull.policyCheckFailedCallout", {
							adjustToNumber: policyCheckFailedCount.value,
							interpolate: { count: `${policyCheckFailedCount.value}` }
						})), 1)]),
						_: 1
					})) : createCommentVNode("", true),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.autoPublishSection) }, [createVNode(unref(N8nText_default), {
						tag: "div",
						bold: "",
						size: "medium",
						color: "text-dark"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.pull.autoPublish.title")), 1)]),
						_: 1
					}), createVNode(unref(N8nSelect_default), {
						modelValue: autoPublish.value,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => autoPublish.value = $event),
						size: "medium",
						class: normalizeClass(_ctx.$style.select),
						"data-test-id": "auto-publish-select"
					}, {
						default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(autoPublishOptions.value, (option) => {
							return openBlock(), createBlock(unref(N8nOption_default), {
								key: option.value,
								value: option.value,
								label: option.label,
								disabled: option.disabled
							}, {
								default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.listOption) }, [createVNode(unref(N8nText_default), { bold: "" }, {
									default: withCtx(() => [createTextVNode(toDisplayString(option.label), 1)]),
									_: 2
								}, 1024), option.description ? (openBlock(), createBlock(unref(N8nText_default), {
									key: 0,
									size: "small",
									color: "text-light"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(option.description), 1)]),
									_: 2
								}, 1024)) : createCommentVNode("", true)], 2)]),
								_: 2
							}, 1032, [
								"value",
								"label",
								"disabled"
							]);
						}), 128))]),
						_: 1
					}, 8, ["modelValue", "class"])], 2),
					createBaseVNode("div", _hoisted_2, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.tabs) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(tabs.value, (tab) => {
						return openBlock(), createElementBlock("button", {
							key: tab.value,
							type: "button",
							class: normalizeClass([_ctx.$style.tab, { [_ctx.$style.tabActive]: activeTab.value === tab.value }]),
							"data-test-id": `source-control-pull-modal-tab-${tab.value}`,
							onClick: ($event) => activeTab.value = tab.value
						}, [createBaseVNode("div", null, toDisplayString(tab.label), 1), createVNode(unref(N8nText_default), {
							tag: "div",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.pull.itemCount", {
								adjustToNumber: tab.total,
								interpolate: { count: `${tab.total}` }
							})), 1)]),
							_: 2
						}, 1024)], 10, _hoisted_3);
					}), 128))], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.listColumn) }, [createBaseVNode("div", { class: normalizeClass([_ctx.$style.table]) }, [createBaseVNode("div", { class: normalizeClass([_ctx.$style.tableHeader]) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerTitle) }, [createVNode(unref(N8nText_default), null, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.tableHeader.title")), 1)]),
						_: 1
					})], 2)], 2), createBaseVNode("div", _hoisted_4, [!activeDataSourceFiltered.value.length ? (openBlock(), createBlock(unref(N8nInfoTip_default), {
						key: 0,
						class: "p-xs",
						bold: false
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(filtersNoResultText.value), 1)]),
						_: 1
					})) : createCommentVNode("", true), activeRows.value.length ? (openBlock(), createBlock(unref(script$1), {
						key: 1,
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
								row.type === "file" ? row.file.name : row.type === "folder" ? row.name : row.count,
								row.id,
								row.depth
							],
							"data-index": index
						}, {
							default: withCtx(() => [row.type === "folder" ? (openBlock(), createElementBlock("div", {
								key: 0,
								class: normalizeClass([_ctx.$style.folderRow, { [_ctx.$style.rowNoBorder]: index === activeRows.value.length - 1 }]),
								style: normalizeStyle({ paddingLeft: `${16 + row.depth * 16}px` }),
								"data-test-id": "source-control-pull-modal-folder-row"
							}, [createVNode(unref(N8nText_default), {
								tag: "span",
								color: "text-light"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(row.name), 1)]),
								_: 2
							}, 1024), createBaseVNode("button", {
								type: "button",
								class: normalizeClass(_ctx.$style.folderToggle),
								"data-test-id": "source-control-pull-modal-folder-toggle",
								onClick: withModifiers(($event) => unref(toggleFolderCollapse)(row.id), ["stop"]),
								onMousedown: _cache[1] || (_cache[1] = withModifiers(() => {}, ["stop"])),
								onPointerdown: _cache[2] || (_cache[2] = withModifiers(() => {}, ["stop"]))
							}, [createVNode(unref(N8nIcon_default), {
								icon: unref(isFolderCollapsed)(row.id) ? "chevron-right" : "chevron-down",
								color: "text-light",
								size: "small"
							}, null, 8, ["icon"])], 42, _hoisted_5)], 6)) : row.type === "policyGroup" ? (openBlock(), createElementBlock("div", {
								key: 1,
								class: normalizeClass(_ctx.$style.policyGroupRow),
								"data-test-id": "source-control-pull-policy-group"
							}, [createVNode(unref(N8nText_default), {
								tag: "span",
								size: "small",
								bold: "",
								color: "text-dark"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.pull.policyBlockedGroup", { interpolate: { count: `${row.count}` } })), 1)]),
								_: 2
							}, 1024)], 2)) : (openBlock(), createElementBlock("div", {
								key: 2,
								class: normalizeClass([_ctx.$style.listItem, { [_ctx.$style.rowNoBorder]: index === activeRows.value.length - 1 }]),
								"data-test-id": "pull-modal-item"
							}, [createBaseVNode("div", {
								class: normalizeClass([_ctx.$style.itemContent]),
								style: normalizeStyle({ paddingLeft: `${row.depth * 16}px` })
							}, [createVNode(unref(N8nText_default), {
								tag: "div",
								bold: "",
								color: unref(isBlockedByPolicy)(row.file) ? "text-light" : "text-dark",
								class: normalizeClass([_ctx.$style.listItemName])
							}, {
								default: withCtx(() => [row.file.type === unref(SOURCE_CONTROL_FILE_TYPE).credential ? (openBlock(), createBlock(_component_RouterLink, {
									key: 0,
									target: "_blank",
									rel: "noopener noreferrer",
									to: {
										name: unref(VIEWS).CREDENTIALS,
										params: { credentialId: row.file.id }
									}
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(row.file.name), 1)]),
									_: 2
								}, 1032, ["to"])) : row.file.type === unref(SOURCE_CONTROL_FILE_TYPE).workflow ? (openBlock(), createBlock(_component_RouterLink, {
									key: 1,
									target: "_blank",
									rel: "noopener noreferrer",
									to: {
										name: unref(VIEWS).WORKFLOW,
										params: { workflowId: row.file.id }
									}
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(row.file.name), 1)]),
									_: 2
								}, 1032, ["to"])) : (openBlock(), createElementBlock("span", _hoisted_6, toDisplayString(row.file.name), 1))]),
								_: 2
							}, 1032, ["color", "class"]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.statusLine) }, [
								row.file.updatedAt ? (openBlock(), createBlock(unref(N8nText_default), {
									key: 0,
									color: "text-light",
									size: "small"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(renderUpdatedAt(row.file)), 1)]),
									_: 2
								}, 1024)) : createCommentVNode("", true),
								row.file.willBeAutoPublished ? (openBlock(), createBlock(unref(N8nText_default), {
									key: 1,
									color: "success",
									size: "small",
									bold: ""
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.pull.autoPublishing")), 1)]),
									_: 1
								})) : createCommentVNode("", true),
								row.file.isRemoteArchived ? (openBlock(), createBlock(unref(N8nText_default), {
									key: 2,
									color: "warning",
									size: "small",
									bold: ""
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.pull.willBeArchived")), 1)]),
									_: 1
								})) : createCommentVNode("", true)
							], 2)], 6), createBaseVNode("span", { class: normalizeClass([_ctx.$style.badges]) }, [
								unref(isBlockedByPolicy)(row.file) ? (openBlock(), createBlock(unref(N8nHoverCard_default), {
									key: 0,
									side: "top",
									"open-delay": 200,
									"max-width": "320px"
								}, {
									trigger: withCtx(() => [createVNode(unref(N8nBadge_default), {
										variant: "warning",
										size: "xsmall",
										"data-test-id": "source-control-pull-policy-blocked"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.pull.policyBlocked")), 1)]),
										_: 1
									})]),
									content: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.policyCard) }, [createVNode(unref(N8nText_default), {
										tag: "p",
										size: "small",
										color: "text-dark"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.pull.policyBlocked.tooltip")), 1)]),
										_: 1
									}), createVNode(unref(PolicyViolationList_default), {
										violations: row.file.contentImportPolicy?.violations ?? [],
										"label-of": unref(policyViolationLabelOf)
									}, null, 8, ["violations", "label-of"])], 2)]),
									_: 2
								}, 1024)) : createCommentVNode("", true),
								row.file.status === "created" ? (openBlock(), createBlock(unref(NewBadge_default), {
									key: 1,
									text: unref(getStatusText)(row.file.status),
									size: "xsmall"
								}, null, 8, ["text"])) : (openBlock(), createBlock(unref(N8nBadge_default), {
									key: 2,
									variant: unref(getStatusTheme)(row.file.status),
									size: "xsmall"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(getStatusText)(row.file.status)), 1)]),
									_: 2
								}, 1032, ["variant"])),
								isWorkflowDiffsEnabled.value ? (openBlock(), createElementBlock(Fragment, { key: 3 }, [row.file.type === unref(SOURCE_CONTROL_FILE_TYPE).workflow && row.file.status === "modified" ? (openBlock(), createBlock(unref(N8nTooltip_default), {
									key: 0,
									content: unref(i18n).baseText("workflowDiff.compare"),
									placement: "top"
								}, {
									default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
										variant: "outline",
										icon: "file-diff",
										onClick: ($event) => openDiffModal(row.file.id)
									}, null, 8, ["onClick"])]),
									_: 2
								}, 1032, ["content"])) : createCommentVNode("", true)], 64)) : createCommentVNode("", true)
							], 2)], 2))]),
							_: 2
						}, 1032, [
							"item",
							"active",
							"size-dependencies",
							"data-index"
						])]),
						_: 1
					}, 8, ["class", "items"])) : createCommentVNode("", true)])], 2)], 2)])
				])]),
				footer: withCtx(() => [
					hasModifiedCredentials.value ? (openBlock(), createBlock(unref(N8nNotice_default), {
						key: 0,
						compact: false,
						class: "mt-0"
					}, {
						default: withCtx(() => [createVNode(unref(N8nText_default), { size: "small" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.pull.modifiedCredentialsNotice")), 1)]),
							_: 1
						})]),
						_: 1
					})) : createCommentVNode("", true),
					otherFiles.value.length ? (openBlock(), createElementBlock("div", _hoisted_7, [createVNode(unref(N8nText_default), {
						bold: "",
						size: "medium"
					}, {
						default: withCtx(() => [..._cache[3] || (_cache[3] = [createTextVNode("Additional changes to be pulled:", -1)])]),
						_: 1
					}), createVNode(unref(N8nText_default), { size: "small" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(otherFilesText.value), 1)]),
						_: 1
					})])) : createCommentVNode("", true),
					hasDataTableConflicts.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 2,
						theme: "warning",
						class: normalizeClass([_ctx.$style.dataTableWarning, "mb-xs"])
					}, {
						default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.warningContent) }, [createBaseVNode("div", null, toDisplayString(dataTableWarningMessage.value), 1), createVNode(unref(N8nScrollArea_default), {
							"max-height": "10vh",
							type: "auto"
						}, {
							default: withCtx(() => [createBaseVNode("ul", { class: normalizeClass(_ctx.$style.dataTableList) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(conflictedDataTables.value, (table) => {
								return openBlock(), createElementBlock("li", {
									key: table.id,
									"data-test-id": "pull-modal-conflicting-data-table"
								}, toDisplayString(table.name), 1);
							}), 128))], 2)]),
							_: 1
						})], 2)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [createVNode(unref(N8nButton_default), {
						variant: "outline",
						class: "mr-2xs",
						onClick: close
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.pull.buttons.cancel")), 1)]),
						_: 1
					}), createVNode(unref(N8nButton_default), {
						variant: "solid",
						"data-test-id": "force-pull",
						disabled: hasNothingToPull.value,
						onClick: pullWorkfolder
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(pullButtonLabel.value), 1)]),
						_: 1
					}, 8, ["disabled"])], 2)
				]),
				_: 1
			}, 8, [
				"event-bus",
				"name",
				"min-height",
				"custom-class"
			])) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	sourceControlPull: "_sourceControlPull_q7n5m_1",
	filtersRow: "_filtersRow_q7n5m_8",
	filters: "_filters_q7n5m_8",
	headerTitle: "_headerTitle_q7n5m_21",
	filtersApplied: "_filtersApplied_q7n5m_27",
	scroller: "_scroller_q7n5m_31",
	listItem: "_listItem_q7n5m_37",
	folderRow: "_folderRow_q7n5m_47",
	folderToggle: "_folderToggle_q7n5m_54",
	itemContent: "_itemContent_q7n5m_67",
	listItemName: "_listItemName_q7n5m_72",
	badges: "_badges_q7n5m_89",
	footer: "_footer_q7n5m_96",
	dataTableWarning: "_dataTableWarning_q7n5m_103",
	warningContent: "_warningContent_q7n5m_108",
	dataTableList: "_dataTableList_q7n5m_114",
	listColumn: "_listColumn_q7n5m_126",
	table: "_table_q7n5m_131",
	tableHeader: "_tableHeader_q7n5m_141",
	tabs: "_tabs_q7n5m_147",
	tab: "_tab_q7n5m_131",
	tabActive: "_tabActive_q7n5m_175",
	autoPublishSection: "_autoPublishSection_q7n5m_180",
	select: "_select_q7n5m_188",
	statusLine: "_statusLine_q7n5m_192",
	listOption: "_listOption_q7n5m_198",
	rowNoBorder: "_rowNoBorder_q7n5m_207",
	policyGroupRow: "_policyGroupRow_q7n5m_211",
	policyCard: "_policyCard_q7n5m_217"
} }]]);
//#endregion
export { SourceControlPullModal_default as default };
