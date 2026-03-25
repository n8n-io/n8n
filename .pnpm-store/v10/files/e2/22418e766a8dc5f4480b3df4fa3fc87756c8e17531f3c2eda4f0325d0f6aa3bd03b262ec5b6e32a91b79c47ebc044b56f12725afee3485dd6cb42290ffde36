import { useEmitAsProps } from "../shared/useEmitAsProps.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { MenuItem_default } from "../Menu/MenuItem.js";
import { createBlock, defineComponent, guardReactiveProps, normalizeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/ContextMenu/ContextMenuItem.vue?vue&type=script&setup=true&lang.ts
var ContextMenuItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ContextMenuItem",
	props: {
		disabled: {
			type: Boolean,
			required: false
		},
		textValue: {
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
		}
	},
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const emitsAsProps = useEmitAsProps(emits);
		useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(MenuItem_default), normalizeProps(guardReactiveProps({
				...props,
				...unref(emitsAsProps)
			})), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/ContextMenu/ContextMenuItem.vue
var ContextMenuItem_default = ContextMenuItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ContextMenuItem_default };
//# sourceMappingURL=ContextMenuItem.js.map