import { createContext } from "../shared/createContext.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { RovingFocusItem_default } from "../RovingFocus/RovingFocusItem.js";
import { Radio_default } from "./Radio.js";
import { injectRadioGroupRootContext } from "./RadioGroupRoot.js";
import { computed, createBlock, createVNode, defineComponent, mergeProps, openBlock, ref, renderSlot, unref, withCtx, withKeys, withModifiers } from "vue";
import { isEqual } from "ohash";
import { useEventListener } from "@vueuse/core";

//#region src/RadioGroup/RadioGroupItem.vue?vue&type=script&setup=true&lang.ts
const [injectRadioGroupItemContext, provideRadiogroupItemContext] = createContext("RadioGroupItem");
var RadioGroupItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "RadioGroupItem",
	props: {
		id: {
			type: String,
			required: false
		},
		value: {
			type: null,
			required: false
		},
		disabled: {
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
			required: false,
			default: "button"
		},
		name: {
			type: String,
			required: false
		},
		required: {
			type: Boolean,
			required: false
		}
	},
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { forwardRef, currentElement } = useForwardExpose();
		const rootContext = injectRadioGroupRootContext();
		const disabled = computed(() => rootContext.disabled.value || props.disabled);
		const required = computed(() => rootContext.required.value || props.required);
		const checked = computed(() => isEqual(rootContext.modelValue?.value, props.value));
		provideRadiogroupItemContext({
			disabled,
			checked
		});
		const isArrowKeyPressed = ref(false);
		const ARROW_KEYS = [
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight"
		];
		useEventListener("keydown", (event) => {
			if (ARROW_KEYS.includes(event.key)) isArrowKeyPressed.value = true;
		});
		useEventListener("keyup", () => {
			isArrowKeyPressed.value = false;
		});
		function handleFocus() {
			setTimeout(() => {
				/**
				* Our `RovingFocusGroup` will focus the radio when navigating with arrow keys
				* and we need to 'check' it in that case. We click it to 'check' it (instead
				* of updating `context.value`) so that the radio change event fires.
				*/
				if (isArrowKeyPressed.value) currentElement.value?.click();
			}, 0);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(RovingFocusItem_default), {
				checked: checked.value,
				disabled: disabled.value,
				"as-child": "",
				focusable: !disabled.value,
				active: checked.value
			}, {
				default: withCtx(() => [createVNode(Radio_default, mergeProps({
					..._ctx.$attrs,
					...props
				}, {
					ref: unref(forwardRef),
					checked: checked.value,
					required: required.value,
					disabled: disabled.value,
					"onUpdate:checked": _cache[0] || (_cache[0] = ($event) => unref(rootContext).changeModelValue(_ctx.value)),
					onSelect: _cache[1] || (_cache[1] = ($event) => emits("select", $event)),
					onKeydown: _cache[2] || (_cache[2] = withKeys(withModifiers(() => {}, ["prevent"]), ["enter"])),
					onFocus: handleFocus
				}), {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default", {
						checked: checked.value,
						required: required.value,
						disabled: disabled.value
					})]),
					_: 3
				}, 16, [
					"checked",
					"required",
					"disabled"
				])]),
				_: 3
			}, 8, [
				"checked",
				"disabled",
				"focusable",
				"active"
			]);
		};
	}
});

//#endregion
//#region src/RadioGroup/RadioGroupItem.vue
var RadioGroupItem_default = RadioGroupItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { RadioGroupItem_default, injectRadioGroupItemContext };
//# sourceMappingURL=RadioGroupItem.js.map