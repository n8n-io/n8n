import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useSize } from "../shared/useSize.js";
import { Primitive } from "../Primitive/Primitive.js";
import { useCollection } from "../Collection/Collection.js";
import { convertValueToPercentage, getLabel, getThumbInBoundsOffset, injectSliderOrientationContext } from "./utils.js";
import { injectSliderRootContext } from "./SliderRoot.js";
import { computed, createBlock, createVNode, defineComponent, mergeProps, onMounted, onUnmounted, openBlock, renderSlot, unref, withCtx } from "vue";
import { useMounted } from "@vueuse/core";

//#region src/Slider/SliderThumbImpl.vue?vue&type=script&setup=true&lang.ts
var SliderThumbImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
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
		const rootContext = injectSliderRootContext();
		const orientation = injectSliderOrientationContext();
		const { forwardRef, currentElement: thumbElement } = useForwardExpose();
		const { CollectionItem } = useCollection();
		const value = computed(() => rootContext.modelValue?.value?.[props.index]);
		const percent = computed(() => value.value === void 0 ? 0 : convertValueToPercentage(value.value, rootContext.min.value ?? 0, rootContext.max.value ?? 100));
		const label = computed(() => getLabel(props.index, rootContext.modelValue?.value?.length ?? 0));
		const size = useSize(thumbElement);
		const orientationSize = computed(() => size[orientation.size].value);
		const thumbInBoundsOffset = computed(() => {
			if (rootContext.thumbAlignment.value === "overflow" || !orientationSize.value) return 0;
			else return getThumbInBoundsOffset(orientationSize.value, percent.value, orientation.direction.value);
		});
		const isMounted = useMounted();
		onMounted(() => {
			rootContext.thumbElements.value.push(thumbElement.value);
		});
		onUnmounted(() => {
			const i = rootContext.thumbElements.value.findIndex((i$1) => i$1 === thumbElement.value) ?? -1;
			rootContext.thumbElements.value.splice(i, 1);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(CollectionItem), null, {
				default: withCtx(() => [createVNode(unref(Primitive), mergeProps(_ctx.$attrs, {
					ref: unref(forwardRef),
					role: "slider",
					tabindex: unref(rootContext).disabled.value ? void 0 : 0,
					"aria-label": _ctx.$attrs["aria-label"] || label.value,
					"data-disabled": unref(rootContext).disabled.value ? "" : void 0,
					"data-orientation": unref(rootContext).orientation.value,
					"aria-valuenow": value.value,
					"aria-valuemin": unref(rootContext).min.value,
					"aria-valuemax": unref(rootContext).max.value,
					"aria-orientation": unref(rootContext).orientation.value,
					"as-child": _ctx.asChild,
					as: _ctx.as,
					style: {
						transform: "var(--reka-slider-thumb-transform)",
						position: "absolute",
						[unref(orientation).startEdge.value]: `calc(${percent.value}% + ${thumbInBoundsOffset.value}px)`,
						display: !unref(isMounted) && value.value === void 0 ? "none" : void 0
					},
					onFocus: _cache[0] || (_cache[0] = () => {
						unref(rootContext).valueIndexToChangeRef.value = _ctx.index;
					})
				}), {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
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
export { SliderThumbImpl_default };
//# sourceMappingURL=SliderThumbImpl.js.map