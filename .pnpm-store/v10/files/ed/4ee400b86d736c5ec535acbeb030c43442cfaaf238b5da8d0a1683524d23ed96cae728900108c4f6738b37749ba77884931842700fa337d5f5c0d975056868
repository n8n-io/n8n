import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { RovingFocusItem_default } from "../RovingFocus/RovingFocusItem.js";
import { createBlock, createVNode, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Toolbar/ToolbarButton.vue?vue&type=script&setup=true&lang.ts
var ToolbarButton_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ToolbarButton",
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
		const { forwardRef } = useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(RovingFocusItem_default), {
				"as-child": "",
				focusable: !_ctx.disabled
			}, {
				default: withCtx(() => [createVNode(unref(Primitive), mergeProps({
					ref: unref(forwardRef),
					type: _ctx.as === "button" ? "button" : void 0
				}, props), {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 16, ["type"])]),
				_: 3
			}, 8, ["focusable"]);
		};
	}
});

//#endregion
//#region src/Toolbar/ToolbarButton.vue
var ToolbarButton_default = ToolbarButton_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ToolbarButton_default };
//# sourceMappingURL=ToolbarButton.js.map