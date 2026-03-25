import { useId } from "../shared/useId.js";
import { Primitive } from "../Primitive/Primitive.js";
import { PRECISION } from "../utils/constants.js";
import { injectPanelGroupContext } from "./SplitterGroup.js";
import { computed, createBlock, defineComponent, normalizeStyle, onMounted, onUnmounted, openBlock, renderSlot, unref, watch, withCtx } from "vue";

//#region src/Splitter/SplitterPanel.vue?vue&type=script&setup=true&lang.ts
var SplitterPanel_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "SplitterPanel",
	props: {
		collapsedSize: {
			type: Number,
			required: false
		},
		collapsible: {
			type: Boolean,
			required: false
		},
		defaultSize: {
			type: Number,
			required: false
		},
		id: {
			type: String,
			required: false
		},
		maxSize: {
			type: Number,
			required: false
		},
		minSize: {
			type: Number,
			required: false
		},
		order: {
			type: Number,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	emits: [
		"collapse",
		"expand",
		"resize"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const panelGroupContext = injectPanelGroupContext();
		if (panelGroupContext === null) throw new Error("SplitterPanel components must be rendered within a SplitterGroup container");
		const { collapsePanel, expandPanel, getPanelSize, getPanelStyle, isPanelCollapsed, resizePanel, groupId, reevaluatePanelConstraints, registerPanel, unregisterPanel } = panelGroupContext;
		const panelId = useId(props.id, "reka-splitter-panel");
		const panelDataRef = computed(() => ({
			callbacks: {
				onCollapse: () => emits("collapse"),
				onExpand: () => emits("expand"),
				onResize: (...args) => emits("resize", ...args)
			},
			constraints: {
				collapsedSize: props.collapsedSize && Number.parseFloat(props.collapsedSize.toFixed(PRECISION)),
				collapsible: props.collapsible,
				defaultSize: props.defaultSize,
				maxSize: props.maxSize,
				minSize: props.minSize
			},
			id: panelId,
			idIsFromProps: props.id !== void 0,
			order: props.order
		}));
		watch(() => panelDataRef.value.constraints, (constraints, prevConstraints) => {
			if (prevConstraints.collapsedSize !== constraints.collapsedSize || prevConstraints.collapsible !== constraints.collapsible || prevConstraints.maxSize !== constraints.maxSize || prevConstraints.minSize !== constraints.minSize) reevaluatePanelConstraints(panelDataRef.value, prevConstraints);
		}, { deep: true });
		onMounted(() => {
			const panelData = panelDataRef.value;
			registerPanel(panelData);
			onUnmounted(() => {
				unregisterPanel(panelData);
			});
		});
		const style = computed(() => getPanelStyle(panelDataRef.value, props.defaultSize));
		/** Panel id (unique within group); falls back to useId when not provided */
		const isCollapsed = computed(() => isPanelCollapsed(panelDataRef.value));
		const isExpanded = computed(() => !isCollapsed.value);
		function collapse() {
			collapsePanel(panelDataRef.value);
		}
		function expand() {
			expandPanel(panelDataRef.value);
		}
		function resize(size) {
			resizePanel(panelDataRef.value, size);
		}
		__expose({
			collapse,
			expand,
			getSize() {
				return getPanelSize(panelDataRef.value);
			},
			resize,
			isCollapsed,
			isExpanded
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				id: unref(panelId),
				style: normalizeStyle(style.value),
				as: _ctx.as,
				"as-child": _ctx.asChild,
				"data-panel": "",
				"data-panel-collapsible": _ctx.collapsible || void 0,
				"data-panel-group-id": unref(groupId),
				"data-panel-id": unref(panelId),
				"data-panel-size": Number.parseFloat(`${style.value.flexGrow}`).toFixed(1),
				"data-state": _ctx.collapsible ? isCollapsed.value ? "collapsed" : "expanded" : void 0
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", {
					isCollapsed: isCollapsed.value,
					isExpanded: isExpanded.value,
					expand,
					collapse,
					resize
				})]),
				_: 3
			}, 8, [
				"id",
				"style",
				"as",
				"as-child",
				"data-panel-collapsible",
				"data-panel-group-id",
				"data-panel-id",
				"data-panel-size",
				"data-state"
			]);
		};
	}
});

//#endregion
//#region src/Splitter/SplitterPanel.vue
var SplitterPanel_default = SplitterPanel_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { SplitterPanel_default };
//# sourceMappingURL=SplitterPanel.js.map