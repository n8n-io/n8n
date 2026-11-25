import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, af as onBeforeMount, ff as openBlock, hf as renderSlot, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, of as onBeforeUnmount, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Kd as useDocumentTitle, NM as N8nCard_default, Ru as usePageRedirectionHelper, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, Vr as useClipboard, Xc as usePushConnectionStore, _N as N8nText_default, bC as useRootStore, bN as N8nSpinner_default, dC as useToast, hC as useTelemetry, jN as useI18n, mc as sortByProperty, xM as N8nEmptyState_default, xN as N8nIcon_default, yC as useSettingsStore } from "./app-D5flEmb-.js";
import { n as useOrchestrationStore, t as usePushConnection } from "./usePushConnection-B4aIEl0f.js";
import { t as ConnectionTracker_default } from "./ConnectionTracker-D5iqGAKh.js";
import "./usePushConnection-wBo-ZJFz.js";
import { n as Chart } from "./dist-nd1xIsJf.js";
//#region src/features/settings/orchestration.ee/orchestration.utils.ts
function averageWorkerLoadFromLoads(loads) {
	return loads.reduce((prev, curr) => prev + curr, 0) / loads.length;
}
function averageWorkerLoadFromLoadsAsString(loads) {
	return averageWorkerLoadFromLoads(loads).toFixed(2);
}
function memAsGb(mem, decimalPlaces = 2) {
	return Number((mem / 1024 / 1024 / 1024).toFixed(decimalPlaces));
}
function memAsMb(mem, decimalPlaces = 2) {
	return Number((mem / 1024 / 1024).toFixed(decimalPlaces));
}
//#endregion
//#region src/features/settings/orchestration.ee/components/WorkerAccordion.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var WorkerAccordion_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkerAccordion",
	props: {
		icon: { default: "list-checks" },
		iconColor: { default: "text-dark" },
		initialExpanded: {
			type: Boolean,
			default: true
		}
	},
	setup(__props) {
		const expanded = ref(__props.initialExpanded);
		function toggle() {
			expanded.value = !expanded.value;
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(["accordion", _ctx.$style.container]) }, [createBaseVNode("div", {
				class: normalizeClass({
					[_ctx.$style.header]: true,
					[_ctx.$style.expanded]: expanded.value
				}),
				onClick: toggle
			}, [
				createVNode(unref(N8nIcon_default), {
					icon: __props.icon,
					color: __props.iconColor,
					size: "small",
					class: "mr-2xs"
				}, null, 8, ["icon", "color"]),
				createVNode(unref(N8nText_default), {
					class: normalizeClass(_ctx.$style.headerText),
					color: "text-base",
					size: "small",
					align: "left",
					bold: ""
				}, {
					default: withCtx(() => [renderSlot(_ctx.$slots, "title")]),
					_: 3
				}, 8, ["class"]),
				createVNode(unref(N8nIcon_default), {
					icon: expanded.value ? "chevron-up" : "chevron-down",
					bold: ""
				}, null, 8, ["icon"])
			], 2), expanded.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass({
					[_ctx.$style.description]: true,
					[_ctx.$style.collapsed]: !expanded.value
				})
			}, [renderSlot(_ctx.$slots, "content")], 2)) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1ouuz_1",
	header: "_header_1ouuz_5",
	headerText: "_headerText_1ouuz_11",
	expanded: "_expanded_1ouuz_15",
	description: "_description_1ouuz_19"
} }]]);
//#endregion
//#region src/features/settings/orchestration.ee/components/WorkerJobAccordion.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$4 = ["href"];
var _hoisted_2$1 = ["href"];
var WorkerJobAccordion_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkerJobAccordion",
	props: { items: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		function runningSince(started) {
			let seconds = Math.floor(((/* @__PURE__ */ new Date()).getTime() - started.getTime()) / 1e3);
			const hrs = Math.floor(seconds / 3600);
			seconds -= hrs * 3600;
			const mnts = Math.floor(seconds / 60);
			seconds -= mnts * 60;
			return `${hrs}h ${mnts}m ${Math.floor(seconds)}s`;
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(WorkerAccordion_default, {
				icon: "list-checks",
				"icon-color": "text-dark",
				"initial-expanded": true
			}, {
				title: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workerList.item.jobListTitle")) + " (" + toDisplayString(__props.items.length) + ") ", 1)]),
				content: withCtx(() => [props.items.length > 0 ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.accordionItems)
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(props.items, (item) => {
					return openBlock(), createElementBlock("div", {
						key: item.executionId,
						class: normalizeClass(_ctx.$style.accordionItem)
					}, [
						createBaseVNode("a", { href: "/workflow/" + item.workflowId + "/executions/" + item.executionId }, " Execution " + toDisplayString(item.executionId) + " - " + toDisplayString(item.workflowName), 9, _hoisted_1$4),
						createVNode(unref(N8nText_default), {
							color: "text-base",
							size: "small",
							align: "left"
						}, {
							default: withCtx(() => [createTextVNode(" | Started at: " + toDisplayString(new Date(item.startedAt).toLocaleTimeString()) + " | Running for " + toDisplayString(runningSince(new Date(item.startedAt))) + " " + toDisplayString(item.retryOf ? `| Retry of: ${item.retryOf}` : "") + " | ", 1)]),
							_: 2
						}, 1024),
						createBaseVNode("a", {
							target: "_blank",
							href: "/workflow/" + item.workflowId
						}, " (Open workflow)", 8, _hoisted_2$1)
					], 2);
				}), 128))], 2)) : (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.accordionItems)
				}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.empty) }, toDisplayString(unref(i18n).baseText("workerList.item.jobList.empty")), 3)], 2))]),
				_: 1
			});
		};
	}
}), [["__cssModules", { "$style": {
	accordionItems: "_accordionItems_iaa1c_1",
	accordionItem: "_accordionItem_iaa1c_1",
	empty: "_empty_iaa1c_14"
} }]]);
//#endregion
//#region src/features/settings/orchestration.ee/components/WorkerNetAccordion.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$3 = ["onClick"];
var WorkerNetAccordion_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkerNetAccordion",
	props: { items: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const clipboard = useClipboard();
		const { showMessage } = useToast();
		function onCopyToClipboard(content) {
			try {
				clipboard.copy(content);
				showMessage({
					title: i18n.baseText("workerList.item.copyAddressToClipboard"),
					type: "success"
				});
			} catch {}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(WorkerAccordion_default, {
				icon: "list-checks",
				"icon-color": "text-dark",
				"initial-expanded": false
			}, {
				title: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workerList.item.netListTitle")) + " (" + toDisplayString(__props.items.length) + ") ", 1)]),
				content: withCtx(() => [props.items.length > 0 ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.accordionItems)
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(props.items, (item) => {
					return openBlock(), createElementBlock("div", {
						key: item.address,
						class: normalizeClass(_ctx.$style.accordionItem),
						onClick: ($event) => onCopyToClipboard(item.address)
					}, [
						createTextVNode(toDisplayString(item.family) + ": ", 1),
						createBaseVNode("span", { class: normalizeClass(_ctx.$style.clickable) }, toDisplayString(item.address), 3),
						createTextVNode(" " + toDisplayString(item.internal ? "(internal)" : ""), 1)
					], 10, _hoisted_1$3);
				}), 128))], 2)) : createCommentVNode("", true)]),
				_: 1
			});
		};
	}
}), [["__cssModules", { "$style": {
	accordionItems: "_accordionItems_1wset_1",
	accordionItem: "_accordionItem_1wset_1",
	clickable: "_clickable_1wset_15"
} }]]);
//#endregion
//#region src/features/settings/orchestration.ee/components/WorkerChartsAccordion.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var WorkerChartsAccordion_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkerChartsAccordion",
	props: { workerId: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const blankDataSet = (label, color, prefill = 0) => ({
			datasets: [{
				label,
				backgroundColor: color,
				data: prefill ? Array(Math.min(100, prefill)).fill(0) : []
			}],
			labels: Array(Math.min(100, prefill)).fill("")
		});
		const orchestrationStore = useOrchestrationStore();
		const chartRefJobs = ref(void 0);
		const chartRefCPU = ref(void 0);
		const chartRefMemoryUsage = ref(void 0);
		const optionsBase = () => ({
			responsive: true,
			maintainAspectRatio: true,
			scales: { y: {
				type: "linear",
				display: true,
				position: "left",
				min: 0,
				suggestedMax: 5
			} }
		});
		const optionsJobs = optionsBase();
		const optionsCPU = optionsBase();
		if (optionsCPU.scales?.y) optionsCPU.scales.y.suggestedMax = 100;
		const optionsMemory = optionsBase();
		if (optionsMemory.scales?.y) optionsMemory.scales.y.suggestedMax = 100;
		const dataJobs = ref(blankDataSet("Job Count", "rgb(255, 111, 92)", 100));
		const dataCPU = ref(blankDataSet("Processor Usage", "rgb(19, 205, 103)", 100));
		const dataMemoryUsage = ref(blankDataSet("Memory Usage (%)", "rgb(244, 216, 174)", 100));
		orchestrationStore.$onAction(({ name, store }) => {
			if (name === "updateWorkerStatus") {
				const prefillCount = 100 - (store.workersHistory[props.workerId]?.length ?? 0);
				const newDataJobs = blankDataSet("Job Count", "rgb(255, 111, 92)", prefillCount);
				const newDataCPU = blankDataSet("Processor Usage", "rgb(19, 205, 103)", prefillCount);
				const newDataMemoryUsage = blankDataSet("Memory Usage (%)", "rgb(244, 216, 174)", prefillCount);
				store.workersHistory[props.workerId]?.forEach((item) => {
					newDataJobs.datasets[0].data.push(item.data.runningJobsSummary.length);
					newDataJobs.labels?.push(new Date(item.timestamp).toLocaleTimeString());
					newDataCPU.datasets[0].data.push(averageWorkerLoadFromLoads(item.data.loadAvg));
					newDataCPU.labels = newDataJobs.labels;
					newDataMemoryUsage.labels = newDataJobs.labels;
					const totalMem = item.data.isInContainer ? item.data.process.memory.constraint : item.data.host.memory.total;
					const usage = (totalMem - item.data.process.memory.available) / totalMem * 100;
					newDataMemoryUsage.datasets[0].data.push(usage);
				});
				dataJobs.value = newDataJobs;
				dataCPU.value = newDataCPU;
				dataMemoryUsage.value = newDataMemoryUsage;
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(WorkerAccordion_default, {
				icon: "list-checks",
				"icon-color": "text-dark",
				"initial-expanded": false
			}, {
				title: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workerList.item.chartsTitle")), 1)]),
				content: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.charts) }, [
					createVNode(unref(Chart), {
						ref_key: "chartRefJobs",
						ref: chartRefJobs,
						type: "line",
						data: dataJobs.value,
						options: unref(optionsJobs),
						class: normalizeClass(_ctx.$style.chart)
					}, null, 8, [
						"data",
						"options",
						"class"
					]),
					createVNode(unref(Chart), {
						ref_key: "chartRefCPU",
						ref: chartRefCPU,
						type: "line",
						data: dataCPU.value,
						options: unref(optionsCPU),
						class: normalizeClass(_ctx.$style.chart)
					}, null, 8, [
						"data",
						"options",
						"class"
					]),
					createVNode(unref(Chart), {
						ref_key: "chartRefMemoryUsage",
						ref: chartRefMemoryUsage,
						type: "line",
						data: dataMemoryUsage.value,
						options: unref(optionsMemory),
						class: normalizeClass(_ctx.$style.chart)
					}, null, 8, [
						"data",
						"options",
						"class"
					])
				], 2)]),
				_: 1
			});
		};
	}
}), [["__cssModules", { "$style": {
	accordionItems: "_accordionItems_1ish4_1",
	accordionItem: "_accordionItem_1ish4_1",
	charts: "_charts_1ish4_14",
	chart: "_chart_1ish4_14"
} }]]);
//#endregion
//#region src/features/settings/orchestration.ee/components/WorkerMemoryMonitorAccordion.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$2 = { key: 0 };
var WorkerMemoryMonitorAccordion_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkerMemoryMonitorAccordion",
	props: { worker: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(WorkerAccordion_default, {
				icon: "list-checks",
				"icon-color": "text-dark",
				"initial-expanded": false
			}, {
				title: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workerList.item.memoryMonitorTitle")), 1)]),
				content: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style["accordion-content"]) }, [
					_cache[7] || (_cache[7] = createBaseVNode("strong", null, "Host/OS Memory:", -1)),
					createBaseVNode("table", null, [createBaseVNode("tbody", null, [createBaseVNode("tr", null, [_cache[0] || (_cache[0] = createBaseVNode("th", null, "Total (os.totalmem)", -1)), createBaseVNode("td", null, toDisplayString(unref(memAsGb)(props.worker.host.memory.total)) + "GB", 1)]), createBaseVNode("tr", null, [_cache[1] || (_cache[1] = createBaseVNode("th", null, "Free (os.freemem)", -1)), createBaseVNode("td", null, toDisplayString(unref(memAsGb)(props.worker.host.memory.free)) + "GB", 1)])])]),
					_cache[8] || (_cache[8] = createBaseVNode("br", null, null, -1)),
					_cache[9] || (_cache[9] = createBaseVNode("strong", null, "Process Memory:", -1)),
					_cache[10] || (_cache[10] = createBaseVNode("br", null, null, -1)),
					createBaseVNode("table", null, [createBaseVNode("tbody", null, [
						__props.worker.isInContainer ? (openBlock(), createElementBlock("tr", _hoisted_1$2, [_cache[2] || (_cache[2] = createBaseVNode("th", null, "Constraint: (process.constrainedMemory)", -1)), createBaseVNode("td", null, toDisplayString(unref(memAsMb)(props.worker.process.memory.constraint)) + "MB", 1)])) : createCommentVNode("", true),
						createBaseVNode("tr", null, [_cache[3] || (_cache[3] = createBaseVNode("th", null, "Available: (process.availableMemory)", -1)), createBaseVNode("td", null, toDisplayString(unref(memAsMb)(props.worker.process.memory.available)) + "MB", 1)]),
						createBaseVNode("tr", null, [_cache[4] || (_cache[4] = createBaseVNode("th", null, "RSS: (process.memoryUsage().rss)", -1)), createBaseVNode("td", null, toDisplayString(unref(memAsMb)(props.worker.process.memory.rss)) + "MB", 1)]),
						createBaseVNode("tr", null, [_cache[5] || (_cache[5] = createBaseVNode("th", null, "Heap total: (process.memoryUsage().heapTotal)", -1)), createBaseVNode("td", null, toDisplayString(unref(memAsMb)(props.worker.process.memory.heapTotal)) + "MB", 1)]),
						createBaseVNode("tr", null, [_cache[6] || (_cache[6] = createBaseVNode("th", null, "Heap used: (process.memoryUsage().heapUsed)", -1)), createBaseVNode("td", null, toDisplayString(unref(memAsMb)(props.worker.process.memory.heapUsed)) + "MB", 1)])
					])])
				], 2)]),
				_: 1
			});
		};
	}
}), [["__cssModules", { "$style": { "accordion-content": "_accordion-content_dkfd8_11" } }]]);
//#endregion
//#region src/features/settings/orchestration.ee/components/WorkerCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var WorkerCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkerCard",
	props: { workerId: {} },
	setup(__props) {
		let interval;
		const orchestrationStore = useOrchestrationStore();
		const i18n = useI18n();
		const props = __props;
		const secondsSinceLastUpdateString = ref("0");
		const stale = ref(false);
		const worker = computed(() => {
			return orchestrationStore.getWorkerStatus(props.workerId);
		});
		const sortedWorkerInterfaces = computed(() => sortByProperty("family", worker.value?.interfaces.slice() ?? []));
		function upTime(seconds) {
			const days = Math.floor(seconds / 86400);
			seconds -= days * 3600 * 24;
			const hrs = Math.floor(seconds / 3600);
			seconds -= hrs * 3600;
			const mnts = Math.floor(seconds / 60);
			seconds -= mnts * 60;
			return `${days}d ${hrs}h ${mnts}m ${Math.floor(seconds)}s`;
		}
		onMounted(() => {
			interval = setInterval(() => {
				const lastUpdated = orchestrationStore.getWorkerLastUpdated(props.workerId);
				if (!lastUpdated) return;
				const secondsSinceLastUpdate = Math.ceil((Date.now() - lastUpdated) / 1e3);
				stale.value = secondsSinceLastUpdate > 10;
				secondsSinceLastUpdateString.value = secondsSinceLastUpdate.toFixed(0);
			}, 500);
		});
		onBeforeUnmount(() => {
			clearInterval(interval);
		});
		return (_ctx, _cache) => {
			return worker.value ? (openBlock(), createBlock(unref(N8nCard_default), {
				key: 0,
				class: normalizeClass(_ctx.$style.cardLink)
			}, {
				header: withCtx(() => [createVNode(unref(N8nHeading_default), {
					tag: "h2",
					bold: "",
					class: normalizeClass(stale.value ? [_ctx.$style.cardHeading, _ctx.$style.stale] : [_ctx.$style.cardHeading]),
					"data-test-id": "worker-card-name"
				}, {
					default: withCtx(() => [
						createTextVNode(" Name: " + toDisplayString(worker.value.senderId) + " (" + toDisplayString(worker.value.hostname) + ") | " + toDisplayString(unref(i18n).baseText("workerList.item.pool")) + ": " + toDisplayString(worker.value.poolName || unref(i18n).baseText("workerList.item.pool.default")) + " | " + toDisplayString(unref(i18n).baseText("workerList.item.queue")) + ": " + toDisplayString(worker.value.queueName) + " ", 1),
						_cache[0] || (_cache[0] = createBaseVNode("br", null, null, -1)),
						createTextVNode(" Average Load: " + toDisplayString(unref(averageWorkerLoadFromLoadsAsString)(worker.value.loadAvg ?? [0])) + " | Free memory: " + toDisplayString(unref(memAsGb)(worker.value.process.memory.available)) + "GB / " + toDisplayString(unref(memAsGb)(worker.value.isInContainer ? worker.value.process.memory.constraint : worker.value.host.memory.total)) + "GB " + toDisplayString(stale.value ? " (stale)" : ""), 1)
					]),
					_: 1
				}, 8, ["class"])]),
				append: withCtx(() => [createBaseVNode("div", {
					ref: "cardActions",
					class: normalizeClass(_ctx.$style.cardActions)
				}, null, 2)]),
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardDescription) }, [createVNode(unref(N8nText_default), {
					color: "text-light",
					size: "small",
					class: normalizeClass(_ctx.$style.container)
				}, {
					default: withCtx(() => [
						createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("workerList.item.lastUpdated")) + " " + toDisplayString(secondsSinceLastUpdateString.value) + "s ago | n8n-Version: " + toDisplayString(worker.value.version) + " | Architecture: " + toDisplayString(worker.value.arch) + " ( " + toDisplayString(worker.value.platform) + ") | Uptime: " + toDisplayString(upTime(worker.value.uptime)), 1),
						_cache[1] || (_cache[1] = createBaseVNode("br", null, null, -1)),
						createVNode(WorkerJobAccordion_default, { items: worker.value.runningJobsSummary }, null, 8, ["items"]),
						createVNode(WorkerNetAccordion_default, { items: sortedWorkerInterfaces.value }, null, 8, ["items"]),
						createVNode(WorkerChartsAccordion_default, { "worker-id": worker.value.senderId }, null, 8, ["worker-id"]),
						createVNode(WorkerMemoryMonitorAccordion_default, { worker: worker.value }, null, 8, ["worker"])
					]),
					_: 1
				}, 8, ["class"])], 2)]),
				_: 1
			}, 8, ["class"])) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_dem04_1",
	cardLink: "_cardLink_dem04_5",
	cardHeading: "_cardHeading_dem04_15",
	stale: "_stale_dem04_21",
	cardDescription: "_cardDescription_dem04_25",
	cardActions: "_cardActions_dem04_32"
} }]]);
//#endregion
//#region src/features/settings/orchestration.ee/components/WorkerList.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1$1 = { key: 0 };
var _hoisted_2 = { key: 1 };
var _hoisted_3 = { key: 0 };
var _hoisted_4 = { key: 1 };
var WorkerList_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkerList",
	props: { autoRefreshEnabled: {
		type: Boolean,
		default: true
	} },
	setup(__props) {
		const router = useRouter();
		const i18n = useI18n();
		const pushConnection = usePushConnection({ router });
		const documentTitle = useDocumentTitle();
		const telemetry = useTelemetry();
		const orchestrationManagerStore = useOrchestrationStore();
		const rootStore = useRootStore();
		const pushStore = usePushConnectionStore();
		const initialStatusReceived = computed(() => orchestrationManagerStore.initialStatusReceived);
		const workerIds = computed(() => Object.keys(orchestrationManagerStore.workers));
		const pageTitle = computed(() => i18n.baseText("workerList.pageTitle"));
		onMounted(() => {
			documentTitle.set(pageTitle.value);
			telemetry.track("User viewed worker view", { instance_id: rootStore.instanceId });
		});
		onBeforeMount(() => {
			pushConnection.initialize();
			pushStore.pushConnect();
			orchestrationManagerStore.startWorkerStatusPolling();
		});
		onBeforeUnmount(() => {
			orchestrationManagerStore.stopWorkerStatusPolling();
			pushStore.pushDisconnect();
			pushConnection.terminate();
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [
				createVNode(ConnectionTracker_default, { class: "actions" }),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.workerListHeader) }, [createVNode(unref(N8nHeading_default), {
					tag: "h1",
					size: "2xlarge"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(pageTitle.value), 1)]),
					_: 1
				})], 2),
				!initialStatusReceived.value ? (openBlock(), createElementBlock("div", _hoisted_1$1, [createVNode(unref(N8nSpinner_default))])) : (openBlock(), createElementBlock("div", _hoisted_2, [workerIds.value.length === 0 ? (openBlock(), createElementBlock("div", _hoisted_3, toDisplayString(unref(i18n).baseText("workerList.empty")), 1)) : (openBlock(), createElementBlock("div", _hoisted_4, [(openBlock(true), createElementBlock(Fragment, null, renderList(workerIds.value, (workerId) => {
					return openBlock(), createElementBlock("div", {
						key: workerId,
						class: normalizeClass(_ctx.$style.card)
					}, [createVNode(WorkerCard_default, {
						"worker-id": workerId,
						"data-test-id": "worker-card"
					}, null, 8, ["worker-id"])], 2);
				}), 128))]))]))
			]);
		};
	}
}), [["__cssModules", { "$style": {
	workerListHeader: "_workerListHeader_lqauo_1",
	card: "_card_lqauo_8",
	tableLoader: "_tableLoader_lqauo_12"
} }]]);
//#endregion
//#region src/features/settings/orchestration.ee/views/WorkerView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = ["href"];
var WorkerView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkerView",
	setup(__props) {
		const settingsStore = useSettingsStore();
		const pageRedirectionHelper = usePageRedirectionHelper();
		const i18n = useI18n();
		const goToUpgrade = () => {
			pageRedirectionHelper.goToUpgrade("worker-view", "upgrade-worker-view");
		};
		return (_ctx, _cache) => {
			return unref(settingsStore).isQueueModeEnabled && unref(settingsStore).isWorkerViewAvailable ? (openBlock(), createBlock(WorkerList_default, {
				key: 0,
				"data-test-id": "worker-view-licensed"
			})) : (openBlock(), createBlock(unref(N8nEmptyState_default), {
				key: 1,
				"data-test-id": "worker-view-unlicensed",
				class: normalizeClass(_ctx.$style.actionBox),
				description: unref(i18n).baseText("workerList.actionBox.description"),
				"button-text": unref(i18n).baseText("workerList.actionBox.buttonText"),
				"onClick:button": goToUpgrade
			}, {
				heading: withCtx(() => [createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("workerList.actionBox.title")), 1)]),
				description: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workerList.actionBox.description")) + " ", 1), createBaseVNode("a", {
					href: unref(i18n).baseText("workerList.docs.url"),
					target: "_blank"
				}, toDisplayString(unref(i18n).baseText("workerList.actionBox.description.link")), 9, _hoisted_1)]),
				_: 1
			}, 8, [
				"class",
				"description",
				"button-text"
			]));
		};
	}
}), [["__cssModules", { "$style": { actionBox: "_actionBox_197bz_1" } }]]);
//#endregion
export { WorkerView_default as default };
