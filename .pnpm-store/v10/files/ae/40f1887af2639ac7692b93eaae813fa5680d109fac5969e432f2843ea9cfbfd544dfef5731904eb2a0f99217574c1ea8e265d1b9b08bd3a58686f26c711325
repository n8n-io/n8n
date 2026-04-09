import { useForwardPropsEmits } from "../shared/useForwardPropsEmits.js";
import { ListboxRoot_default } from "../Listbox/ListboxRoot.js";
import { ListboxContent_default } from "../Listbox/ListboxContent.js";
import { createBlock, createVNode, defineComponent, isRef, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/ColorSwatchPicker/ColorSwatchPickerRoot.vue?vue&type=script&setup=true&lang.ts
var ColorSwatchPickerRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ColorSwatchPickerRoot",
	props: {
		defaultValue: {
			type: [String, Array],
			required: false,
			default: void 0
		},
		modelValue: {
			type: [String, Array],
			required: false
		},
		multiple: {
			type: Boolean,
			required: false
		},
		orientation: {
			type: String,
			required: false,
			default: "horizontal"
		},
		dir: {
			type: String,
			required: false,
			default: "ltr"
		},
		disabled: {
			type: Boolean,
			required: false,
			default: false
		},
		selectionBehavior: {
			type: String,
			required: false
		},
		highlightOnHover: {
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
			default: "div"
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
	emits: [
		"update:modelValue",
		"highlight",
		"entryFocus",
		"leave"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const modelValue = useVModel(props, "modelValue", emits, {
			defaultValue: props.defaultValue ?? (props.multiple ? [] : ""),
			passive: props.modelValue === void 0
		});
		const forwarded = useForwardPropsEmits(props, emits);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(ListboxRoot_default), mergeProps(unref(forwarded), {
				modelValue: unref(modelValue),
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(modelValue) ? modelValue.value = $event : null),
				"as-child": ""
			}), {
				default: withCtx(() => [createVNode(unref(ListboxContent_default), {
					"as-child": _ctx.asChild,
					as: _ctx.as
				}, {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default", { modelValue: unref(modelValue) })]),
					_: 3
				}, 8, ["as-child", "as"])]),
				_: 3
			}, 16, ["modelValue"]);
		};
	}
});

//#endregion
//#region src/ColorSwatchPicker/ColorSwatchPickerRoot.vue
var ColorSwatchPickerRoot_default = ColorSwatchPickerRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ColorSwatchPickerRoot_default };
//# sourceMappingURL=ColorSwatchPickerRoot.js.map