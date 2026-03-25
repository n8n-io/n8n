import { useForwardExpose } from "../shared/useForwardExpose.js";
import { ToggleGroupItem_default } from "../ToggleGroup/ToggleGroupItem.js";
import { ToolbarButton_default } from "./ToolbarButton.js";
import { createBlock, createVNode, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Toolbar/ToolbarToggleItem.vue?vue&type=script&setup=true&lang.ts
var ToolbarToggleItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ToolbarToggleItem",
	props: {
		value: {
			type: null,
			required: true
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
			required: false
		}
	},
	setup(__props) {
		const props = __props;
		const { forwardRef } = useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(ToolbarButton_default, { "as-child": "" }, {
				default: withCtx(() => [createVNode(unref(ToggleGroupItem_default), mergeProps(props, { ref: unref(forwardRef) }), {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 16)]),
				_: 3
			});
		};
	}
});

//#endregion
//#region src/Toolbar/ToolbarToggleItem.vue
var ToolbarToggleItem_default = ToolbarToggleItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ToolbarToggleItem_default };
//# sourceMappingURL=ToolbarToggleItem.js.map