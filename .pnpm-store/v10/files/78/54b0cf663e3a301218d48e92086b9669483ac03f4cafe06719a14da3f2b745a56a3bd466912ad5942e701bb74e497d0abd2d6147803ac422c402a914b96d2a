import { createContext } from "../shared/createContext.js";
import { useFormControl } from "../shared/useFormControl.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { VisuallyHiddenInput_default } from "../VisuallyHidden/VisuallyHiddenInput.js";
import { computed, createBlock, createCommentVNode, defineComponent, mergeProps, openBlock, renderSlot, toRefs, unref, withCtx, withKeys, withModifiers } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/Switch/SwitchRoot.vue?vue&type=script&setup=true&lang.ts
const [injectSwitchRootContext, provideSwitchRootContext] = createContext("SwitchRoot");
var SwitchRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "SwitchRoot",
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
			required: false
		},
		id: {
			type: String,
			required: false
		},
		value: {
			type: String,
			required: false,
			default: "on"
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
		const emit = __emit;
		const { disabled } = toRefs(props);
		const modelValue = useVModel(props, "modelValue", emit, {
			defaultValue: props.defaultValue,
			passive: props.modelValue === void 0
		});
		function toggleCheck() {
			if (disabled.value) return;
			modelValue.value = !modelValue.value;
		}
		const { forwardRef, currentElement } = useForwardExpose();
		const isFormControl = useFormControl(currentElement);
		const ariaLabel = computed(() => props.id && currentElement.value ? document.querySelector(`[for="${props.id}"]`)?.innerText : void 0);
		provideSwitchRootContext({
			modelValue,
			toggleCheck,
			disabled
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(_ctx.$attrs, {
				id: _ctx.id,
				ref: unref(forwardRef),
				role: "switch",
				type: _ctx.as === "button" ? "button" : void 0,
				value: _ctx.value,
				"aria-label": _ctx.$attrs["aria-label"] || ariaLabel.value,
				"aria-checked": unref(modelValue),
				"aria-required": _ctx.required,
				"data-state": unref(modelValue) ? "checked" : "unchecked",
				"data-disabled": unref(disabled) ? "" : void 0,
				"as-child": _ctx.asChild,
				as: _ctx.as,
				disabled: unref(disabled),
				onClick: toggleCheck,
				onKeydown: withKeys(withModifiers(toggleCheck, ["prevent"]), ["enter"])
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", { modelValue: unref(modelValue) }), unref(isFormControl) && _ctx.name ? (openBlock(), createBlock(unref(VisuallyHiddenInput_default), {
					key: 0,
					type: "checkbox",
					name: _ctx.name,
					disabled: unref(disabled),
					required: _ctx.required,
					value: _ctx.value,
					checked: !!unref(modelValue)
				}, null, 8, [
					"name",
					"disabled",
					"required",
					"value",
					"checked"
				])) : createCommentVNode("v-if", true)]),
				_: 3
			}, 16, [
				"id",
				"type",
				"value",
				"aria-label",
				"aria-checked",
				"aria-required",
				"data-state",
				"data-disabled",
				"as-child",
				"as",
				"disabled",
				"onKeydown"
			]);
		};
	}
});

//#endregion
//#region src/Switch/SwitchRoot.vue
var SwitchRoot_default = SwitchRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { SwitchRoot_default, injectSwitchRootContext };
//# sourceMappingURL=SwitchRoot.js.map