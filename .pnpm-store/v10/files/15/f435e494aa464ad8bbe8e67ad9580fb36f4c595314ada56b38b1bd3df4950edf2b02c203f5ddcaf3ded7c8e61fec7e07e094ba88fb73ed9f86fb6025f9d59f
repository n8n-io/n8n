import { isValueEqualOrExist } from "../shared/isValueEqualOrExist.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { RovingFocusItem_default } from "../RovingFocus/RovingFocusItem.js";
import { injectToggleGroupRootContext } from "./ToggleGroupRoot.js";
import { Toggle_default } from "../Toggle/Toggle.js";
import { computed, createBlock, createVNode, defineComponent, guardReactiveProps, mergeProps, normalizeProps, openBlock, renderSlot, resolveDynamicComponent, unref, withCtx } from "vue";

//#region src/ToggleGroup/ToggleGroupItem.vue?vue&type=script&setup=true&lang.ts
var ToggleGroupItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ToggleGroupItem",
	props: {
		value: {
			type: null,
			required: true
		},
		disabled: {
			type: Boolean,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "button"
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = injectToggleGroupRootContext();
		const disabled = computed(() => rootContext.disabled?.value || props.disabled);
		const pressed = computed(() => isValueEqualOrExist(rootContext.modelValue.value, props.value));
		const { forwardRef } = useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(resolveDynamicComponent(unref(rootContext).rovingFocus.value ? unref(RovingFocusItem_default) : unref(Primitive)), {
				"as-child": "",
				focusable: !disabled.value,
				active: pressed.value
			}, {
				default: withCtx(() => [createVNode(unref(Toggle_default), mergeProps(props, {
					ref: unref(forwardRef),
					disabled: disabled.value,
					"model-value": pressed.value,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => unref(rootContext).changeModelValue(_ctx.value))
				}), {
					default: withCtx((slotProps) => [renderSlot(_ctx.$slots, "default", normalizeProps(guardReactiveProps(slotProps)))]),
					_: 3
				}, 16, ["disabled", "model-value"])]),
				_: 3
			}, 8, ["focusable", "active"]);
		};
	}
});

//#endregion
//#region src/ToggleGroup/ToggleGroupItem.vue
var ToggleGroupItem_default = ToggleGroupItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ToggleGroupItem_default };
//# sourceMappingURL=ToggleGroupItem.js.map