import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Md as withKeys, Nf as init_reactivity_esm_bundler, Od as useCssModule, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, nf as mergeModels, xf as useModel, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Bk as sleep, Gt as useMCPStore, Hj as SettingsPageHeader_default, KA as Dialog_default, Kj as N8nNotice_default, Nh as AGENT_VIEW, Ph as PROJECT_AGENTS, Qt as MCP_DOCS_PAGE_URL, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, Uj as SettingsLayout_default, WA as DialogBody_default, Wj as N8nSelectedItemsInfo_default, YM as N8nActionToggle_default, _N as N8nText_default, dC as useToast, ej as N8nDataTableServer_default, en as MCP_SETTINGS_VIEW, fN as N8nTooltip_default, hC as useTelemetry, hM as N8nLink_default, jN as useI18n, mM as N8nOption_default, pM as N8nSelect_default, qd as useDocumentTitle, tN as N8nLoading_default, wy as TELEMETRY_EVENT, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
//#region ../../modules/mcp/frontend/src/components/tabs/AgentsTable.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = { key: 0 };
var AgentsTable_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentsTable",
	props: /*@__PURE__*/ mergeModels({
		agents: {},
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
		"connectAgents",
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
		const itemsLength = computed(() => props.totalCount ?? props.agents.length);
		const selectedAgentIds = ref([]);
		watch(() => props.agents, () => {
			selectedAgentIds.value = [];
		});
		const clearSelection = () => {
			selectedAgentIds.value = [];
		};
		const onBulkRemoveMcpAccess = () => {
			emit("bulkRemoveMcpAccess", selectedAgentIds.value);
		};
		const tableHeaders = ref([
			{
				title: i18n.baseText("settings.mcp.agents.table.column.name"),
				key: "agent",
				width: 300,
				disableSort: true,
				value() {}
			},
			{
				title: i18n.baseText("settings.mcp.agents.table.column.location"),
				key: "location",
				width: 300,
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
		const availableActions = [{
			label: i18n.baseText("settings.mcp.agents.table.action.removeMCPAccess"),
			value: "removeFromMCP"
		}];
		const onAgentAction = (action, agent) => {
			if (action === "removeFromMCP") emit("removeMcpAccess", agent);
		};
		const onConnectClick = () => {
			emit("connectAgents");
		};
		const agentLink = (agent) => router.resolve({
			name: AGENT_VIEW,
			params: {
				projectId: agent.projectId,
				agentId: agent.id
			}
		}).fullPath;
		const projectName = (agent) => agent.project?.type === "personal" ? i18n.baseText("projects.menu.personal") : agent.project?.name ?? "";
		const projectLink = (agent) => router.resolve({
			name: PROJECT_AGENTS,
			params: { projectId: agent.projectId }
		}).fullPath;
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
				selection: selectedAgentIds.value,
				"onUpdate:selection": _cache[3] || (_cache[3] = ($event) => selectedAgentIds.value = $event),
				class: normalizeClass(_ctx.$style["agent-table"]),
				"data-test-id": "mcp-agent-table",
				headers: tableHeaders.value,
				items: props.agents,
				"items-length": itemsLength.value,
				"page-sizes": [
					10,
					25,
					50
				],
				"show-select": itemsLength.value > 0,
				"onUpdate:options": _cache[4] || (_cache[4] = ($event) => emit("update:options", $event))
			}, createSlots({
				[`item.agent`]: withCtx(({ item }) => [createBaseVNode("div", {
					class: normalizeClass(_ctx.$style["agent-cell"]),
					"data-test-id": "mcp-agent-cell"
				}, [createVNode(unref(N8nLink_default), {
					"data-test-id": "mcp-agent-name-link",
					"new-window": true,
					to: agentLink(item),
					theme: "text",
					class: normalizeClass([_ctx.$style["table-link"], _ctx.$style.truncate])
				}, {
					default: withCtx(() => [createVNode(unref(N8nText_default), {
						class: normalizeClass(_ctx.$style.truncate),
						"data-test-id": "mcp-agent-name"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(item.name), 1)]),
						_: 2
					}, 1032, ["class"])]),
					_: 2
				}, 1032, ["to", "class"])], 2)]),
				[`item.location`]: withCtx(({ item }) => [createBaseVNode("div", {
					class: normalizeClass(_ctx.$style["location-cell"]),
					"data-test-id": "mcp-agent-location-cell"
				}, [createVNode(unref(N8nLink_default), {
					"data-test-id": "mcp-agent-project-link",
					"new-window": true,
					to: projectLink(item),
					theme: "text",
					class: normalizeClass([_ctx.$style["table-link"], _ctx.$style.truncate])
				}, {
					default: withCtx(() => [createVNode(unref(N8nText_default), {
						class: normalizeClass(_ctx.$style.truncate),
						"data-test-id": "mcp-agent-project-name"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(projectName(item)), 1)]),
						_: 2
					}, 1032, ["class"])]),
					_: 2
				}, 1032, ["to", "class"])], 2)]),
				[`item.actions`]: withCtx(({ item }) => [createVNode(unref(N8nActionToggle_default), {
					class: normalizeClass(_ctx.$style["action-toggle"]),
					"data-test-id": "mcp-agent-action-toggle",
					placement: "bottom",
					actions: availableActions,
					theme: "dark",
					onAction: ($event) => onAgentAction($event, item)
				}, null, 8, ["class", "onAction"])]),
				_: 2
			}, [itemsLength.value === 0 ? {
				name: "cover",
				fn: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style["empty-state"]) }, [
					createVNode(unref(N8nText_default), {
						"data-test-id": "mcp-agent-table-empty-state",
						size: "large",
						color: "text-base"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.mcp.agents.table.empty.title")), 1)]),
						_: 1
					}),
					createVNode(unref(N8nText_default), {
						"data-test-id": "mcp-agent-table-empty-state-description",
						size: "small",
						color: "text-base"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.mcp.agents.table.empty.description")), 1)]),
						_: 1
					}),
					createVNode(unref(N8nButton_default), {
						variant: "solid",
						"data-test-id": "mcp-agent-table-empty-state-button",
						label: unref(i18n).baseText("settings.mcp.connectAgents"),
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
				"selected-count": selectedAgentIds.value.length,
				onClearSelection: clearSelection
			}, {
				actions: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "outline",
					"data-test-id": "mcp-bulk-remove-agent-access-button",
					label: unref(i18n).baseText("settings.mcp.agents.table.action.removeMCPAccess"),
					onClick: onBulkRemoveMcpAccess
				}, null, 8, ["label"])]),
				_: 1
			}, 8, ["class", "selected-count"])], 2))]);
		};
	}
}), [["__cssModules", { "$style": {
	"table-container": "_table-container_1kf6q_1",
	"selection-bar": "_selection-bar_1kf6q_1",
	"agent-table": "_agent-table_1kf6q_10",
	"empty-state": "_empty-state_1kf6q_20",
	"agent-cell": "_agent-cell_1kf6q_30",
	"location-cell": "_location-cell_1kf6q_37",
	"table-link": "_table-link_1kf6q_44",
	truncate: "_truncate_1kf6q_48"
} }]]);
//#endregion
//#region ../../modules/mcp/frontend/src/components/MCPAgentsSelect.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var MCPAgentsSelect_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "MCPAgentsSelect",
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
		const agentOptions = ref([]);
		let loadingTimeoutId = null;
		const showEmptyState = computed(() => {
			return !isLoading.value && hasFetched.value && agentOptions.value.length === 0;
		});
		const $style = useCssModule();
		const popperClass = computed(() => [isLoading.value ? $style["mcp-agents-select-loading"] : "", showEmptyState.value ? $style["mcp-agents-select-empty"] : ""].filter(Boolean).join(" "));
		const projectName = (agent) => agent.project?.type === "personal" ? i18n.baseText("projects.menu.personal") : agent.project?.name ?? "";
		async function searchAgents(query) {
			if (loadingTimeoutId) {
				clearTimeout(loadingTimeoutId);
				loadingTimeoutId = null;
			}
			isLoading.value = true;
			hasFetched.value = false;
			try {
				const response = await mcpStore.getMcpEligibleAgents({
					limit: 10,
					query: query ?? void 0
				});
				agentOptions.value = response?.data ?? [];
			} catch (e) {
				toast.showError(e, i18n.baseText("settings.mcp.connectAgents.error"));
			} finally {
				await sleep(200);
				isLoading.value = false;
				hasFetched.value = true;
			}
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
			await searchAgents();
			emit("ready");
		});
		__expose({ focusOnInput });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { onKeydownCapture: withKeys(onKeydownCapture, ["enter"]) }, [createVNode(unref(N8nSelect_default), {
				ref_key: "selectRef",
				ref: selectRef,
				modelValue: modelValue.value,
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => modelValue.value = $event),
				"data-test-id": "mcp-agents-select",
				placeholder: __props.placeholder,
				disabled: __props.disabled,
				loading: isLoading.value,
				multiple: true,
				filterable: true,
				remote: true,
				"remote-method": searchAgents,
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
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.mcp.connectAgents.emptyState")), 1)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true), (openBlock(true), createElementBlock(Fragment, null, renderList(agentOptions.value, (agent) => {
					return openBlock(), createBlock(unref(N8nOption_default), {
						key: agent.id,
						value: agent.id,
						label: agent.name
					}, {
						default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(unref($style).option) }, [
							createVNode(unref(N8nText_default), { class: normalizeClass(unref($style).truncate) }, {
								default: withCtx(() => [createTextVNode(toDisplayString(projectName(agent)), 1)]),
								_: 2
							}, 1032, ["class"]),
							createBaseVNode("span", { class: normalizeClass(unref($style).separator) }, "/", 2),
							createVNode(unref(N8nText_default), {
								class: normalizeClass(unref($style).truncate),
								color: "text-dark"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(agent.name), 1)]),
								_: 2
							}, 1032, ["class"])
						], 2)]),
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
	"mcp-agents-select-loading": "_mcp-agents-select-loading_1n5y3_1",
	"mcp-agents-select-empty": "_mcp-agents-select-empty_1n5y3_2",
	"empty-option": "_empty-option_1n5y3_9",
	option: "_option_1n5y3_14",
	separator: "_separator_1n5y3_22",
	truncate: "_truncate_1n5y3_27"
} }]]);
//#endregion
//#region ../../modules/mcp/frontend/src/modals/MCPConnectAgentsModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var MCPConnectAgentsModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "MCPConnectAgentsModal",
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
		const selectedAgentIds = ref([]);
		const selectRef = ref(null);
		const closedByAction = ref(false);
		const canSave = computed(() => selectedAgentIds.value.length > 0);
		watch(open, (isOpen) => {
			if (isOpen) {
				selectedAgentIds.value = [];
				closedByAction.value = false;
			} else if (!closedByAction.value) telemetry.track(TELEMETRY_EVENT.AGENTS.USER_DISMISSED_MCP_AGENTS_DIALOG, {});
		});
		async function save() {
			if (selectedAgentIds.value.length === 0) return;
			isSaving.value = true;
			try {
				await props.enableMcpAccess(selectedAgentIds.value);
				closedByAction.value = true;
				telemetry.track(TELEMETRY_EVENT.AGENTS.USER_SELECTED_AGENTS_FOR_MCP, {
					agentIds: selectedAgentIds.value,
					count: selectedAgentIds.value.length
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
				header: unref(i18n).baseText("settings.mcp.connectAgents.modalTitle"),
				"close-on-overlay-click": false,
				"data-test-id": "mcp-connect-agents-dialog"
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [createVNode(unref(N8nNotice_default), {
						"data-test-id": "mcp-connect-agents-info-notice",
						theme: "info",
						content: unref(i18n).baseText("settings.mcp.connectAgents.notice"),
						class: normalizeClass(_ctx.$style.notice)
					}, null, 8, ["content", "class"]), createVNode(MCPAgentsSelect_default, {
						ref_key: "selectRef",
						ref: selectRef,
						modelValue: selectedAgentIds.value,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selectedAgentIds.value = $event),
						placeholder: unref(i18n).baseText("settings.mcp.connectAgents.input.placeholder"),
						disabled: isSaving.value,
						onReady: onSelectReady,
						onConfirm
					}, null, 8, [
						"modelValue",
						"placeholder",
						"disabled"
					])], 2)]),
					_: 1
				}), createVNode(unref(DialogFooter_default), null, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "outline",
						label: unref(i18n).baseText("generic.cancel"),
						disabled: isSaving.value,
						"data-test-id": "mcp-connect-agents-cancel-button",
						onClick: _cache[1] || (_cache[1] = ($event) => open.value = false)
					}, null, 8, ["label", "disabled"]), createVNode(unref(N8nButton_default), {
						variant: "solid",
						label: unref(i18n).baseText("settings.mcp.connectAgents.confirm.label"),
						loading: isSaving.value,
						disabled: !canSave.value || isSaving.value,
						"data-test-id": "mcp-connect-agents-save-button",
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
}), [["__cssModules", { "$style": {
	content: "_content_16gbq_1",
	notice: "_notice_16gbq_6"
} }]]);
//#endregion
//#region ../../modules/mcp/frontend/src/SettingsMCPAgentsView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { "data-test-id": "mcp-agents-view" };
var SettingsMCPAgentsView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SettingsMCPAgentsView",
	setup(__props) {
		const i18n = useI18n();
		const toast = useToast();
		const telemetry = useTelemetry();
		const router = useRouter();
		const documentTitle = useDocumentTitle({ releaseChannel: useSettingsStore().settings.releaseChannel });
		const mcpStore = useMCPStore();
		const settingsStore = useSettingsStore();
		const agentsLoading = ref(false);
		const showConnectAgentsDialog = ref(false);
		const availableAgents = ref([]);
		const availableAgentsTotal = ref(0);
		const agentsTableState = ref({
			page: 0,
			itemsPerPage: 10,
			sortBy: []
		});
		const agentsTableItemsPerPage = ref(agentsTableState.value.itemsPerPage);
		const showConnectAgentsButton = computed(() => availableAgentsTotal.value > 0);
		const showMcpAccessUpdatedToast = (count, enabled) => {
			toast.showMessage({
				type: "success",
				title: i18n.baseText(enabled ? "settings.mcp.agents.enableAccess.success.title" : "settings.mcp.agents.removeAccess.success.title", {
					adjustToNumber: count,
					interpolate: { count: String(count) }
				})
			});
		};
		const fetchAvailableAgents = async () => {
			agentsLoading.value = true;
			try {
				const response = await mcpStore.fetchAgentsAvailableForMCPPage(agentsTableState.value.page + 1, agentsTableState.value.itemsPerPage);
				if (response.page !== agentsTableState.value.page + 1) agentsTableState.value = {
					...agentsTableState.value,
					page: response.page - 1
				};
				availableAgents.value = response.data;
				availableAgentsTotal.value = response.count;
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.mcp.agents.list.error.fetching"));
			} finally {
				setTimeout(() => {
					agentsLoading.value = false;
				}, 200);
			}
		};
		const refreshAgentsFromFirstPage = async () => {
			agentsTableState.value = {
				...agentsTableState.value,
				page: 0
			};
			await fetchAvailableAgents();
		};
		const onAgentsTableUpdate = async (options) => {
			const pageSizeChanged = options.itemsPerPage !== agentsTableItemsPerPage.value;
			agentsTableState.value = {
				...options,
				page: pageSizeChanged ? 0 : options.page
			};
			agentsTableItemsPerPage.value = options.itemsPerPage;
			await fetchAvailableAgents();
		};
		const onToggleAgentMCPAccess = async (agentId, isEnabled) => {
			try {
				await mcpStore.toggleAgentMcpAccess(agentId, isEnabled);
				if (isEnabled) await refreshAgentsFromFirstPage();
				else {
					showMcpAccessUpdatedToast(1, false);
					await fetchAvailableAgents();
				}
			} catch (error) {
				toast.showError(error, i18n.baseText("agents.toggleMCP.error.title"));
				throw error;
			}
		};
		const onBulkEnableAgentsMCPAccess = async (agentIds) => {
			try {
				const response = await mcpStore.toggleAgentsMcpAccess({ agentIds }, true);
				showMcpAccessUpdatedToast(response.updatedCount, true);
				await refreshAgentsFromFirstPage();
			} catch (error) {
				toast.showError(error, i18n.baseText("agents.toggleMCP.error.title"));
				throw error;
			}
		};
		const onBulkRemoveAgentsMCPAccess = async (agentIds) => {
			try {
				const response = await mcpStore.toggleAgentsMcpAccess({ agentIds }, false);
				showMcpAccessUpdatedToast(response.updatedCount, false);
				await fetchAvailableAgents();
			} catch (error) {
				toast.showError(error, i18n.baseText("agents.toggleMCP.error.title"));
			}
		};
		const openConnectAgentsModal = () => {
			showConnectAgentsDialog.value = true;
			telemetry.track(TELEMETRY_EVENT.AGENTS.USER_CLICKED_CONNECT_AGENTS_FROM_MCP_SETTINGS, {});
		};
		const onBack = () => {
			router.push({ name: MCP_SETTINGS_VIEW });
		};
		onMounted(async () => {
			documentTitle.set(i18n.baseText("settings.mcp.agentsExposed.page.title"));
			if (!mcpStore.mcpAccessEnabled || !settingsStore.isAgentsEnabled) {
				await router.replace({ name: MCP_SETTINGS_VIEW });
				return;
			}
			await fetchAvailableAgents();
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
						title: unref(i18n).baseText("settings.mcp.agentsExposed.page.title"),
						description: unref(i18n).baseText("settings.mcp.agentsExposed.page.description"),
						"docs-url": unref(MCP_DOCS_PAGE_URL)
					}, null, 8, [
						"title",
						"description",
						"docs-url"
					]),
					createBaseVNode("div", _hoisted_1, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.actions) }, [showConnectAgentsButton.value ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 0,
						variant: "solid",
						label: unref(i18n).baseText("settings.mcp.connectAgents"),
						"data-test-id": "mcp-connect-agents-header-button",
						size: "small",
						onClick: openConnectAgentsModal
					}, null, 8, ["label"])) : createCommentVNode("", true), createVNode(unref(N8nTooltip_default), { content: unref(i18n).baseText("settings.mcp.refresh.tooltip") }, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "outline",
							"icon-only": "",
							"data-test-id": "mcp-agents-refresh-button",
							size: "small",
							icon: "refresh-cw",
							onClick: fetchAvailableAgents
						})]),
						_: 1
					}, 8, ["content"])], 2), createVNode(AgentsTable_default, {
						"table-options": agentsTableState.value,
						"onUpdate:tableOptions": _cache[0] || (_cache[0] = ($event) => agentsTableState.value = $event),
						agents: availableAgents.value,
						"total-count": availableAgentsTotal.value,
						loading: agentsLoading.value,
						onRemoveMcpAccess: _cache[1] || (_cache[1] = (agent) => onToggleAgentMCPAccess(agent.id, false)),
						onBulkRemoveMcpAccess: onBulkRemoveAgentsMCPAccess,
						onConnectAgents: openConnectAgentsModal,
						"onUpdate:options": onAgentsTableUpdate
					}, null, 8, [
						"table-options",
						"agents",
						"total-count",
						"loading"
					])]),
					createVNode(MCPConnectAgentsModal_default, {
						open: showConnectAgentsDialog.value,
						"onUpdate:open": _cache[2] || (_cache[2] = ($event) => showConnectAgentsDialog.value = $event),
						"enable-mcp-access": onBulkEnableAgentsMCPAccess
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
export { SettingsMCPAgentsView_default as default };
