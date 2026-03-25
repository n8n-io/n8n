import { createContext } from "../shared/createContext.js";
import { useDirection } from "../shared/useDirection.js";
import { useFormControl } from "../shared/useFormControl.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { RovingFocusGroup_default } from "../RovingFocus/RovingFocusGroup.js";
import { VisuallyHiddenInput_default } from "../VisuallyHidden/VisuallyHiddenInput.js";
import { createBlock, createCommentVNode, createVNode, defineComponent, openBlock, renderSlot, toRefs, unref, withCtx } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/RadioGroup/RadioGroupRoot.vue?vue&type=script&setup=true&lang.ts
const [injectRadioGroupRootContext, provideRadioGroupRootContext] = createContext("RadioGroupRoot");
var RadioGroupRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "RadioGroupRoot",
	props: {
		modelValue: {
			type: null,
			required: false
		},
		defaultValue: {
			type: null,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false
		},
		orientation: {
			type: String,
			required: false,
			default: void 0
		},
		dir: {
			type: String,
			required: false
		},
		loop: {
			type: Boolean,
			required: false,
			default: true
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		},
		name: {
			type: String,
			required: false
		},
		required: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { forwardRef, currentElement } = useForwardExpose();
		const modelValue = useVModel(props, "modelValue", emits, {
			defaultValue: props.defaultValue,
			passive: props.modelValue === void 0
		});
		const { disabled, loop, orientation, name, required, dir: propDir } = toRefs(props);
		const dir = useDirection(propDir);
		const isFormControl = useFormControl(currentElement);
		provideRadioGroupRootContext({
			modelValue,
			changeModelValue: (value) => {
				modelValue.value = value;
			},
			disabled,
			loop,
			orientation,
			name: name?.value,
			required
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(RovingFocusGroup_default), {
				"as-child": "",
				orientation: unref(orientation),
				dir: unref(dir),
				loop: unref(loop)
			}, {
				default: withCtx(() => [createVNode(unref(Primitive), {
					ref: unref(forwardRef),
					role: "radiogroup",
					"data-disabled": unref(disabled) ? "" : void 0,
					"as-child": _ctx.asChild,
					as: _ctx.as,
					"aria-orientation": unref(orientation),
					"aria-required": unref(required),
					dir: unref(dir)
				}, {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default", { modelValue: unref(modelValue) }), unref(isFormControl) && unref(name) ? (openBlock(), createBlock(unref(VisuallyHiddenInput_default), {
						key: 0,
						required: unref(required),
						disabled: unref(disabled),
						value: unref(modelValue),
						name: unref(name)
					}, null, 8, [
						"required",
						"disabled",
						"value",
						"name"
					])) : createCommentVNode("v-if", true)]),
					_: 3
				}, 8, [
					"data-disabled",
					"as-child",
					"as",
					"aria-orientation",
					"aria-required",
					"dir"
				])]),
				_: 3
			}, 8, [
				"orientation",
				"dir",
				"loop"
			]);
		};
	}
});

//#endregion
//#region src/RadioGroup/RadioGroupRoot.vue
var RadioGroupRoot_default = RadioGroupRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { RadioGroupRoot_default, injectRadioGroupRootContext };
//# sourceMappingURL=RadioGroupRoot.js.map