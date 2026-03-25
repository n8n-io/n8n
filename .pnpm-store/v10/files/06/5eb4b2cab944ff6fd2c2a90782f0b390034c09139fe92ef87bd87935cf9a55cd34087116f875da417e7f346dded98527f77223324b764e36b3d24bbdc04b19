import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectComboboxRootContext } from "./ComboboxRoot.js";
import { createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Combobox/ComboboxCancel.vue?vue&type=script&setup=true&lang.ts
var ComboboxCancel_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ComboboxCancel",
	props: {
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
		useForwardExpose();
		const rootContext = injectComboboxRootContext();
		function handleClick() {
			rootContext.filterSearch.value = "";
			if (rootContext.inputElement.value) {
				rootContext.inputElement.value.value = "";
				rootContext.inputElement.value.focus();
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps({ type: _ctx.as === "button" ? "button" : void 0 }, props, {
				tabindex: "-1",
				onClick: handleClick
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["type"]);
		};
	}
});

//#endregion
//#region src/Combobox/ComboboxCancel.vue
var ComboboxCancel_default = ComboboxCancel_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ComboboxCancel_default };
//# sourceMappingURL=ComboboxCancel.js.map