import { useEmitAsProps } from "../shared/useEmitAsProps.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { MenuCheckboxItem_default } from "../Menu/MenuCheckboxItem.js";
import { createBlock, defineComponent, guardReactiveProps, normalizeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/ContextMenu/ContextMenuCheckboxItem.vue?vue&type=script&setup=true&lang.ts
var ContextMenuCheckboxItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ContextMenuCheckboxItem",
	props: {
		modelValue: {
			type: [Boolean, String],
			required: false
		},
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
	emits: ["select", "update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const emitsAsProps = useEmitAsProps(emits);
		useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(MenuCheckboxItem_default), normalizeProps(guardReactiveProps({
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
//#region src/ContextMenu/ContextMenuCheckboxItem.vue
var ContextMenuCheckboxItem_default = ContextMenuCheckboxItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ContextMenuCheckboxItem_default };
//# sourceMappingURL=ContextMenuCheckboxItem.js.map