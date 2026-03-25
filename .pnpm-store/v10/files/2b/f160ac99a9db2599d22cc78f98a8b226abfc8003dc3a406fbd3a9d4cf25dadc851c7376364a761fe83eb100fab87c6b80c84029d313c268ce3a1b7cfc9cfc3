import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { RovingFocusItem_default } from "../RovingFocus/RovingFocusItem.js";
import { createBlock, createVNode, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Toolbar/ToolbarLink.vue?vue&type=script&setup=true&lang.ts
var ToolbarLink_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ToolbarLink",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "a"
		}
	},
	setup(__props) {
		const props = __props;
		const { forwardRef } = useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(RovingFocusItem_default), {
				"as-child": "",
				focusable: ""
			}, {
				default: withCtx(() => [createVNode(unref(Primitive), mergeProps(props, {
					ref: unref(forwardRef),
					onKeydown: _cache[0] || (_cache[0] = (event) => {
						if (event.key === " ") event.currentTarget?.click();
					})
				}), {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 16)]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Toolbar/ToolbarLink.vue
var ToolbarLink_default = ToolbarLink_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ToolbarLink_default };
//# sourceMappingURL=ToolbarLink.js.map