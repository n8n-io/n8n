import { createContext } from "../shared/createContext.js";
import { useDirection } from "../shared/useDirection.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { VisuallyHiddenInput_default } from "../VisuallyHidden/VisuallyHiddenInput.js";
import { computed, createBlock, createVNode, defineComponent, mergeProps, openBlock, ref, renderSlot, toRefs, unref, watch, withCtx } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/PinInput/PinInputRoot.vue?vue&type=script&setup=true&lang.ts
const [injectPinInputRootContext, providePinInputRootContext] = createContext("PinInputRoot");
var PinInputRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "PinInputRoot",
	props: {
		modelValue: {
			type: null,
			required: false
		},
		defaultValue: {
			type: Array,
			required: false
		},
		placeholder: {
			type: String,
			required: false,
			default: ""
		},
		mask: {
			type: Boolean,
			required: false
		},
		otp: {
			type: Boolean,
			required: false
		},
		type: {
			type: null,
			required: false,
			default: "text"
		},
		dir: {
			type: String,
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		id: {
			type: String,
			required: false
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
		}
	},
	emits: ["update:modelValue", "complete"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const { mask, otp, placeholder, type, disabled, dir: propDir } = toRefs(props);
		const { forwardRef } = useForwardExpose();
		const dir = useDirection(propDir);
		const modelValue = useVModel(props, "modelValue", emits, {
			defaultValue: props.defaultValue ?? [],
			passive: props.modelValue === void 0
		});
		const currentModelValue = computed(() => Array.isArray(modelValue.value) ? [...modelValue.value] : []);
		const inputElements = ref(/* @__PURE__ */ new Set());
		function onInputElementChange(el) {
			inputElements.value.add(el);
		}
		const isNumericMode = computed(() => props.type === "number");
		const isCompleted = computed(() => {
			const modelValues = currentModelValue.value.filter((i) => !!i || isNumericMode.value && i === 0);
			return modelValues.length === inputElements.value.size;
		});
		watch(modelValue, () => {
			if (isCompleted.value) emits("complete", modelValue.value);
		}, { deep: true });
		providePinInputRootContext({
			modelValue,
			currentModelValue,
			mask,
			otp,
			placeholder,
			type,
			dir,
			disabled,
			isCompleted,
			inputElements,
			onInputElementChange,
			isNumericMode
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(_ctx.$attrs, {
				ref: unref(forwardRef),
				dir: unref(dir),
				"data-complete": isCompleted.value ? "" : void 0,
				"data-disabled": unref(disabled) ? "" : void 0
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", { modelValue: unref(modelValue) }), createVNode(VisuallyHiddenInput_default, {
					id: _ctx.id,
					as: "input",
					feature: "focusable",
					tabindex: "-1",
					value: currentModelValue.value.join(""),
					name: _ctx.name ?? "",
					disabled: unref(disabled),
					required: _ctx.required,
					onFocus: _cache[0] || (_cache[0] = ($event) => Array.from(inputElements.value)?.[0]?.focus())
				}, null, 8, [
					"id",
					"value",
					"name",
					"disabled",
					"required"
				])]),
				_: 3
			}, 16, [
				"dir",
				"data-complete",
				"data-disabled"
			]);
		};
	}
});

//#endregion
//#region src/PinInput/PinInputRoot.vue
var PinInputRoot_default = PinInputRoot_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { PinInputRoot_default, injectPinInputRootContext };
//# sourceMappingURL=PinInputRoot.js.map