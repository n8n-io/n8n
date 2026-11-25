import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Vf as ref, Xf as unref, _p as normalizeClass, ff as openBlock, gf as resolveComponent, ip as init_shared_esm_bundler, mf as renderList, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Jg as useUIStore, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, _N as N8nText_default, fC as VIEWS, jN as useI18n, tM as N8nInfoTip_default, yE as SOURCE_CONTROL_FILE_TYPE, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
//#region src/features/integrations/sourceControl.ee/components/SourceControlPullResultModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { style: {
	"display": "flex",
	"flex-direction": "column",
	"height": "100%"
} };
var _hoisted_2 = { style: {
	"display": "flex",
	"flex": "1",
	"min-height": "0"
} };
var _hoisted_3 = ["data-test-id", "onClick"];
var _hoisted_4 = { style: { "flex": "1" } };
var SourceControlPullResultModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SourceControlPullResultModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const uiStore = useUIStore();
		const publishedWorkflows = computed(() => {
			return props.data.workflows.filter((w) => w.type === SOURCE_CONTROL_FILE_TYPE.workflow && !w.publishingError);
		});
		const failedWorkflows = computed(() => {
			return props.data.workflows.filter((w) => w.type === SOURCE_CONTROL_FILE_TYPE.workflow && w.publishingError);
		});
		const activeTab = ref(failedWorkflows.value.length > 0 ? "failed" : "published");
		const tabs = computed(() => {
			const tabsList = [];
			if (failedWorkflows.value.length > 0) tabsList.push({
				label: i18n.baseText("settings.sourceControl.modals.pullResult.tabs.failed"),
				value: "failed",
				total: failedWorkflows.value.length
			});
			tabsList.push({
				label: i18n.baseText("settings.sourceControl.modals.pullResult.tabs.published"),
				value: "published",
				total: publishedWorkflows.value.length
			});
			return tabsList;
		});
		const activeWorkflows = computed(() => {
			return activeTab.value === "failed" ? failedWorkflows.value : publishedWorkflows.value;
		});
		function close() {
			uiStore.closeModal(props.modalName);
		}
		return (_ctx, _cache) => {
			const _component_RouterLink = resolveComponent("RouterLink");
			return openBlock(), createBlock(Modal_default, {
				name: __props.modalName,
				width: "812px",
				height: "min(80vh, 850px)",
				"custom-class": _ctx.$style.pullResultModal,
				onClose: close
			}, {
				header: withCtx(() => [createVNode(unref(N8nHeading_default), {
					tag: "h1",
					size: "xlarge"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.pullResult.title")), 1)]),
					_: 1
				})]),
				content: withCtx(() => [createBaseVNode("div", _hoisted_1, [createBaseVNode("div", _hoisted_2, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.tabs) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(tabs.value, (tab) => {
					return openBlock(), createElementBlock("button", {
						key: tab.value,
						type: "button",
						class: normalizeClass([_ctx.$style.tab, { [_ctx.$style.tabActive]: activeTab.value === tab.value }]),
						"data-test-id": `pull-result-modal-tab-${tab.value}`,
						onClick: ($event) => activeTab.value = tab.value
					}, [createBaseVNode("div", null, toDisplayString(tab.label), 1), createVNode(unref(N8nText_default), {
						tag: "div",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.pullResult.itemCount", {
							adjustToNumber: tab.total,
							interpolate: { count: `${tab.total}` }
						})), 1)]),
						_: 2
					}, 1024)], 10, _hoisted_3);
				}), 128))], 2), createBaseVNode("div", _hoisted_4, [createBaseVNode("div", { class: normalizeClass([_ctx.$style.table]) }, [createBaseVNode("div", { class: normalizeClass([_ctx.$style.tableHeader]) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerTitle) }, [createVNode(unref(N8nText_default), null, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.pullResult.tableHeader.title")), 1)]),
					_: 1
				})], 2)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.tableContent) }, [!activeWorkflows.value.length ? (openBlock(), createBlock(unref(N8nInfoTip_default), {
					key: 0,
					class: "p-xs",
					bold: false
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.pullResult.noWorkflows")), 1)]),
					_: 1
				})) : createCommentVNode("", true), activeWorkflows.value.length ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.scrollContent)
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(activeWorkflows.value, (workflow) => {
					return openBlock(), createElementBlock("div", {
						key: workflow.id,
						class: normalizeClass(_ctx.$style.listItem)
					}, [createBaseVNode("div", { class: normalizeClass([_ctx.$style.itemContent]) }, [createVNode(unref(N8nText_default), {
						tag: "div",
						bold: "",
						color: "text-dark",
						class: normalizeClass([_ctx.$style.listItemName])
					}, {
						default: withCtx(() => [createVNode(_component_RouterLink, {
							target: "_blank",
							rel: "noopener noreferrer",
							to: {
								name: unref(VIEWS).WORKFLOW,
								params: { workflowId: workflow.id }
							}
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(workflow.name), 1)]),
							_: 2
						}, 1032, ["to"])]),
						_: 2
					}, 1032, ["class"]), workflow.publishingError ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						tag: "p",
						class: "mt-4xs",
						color: "danger",
						size: "small"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(workflow.publishingError), 1)]),
						_: 2
					}, 1024)) : createCommentVNode("", true)], 2)], 2);
				}), 128))], 2)) : createCommentVNode("", true)], 2)], 2)])])])]),
				footer: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [createVNode(unref(N8nButton_default), { onClick: close }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("settings.sourceControl.modals.pullResult.buttons.close")), 1)]),
					_: 1
				})], 2)]),
				_: 1
			}, 8, ["name", "custom-class"]);
		};
	}
}), [["__cssModules", { "$style": {
	pullResultModal: "_pullResultModal_1exvv_1",
	headerTitle: "_headerTitle_1exvv_8",
	scrollContent: "_scrollContent_1exvv_14",
	listItem: "_listItem_1exvv_20",
	itemContent: "_itemContent_1exvv_33",
	listItemName: "_listItemName_1exvv_38",
	footer: "_footer_1exvv_55",
	table: "_table_1exvv_62",
	tableHeader: "_tableHeader_1exvv_72",
	tableContent: "_tableContent_1exvv_78",
	tabs: "_tabs_1exvv_85",
	tab: "_tab_1exvv_62",
	tabActive: "_tabActive_1exvv_113"
} }]]);
//#endregion
export { SourceControlPullResultModal_default as default };
