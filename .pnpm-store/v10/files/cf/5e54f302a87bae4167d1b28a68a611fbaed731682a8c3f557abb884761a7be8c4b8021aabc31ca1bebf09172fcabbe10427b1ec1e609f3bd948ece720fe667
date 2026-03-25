const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_browser = require('../shared/browser.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useId = require('../shared/useId.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_shared_useNonce = require('../shared/useNonce.cjs');
const require_utils_assert = require('../utils/assert.cjs');
const require_utils_registry = require('../utils/registry.cjs');
const require_Splitter_SplitterGroup = require('./SplitterGroup.cjs');
const require_composables_useWindowSplitterBehavior = require('../composables/useWindowSplitterBehavior.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/Splitter/SplitterResizeHandle.vue?vue&type=script&setup=true&lang.ts
var SplitterResizeHandle_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "SplitterResizeHandle",
	props: {
		id: {
			type: String,
			required: false
		},
		hitAreaMargins: {
			type: Object,
			required: false
		},
		tabindex: {
			type: Number,
			required: false,
			default: 0
		},
		disabled: {
			type: Boolean,
			required: false
		},
		nonce: {
			type: String,
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
	emits: ["dragging"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { forwardRef, currentElement } = require_shared_useForwardExpose.useForwardExpose();
		const { disabled } = (0, vue.toRefs)(props);
		const panelGroupContext = require_Splitter_SplitterGroup.injectPanelGroupContext();
		if (panelGroupContext === null) throw new Error("PanelResizeHandle components must be rendered within a PanelGroup container");
		const { direction, groupId, registerResizeHandle: registerResizeHandleWithParentGroup, startDragging, stopDragging, panelGroupElement } = panelGroupContext;
		const resizeHandleId = require_shared_useId.useId(props.id, "reka-splitter-resize-handle");
		const state = (0, vue.ref)("inactive");
		const isFocused = (0, vue.ref)(false);
		const resizeHandler = (0, vue.ref)(null);
		const { nonce: propNonce } = (0, vue.toRefs)(props);
		const nonce = require_shared_useNonce.useNonce(propNonce);
		(0, vue.watch)(disabled, () => {
			if (!require_shared_browser.isBrowser) return;
			if (disabled.value) resizeHandler.value = null;
			else resizeHandler.value = registerResizeHandleWithParentGroup(resizeHandleId);
		}, { immediate: true });
		(0, vue.watchEffect)((onCleanup) => {
			if (disabled.value || resizeHandler.value === null) return;
			const element = currentElement.value;
			if (!element) return;
			require_utils_assert.assert(element);
			const setResizeHandlerState = (action, isActive, event) => {
				if (isActive) switch (action) {
					case "down": {
						state.value = "drag";
						startDragging(resizeHandleId, event);
						emits("dragging", true);
						break;
					}
					case "move": {
						if (state.value !== "drag") state.value = "hover";
						resizeHandler.value?.(event);
						break;
					}
					case "up": {
						state.value = "hover";
						stopDragging();
						emits("dragging", false);
						break;
					}
				}
				else state.value = "inactive";
			};
			onCleanup(require_utils_registry.registerResizeHandle(resizeHandleId, element, direction, {
				coarse: props.hitAreaMargins?.coarse ?? 15,
				fine: props.hitAreaMargins?.fine ?? 5
			}, nonce, setResizeHandlerState));
		});
		require_composables_useWindowSplitterBehavior.useWindowSplitterResizeHandlerBehavior({
			disabled,
			resizeHandler,
			handleId: resizeHandleId,
			panelGroupElement
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				id: (0, vue.unref)(resizeHandleId),
				ref: (0, vue.unref)(forwardRef),
				style: {
					touchAction: "none",
					userSelect: "none"
				},
				as: _ctx.as,
				"as-child": _ctx.asChild,
				role: "separator",
				"data-resize-handle": "",
				tabindex: _ctx.tabindex,
				"data-state": state.value,
				"data-disabled": (0, vue.unref)(disabled) ? "" : void 0,
				"data-orientation": (0, vue.unref)(direction),
				"data-panel-group-id": (0, vue.unref)(groupId),
				"data-resize-handle-active": state.value === "drag" ? "pointer" : isFocused.value ? "keyboard" : void 0,
				"data-resize-handle-state": state.value,
				"data-panel-resize-handle-enabled": !(0, vue.unref)(disabled),
				"data-panel-resize-handle-id": (0, vue.unref)(resizeHandleId),
				onBlur: _cache[0] || (_cache[0] = ($event) => isFocused.value = false),
				onFocus: _cache[1] || (_cache[1] = ($event) => isFocused.value = false)
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"id",
				"as",
				"as-child",
				"tabindex",
				"data-state",
				"data-disabled",
				"data-orientation",
				"data-panel-group-id",
				"data-resize-handle-active",
				"data-resize-handle-state",
				"data-panel-resize-handle-enabled",
				"data-panel-resize-handle-id"
			]);
		};
	}
});

//#endregion
//#region src/Splitter/SplitterResizeHandle.vue
var SplitterResizeHandle_default = SplitterResizeHandle_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'SplitterResizeHandle_default', {
  enumerable: true,
  get: function () {
    return SplitterResizeHandle_default;
  }
});
//# sourceMappingURL=SplitterResizeHandle.cjs.map