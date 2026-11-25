import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Sp as toDisplayString, Vd as createCommentVNode, Xf as unref, _p as normalizeClass, ff as openBlock, hf as renderSlot, ip as init_shared_esm_bundler, nf as mergeModels, xf as useModel, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, _M as Checkbox_default, _N as N8nText_default, jN as useI18n, vN as N8nIconButton_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
//#region src/features/workflows/workflowDiff/WorkflowDiffToolbar.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var WorkflowDiffToolbar_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowDiffToolbar",
	props: /*@__PURE__*/ mergeModels({
		title: {},
		hideTitle: { type: Boolean },
		showBackButton: { type: Boolean },
		showFullscreenButton: { type: Boolean },
		isFullscreen: { type: Boolean },
		disabled: { type: Boolean }
	}, {
		"syncIsEnabled": {
			type: Boolean,
			default: true
		},
		"syncIsEnabledModifiers": {}
	}),
	emits: /*@__PURE__*/ mergeModels([
		"back",
		"previous",
		"next",
		"fullscreen"
	], ["update:syncIsEnabled"]),
	setup(__props, { emit: __emit }) {
		const syncIsEnabled = useModel(__props, "syncIsEnabled");
		const emit = __emit;
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.header) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerLeft) }, [
				renderSlot(_ctx.$slots, "header-prefix"),
				__props.showBackButton ? (openBlock(), createBlock(unref(N8nIconButton_default), {
					key: 0,
					variant: "outline",
					icon: "arrow-left",
					"aria-label": unref(i18n).baseText("generic.back"),
					class: normalizeClass([_ctx.$style.backButton, "mr-xs"]),
					"icon-size": "large",
					onClick: _cache[0] || (_cache[0] = ($event) => emit("back"))
				}, null, 8, ["aria-label", "class"])) : createCommentVNode("", true),
				!__props.hideTitle || __props.isFullscreen ? (openBlock(), createBlock(unref(N8nHeading_default), {
					key: 1,
					tag: "h4",
					size: "medium"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.title), 1)]),
					_: 1
				})) : createCommentVNode("", true)
			], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerRight) }, [
				createVNode(unref(Checkbox_default), {
					modelValue: syncIsEnabled.value,
					"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => syncIsEnabled.value = $event),
					disabled: __props.disabled,
					"label-size": "small",
					label: unref(i18n).baseText("workflowDiff.syncViews"),
					class: "mb-0 mr-s"
				}, null, 8, [
					"modelValue",
					"disabled",
					"label"
				]),
				renderSlot(_ctx.$slots, "changes", {}, () => [createVNode(unref(N8nButton_default), {
					variant: "outline",
					disabled: __props.disabled
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowDiff.changes")), 1)]),
					_: 1
				}, 8, ["disabled"])]),
				createVNode(unref(N8nIconButton_default), {
					variant: "outline",
					icon: "chevron-left",
					"aria-label": unref(i18n).baseText("workflowDiff.previousChange"),
					class: normalizeClass(_ctx.$style.navigationButton),
					disabled: __props.disabled,
					onClick: _cache[2] || (_cache[2] = ($event) => emit("previous"))
				}, null, 8, [
					"aria-label",
					"class",
					"disabled"
				]),
				createVNode(unref(N8nIconButton_default), {
					variant: "outline",
					icon: "chevron-right",
					"aria-label": unref(i18n).baseText("workflowDiff.nextChange"),
					class: normalizeClass(_ctx.$style.navigationButton),
					disabled: __props.disabled,
					onClick: _cache[3] || (_cache[3] = ($event) => emit("next"))
				}, null, 8, [
					"aria-label",
					"class",
					"disabled"
				]),
				__props.showFullscreenButton ? (openBlock(), createBlock(unref(N8nIconButton_default), {
					key: 0,
					variant: "outline",
					icon: __props.isFullscreen ? "minimize-2" : "maximize-2",
					title: unref(i18n).baseText(__props.isFullscreen ? "workflowDiff.fullscreen.exit" : "workflowDiff.fullscreen.enter"),
					"aria-label": unref(i18n).baseText(__props.isFullscreen ? "workflowDiff.fullscreen.exit" : "workflowDiff.fullscreen.enter"),
					class: normalizeClass(_ctx.$style.fullscreenButton),
					"data-test-id": "workflow-diff-fullscreen-toggle",
					disabled: __props.disabled,
					onClick: _cache[4] || (_cache[4] = ($event) => emit("fullscreen"))
				}, null, 8, [
					"icon",
					"title",
					"aria-label",
					"class",
					"disabled"
				])) : createCommentVNode("", true)
			], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	fullscreenButton: "_fullscreenButton_pvlpk_1",
	header: "_header_pvlpk_5",
	navigationButton: "_navigationButton_pvlpk_12",
	backButton: "_backButton_pvlpk_15",
	headerLeft: "_headerLeft_pvlpk_19",
	headerRight: "_headerRight_pvlpk_20"
} }]]);
//#endregion
//#region src/features/workflows/workflowDiff/WorkflowDiffPanels.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var WorkflowDiffPanels_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowDiffPanels",
	props: {
		sourceLabel: {},
		targetLabel: {}
	},
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.workflowDiff) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.workflowDiffPanel) }, [renderSlot(_ctx.$slots, "sourceLabel", {}, () => [createVNode(unref(N8nText_default), {
				color: "text-dark",
				size: "small",
				class: normalizeClass(_ctx.$style.sourceBadge)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(__props.sourceLabel), 1)]),
				_: 1
			}, 8, ["class"])]), renderSlot(_ctx.$slots, "source")], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.workflowDiffPanel) }, [renderSlot(_ctx.$slots, "targetLabel", {}, () => [createVNode(unref(N8nText_default), {
				color: "text-dark",
				size: "small",
				class: normalizeClass(_ctx.$style.sourceBadge)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(__props.targetLabel), 1)]),
				_: 1
			}, 8, ["class"])]), renderSlot(_ctx.$slots, "target")], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	workflowDiff: "_workflowDiff_12j8t_1",
	workflowDiffPanel: "_workflowDiffPanel_12j8t_9",
	sourceBadge: "_sourceBadge_12j8t_17 _sourceBadge_pmpky_3"
} }]]);
//#endregion
export { WorkflowDiffToolbar_default as n, WorkflowDiffPanels_default as t };
