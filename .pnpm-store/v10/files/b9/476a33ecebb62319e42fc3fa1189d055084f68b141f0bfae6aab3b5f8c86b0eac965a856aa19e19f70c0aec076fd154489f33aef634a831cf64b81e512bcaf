import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectComboboxRootContext } from "./ComboboxRoot.js";
import { computed, createBlock, defineComponent, mergeProps, onMounted, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Combobox/ComboboxTrigger.vue?vue&type=script&setup=true&lang.ts
var ComboboxTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ComboboxTrigger",
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
		const { forwardRef, currentElement } = useForwardExpose();
		const rootContext = injectComboboxRootContext();
		const disabled = computed(() => props.disabled || rootContext.disabled.value || false);
		onMounted(() => {
			if (currentElement.value) rootContext.onTriggerElementChange(currentElement.value);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(props, {
				ref: unref(forwardRef),
				type: _ctx.as === "button" ? "button" : void 0,
				tabindex: "-1",
				"aria-label": "Show popup",
				"aria-haspopup": "listbox",
				"aria-expanded": unref(rootContext).open.value,
				"aria-controls": unref(rootContext).contentId,
				"data-state": unref(rootContext).open.value ? "open" : "closed",
				disabled: disabled.value,
				"data-disabled": disabled.value ? "" : void 0,
				"aria-disabled": disabled.value ?? void 0,
				onClick: _cache[0] || (_cache[0] = ($event) => unref(rootContext).onOpenChange(!unref(rootContext).open.value))
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"type",
				"aria-expanded",
				"aria-controls",
				"data-state",
				"disabled",
				"data-disabled",
				"aria-disabled"
			]);
		};
	}
});

//#endregion
//#region src/Combobox/ComboboxTrigger.vue
var ComboboxTrigger_default = ComboboxTrigger_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ComboboxTrigger_default };
//# sourceMappingURL=ComboboxTrigger.js.map