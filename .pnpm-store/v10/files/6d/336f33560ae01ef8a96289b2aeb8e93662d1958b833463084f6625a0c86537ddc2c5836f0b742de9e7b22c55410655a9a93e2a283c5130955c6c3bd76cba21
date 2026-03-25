import { createContext } from "../shared/createContext.js";
import { useDirection } from "../shared/useDirection.js";
import { useFormControl } from "../shared/useFormControl.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { useSingleOrMultipleValue } from "../shared/useSingleOrMultipleValue.js";
import { RovingFocusGroup_default } from "../RovingFocus/RovingFocusGroup.js";
import { VisuallyHiddenInput_default } from "../VisuallyHidden/VisuallyHiddenInput.js";
import { createBlock, createCommentVNode, createVNode, defineComponent, openBlock, renderSlot, resolveDynamicComponent, toRefs, unref, withCtx } from "vue";

//#region src/ToggleGroup/ToggleGroupRoot.vue?vue&type=script&setup=true&lang.ts
const [injectToggleGroupRootContext, provideToggleGroupRootContext] = createContext("ToggleGroupRoot");
var ToggleGroupRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ToggleGroupRoot",
	props: {
		rovingFocus: {
			type: Boolean,
			required: false,
			default: true
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false
		},
		orientation: {
			type: String,
			required: false
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
			required: false
		},
		type: {
			type: String,
			required: false
		},
		modelValue: {
			type: null,
			required: false
		},
		defaultValue: {
			type: null,
			required: false
		}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { loop, rovingFocus, disabled, dir: propDir } = toRefs(props);
		const dir = useDirection(propDir);
		const { forwardRef, currentElement } = useForwardExpose();
		const { modelValue, changeModelValue, isSingle } = useSingleOrMultipleValue(props, emits);
		const isFormControl = useFormControl(currentElement);
		provideToggleGroupRootContext({
			isSingle,
			modelValue,
			changeModelValue,
			dir,
			orientation: props.orientation,
			loop,
			rovingFocus,
			disabled
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(resolveDynamicComponent(unref(rovingFocus) ? unref(RovingFocusGroup_default) : unref(Primitive)), {
				"as-child": "",
				orientation: unref(rovingFocus) ? _ctx.orientation : void 0,
				dir: unref(dir),
				loop: unref(rovingFocus) ? unref(loop) : void 0
			}, {
				default: withCtx(() => [createVNode(unref(Primitive), {
					ref: unref(forwardRef),
					role: "group",
					"as-child": _ctx.asChild,
					as: _ctx.as
				}, {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default", { modelValue: unref(modelValue) }), unref(isFormControl) && _ctx.name ? (openBlock(), createBlock(VisuallyHiddenInput_default, {
						key: 0,
						name: _ctx.name,
						required: _ctx.required,
						value: unref(modelValue)
					}, null, 8, [
						"name",
						"required",
						"value"
					])) : createCommentVNode("v-if", true)]),
					_: 3
				}, 8, ["as-child", "as"])]),
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
//#region src/ToggleGroup/ToggleGroupRoot.vue
var ToggleGroupRoot_default = ToggleGroupRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ToggleGroupRoot_default, injectToggleGroupRootContext };
//# sourceMappingURL=ToggleGroupRoot.js.map