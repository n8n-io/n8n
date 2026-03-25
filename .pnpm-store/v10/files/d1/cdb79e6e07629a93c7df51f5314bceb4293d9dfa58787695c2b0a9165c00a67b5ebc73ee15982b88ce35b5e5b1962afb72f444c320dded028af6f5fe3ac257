import { Primitive } from "../Primitive/Primitive.js";
import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { usePressedHold } from "./utils.js";
import { injectNumberFieldRootContext } from "./NumberFieldRoot.js";
import { computed, createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx, withModifiers } from "vue";

//#region src/NumberField/NumberFieldDecrement.vue?vue&type=script&setup=true&lang.ts
var NumberFieldDecrement_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "NumberFieldDecrement",
	props: {
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
		const rootContext = injectNumberFieldRootContext();
		const isDisabled = computed(() => rootContext.disabled?.value || rootContext.readonly.value || props.disabled || rootContext.isDecreaseDisabled.value);
		const { primitiveElement, currentElement } = usePrimitiveElement();
		const { isPressed, onTrigger } = usePressedHold({
			target: currentElement,
			disabled: isDisabled
		});
		onTrigger(() => {
			rootContext.handleDecrease();
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(props, {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				tabindex: "-1",
				"aria-label": "Decrease",
				type: _ctx.as === "button" ? "button" : void 0,
				style: { userSelect: unref(isPressed) ? "none" : void 0 },
				disabled: isDisabled.value ? "" : void 0,
				"data-disabled": isDisabled.value ? "" : void 0,
				"data-pressed": unref(isPressed) ? "true" : void 0,
				onContextmenu: _cache[0] || (_cache[0] = withModifiers(() => {}, ["prevent"]))
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"type",
				"style",
				"disabled",
				"data-disabled",
				"data-pressed"
			]);
		};
	}
});

//#endregion
//#region src/NumberField/NumberFieldDecrement.vue
var NumberFieldDecrement_default = NumberFieldDecrement_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { NumberFieldDecrement_default };
//# sourceMappingURL=NumberFieldDecrement.js.map