import { Primitive } from "../Primitive/Primitive.js";
import { usePrimitiveElement } from "../Primitive/usePrimitiveElement.js";
import { injectListboxRootContext } from "./ListboxRoot.js";
import { computed, createBlock, defineComponent, onMounted, onUnmounted, openBlock, ref, renderSlot, unref, watchSyncEffect, withCtx, withKeys, withModifiers } from "vue";
import { useVModel } from "@vueuse/core";

//#region src/Listbox/ListboxFilter.vue?vue&type=script&setup=true&lang.ts
var ListboxFilter_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ListboxFilter",
	props: {
		modelValue: {
			type: String,
			required: false
		},
		autoFocus: {
			type: Boolean,
			required: false
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
			default: "input"
		}
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const modelValue = useVModel(props, "modelValue", emits, {
			defaultValue: "",
			passive: props.modelValue === void 0
		});
		const rootContext = injectListboxRootContext();
		const { primitiveElement, currentElement } = usePrimitiveElement();
		const disabled = computed(() => props.disabled || rootContext.disabled.value || false);
		const activedescendant = ref();
		watchSyncEffect(() => activedescendant.value = rootContext.highlightedElement.value?.id);
		onMounted(() => {
			rootContext.focusable.value = false;
			setTimeout(() => {
				if (props.autoFocus) currentElement.value?.focus();
			}, 1);
		});
		onUnmounted(() => {
			rootContext.focusable.value = true;
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				ref_key: "primitiveElement",
				ref: primitiveElement,
				as: _ctx.as,
				"as-child": _ctx.asChild,
				value: unref(modelValue),
				disabled: disabled.value ? "" : void 0,
				"data-disabled": disabled.value ? "" : void 0,
				"aria-disabled": disabled.value ?? void 0,
				"aria-activedescendant": activedescendant.value,
				type: "text",
				onKeydown: [withKeys(withModifiers(unref(rootContext).onKeydownNavigation, ["prevent"]), [
					"down",
					"up",
					"home",
					"end"
				]), withKeys(unref(rootContext).onKeydownEnter, ["enter"])],
				onInput: _cache[0] || (_cache[0] = (event) => {
					modelValue.value = event.target.value;
					unref(rootContext).highlightFirstItem();
				}),
				onCompositionstart: unref(rootContext).onCompositionStart,
				onCompositionend: unref(rootContext).onCompositionEnd
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", { modelValue: unref(modelValue) })]),
				_: 3
			}, 8, [
				"as",
				"as-child",
				"value",
				"disabled",
				"data-disabled",
				"aria-disabled",
				"aria-activedescendant",
				"onKeydown",
				"onCompositionstart",
				"onCompositionend"
			]);
		};
	}
});

//#endregion
//#region src/Listbox/ListboxFilter.vue
var ListboxFilter_default = ListboxFilter_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ListboxFilter_default };
//# sourceMappingURL=ListboxFilter.js.map