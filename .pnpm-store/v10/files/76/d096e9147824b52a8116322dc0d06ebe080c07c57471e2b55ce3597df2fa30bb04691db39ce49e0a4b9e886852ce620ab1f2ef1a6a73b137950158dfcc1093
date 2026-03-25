import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { PopperAnchor_default } from "../Popper/PopperAnchor.js";
import { createBlock, createVNode, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Combobox/ComboboxAnchor.vue?vue&type=script&setup=true&lang.ts
var ComboboxAnchor_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ComboboxAnchor",
	props: {
		reference: {
			type: null,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false
		}
	},
	setup(__props) {
		const { forwardRef } = useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(PopperAnchor_default), {
				"as-child": "",
				reference: _ctx.reference
			}, {
				default: withCtx(() => [createVNode(unref(Primitive), mergeProps({
					ref: unref(forwardRef),
					"as-child": _ctx.asChild,
					as: _ctx.as
				}, _ctx.$attrs), {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 16, ["as-child", "as"])]),
				_: 3
			}, 8, ["reference"]);
		};
	}
});

//#endregion
//#region src/Combobox/ComboboxAnchor.vue
var ComboboxAnchor_default = ComboboxAnchor_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ComboboxAnchor_default };
//# sourceMappingURL=ComboboxAnchor.js.map