import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Md as withKeys, Nf as init_reactivity_esm_bundler, Od as useCssModule, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, nf as mergeModels, xf as useModel, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $g as modalOpeners, Gt as useMCPStore, Hj as SettingsPageHeader_default, KA as Dialog_default, Ox as WORKFLOW_DESCRIPTION_MODAL_KEY, Qt as MCP_DOCS_PAGE_URL, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, Uj as SettingsLayout_default, WA as DialogBody_default, Wj as N8nSelectedItemsInfo_default, YM as N8nActionToggle_default, _N as N8nText_default, dC as useToast, ej as N8nDataTableServer_default, en as MCP_SETTINGS_VIEW, fC as VIEWS, fN as N8nTooltip_default, hC as useTelemetry, hM as N8nLink_default, jN as useI18n, mM as N8nOption_default, nD as getResourcePermissions, o_ as use, pM as N8nSelect_default, qd as useDocumentTitle, tN as N8nLoading_default, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
//#region ../../modules/mcp/frontend/src/components/WorkflowLocation.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var WorkflowLocation_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowLocation",
	props: {
		workflowId: {},
		workflowName: { default: void 0 },
		homeProject: { default: void 0 },
		parentFolder: { default: void 0 },
		asLinks: {
			type: Boolean,
			default: false
		}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const router = useRouter();
		const projectName = computed(() => {
			if (props.homeProject?.type === "personal") return i18n.baseText("projects.menu.personal");
			return props.homeProject?.name ?? "";
		});
		const projectLink = computed(() => {
			if (!props.homeProject) return "";
			return router.resolve({
				name: VIEWS.PROJECTS_WORKFLOWS,
				params: { projectId: props.homeProject.id }
			}).fullPath;
		});
		const folderLink = computed(() => {
			if (!props.homeProject || !props.parentFolder) return "";
			return `/projects/${props.homeProject.id}/folders/${props.parentFolder.id}/workflows`;
		});
		const workflowLink = computed(() => {
			if (!props.workflowId) return "";
			return router.resolve({
				name: VIEWS.WORKFLOW,
				params: { workflowId: props.workflowId }
			}).fullPath;
		});
		const hasGrandparentFolder = computed(() => !!props.parentFolder?.parentFolderId);
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style["location-container"]) }, [
				__props.homeProject ? (openBlock(), createElementBlock("span", {
					key: 0,
					class: normalizeClass(_ctx.$style.truncate)
				}, [__props.asLinks ? (openBlock(), createBlock(unref(N8nLink_default), {
					key: 0,
					"data-test-id": "workflow-location-project-link",
					to: projectLink.value,
					theme: "text",
					class: normalizeClass([_ctx.$style["location-link"], _ctx.$style.truncate]),
					"new-window": true
				}, {
					default: withCtx(() => [createVNode(unref(N8nText_default), {
						class: normalizeClass(_ctx.$style.truncate),
						"data-test-id": "workflow-location-project-name"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(projectName.value), 1)]),
						_: 1
					}, 8, ["class"])]),
					_: 1
				}, 8, ["to", "class"])) : (openBlock(), createBlock(unref(N8nText_default), {
					key: 1,
					class: normalizeClass(_ctx.$style.truncate),
					"data-test-id": "workflow-location-project-name"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(projectName.value), 1)]),
					_: 1
				}, 8, ["class"]))], 2)) : createCommentVNode("", true),
				__props.parentFolder || __props.workflowName ? (openBlock(), createElementBlock("span", {
					key: 1,
					class: normalizeClass(_ctx.$style.separator),
					"data-test-id": "workflow-location-separator"
				}, " / ", 2)) : createCommentVNode("", true),
				hasGrandparentFolder.value ? (openBlock(), createElementBlock("span", {
					key: 2,
					class: normalizeClass(_ctx.$style.grandparent),
					"data-test-id": "workflow-location-grandparent"
				}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.ellipsis) }, "...", 2), createBaseVNode("span", {
					class: normalizeClass(_ctx.$style.separator),
					"data-test-id": "workflow-location-ellipsis-separator"
				}, "/", 2)], 2)) : createCommentVNode("", true),
				__props.parentFolder ? (openBlock(), createElementBlock("span", {
					key: 3,
					class: normalizeClass(_ctx.$style["parent-folder"])
				}, [__props.asLinks && __props.homeProject ? (openBlock(), createBlock(unref(N8nLink_default), {
					key: 0,
					"data-test-id": "workflow-location-folder-link",
					to: folderLink.value,
					theme: "text",
					class: normalizeClass([_ctx.$style["location-link"], _ctx.$style.truncate]),
					"new-window": true
				}, {
					default: withCtx(() => [createVNode(unref(N8nText_default), {
						class: normalizeClass(_ctx.$style.truncate),
						"data-test-id": "workflow-location-folder-name"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(__props.parentFolder.name), 1)]),
						_: 1
					}, 8, ["class"])]),
					_: 1
				}, 8, ["to", "class"])) : (openBlock(), createBlock(unref(N8nText_default), {
					key: 1,
					class: normalizeClass(_ctx.$style.truncate),
					"data-test-id": "workflow-location-folder-name"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.parentFolder.name), 1)]),
					_: 1
				}, 8, ["class"]))], 2)) : createCommentVNode("", true),
				__props.parentFolder && __props.workflowName ? (openBlock(), createElementBlock("span", {
					key: 4,
					class: normalizeClass(_ctx.$style.separator)
				}, "/", 2)) : createCommentVNode("", true),
				__props.workflowName ? (openBlock(), createElementBlock("span", {
					key: 5,
					class: normalizeClass([_ctx.$style["workflow-name"], _ctx.$style.truncate])
				}, [__props.asLinks && __props.workflowId ? (openBlock(), createBlock(unref(N8nLink_default), {
					key: 0,
					"data-test-id": "workflow-location-workflow-link",
					to: workflowLink.value,
					theme: "text",
					class: normalizeClass([_ctx.$style["location-link"], _ctx.$style.truncate]),
					"new-window": true
				}, {
					default: withCtx(() => [createVNode(unref(N8nText_default), {
						class: normalizeClass(_ctx.$style.truncate),
						"data-test-id": "workflow-location-workflow-name"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(__props.workflowName), 1)]),
						_: 1
					}, 8, ["class"])]),
					_: 1
				}, 8, ["to", "class"])) : (openBlock(), createBlock(unref(N8nText_default), {
					key: 1,
					class: normalizeClass(_ctx.$style.truncate),
					"data-test-id": "workflow-location-workflow-name"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.workflowName), 1)]),
					_: 1
				}, 8, ["class"]))], 2)) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	"location-container": "_location-container_yz6mi_1",
	ellipsis: "_ellipsis_yz6mi_10",
	separator: "_separator_yz6mi_15",
	grandparent: "_grandparent_yz6mi_20",
	"parent-folder": "_parent-folder_yz6mi_26",
	truncate: "_truncate_yz6mi_34",
	"location-link": "_location-link_yz6mi_42",
	"workflow-name": "_workflow-name_yz6mi_46"
} }]]);
//#endregion
//#region ../../modules/mcp/frontend/src/components/tabs/WorkflowsTable.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = { key: 0 };
var _hoisted_2 = ["onClick"];
var WorkflowsTable_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowsTable",
	props: /*@__PURE__*/ mergeModels({
		workflows: {},
		totalCount: {},
		loading: { type: Boolean }
	}, {
		"tableOptions": { default: () => ({
			page: 0,
			itemsPerPage: 10,
			sortBy: []
		}) },
		"tableOptionsModifiers": {}
	}),
	emits: /*@__PURE__*/ mergeModels([
		"removeMcpAccess",
		"bulkRemoveMcpAccess",
		"connectWorkflows",
		"updateDescription",
		"update:options"
	], ["update:tableOptions"]),
	setup(__props, { emit: __emit }) {
		const props = __props;
		const tableOptions = useModel(__props, "tableOptions");
		const tablePage = computed({
			get: () => tableOptions.value.page,
			set: (page) => {
				tableOptions.value = {
					...tableOptions.value,
					page
				};
			}
		});
		const tableItemsPerPage = computed({
			get: () => tableOptions.value.itemsPerPage,
			set: (itemsPerPage) => {
				tableOptions.value = {
					...tableOptions.value,
					itemsPerPage
				};
			}
		});
		const tableSortBy = computed({
			get: () => tableOptions.value.sortBy,
			set: (sortBy) => {
				tableOptions.value = {
					...tableOptions.value,
					sortBy
				};
			}
		});
		const emit = __emit;
		const i18n = useI18n();
		const router = useRouter();
		const itemsLength = computed(() => props.totalCount ?? props.workflows.length);
		const selectedWorkflowIds = ref([]);
		watch(() => props.workflows, () => {
			selectedWorkflowIds.value = [];
		});
		const isRowSelectable = (workflow) => !!getResourcePermissions(workflow.scopes).workflow.update;
		const clearSelection = () => {
			selectedWorkflowIds.value = [];
		};
		const onBulkRemoveMcpAccess = () => {
			emit("bulkRemoveMcpAccess", selectedWorkflowIds.value);
		};
		const tableHeaders = ref([
			{
				title: i18n.baseText("settings.mcp.workflows.table.column.name"),
				key: "workflow",
				width: 150,
				disableSort: true,
				value() {}
			},
			{
				title: i18n.baseText("settings.mcp.workflows.table.column.location"),
				key: "location",
				width: 200,
				disableSort: true,
				value() {}
			},
			{
				title: i18n.baseText("generic.description"),
				key: "description",
				width: 350,
				disableSort: true,
				value() {}
			},
			{
				title: "",
				key: "actions",
				align: "end",
				width: 50,
				disableSort: true,
				value() {}
			}
		]);
		const getAvailableActions = (workflow) => {
			const permissions = getResourcePermissions(workflow.scopes);
			return [{
				label: i18n.baseText("settings.mcp.workflows.table.action.removeMCPAccess"),
				value: "removeFromMCP",
				disabled: !permissions.workflow.update
			}, {
				label: i18n.baseText("settings.mcp.workflows.table.action.updateDescription"),
				value: "updateDescription",
				disabled: !permissions.workflow.update
			}];
		};
		const onWorkflowAction = (action, workflow) => {
			switch (action) {
				case "removeFromMCP":
					emit("removeMcpAccess", workflow);
					break;
				case "updateDescription": emit("updateDescription", workflow);
			}
		};
		const onConnectClick = () => {
			emit("connectWorkflows");
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [props.loading ? (openBlock(), createElementBlock("div", _hoisted_1$1, [createVNode(unref(N8nLoading_default), {
				loading: props.loading,
				variant: "h1",
				class: "mb-l"
			}, null, 8, ["loading"]), createVNode(unref(N8nLoading_default), {
				loading: props.loading,
				variant: "p",
				rows: 5,
				"shrink-last": false
			}, null, 8, ["loading"])])) : (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(["mt-s mb-xl", _ctx.$style["table-container"]])
			}, [createVNode(unref(N8nDataTableServer_default), {
				"sort-by": tableSortBy.value,
				"onUpdate:sortBy": _cache[0] || (_cache[0] = ($event) => tableSortBy.value = $event),
				page: tablePage.value,
				"onUpdate:page": _cache[1] || (_cache[1] = ($event) => tablePage.value = $event),
				"items-per-page": tableItemsPerPage.value,
				"onUpdate:itemsPerPage": _cache[2] || (_cache[2] = ($event) => tableItemsPerPage.value = $event),
				selection: selectedWorkflowIds.value,
				"onUpdate:selection": _cache[3] || (_cache[3] = ($event) => selectedWorkflowIds.value = $event),
				class: normalizeClass(_ctx.$style["workflow-table"]),
				"data-test-id": "mcp-workflow-table",
				headers: tableHeaders.value,
				items: props.workflows,
				"items-length": itemsLength.value,
				"page-sizes": [
					10,
					25,
					50
				],
				"show-select": itemsLength.value > 0,
				"item-selectable": isRowSelectable,
				"onUpdate:options": _cache[4] || (_cache[4] = ($event) => emit("update:options", $event))
			}, createSlots({
				[`item.workflow`]: withCtx(({ item }) => [createBaseVNode("div", {
					class: normalizeClass(_ctx.$style["workflow-cell"]),
					"data-test-id": "mcp-workflow-cell"
				}, [createVNode(unref(N8nLink_default), {
					"data-test-id": "mcp-workflow-name-link",
					"new-window": true,
					to: unref(router).resolve({
						name: unref(VIEWS).WORKFLOW,
						params: { workflowId: item.id }
					}).fullPath,
					theme: "text",
					class: normalizeClass([_ctx.$style["table-link"], _ctx.$style.truncate])
				}, {
					default: withCtx(() => [createVNode(unref(N8nText_default), {
						class: normalizeClass(_ctx.$style.truncate),
						"data-test-id": "mcp-workflow-name"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(item.name), 1)]),
						_: 2
					}, 1032, ["class"])]),
					_: 2
				}, 1032, ["to", "class"])], 2)]),
				[`item.location`]: withCtx(({ item }) => [createBaseVNode("div", {
					class: normalizeClass(_ctx.$style["location-cell"]),
					"data-test-id": "mcp-workflow-location-cell"
				}, [createVNode(WorkflowLocation_default, {
					"workflow-id": item.id,
					"home-project": item.homeProject,
					"parent-folder": item.parentFolder,
					"as-links": true
				}, null, 8, [
					"workflow-id",
					"home-project",
					"parent-folder"
				])], 2)]),
				[`item.description`]: withCtx(({ item }) => [createVNode(unref(N8nTooltip_default), {
					content: item.description ? unref(i18n).baseText("settings.mcp.workflows.table.column.description.editTooltip") : unref(i18n).baseText("settings.mcp.workflows.table.column.description.emptyTooltip"),
					"show-after": unref(100),
					"as-child": ""
				}, {
					default: withCtx(() => [createBaseVNode("div", {
						"data-test-id": "mcp-workflow-description-cell",
						class: normalizeClass(_ctx.$style["description-cell"]),
						onClick: ($event) => emit("updateDescription", item)
					}, [item.description ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						class: normalizeClass(_ctx.$style["description-text"]),
						"data-test-id": "mcp-workflow-description"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(item.description), 1)]),
						_: 2
					}, 1032, ["class"])) : (openBlock(), createElementBlock("span", {
						key: 1,
						class: normalizeClass(_ctx.$style["empty-description"])
					}, [createVNode(unref(N8nIcon_default), {
						icon: "triangle-alert",
						size: 14,
						color: "warning",
						class: "mr-2xs"
					}), createVNode(unref(N8nText_default), { "data-test-id": "mcp-workflow-description-empty" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.mcp.workflows.table.column.description.emptyContent")), 1)]),
						_: 1
					})], 2))], 10, _hoisted_2)]),
					_: 2
				}, 1032, ["content", "show-after"])]),
				[`item.actions`]: withCtx(({ item }) => [createVNode(unref(N8nActionToggle_default), {
					class: normalizeClass(_ctx.$style["action-toggle"]),
					"data-test-id": "mcp-workflow-action-toggle",
					placement: "bottom",
					actions: getAvailableActions(item),
					theme: "dark",
					onAction: ($event) => onWorkflowAction($event, item)
				}, null, 8, [
					"class",
					"actions",
					"onAction"
				])]),
				_: 2
			}, [itemsLength.value === 0 ? {
				name: "cover",
				fn: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style["empty-state"]) }, [
					createVNode(unref(N8nText_default), {
						"data-test-id": "mcp-workflow-table-empty-state",
						size: "large",
						color: "text-base"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.mcp.workflows.table.empty.title")), 1)]),
						_: 1
					}),
					createVNode(unref(N8nText_default), {
						"data-test-id": "mcp-workflow-table-empty-state-description",
						size: "small",
						color: "text-base"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.mcp.workflows.table.empty.description")), 1)]),
						_: 1
					}),
					createVNode(unref(N8nButton_default), {
						variant: "solid",
						"data-test-id": "mcp-workflow-table-empty-state-button",
						label: unref(i18n).baseText("settings.mcp.connectWorkflows"),
						onClick: onConnectClick
					}, null, 8, ["label"])
				], 2)]),
				key: "0"
			} : void 0]), 1032, [
				"sort-by",
				"page",
				"items-per-page",
				"selection",
				"class",
				"headers",
				"items",
				"items-length",
				"show-select"
			]), createVNode(unref(N8nSelectedItemsInfo_default), {
				class: normalizeClass(_ctx.$style["selection-bar"]),
				"selected-count": selectedWorkflowIds.value.length,
				onClearSelection: clearSelection
			}, {
				actions: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "outline",
					"data-test-id": "mcp-bulk-remove-access-button",
					label: unref(i18n).baseText("settings.mcp.workflows.table.action.removeMCPAccess"),
					onClick: onBulkRemoveMcpAccess
				}, null, 8, ["label"])]),
				_: 1
			}, 8, ["class", "selected-count"])], 2))]);
		};
	}
}), [["__cssModules", { "$style": {
	header: "_header_luegg_1",
	"table-container": "_table-container_luegg_7",
	"selection-bar": "_selection-bar_luegg_7",
	"workflow-table": "_workflow-table_luegg_16",
	"empty-state": "_empty-state_luegg_26",
	"workflow-cell": "_workflow-cell_luegg_36",
	"location-cell": "_location-cell_luegg_43",
	"description-cell": "_description-cell_luegg_47",
	"description-text": "_description-text_luegg_58",
	"empty-description": "_empty-description_luegg_67",
	"table-link": "_table-link_luegg_72",
	truncate: "_truncate_luegg_76"
} }]]);
//#endregion
//#region ../../modules/mcp/frontend/src/components/MCPWorkflowsSelect.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var MCPWorkflowsSelect_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "MCPWorkflowsSelect",
	props: /*@__PURE__*/ mergeModels({
		placeholder: {},
		disabled: { type: Boolean }
	}, {
		"modelValue": { default: () => [] },
		"modelModifiers": {}
	}),
	emits: /*@__PURE__*/ mergeModels(["ready", "confirm"], ["update:modelValue"]),
	setup(__props, { expose: __expose, emit: __emit }) {
		const i18n = useI18n();
		const toast = useToast();
		const modelValue = useModel(__props, "modelValue");
		const emit = __emit;
		const mcpStore = useMCPStore();
		const isLoading = ref(false);
		const hasFetched = ref(false);
		const isDropdownVisible = ref(false);
		const selectRef = ref();
		const workflowOptions = ref([]);
		let loadingTimeoutId = null;
		const showEmptyState = computed(() => {
			return !isLoading.value && hasFetched.value && workflowOptions.value.length === 0;
		});
		const $style = useCssModule();
		const popperClass = computed(() => [isLoading.value ? $style["mcp-workflows-select-loading"] : "", showEmptyState.value ? $style["mcp-workflows-select-empty"] : ""].filter(Boolean).join(" "));
		async function searchWorkflows(query) {
			if (loadingTimeoutId) {
				clearTimeout(loadingTimeoutId);
				loadingTimeoutId = null;
			}
			isLoading.value = true;
			hasFetched.value = false;
			try {
				const response = await mcpStore.getMcpEligibleWorkflows({
					take: 10,
					query: query ?? void 0
				});
				workflowOptions.value = response?.data ?? [];
			} catch (e) {
				toast.showError(e, i18n.baseText("settings.mcp.connectWorkflows.error"));
			} finally {
				await waitFor(200);
				isLoading.value = false;
				hasFetched.value = true;
			}
		}
		async function waitFor(timeout) {
			await new Promise((resolve) => {
				setTimeout(() => {
					resolve();
				}, timeout);
			});
		}
		function focusOnInput() {
			selectRef.value?.focusOnInput();
		}
		function onVisibleChange(visible) {
			isDropdownVisible.value = visible;
		}
		function onKeydownCapture(event) {
			if (event.key === "Enter" && !isDropdownVisible.value && modelValue.value.length > 0) {
				event.preventDefault();
				event.stopPropagation();
				emit("confirm");
			}
		}
		onMounted(async () => {
			await searchWorkflows();
			emit("ready");
		});
		__expose({ focusOnInput });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { onKeydownCapture: withKeys(onKeydownCapture, ["enter"]) }, [createVNode(unref(N8nSelect_default), {
				ref_key: "selectRef",
				ref: selectRef,
				modelValue: modelValue.value,
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => modelValue.value = $event),
				"data-test-id": "mcp-workflows-select",
				placeholder: __props.placeholder,
				disabled: __props.disabled,
				loading: isLoading.value,
				multiple: true,
				filterable: true,
				remote: true,
				"remote-method": searchWorkflows,
				size: "medium",
				"popper-class": popperClass.value,
				teleported: false,
				onVisibleChange
			}, {
				default: withCtx(() => [showEmptyState.value ? (openBlock(), createBlock(unref(N8nOption_default), {
					key: 0,
					value: "",
					disabled: "",
					class: normalizeClass(unref($style)["empty-option"])
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.mcp.connectWorkflows.emptyState")), 1)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true), (openBlock(true), createElementBlock(Fragment, null, renderList(workflowOptions.value, (workflow) => {
					return openBlock(), createBlock(unref(N8nOption_default), {
						key: workflow.id,
						value: workflow.id,
						label: workflow.name
					}, {
						default: withCtx(() => [createVNode(WorkflowLocation_default, {
							"workflow-id": workflow.id,
							"workflow-name": workflow.name,
							"home-project": workflow.homeProject,
							"parent-folder": workflow.parentFolder
						}, null, 8, [
							"workflow-id",
							"workflow-name",
							"home-project",
							"parent-folder"
						])]),
						_: 2
					}, 1032, ["value", "label"]);
				}), 128))]),
				_: 1
			}, 8, [
				"modelValue",
				"placeholder",
				"disabled",
				"loading",
				"popper-class"
			])], 32);
		};
	}
}), [["__cssModules", { "$style": {
	"mcp-workflows-select-loading": "_mcp-workflows-select-loading_l8bd8_1",
	"mcp-workflows-select-empty": "_mcp-workflows-select-empty_l8bd8_2",
	"empty-option": "_empty-option_l8bd8_9"
} }]]);
//#endregion
//#region ../../modules/mcp/frontend/src/modals/MCPConnectWorkflowsModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region ../../modules/mcp/frontend/src/modals/MCPConnectWorkflowsModal.vue
var MCPConnectWorkflowsModal_default = /* @__PURE__ */ defineComponent({
	__name: "MCPConnectWorkflowsModal",
	props: /*@__PURE__*/ mergeModels({ enableMcpAccess: { type: Function } }, {
		"open": {
			type: Boolean,
			default: false
		},
		"openModifiers": {}
	}),
	emits: ["update:open"],
	setup(__props) {
		const props = __props;
		const open = useModel(__props, "open");
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const isSaving = ref(false);
		const selectedWorkflowIds = ref([]);
		const selectRef = ref(null);
		const closedByAction = ref(false);
		const canSave = computed(() => selectedWorkflowIds.value.length > 0);
		watch(open, (isOpen) => {
			if (isOpen) {
				selectedWorkflowIds.value = [];
				closedByAction.value = false;
			} else if (!closedByAction.value) telemetry.track("User dismissed mcp workflows dialog");
		});
		async function save() {
			if (selectedWorkflowIds.value.length === 0) return;
			isSaving.value = true;
			try {
				await props.enableMcpAccess(selectedWorkflowIds.value);
				closedByAction.value = true;
				telemetry.track("User selected workflow from list", {
					workflowIds: selectedWorkflowIds.value,
					count: selectedWorkflowIds.value.length
				});
				open.value = false;
			} finally {
				isSaving.value = false;
			}
		}
		function onSelectReady() {
			selectRef.value?.focusOnInput();
		}
		function onConfirm() {
			if (!isSaving.value) save();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: open.value,
				"onUpdate:open": _cache[2] || (_cache[2] = ($event) => open.value = $event),
				size: "xlarge",
				header: unref(i18n).baseText("settings.mcp.connectWorkflows.modalTitle"),
				"close-on-overlay-click": false,
				"data-test-id": "mcp-connect-workflows-dialog"
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [createVNode(MCPWorkflowsSelect_default, {
						ref_key: "selectRef",
						ref: selectRef,
						modelValue: selectedWorkflowIds.value,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selectedWorkflowIds.value = $event),
						placeholder: unref(i18n).baseText("settings.mcp.connectWorkflows.input.placeholder"),
						disabled: isSaving.value,
						onReady: onSelectReady,
						onConfirm
					}, null, 8, [
						"modelValue",
						"placeholder",
						"disabled"
					])]),
					_: 1
				}), createVNode(unref(DialogFooter_default), null, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "outline",
						label: unref(i18n).baseText("generic.cancel"),
						disabled: isSaving.value,
						"data-test-id": "mcp-connect-workflows-cancel-button",
						onClick: _cache[1] || (_cache[1] = ($event) => open.value = false)
					}, null, 8, ["label", "disabled"]), createVNode(unref(N8nButton_default), {
						variant: "solid",
						label: unref(i18n).baseText("settings.mcp.connectWorkflows.confirm.label"),
						loading: isSaving.value,
						disabled: !canSave.value || isSaving.value,
						"data-test-id": "mcp-connect-workflows-save-button",
						onClick: save
					}, null, 8, [
						"label",
						"loading",
						"disabled"
					])]),
					_: 1
				})]),
				_: 1
			}, 8, ["open", "header"]);
		};
	}
});
//#endregion
//#region ../../modules/mcp/frontend/src/SettingsMCPWorkflowsView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { "data-test-id": "mcp-workflows-view" };
var SettingsMCPWorkflowsView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SettingsMCPWorkflowsView",
	setup(__props) {
		const i18n = useI18n();
		const toast = useToast();
		const telemetry = useTelemetry();
		const router = useRouter();
		const documentTitle = useDocumentTitle({ releaseChannel: useSettingsStore().settings.releaseChannel });
		const mcpStore = useMCPStore();
		const workflowsLoading = ref(false);
		const showConnectWorkflowsDialog = ref(false);
		const availableWorkflows = ref([]);
		const availableWorkflowsTotal = ref(0);
		const workflowsTableState = ref({
			page: 0,
			itemsPerPage: 10,
			sortBy: []
		});
		const workflowsTableItemsPerPage = ref(workflowsTableState.value.itemsPerPage);
		const showConnectWorkflowsButton = computed(() => availableWorkflowsTotal.value > 0);
		const showMcpAccessUpdatedToast = (count, enabled) => {
			toast.showMessage({
				type: "success",
				title: i18n.baseText(enabled ? "settings.mcp.workflows.enableAccess.success.title" : "settings.mcp.workflows.removeAccess.success.title", {
					adjustToNumber: count,
					interpolate: { count: String(count) }
				})
			});
		};
		const fetchAvailableWorkflows = async () => {
			workflowsLoading.value = true;
			try {
				const response = await mcpStore.fetchWorkflowsAvailableForMCPPage(workflowsTableState.value.page + 1, workflowsTableState.value.itemsPerPage);
				if (response.page !== workflowsTableState.value.page + 1) workflowsTableState.value = {
					...workflowsTableState.value,
					page: response.page - 1
				};
				availableWorkflows.value = response.data;
				availableWorkflowsTotal.value = response.count;
			} catch (error) {
				toast.showError(error, i18n.baseText("workflows.list.error.fetching"));
			} finally {
				setTimeout(() => {
					workflowsLoading.value = false;
				}, 200);
			}
		};
		const refreshWorkflowsFromFirstPage = async () => {
			workflowsTableState.value = {
				...workflowsTableState.value,
				page: 0
			};
			await fetchAvailableWorkflows();
		};
		const onWorkflowsTableUpdate = async (options) => {
			const pageSizeChanged = options.itemsPerPage !== workflowsTableItemsPerPage.value;
			workflowsTableState.value = {
				...options,
				page: pageSizeChanged ? 0 : options.page
			};
			workflowsTableItemsPerPage.value = options.itemsPerPage;
			await fetchAvailableWorkflows();
		};
		const onToggleWorkflowMCPAccess = async (workflowId, isEnabled) => {
			try {
				await mcpStore.toggleWorkflowMcpAccess(workflowId, isEnabled);
				if (isEnabled) await refreshWorkflowsFromFirstPage();
				else {
					showMcpAccessUpdatedToast(1, false);
					await fetchAvailableWorkflows();
				}
			} catch (error) {
				toast.showError(error, i18n.baseText("workflowSettings.toggleMCP.error.title"));
				throw error;
			}
		};
		const onBulkEnableWorkflowsMCPAccess = async (workflowIds) => {
			try {
				const response = await mcpStore.toggleWorkflowsMcpAccess({ workflowIds }, true);
				showMcpAccessUpdatedToast(response.updatedCount, true);
				await refreshWorkflowsFromFirstPage();
			} catch (error) {
				toast.showError(error, i18n.baseText("workflowSettings.toggleMCP.error.title"));
				throw error;
			}
		};
		const onBulkRemoveWorkflowsMCPAccess = async (workflowIds) => {
			try {
				const response = await mcpStore.toggleWorkflowsMcpAccess({ workflowIds }, false);
				showMcpAccessUpdatedToast(response.updatedCount, false);
				await fetchAvailableWorkflows();
			} catch (error) {
				toast.showError(error, i18n.baseText("workflowSettings.toggleMCP.error.title"));
			}
		};
		const onUpdateDescription = (workflow) => {
			use(modalOpeners).openModalWithData({
				name: WORKFLOW_DESCRIPTION_MODAL_KEY,
				data: {
					workflowId: workflow.id,
					workflowName: workflow.name,
					workflowDescription: workflow.description ?? "",
					onSave: (updatedDescription) => {
						const index = availableWorkflows.value.findIndex((w) => w.id === workflow.id);
						if (index !== -1) availableWorkflows.value[index] = {
							...availableWorkflows.value[index],
							description: updatedDescription ?? void 0
						};
					}
				}
			});
		};
		const openConnectWorkflowsModal = () => {
			showConnectWorkflowsDialog.value = true;
			telemetry.track("User clicked connect workflows from mcp settings");
		};
		const onBack = () => {
			router.push({ name: MCP_SETTINGS_VIEW });
		};
		onMounted(async () => {
			documentTitle.set(i18n.baseText("settings.mcp.workflowsExposed.page.title"));
			if (!mcpStore.mcpAccessEnabled) {
				await router.replace({ name: MCP_SETTINGS_VIEW });
				return;
			}
			await fetchAvailableWorkflows();
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SettingsLayout_default), {
				"full-width": "",
				"show-back": "",
				"back-label": unref(i18n).baseText("settings.mcp.back"),
				class: normalizeClass(_ctx.$style.layout),
				onBack
			}, {
				default: withCtx(() => [
					createVNode(unref(SettingsPageHeader_default), {
						title: unref(i18n).baseText("settings.mcp.workflowsExposed.page.title"),
						description: unref(i18n).baseText("settings.mcp.workflowsExposed.page.description"),
						"docs-url": unref(MCP_DOCS_PAGE_URL)
					}, null, 8, [
						"title",
						"description",
						"docs-url"
					]),
					createBaseVNode("div", _hoisted_1, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.actions) }, [showConnectWorkflowsButton.value ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 0,
						variant: "solid",
						label: unref(i18n).baseText("settings.mcp.connectWorkflows"),
						"data-test-id": "mcp-connect-workflows-header-button",
						size: "small",
						onClick: openConnectWorkflowsModal
					}, null, 8, ["label"])) : createCommentVNode("", true), createVNode(unref(N8nTooltip_default), { content: unref(i18n).baseText("settings.mcp.refresh.tooltip") }, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "outline",
							"icon-only": "",
							"data-test-id": "mcp-workflows-refresh-button",
							size: "small",
							icon: "refresh-cw",
							onClick: fetchAvailableWorkflows
						})]),
						_: 1
					}, 8, ["content"])], 2), createVNode(WorkflowsTable_default, {
						"table-options": workflowsTableState.value,
						"onUpdate:tableOptions": _cache[0] || (_cache[0] = ($event) => workflowsTableState.value = $event),
						workflows: availableWorkflows.value,
						"total-count": availableWorkflowsTotal.value,
						loading: workflowsLoading.value,
						onRemoveMcpAccess: _cache[1] || (_cache[1] = (workflow) => onToggleWorkflowMCPAccess(workflow.id, false)),
						onBulkRemoveMcpAccess: onBulkRemoveWorkflowsMCPAccess,
						onConnectWorkflows: openConnectWorkflowsModal,
						onUpdateDescription,
						"onUpdate:options": onWorkflowsTableUpdate,
						onRefresh: fetchAvailableWorkflows
					}, null, 8, [
						"table-options",
						"workflows",
						"total-count",
						"loading"
					])]),
					createVNode(MCPConnectWorkflowsModal_default, {
						open: showConnectWorkflowsDialog.value,
						"onUpdate:open": _cache[2] || (_cache[2] = ($event) => showConnectWorkflowsDialog.value = $event),
						"enable-mcp-access": onBulkEnableWorkflowsMCPAccess
					}, null, 8, ["open"])
				]),
				_: 1
			}, 8, ["back-label", "class"]);
		};
	}
}), [["__cssModules", { "$style": {
	layout: "_layout_1rja6_2",
	actions: "_actions_1rja6_15"
} }]]);
//#endregion
export { SettingsMCPWorkflowsView_default as default };
