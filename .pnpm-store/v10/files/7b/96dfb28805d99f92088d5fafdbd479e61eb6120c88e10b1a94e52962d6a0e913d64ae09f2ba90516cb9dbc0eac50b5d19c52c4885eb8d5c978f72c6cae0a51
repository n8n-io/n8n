import { Primitive } from "../Primitive/Primitive.js";
import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { getChannelName } from "../color/channel.js";
import { injectColorAreaRootContext } from "./ColorAreaRoot.js";
import { convertValueToPercentage } from "./utils.js";
import { computed, createBlock, defineComponent, normalizeStyle, onMounted, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/ColorArea/ColorAreaThumb.vue?vue&type=script&setup=true&lang.ts
var ColorAreaThumb_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ColorAreaThumb",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "span"
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = injectColorAreaRootContext();
		const { primitiveElement, currentElement } = usePrimitiveElement();
		onMounted(() => {
			rootContext.thumbRef.value = currentElement.value;
		});
		const xPercent = computed(() => convertValueToPercentage(rootContext.xValue.value, rootContext.xRange.value.min, rootContext.xRange.value.max));
		const yPercent = computed(() => convertValueToPercentage(rootContext.yValue.value, rootContext.yRange.value.min, rootContext.yRange.value.max));
		const ariaLabel = computed(() => {
			return `${getChannelName(rootContext.xChannel.value)}, ${getChannelName(rootContext.yChannel.value)}`;
		});
		const ariaValueText = computed(() => {
			return `${getChannelName(rootContext.xChannel.value)} ${Math.round(rootContext.xValue.value)}, ${getChannelName(rootContext.yChannel.value)} ${Math.round(rootContext.yValue.value)}`;
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				role: "slider",
				tabindex: unref(rootContext).disabled.value ? void 0 : 0,
				"aria-label": ariaLabel.value,
				"aria-roledescription": "Color thumb",
				"aria-valuemin": unref(rootContext).xRange.value.min,
				"aria-valuemax": unref(rootContext).xRange.value.max,
				"aria-valuenow": unref(rootContext).xValue.value,
				"aria-valuetext": ariaValueText.value,
				"aria-orientation": "horizontal",
				"data-disabled": unref(rootContext).disabled.value ? "" : void 0,
				"as-child": _ctx.asChild,
				as: _ctx.as,
				style: normalizeStyle({
					position: "absolute",
					left: `${xPercent.value}%`,
					top: `${100 - yPercent.value}%`,
					transform: "translate(-50%, -50%)",
					touchAction: "none"
				})
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"tabindex",
				"aria-label",
				"aria-valuemin",
				"aria-valuemax",
				"aria-valuenow",
				"aria-valuetext",
				"data-disabled",
				"as-child",
				"as",
				"style"
			]);
		};
	}
});

//#endregion
//#region src/ColorArea/ColorAreaThumb.vue
var ColorAreaThumb_default = ColorAreaThumb_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ColorAreaThumb_default };
//# sourceMappingURL=ColorAreaThumb.js.map