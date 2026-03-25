import { createContext } from "../shared/createContext.js";
import { useDirection } from "../shared/useDirection.js";
import { useFormControl } from "../shared/useFormControl.js";
import { Primitive } from "../Primitive/Primitive.js";
import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { RovingFocusGroup_default } from "../RovingFocus/RovingFocusGroup.js";
import { VisuallyHiddenInput_default } from "../VisuallyHidden/VisuallyHiddenInput.js";
import { computed, createBlock, createCommentVNode, defineComponent, mergeProps, openBlock, renderSlot, resolveDynamicComponent, toRefs, unref, withCtx } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/Checkbox/CheckboxGroupRoot.vue?vue&type=script&setup=true&lang.ts
const [injectCheckboxGroupRootContext, provideCheckboxGroupRootContext] = createContext("CheckboxGroupRoot");
var CheckboxGroupRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "CheckboxGroupRoot",
	props: {
		defaultValue: {
			type: Array,
			required: false
		},
		modelValue: {
			type: Array,
			required: false
		},
		rovingFocus: {
			type: Boolean,
			required: false,
			default: true
		},
		disabled: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		dir: {
			type: String,
			required: false
		},
		orientation: {
			type: String,
			required: false
		},
		loop: {
			type: Boolean,
			required: false
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
		const { disabled, rovingFocus, dir: propDir } = toRefs(props);
		const dir = useDirection(propDir);
		const { primitiveElement, currentElement } = usePrimitiveElement();
		const isFormControl = useFormControl(currentElement);
		const modelValue = useVModel(props, "modelValue", emits, {
			defaultValue: props.defaultValue ?? [],
			passive: props.modelValue === void 0
		});
		const rovingFocusProps = computed(() => {
			return rovingFocus.value ? {
				loop: props.loop,
				dir: dir.value,
				orientation: props.orientation
			} : {};
		});
		provideCheckboxGroupRootContext({
			modelValue,
			rovingFocus,
			disabled
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(resolveDynamicComponent(unref(rovingFocus) ? unref(RovingFocusGroup_default) : unref(Primitive)), mergeProps({
				ref_key: "primitiveElement",
				ref: primitiveElement,
				as: _ctx.as,
				"as-child": _ctx.asChild
			}, rovingFocusProps.value), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default"), unref(isFormControl) && _ctx.name ? (openBlock(), createBlock(unref(VisuallyHiddenInput_default), {
					key: 0,
					name: _ctx.name,
					value: unref(modelValue),
					required: _ctx.required
				}, null, 8, [
					"name",
					"value",
					"required"
				])) : createCommentVNode("v-if", true)]),
				_: 3
			}, 16, ["as", "as-child"]);
		};
	}
});

//#endregion
//#region src/Checkbox/CheckboxGroupRoot.vue
var CheckboxGroupRoot_default = CheckboxGroupRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { CheckboxGroupRoot_default, injectCheckboxGroupRootContext };
//# sourceMappingURL=CheckboxGroupRoot.js.map