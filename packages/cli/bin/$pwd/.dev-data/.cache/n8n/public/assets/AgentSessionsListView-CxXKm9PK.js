import "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Ud as createSlots, Vd as createCommentVNode, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, cu as ElDatePicker, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, nu as ElSkeletonItem, of as onBeforeUnmount, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Mh as AGENT_SESSION_DETAIL_VIEW, Mn as convertToDisplayDate, Nj as N8nPopover_default, Rc as useAgentTelemetry, SN as _plugin_vue_export_helper_default, XM as N8nActionDropdown_default, _M as Checkbox_default, _N as N8nText_default, dC as useToast, jN as useI18n, mM as N8nOption_default, nN as N8nBadge_default, pM as N8nSelect_default, wM as TableBase_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as useAgentConfirmationModal } from "./useAgentConfirmationModal-3kW3PApn.js";
import { i as defaultAgentSessionFilters, n as useThreadTitle, r as useAgentSessionsStore, t as useAgentSessionStop } from "./useAgentSessionStop-CtqFqela.js";
//#region src/features/agents/components/AgentSessionsFilter.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = { "data-test-id": "agent-sessions-filter-form" };
var _hoisted_2$1 = { for: "agent-sessions-filter-status" };
var _hoisted_3$1 = { for: "agent-sessions-filter-origin" };
var _hoisted_4$1 = { for: "agent-sessions-filter-start-date" };
var DATE_TIME_MASK = "YYYY-MM-DD HH:mm";
var AgentSessionsFilter_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentSessionsFilter",
	props: { modelValue: {} },
	emits: ["filterChanged"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const statuses = [
			{
				id: "all",
				name: i18n.baseText("agentSessions.filters.anyStatus")
			},
			{
				id: "running",
				name: i18n.baseText("agentSessions.status.running")
			},
			{
				id: "succeeded",
				name: i18n.baseText("agentSessions.status.succeeded")
			},
			{
				id: "error",
				name: i18n.baseText("agentSessions.status.error")
			},
			{
				id: "cancelled",
				name: i18n.baseText("agentSessions.status.cancelled")
			},
			{
				id: "interrupted",
				name: i18n.baseText("agentSessions.status.interrupted")
			},
			{
				id: "awaiting",
				name: i18n.baseText("agentSessions.status.awaiting")
			}
		];
		const origins = [
			{
				id: "all",
				name: i18n.baseText("agentSessions.filters.anyOrigin")
			},
			{
				id: "preview",
				name: i18n.baseText("agentSessions.origin.preview")
			},
			{
				id: "instance-ai",
				name: i18n.baseText("agentSessions.origin.instanceAi")
			},
			{
				id: "mcp",
				name: i18n.baseText("agentSessions.origin.mcp")
			},
			{
				id: "sub-agent",
				name: i18n.baseText("agentSessions.origin.subAgent")
			},
			{
				id: "schedule",
				name: i18n.baseText("agentSessions.origin.schedule")
			},
			{
				id: "workflow",
				name: i18n.baseText("agentSessions.origin.workflow")
			},
			{
				id: "n8n_chat_production",
				name: i18n.baseText("agentSessions.origin.n8nChat")
			},
			{
				id: "slack",
				name: i18n.baseText("agentSessions.origin.slack")
			},
			{
				id: "telegram",
				name: i18n.baseText("agentSessions.origin.telegram")
			},
			{
				id: "linear",
				name: i18n.baseText("agentSessions.origin.linear")
			},
			{
				id: "discord",
				name: i18n.baseText("agentSessions.origin.discord")
			},
			{
				id: "whatsapp",
				name: i18n.baseText("agentSessions.origin.whatsapp")
			},
			{
				id: "teams",
				name: i18n.baseText("agentSessions.origin.teams")
			},
			{
				id: "webhook",
				name: i18n.baseText("agentSessions.origin.webhook")
			},
			{
				id: "public_api",
				name: i18n.baseText("agentSessions.origin.publicApi")
			}
		];
		const activeFilterCount = computed(() => [
			props.modelValue.status !== "all",
			props.modelValue.origin !== "all",
			Boolean(props.modelValue.startDate),
			Boolean(props.modelValue.endDate)
		].filter(Boolean).length);
		function updateFilter(value) {
			emit("filterChanged", {
				...props.modelValue,
				...value
			});
		}
		function reset() {
			emit("filterChanged", defaultAgentSessionFilters());
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nPopover_default), {
				side: "bottom",
				align: "end",
				"position-strategy": "absolute",
				width: "calc(var(--spacing--5xl) + var(--spacing--4xl))",
				"content-class": _ctx.$style.popoverContent,
				"show-arrow": ""
			}, {
				trigger: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "outline",
					"icon-only": "",
					icon: "funnel",
					size: "medium",
					"aria-label": unref(i18n).baseText("forms.resourceFiltersDropdown.filters"),
					active: activeFilterCount.value > 0,
					"data-test-id": "agent-sessions-filter-button",
					class: normalizeClass(_ctx.$style.filterButton)
				}, createSlots({ _: 2 }, [activeFilterCount.value > 0 ? {
					name: "default",
					fn: withCtx(() => [createVNode(unref(N8nBadge_default), {
						variant: "primary",
						class: normalizeClass(_ctx.$style.filterBadge),
						"data-test-id": "agent-sessions-filter-badge"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(activeFilterCount.value), 1)]),
						_: 1
					}, 8, ["class"])]),
					key: "0"
				} : void 0]), 1032, [
					"aria-label",
					"active",
					"class"
				])]),
				content: withCtx(() => [createBaseVNode("div", _hoisted_1$1, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.group) }, [createBaseVNode("label", _hoisted_2$1, toDisplayString(unref(i18n).baseText("agentSessions.filters.status")), 1), createVNode(unref(N8nSelect_default), {
						id: "agent-sessions-filter-status",
						"model-value": props.modelValue.status,
						"data-test-id": "agent-sessions-filter-status",
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => updateFilter({ status: $event }))
					}, {
						default: withCtx(() => [(openBlock(), createElementBlock(Fragment, null, renderList(statuses, (status) => {
							return createVNode(unref(N8nOption_default), {
								key: status.id,
								label: status.name,
								value: status.id
							}, null, 8, ["label", "value"]);
						}), 64))]),
						_: 1
					}, 8, ["model-value"])], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.group) }, [createBaseVNode("label", _hoisted_3$1, toDisplayString(unref(i18n).baseText("agentSessions.filters.origin")), 1), createVNode(unref(N8nSelect_default), {
						id: "agent-sessions-filter-origin",
						"model-value": props.modelValue.origin,
						"data-test-id": "agent-sessions-filter-origin",
						"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => updateFilter({ origin: $event }))
					}, {
						default: withCtx(() => [(openBlock(), createElementBlock(Fragment, null, renderList(origins, (origin) => {
							return createVNode(unref(N8nOption_default), {
								key: origin.id,
								label: origin.name,
								value: origin.id
							}, null, 8, ["label", "value"]);
						}), 64))]),
						_: 1
					}, 8, ["model-value"])], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.group) }, [createBaseVNode("label", _hoisted_4$1, toDisplayString(unref(i18n).baseText("agentSessions.filters.lastActivity")), 1), createBaseVNode("div", { class: normalizeClass(_ctx.$style.dates) }, [
						createVNode(unref(ElDatePicker), {
							id: "agent-sessions-filter-start-date",
							"model-value": props.modelValue.startDate,
							type: "datetime",
							format: DATE_TIME_MASK,
							placeholder: unref(i18n).baseText("agentSessions.filters.earliest"),
							"data-test-id": "agent-sessions-filter-start-date",
							onChange: _cache[2] || (_cache[2] = ($event) => updateFilter({ startDate: $event ?? "" }))
						}, null, 8, ["model-value", "placeholder"]),
						createBaseVNode("span", { class: normalizeClass(_ctx.$style.divider) }, toDisplayString(unref(i18n).baseText("agentSessions.filters.to")), 3),
						createVNode(unref(ElDatePicker), {
							id: "agent-sessions-filter-end-date",
							"model-value": props.modelValue.endDate,
							type: "datetime",
							format: DATE_TIME_MASK,
							placeholder: unref(i18n).baseText("agentSessions.filters.latest"),
							"data-test-id": "agent-sessions-filter-end-date",
							onChange: _cache[3] || (_cache[3] = ($event) => updateFilter({ endDate: $event ?? "" }))
						}, null, 8, ["model-value", "placeholder"])
					], 2)], 2),
					activeFilterCount.value > 0 ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 0,
						variant: "ghost",
						size: "large",
						class: normalizeClass(_ctx.$style.resetButton),
						"data-test-id": "agent-sessions-filter-reset",
						onClick: reset
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agentSessions.filters.reset")), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true)
				])]),
				_: 1
			}, 8, ["content-class"]);
		};
	}
}), [["__cssModules", { "$style": {
	group: "_group_1a7ln_1",
	dates: "_dates_1a7ln_8",
	divider: "_divider_1a7ln_16",
	resetButton: "_resetButton_1a7ln_21",
	filterButton: "_filterButton_1a7ln_26",
	filterBadge: "_filterBadge_1a7ln_30",
	popoverContent: "_popoverContent_1a7ln_37"
} }], ["__scopeId", "data-v-4c981cdd"]]);
//#endregion
//#region src/features/agents/views/AgentSessionsListView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = ["data-status", "onClick"];
var _hoisted_2 = {
	colspan: 5,
	style: {
		"text-align": "center",
		"padding": "var(--spacing--lg)"
	}
};
var _hoisted_3 = { "data-test-id": "agent-sessions-empty" };
var _hoisted_4 = { colspan: 5 };
var AgentSessionsListView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentSessionsListView",
	props: {
		embedded: {
			type: Boolean,
			default: false
		},
		projectId: { default: void 0 },
		agentId: { default: void 0 },
		manageStoreLifecycle: {
			type: Boolean,
			default: true
		}
	},
	setup(__props) {
		const sessionFilterFields = [
			["status", "status"],
			["origin", "origin"],
			["startDate", "start_date"],
			["endDate", "end_date"]
		];
		const props = __props;
		const i18n = useI18n();
		const threadTitleOf = useThreadTitle();
		const route = useRoute();
		const router = useRouter();
		const toast = useToast();
		const { openAgentConfirmationModal } = useAgentConfirmationModal();
		const sessionsStore = useAgentSessionsStore();
		const agentTelemetry = useAgentTelemetry();
		let disposed = false;
		let managesStoreLifecycle = false;
		const projectId = computed(() => props.projectId ?? route.params.projectId);
		const agentId = computed(() => props.agentId ?? route.params.agentId);
		const { canStop, stoppingSessionIds, stop: stopSession } = useAgentSessionStop(projectId, agentId);
		const hasActiveFilters = computed(() => {
			const { status, origin, startDate, endDate } = sessionsStore.filters;
			return status !== "all" || origin !== "all" || Boolean(startDate) || Boolean(endDate);
		});
		function onVisibilityChange() {
			if (document.visibilityState !== "visible" || !sessionsStore.autoRefresh) return;
			if (!projectId.value || !agentId.value) return;
			sessionsStore.refreshThreads(projectId.value, agentId.value);
		}
		onMounted(async () => {
			if (!props.manageStoreLifecycle) return;
			managesStoreLifecycle = true;
			document.addEventListener("visibilitychange", onVisibilityChange);
			if (projectId.value && agentId.value) try {
				await sessionsStore.fetchThreads(projectId.value, agentId.value);
				if (disposed) return;
				sessionsStore.startAutoRefresh();
			} catch (error) {
				if (disposed) return;
				toast.showError(error, i18n.baseText("agentSessions.showError.load"));
			}
		});
		onBeforeUnmount(() => {
			disposed = true;
			if (!managesStoreLifecycle) return;
			document.removeEventListener("visibilitychange", onVisibilityChange);
			sessionsStore.stopAutoRefresh();
		});
		function formatDate(fullDate) {
			const { date, time } = convertToDisplayDate(fullDate);
			return `${date} ${time}`;
		}
		function formatDuration(ms) {
			if (ms < 1e3) return `${ms}ms`;
			const seconds = ms / 1e3;
			return Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`;
		}
		function statusColor(status) {
			if (status === "succeeded") return "success";
			if (status === "error") return "danger";
			if (status === "awaiting") return "secondary";
			if (status === "running") return "text-base";
			return "warning";
		}
		function statusLabel(status) {
			switch (status) {
				case "running": return i18n.baseText("agentSessions.status.running");
				case "succeeded": return i18n.baseText("agentSessions.status.succeeded");
				case "error": return i18n.baseText("agentSessions.status.error");
				case "cancelled": return i18n.baseText("agentSessions.status.cancelled");
				case "interrupted": return i18n.baseText("agentSessions.status.interrupted");
				case "awaiting": return i18n.baseText("agentSessions.status.awaiting");
			}
		}
		function originPresentation(thread) {
			const rawSource = thread.source?.trim();
			const source = rawSource ? rawSource.toLowerCase() : void 0;
			if (thread.parentThreadId || source === "subagent" || source === "sub-agent") return {
				icon: "bot",
				label: i18n.baseText("agentSessions.origin.subAgent")
			};
			if (thread.taskId || source === "task") return {
				icon: "clock",
				label: i18n.baseText("agentSessions.origin.schedule")
			};
			switch (source) {
				case "instance-ai": return {
					icon: "flask-conical",
					label: i18n.baseText("agentSessions.origin.instanceAi")
				};
				case "mcp": return {
					icon: "flask-conical",
					label: i18n.baseText("agentSessions.origin.mcp")
				};
				case "workflow": return {
					icon: "workflow",
					label: i18n.baseText("agentSessions.origin.workflow")
				};
				case "n8n_chat_production": return {
					icon: "message-square",
					label: i18n.baseText("agentSessions.origin.n8nChat")
				};
				case "webhook": return {
					icon: "plug",
					label: i18n.baseText("agentSessions.origin.webhook")
				};
				case "public_api": return {
					icon: "plug",
					label: i18n.baseText("agentSessions.origin.publicApi")
				};
				case "slack":
				case "telegram":
				case "linear":
				case "discord":
				case "teams": return {
					icon: source,
					label: source.charAt(0).toUpperCase() + source.slice(1)
				};
				case "whatsapp": return {
					icon: source,
					label: "WhatsApp"
				};
				case "chat":
				case "n8n_chat":
				case void 0: return {
					icon: "flask-conical",
					label: i18n.baseText("agentSessions.origin.preview")
				};
				default: return {
					icon: "plug",
					label: rawSource ? rawSource.charAt(0).toUpperCase() + rawSource.slice(1) : ""
				};
			}
		}
		function rowActions(thread) {
			const actions = [];
			if (thread.status === "running" && canStop.value) actions.push({
				id: "stop",
				label: i18n.baseText("agentSessions.stop"),
				icon: "square",
				variant: "destructive",
				disabled: stoppingSessionIds.value.has(thread.id)
			});
			if (thread.parentThreadId && thread.parentAgentId) actions.push({
				id: "goToParentRun",
				label: i18n.baseText("agentSessions.goToParentRun"),
				icon: "arrow-up-right"
			});
			actions.push({
				id: "delete",
				label: i18n.baseText("generic.delete"),
				icon: "trash-2",
				divided: actions.length > 0
			});
			return actions;
		}
		function onViewTrace(target) {
			const routeTarget = {
				name: AGENT_SESSION_DETAIL_VIEW,
				params: {
					projectId: projectId.value,
					agentId: target.agentId,
					threadId: target.threadId
				}
			};
			router.push(routeTarget);
		}
		async function onAction(actionId, thread) {
			if (actionId === "stop") {
				if (thread.status !== "running") return;
				const targetProjectId = projectId.value;
				const targetAgentId = agentId.value;
				if (await stopSession(thread.id)) await sessionsStore.refreshThreads(targetProjectId, targetAgentId);
				return;
			}
			if (actionId === "goToParentRun") {
				if (!thread.parentAgentId || !thread.parentThreadId) return;
				onViewTrace({
					agentId: thread.parentAgentId,
					threadId: thread.parentThreadId
				});
				return;
			}
			if (actionId !== "delete") return;
			if (await openAgentConfirmationModal({
				title: i18n.baseText("agentSessions.deleteConfirm.headline"),
				description: i18n.baseText("agentSessions.deleteConfirm.message"),
				isDestructive: true,
				confirmButtonText: i18n.baseText("agentSessions.deleteConfirm.confirmButtonText"),
				cancelButtonText: i18n.baseText("generic.cancel")
			}) !== "confirm") return;
			try {
				await sessionsStore.deleteThread(projectId.value, agentId.value, thread.id);
				toast.showMessage({
					title: i18n.baseText("agentSessions.showMessage.deleted"),
					type: "success"
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("agentSessions.showError.delete"));
			}
		}
		async function loadMore() {
			try {
				await sessionsStore.loadMore(projectId.value, agentId.value);
			} catch (error) {
				toast.showError(error, i18n.baseText("agentSessions.showError.load"));
			}
		}
		function onAutoRefreshChange(enabled) {
			if (enabled) sessionsStore.startAutoRefresh();
			else sessionsStore.stopAutoRefresh();
		}
		async function onFiltersChange(value) {
			const filterNames = sessionFilterFields.filter(([field]) => JSON.stringify(sessionsStore.filters[field]) !== JSON.stringify(value[field])).map(([, name]) => name);
			if (filterNames.length > 0) agentTelemetry.trackAppliedSessionFilter({
				agentId: agentId.value,
				filterNames
			});
			try {
				await sessionsStore.setFilters(projectId.value, agentId.value, value);
			} catch (error) {
				toast.showError(error, i18n.baseText("agentSessions.showError.load"));
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass([_ctx.$style.wrapper, { [_ctx.$style.embedded]: props.embedded }]) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.filters) }, [createVNode(unref(Checkbox_default), {
				modelValue: unref(sessionsStore).autoRefresh,
				"onUpdate:modelValue": [_cache[0] || (_cache[0] = ($event) => unref(sessionsStore).autoRefresh = $event), onAutoRefreshChange],
				"data-test-id": "agent-sessions-auto-refresh-checkbox",
				label: unref(i18n).baseText("executionsList.autoRefresh")
			}, null, 8, ["modelValue", "label"]), createVNode(AgentSessionsFilter_default, {
				"model-value": unref(sessionsStore).filters,
				onFilterChanged: onFiltersChange
			}, null, 8, ["model-value"])], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.tableContainer) }, [createVNode(unref(TableBase_default), { class: normalizeClass(_ctx.$style.sessionsTable) }, {
				default: withCtx(() => [createBaseVNode("tbody", null, [
					(openBlock(true), createElementBlock(Fragment, null, renderList(unref(sessionsStore).threads, (thread) => {
						return openBlock(), createElementBlock("tr", {
							key: thread.id,
							class: normalizeClass(_ctx.$style.clickableRow),
							"data-status": thread.status,
							"data-test-id": "agent-session-list-item",
							onClick: ($event) => onViewTrace({
								agentId: agentId.value,
								threadId: thread.id
							})
						}, [
							createBaseVNode("td", { class: normalizeClass(_ctx.$style.titleCell) }, [createBaseVNode("button", {
								type: "button",
								class: normalizeClass(_ctx.$style.sessionOpen),
								"data-test-id": "agent-session-open"
							}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.sessionTitleRow) }, [createBaseVNode("span", {
								class: normalizeClass(_ctx.$style.sessionTitle),
								"data-test-id": "agent-session-title"
							}, toDisplayString(unref(threadTitleOf)(thread)), 3), thread.status ? (openBlock(), createElementBlock("span", {
								key: 0,
								class: normalizeClass(_ctx.$style.statusRow)
							}, [createVNode(unref(N8nText_default), {
								color: statusColor(thread.status),
								size: "small",
								"data-testid": "agent-session-status-indicator"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(statusLabel(thread.status)), 1)]),
								_: 2
							}, 1032, ["color"]), thread.status !== "running" ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 0,
								color: "text-base",
								size: "small",
								"data-testid": "agent-session-status-duration"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("executionDetails.runningTimeFinished", { interpolate: { time: formatDuration(thread.totalDuration) } })), 1)]),
								_: 2
							}, 1024)) : createCommentVNode("", true)], 2)) : createCommentVNode("", true)], 2)], 2)], 2),
							createBaseVNode("td", {
								class: normalizeClass(_ctx.$style.originCell),
								"data-test-id": "agent-session-origin"
							}, [createVNode(unref(N8nBadge_default), {
								"leading-icon": originPresentation(thread).icon,
								"data-test-id": "agent-session-origin-pill"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(originPresentation(thread).label), 1)]),
								_: 2
							}, 1032, ["leading-icon"])], 2),
							createBaseVNode("td", {
								class: normalizeClass(_ctx.$style.dateCell),
								"data-test-id": "agent-session-updated-at"
							}, toDisplayString(formatDate(thread.updatedAt)), 3),
							createBaseVNode("td", {
								class: normalizeClass(_ctx.$style.tokenCell),
								"data-test-id": "agent-session-token-usage"
							}, toDisplayString((thread.totalPromptTokens + thread.totalCompletionTokens).toLocaleString()) + "t ", 3),
							createBaseVNode("td", {
								class: normalizeClass(_ctx.$style.actionCell),
								onClick: _cache[1] || (_cache[1] = withModifiers(() => {}, ["stop"]))
							}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.actionGroup) }, [createVNode(unref(N8nActionDropdown_default), {
								items: rowActions(thread),
								"activator-icon": "ellipsis",
								"data-test-id": "agent-session-actions",
								onSelect: ($event) => onAction($event, thread)
							}, null, 8, ["items", "onSelect"])], 2)], 2)
						], 10, _hoisted_1);
					}), 128)),
					unref(sessionsStore).loading && !unref(sessionsStore).threads.length ? (openBlock(), createElementBlock(Fragment, { key: 0 }, renderList(5, (item) => {
						return createBaseVNode("tr", {
							key: item,
							class: normalizeClass(_ctx.$style.skeletonRow)
						}, [(openBlock(), createElementBlock(Fragment, null, renderList(5, (col) => {
							return createBaseVNode("td", { key: col }, [createVNode(unref(ElSkeletonItem))]);
						}), 64))], 2);
					}), 64)) : createCommentVNode("", true),
					!unref(sessionsStore).loading && !unref(sessionsStore).threads.length ? (openBlock(), createElementBlock("tr", {
						key: 1,
						class: normalizeClass(_ctx.$style.lastRow)
					}, [createBaseVNode("td", _hoisted_2, [!unref(sessionsStore).threads.length && !unref(sessionsStore).loading ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.emptyState)
					}, [createBaseVNode("span", _hoisted_3, toDisplayString(unref(i18n).baseText(hasActiveFilters.value ? "agentSessions.emptyWithFilters" : "agentSessions.empty")), 1), !hasActiveFilters.value ? (openBlock(), createElementBlock("span", {
						key: 0,
						class: normalizeClass(_ctx.$style.emptyStateDescription),
						"data-test-id": "agent-sessions-empty-description"
					}, toDisplayString(unref(i18n).baseText("agentSessions.emptyDescription")), 3)) : createCommentVNode("", true)], 2)) : createCommentVNode("", true)])], 2)) : createCommentVNode("", true),
					unref(sessionsStore).nextCursor ? (openBlock(), createElementBlock("tr", {
						key: 2,
						class: normalizeClass(_ctx.$style.lastRow)
					}, [createBaseVNode("td", _hoisted_4, [createVNode(unref(N8nButton_default), {
						icon: "refresh-cw",
						variant: "ghost",
						title: unref(i18n).baseText("agentSessions.loadMore"),
						label: unref(i18n).baseText("agentSessions.loadMore"),
						loading: unref(sessionsStore).loading,
						"data-test-id": "agent-sessions-load-more",
						onClick: _cache[2] || (_cache[2] = ($event) => loadMore())
					}, null, 8, [
						"title",
						"label",
						"loading"
					])])], 2)) : createCommentVNode("", true)
				])]),
				_: 1
			}, 8, ["class"])], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	wrapper: "_wrapper_7e6x7_3",
	embedded: "_embedded_7e6x7_16",
	tableContainer: "_tableContainer_7e6x7_22",
	sessionsTable: "_sessionsTable_7e6x7_31",
	filters: "_filters_7e6x7_52",
	titleCell: "_titleCell_7e6x7_58",
	sessionTitle: "_sessionTitle_7e6x7_64",
	sessionTitleRow: "_sessionTitleRow_7e6x7_75",
	statusRow: "_statusRow_7e6x7_83",
	sessionOpen: "_sessionOpen_7e6x7_90",
	originCell: "_originCell_7e6x7_107",
	dateCell: "_dateCell_7e6x7_108",
	tokenCell: "_tokenCell_7e6x7_109",
	originPill: "_originPill_7e6x7_114",
	actionCell: "_actionCell_7e6x7_135",
	actionGroup: "_actionGroup_7e6x7_142",
	clickableRow: "_clickableRow_7e6x7_149",
	skeletonRow: "_skeletonRow_7e6x7_178",
	lastRow: "_lastRow_7e6x7_182",
	emptyState: "_emptyState_7e6x7_196",
	emptyStateDescription: "_emptyStateDescription_7e6x7_204"
} }]]);
//#endregion
export { AgentSessionsListView_default as t };
