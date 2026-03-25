import { useFormControl } from "../shared/useFormControl.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { VisuallyHiddenInput_default } from "../VisuallyHidden/VisuallyHiddenInput.js";
import { injectToggleGroupRootContext } from "../ToggleGroup/ToggleGroupRoot.js";
import { computed, createBlock, createCommentVNode, defineComponent, openBlock, renderSlot, unref, withCtx } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/Toggle/Toggle.vue?vue&type=script&setup=true&lang.ts
var Toggle_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "Toggle",
	props: {
		defaultValue: {
			type: Boolean,
			required: false
		},
		modelValue: {
			type: [Boolean, null],
			required: false,
			default: void 0
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
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { forwardRef, currentElement } = useForwardExpose();
		const toggleGroupContext = injectToggleGroupRootContext(null);
		const modelValue = useVModel(props, "modelValue", emits, {
			defaultValue: props.defaultValue,
			passive: props.modelValue === void 0
		});
		function togglePressed() {
			modelValue.value = !modelValue.value;
		}
		const dataState = computed(() => {
			return modelValue.value ? "on" : "off";
		});
		const isFormControl = useFormControl(currentElement);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				ref: unref(forwardRef),
				type: _ctx.as === "button" ? "button" : void 0,
				"as-child": props.asChild,
				as: _ctx.as,
				"aria-pressed": unref(modelValue),
				"data-state": dataState.value,
				"data-disabled": _ctx.disabled ? "" : void 0,
				disabled: _ctx.disabled,
				onClick: togglePressed
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", {
					modelValue: unref(modelValue),
					disabled: _ctx.disabled,
					pressed: unref(modelValue),
					state: dataState.value
				}), unref(isFormControl) && _ctx.name && !unref(toggleGroupContext) ? (openBlock(), createBlock(VisuallyHiddenInput_default, {
					key: 0,
					type: "checkbox",
					name: _ctx.name,
					value: unref(modelValue),
					required: _ctx.required
				}, null, 8, [
					"name",
					"value",
					"required"
				])) : createCommentVNode("v-if", true)]),
				_: 3
			}, 8, [
				"type",
				"as-child",
				"as",
				"aria-pressed",
				"data-state",
				"data-disabled",
				"disabled"
			]);
		};
	}
});

//#endregion
//#region src/Toggle/Toggle.vue
var Toggle_default = Toggle_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { Toggle_default };
//# sourceMappingURL=Toggle.js.map