import { useForwardExpose } from "../shared/useForwardExpose.js";
import { PopperArrow_default } from "../Popper/PopperArrow.js";
import { injectComboboxRootContext } from "./ComboboxRoot.js";
import { injectComboboxContentContext } from "./ComboboxContentImpl.js";
import { createBlock, createCommentVNode, defineComponent, guardReactiveProps, mergeProps, normalizeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Combobox/ComboboxArrow.vue?vue&type=script&setup=true&lang.ts
var ComboboxArrow_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ComboboxArrow",
	props: {
		width: {
			type: Number,
			required: false,
			default: 10
		},
		height: {
			type: Number,
			required: false,
			default: 5
		},
		rounded: {
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
			default: "svg"
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = injectComboboxRootContext();
		const contentContext = injectComboboxContentContext();
		useForwardExpose();
		return (_ctx, _cache) => {
			return unref(rootContext).open.value && unref(contentContext).position.value === "popper" ? (openBlock(), createBlock(unref(PopperArrow_default), normalizeProps(mergeProps({ key: 0 }, props)), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16)) : createCommentVNode("v-if", true);
		};
	}
});

//#endregion
//#region src/Combobox/ComboboxArrow.vue
var ComboboxArrow_default = ComboboxArrow_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ComboboxArrow_default };
//# sourceMappingURL=ComboboxArrow.js.map