import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Vd as createCommentVNode, Xf as unref, _p as normalizeClass, bf as useId, ff as openBlock, hf as renderSlot, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { SN as _plugin_vue_export_helper_default } from "./app-D5flEmb-.js";
import { n as WorkflowDiffToolbar_default, t as WorkflowDiffPanels_default } from "./WorkflowDiffPanels-BuGCS9S6.js";
//#region src/features/workflows/workflowDiff/WorkflowDiffIllustration.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1 = {
	viewBox: "0 0 320 96",
	fill: "none",
	"aria-hidden": "true",
	focusable: "false"
};
var _hoisted_2 = ["id"];
var _hoisted_3 = ["mask"];
var WorkflowDiffIllustration_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowDiffIllustration",
	setup(__props) {
		const strokeMaskId = useId();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("svg", _hoisted_1, [
				createBaseVNode("rect", {
					x: "224",
					width: "96",
					height: "96",
					rx: "16",
					class: normalizeClass(_ctx.$style.node)
				}, null, 2),
				_cache[1] || (_cache[1] = createBaseVNode("rect", {
					x: "224.5",
					y: "0.5",
					width: "95",
					height: "95",
					rx: "15.5",
					stroke: "currentColor"
				}, null, -1)),
				createBaseVNode("circle", {
					cx: "224",
					cy: "48",
					r: "7.5",
					class: normalizeClass(_ctx.$style.node)
				}, null, 2),
				_cache[2] || (_cache[2] = createBaseVNode("circle", {
					cx: "224",
					cy: "48",
					r: "7",
					stroke: "currentColor"
				}, null, -1)),
				createBaseVNode("path", {
					d: "M40 0H80C88.84 0 96 7.16 96 16V80C96 88.84 88.84 96 80 96H40C17.91 96 0 78.09 0 56V40C0 17.91 17.91 0 40 0Z",
					class: normalizeClass(_ctx.$style.node)
				}, null, 2),
				createBaseVNode("mask", {
					id: unref(strokeMaskId),
					fill: "white"
				}, [..._cache[0] || (_cache[0] = [createBaseVNode("path", { d: "M40 0H80C88.84 0 96 7.16 96 16V80C96 88.84 88.84 96 80 96H40C17.91 96 0 78.09 0 56V40C0 17.91 17.91 0 40 0Z" }, null, -1)])], 8, _hoisted_2),
				createBaseVNode("path", {
					d: "M40 0H80C88.84 0 96 7.16 96 16V80C96 88.84 88.84 96 80 96H40C17.91 96 0 78.09 0 56V40C0 17.91 17.91 0 40 0Z",
					"stroke-width": "2",
					stroke: "currentColor",
					mask: `url(#${unref(strokeMaskId)})`
				}, null, 8, _hoisted_3),
				createBaseVNode("circle", {
					cx: "96",
					cy: "48",
					r: "7.5",
					class: normalizeClass(_ctx.$style.node)
				}, null, 2),
				_cache[3] || (_cache[3] = createBaseVNode("circle", {
					cx: "96",
					cy: "48",
					r: "7",
					stroke: "currentColor"
				}, null, -1)),
				_cache[4] || (_cache[4] = createBaseVNode("path", {
					d: "M211 44L217 48L211 52V44Z",
					fill: "currentColor"
				}, null, -1)),
				_cache[5] || (_cache[5] = createBaseVNode("rect", {
					x: "103",
					y: "47.5",
					width: "108",
					height: "1",
					fill: "currentColor"
				}, null, -1))
			]);
		};
	}
}), [["__cssModules", { "$style": { node: "_node_6feaj_1" } }]]);
//#endregion
//#region src/features/workflows/workflowDiff/WorkflowDiffPlaceholder.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler();
var WorkflowDiffPlaceholder_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowDiffPlaceholder",
	props: { hideIllustration: { type: Boolean } },
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.placeholder),
				"data-test-id": "workflow-diff-placeholder"
			}, [createBaseVNode("div", {
				class: normalizeClass(_ctx.$style.toolbar),
				inert: "",
				"aria-hidden": "true"
			}, [createVNode(WorkflowDiffToolbar_default, {
				"hide-title": "",
				"show-fullscreen-button": "",
				disabled: ""
			})], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [createBaseVNode("div", {
				class: normalizeClass(_ctx.$style.chrome),
				inert: "",
				"aria-hidden": "true"
			}, [createVNode(WorkflowDiffPanels_default, null, {
				sourceLabel: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.label) }, [renderSlot(_ctx.$slots, "sourceLabel")], 2)]),
				targetLabel: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.label) }, [renderSlot(_ctx.$slots, "targetLabel")], 2)]),
				source: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.canvas) }, [!__props.hideIllustration ? (openBlock(), createBlock(WorkflowDiffIllustration_default, {
					key: 0,
					class: normalizeClass(_ctx.$style.illustration)
				}, null, 8, ["class"])) : createCommentVNode("", true)], 2)]),
				target: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.canvas) }, [!__props.hideIllustration ? (openBlock(), createBlock(WorkflowDiffIllustration_default, {
					key: 0,
					class: normalizeClass(_ctx.$style.illustration)
				}, null, 8, ["class"])) : createCommentVNode("", true)], 2)]),
				_: 3
			})], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.overlay) }, [renderSlot(_ctx.$slots, "default")], 2)], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	placeholder: "_placeholder_gc8j8_1",
	chrome: "_chrome_gc8j8_2",
	toolbar: "_toolbar_gc8j8_9",
	content: "_content_gc8j8_10",
	overlay: "_overlay_gc8j8_24",
	label: "_label_gc8j8_30",
	canvas: "_canvas_gc8j8_34",
	illustration: "_illustration_gc8j8_43"
} }]]);
//#endregion
export { WorkflowDiffPlaceholder_default as default };
