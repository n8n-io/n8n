const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const require_shared_useForwardExpose = require('../shared/useForwardExpose.cjs');
const require_shared_useSize = require('../shared/useSize.cjs');
const require_Primitive_Primitive = require('../Primitive/Primitive.cjs');
const require_Collection_Collection = require('../Collection/Collection.cjs');
const require_Slider_utils = require('./utils.cjs');
const require_Slider_SliderRoot = require('./SliderRoot.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));
const __vueuse_core = require_rolldown_runtime.__toESM(require("@vueuse/core"));

//#region src/Slider/SliderThumbImpl.vue?vue&type=script&setup=true&lang.ts
var SliderThumbImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ (0, vue.defineComponent)({
	inheritAttrs: false,
	__name: "SliderThumbImpl",
	props: {
		index: {
			type: Number,
			required: true
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
	setup(__props) {
		const props = __props;
		const rootContext = require_Slider_SliderRoot.injectSliderRootContext();
		const orientation = require_Slider_utils.injectSliderOrientationContext();
		const { forwardRef, currentElement: thumbElement } = require_shared_useForwardExpose.useForwardExpose();
		const { CollectionItem } = require_Collection_Collection.useCollection();
		const value = (0, vue.computed)(() => rootContext.modelValue?.value?.[props.index]);
		const percent = (0, vue.computed)(() => value.value === void 0 ? 0 : require_Slider_utils.convertValueToPercentage(value.value, rootContext.min.value ?? 0, rootContext.max.value ?? 100));
		const label = (0, vue.computed)(() => require_Slider_utils.getLabel(props.index, rootContext.modelValue?.value?.length ?? 0));
		const size = require_shared_useSize.useSize(thumbElement);
		const orientationSize = (0, vue.computed)(() => size[orientation.size].value);
		const thumbInBoundsOffset = (0, vue.computed)(() => {
			if (rootContext.thumbAlignment.value === "overflow" || !orientationSize.value) return 0;
			else return require_Slider_utils.getThumbInBoundsOffset(orientationSize.value, percent.value, orientation.direction.value);
		});
		const isMounted = (0, __vueuse_core.useMounted)();
		(0, vue.onMounted)(() => {
			rootContext.thumbElements.value.push(thumbElement.value);
		});
		(0, vue.onUnmounted)(() => {
			const i = rootContext.thumbElements.value.findIndex((i$1) => i$1 === thumbElement.value) ?? -1;
			rootContext.thumbElements.value.splice(i, 1);
		});
		return (_ctx, _cache) => {
			return (0, vue.openBlock)(), (0, vue.createBlock)((0, vue.unref)(CollectionItem), null, {
				default: (0, vue.withCtx)(() => [(0, vue.createVNode)((0, vue.unref)(require_Primitive_Primitive.Primitive), (0, vue.mergeProps)(_ctx.$attrs, {
					ref: (0, vue.unref)(forwardRef),
					role: "slider",
					tabindex: (0, vue.unref)(rootContext).disabled.value ? void 0 : 0,
					"aria-label": _ctx.$attrs["aria-label"] || label.value,
					"data-disabled": (0, vue.unref)(rootContext).disabled.value ? "" : void 0,
					"data-orientation": (0, vue.unref)(rootContext).orientation.value,
					"aria-valuenow": value.value,
					"aria-valuemin": (0, vue.unref)(rootContext).min.value,
					"aria-valuemax": (0, vue.unref)(rootContext).max.value,
					"aria-orientation": (0, vue.unref)(rootContext).orientation.value,
					"as-child": _ctx.asChild,
					as: _ctx.as,
					style: {
						transform: "var(--reka-slider-thumb-transform)",
						position: "absolute",
						[(0, vue.unref)(orientation).startEdge.value]: `calc(${percent.value}% + ${thumbInBoundsOffset.value}px)`,
						display: !(0, vue.unref)(isMounted) && value.value === void 0 ? "none" : void 0
					},
					onFocus: _cache[0] || (_cache[0] = () => {
						(0, vue.unref)(rootContext).valueIndexToChangeRef.value = _ctx.index;
					})
				}), {
					default: (0, vue.withCtx)(() => [(0, vue.renderSlot)(_ctx.$slots, "default")]),
					_: 3
				}, 16, [
					"tabindex",
					"aria-label",
					"data-disabled",
					"data-orientation",
					"aria-valuenow",
					"aria-valuemin",
					"aria-valuemax",
					"aria-orientation",
					"as-child",
					"as",
					"style"
				])]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Slider/SliderThumbImpl.vue
var SliderThumbImpl_default = SliderThumbImpl_vue_vue_type_script_setup_true_lang_default;

//#endregion
Object.defineProperty(exports, 'SliderThumbImpl_default', {
  enumerable: true,
  get: function () {
    return SliderThumbImpl_default;
  }
});
//# sourceMappingURL=SliderThumbImpl.cjs.map