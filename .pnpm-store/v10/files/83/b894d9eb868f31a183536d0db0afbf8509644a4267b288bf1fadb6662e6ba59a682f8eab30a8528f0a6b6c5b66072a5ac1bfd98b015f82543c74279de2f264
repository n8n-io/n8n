const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_DismissableLayer_utils = require('./utils.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/DismissableLayer/DismissableLayer.vue?vue&type=script&setup=true&lang.ts
const context = (0, vue.reactive)({
	layersRoot: /* @__PURE__ */ new Set(),
	layersWithOutsidePointerEventsDisabled: /* @__PURE__ */ new Set(),
	branches: /* @__PURE__ */ new Set()
});
var DismissableLayer_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	__name: "DismissableLayer",
	props: {
		disableOutsidePointerEvents: {
			type: Boolean,
			required: false,
			default: false
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
		"escapeKeyDown",
		"pointerDownOutside",
		"focusOutside",
		"interactOutside",
		"dismiss"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { forwardRef, currentElement: layerElement } = require_shared_useForwardExpose.useForwardExpose();
		const ownerDocument = (0, vue.computed)(() => layerElement.value?.ownerDocument ?? globalThis.document);
		const layers = (0, vue.computed)(() => context.layersRoot);
		const index = (0, vue.computed)(() => {
			return layerElement.value ? Array.from(layers.value).indexOf(layerElement.value) : -1;
		});
		const isBodyPointerEventsDisabled = (0, vue.computed)(() => {
			return context.layersWithOutsidePointerEventsDisabled.size > 0;
		});
		const isPointerEventsEnabled = (0, vue.computed)(() => {
			const localLayers = Array.from(layers.value);
			const [highestLayerWithOutsidePointerEventsDisabled] = [...context.layersWithOutsidePointerEventsDisabled].slice(-1);
			const highestLayerWithOutsidePointerEventsDisabledIndex = localLayers.indexOf(highestLayerWithOutsidePointerEventsDisabled);
			return index.value >= highestLayerWithOutsidePointerEventsDisabledIndex;
		});
		const pointerDownOutside = require_DismissableLayer_utils.usePointerDownOutside(async (event) => {
			const isPointerDownOnBranch = [...context.branches].some((branch) => branch?.contains(event.target));
			if (!isPointerEventsEnabled.value || isPointerDownOnBranch) return;
			emits("pointerDownOutside", event);
			emits("interactOutside", event);
			await (0, vue.nextTick)();
			if (!event.defaultPrevented) emits("dismiss");
		}, layerElement);
		const focusOutside = require_DismissableLayer_utils.useFocusOutside((event) => {
			const isFocusInBranch = [...context.branches].some((branch) => branch?.contains(event.target));
			if (isFocusInBranch) return;
			emits("focusOutside", event);
			emits("interactOutside", event);
			if (!event.defaultPrevented) emits("dismiss");
		}, layerElement);
		(0, __vueuse_core.onKeyStroke)("Escape", (event) => {
			const isHighestLayer = index.value === layers.value.size - 1;
			if (!isHighestLayer) return;
			emits("escapeKeyDown", event);
			if (!event.defaultPrevented) emits("dismiss");
		});
		let originalBodyPointerEvents;
		(0, vue.watchEffect)((cleanupFn) => {
			if (!layerElement.value) return;
			if (props.disableOutsidePointerEvents) {
				if (context.layersWithOutsidePointerEventsDisabled.size === 0) {
					originalBodyPointerEvents = ownerDocument.value.body.style.pointerEvents;
					ownerDocument.value.body.style.pointerEvents = "none";
				}
				context.layersWithOutsidePointerEventsDisabled.add(layerElement.value);
			}
			layers.value.add(layerElement.value);
			cleanupFn(() => {
				if (props.disableOutsidePointerEvents && context.layersWithOutsidePointerEventsDisabled.size === 1) ownerDocument.value.body.style.pointerEvents = originalBodyPointerEvents;
			});
		});
		(0, vue.watchEffect)((cleanupFn) => {
			cleanupFn(() => {
				if (!layerElement.value) return;
				layers.value.delete(layerElement.value);
				context.layersWithOutsidePointerEventsDisabled.delete(layerElement.value);
			});
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(require_Primitive_Primitive.Primitive), {
				ref: (0, vue.unref)(forwardRef),
				"as-child": _ctx.asChild,
				as: _ctx.as,
				"data-dismissable-layer": "",
				style: (0, vue.normalizeStyle)({ pointerEvents: isBodyPointerEventsDisabled.value ? isPointerEventsEnabled.value ? "auto" : "none" : void 0 }),
				onFocusCapture: (0, vue.unref)(focusOutside).onFocusCapture,
				onBlurCapture: (0, vue.unref)(focusOutside).onBlurCapture,
				onPointerdownCapture: (0, vue.unref)(pointerDownOutside).onPointerDownCapture
			}, {
				default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"as-child",
				"as",
				"style",
				"onFocusCapture",
				"onBlurCapture",
				"onPointerdownCapture"
			]);
		};
	}
});

//#endregion
//#region src/DismissableLayer/DismissableLayer.vue
var DismissableLayer_default = DismissableLayer_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'DismissableLayer_default', {
  enumerable: true,
  get: function () {
    return DismissableLayer_default;
  }
});
Object.defineProperty(exports, 'context', {
  enumerable: true,
  get: function () {
    return context;
  }
});
//# sourceMappingURL=DismissableLayer.cjs.map