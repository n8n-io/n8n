import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useForwardPropsEmits } from "../shared/useForwardPropsEmits.js";
import { MenuRadioItem_default } from "../Menu/MenuRadioItem.js";
import { createBlock, defineComponent, guardReactiveProps, normalizeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Menubar/MenubarRadioItem.vue?vue&type=script&setup=true&lang.ts
var MenubarRadioItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "MenubarRadioItem",
	props: {
		value: {
			type: String,
			required: true
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
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const forwarded = useForwardPropsEmits(props, emits);
		useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(MenuRadioItem_default), normalizeProps(guardReactiveProps(unref(forwarded))), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/Menubar/MenubarRadioItem.vue
var MenubarRadioItem_default = MenubarRadioItem_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { MenubarRadioItem_default };
//# sourceMappingURL=MenubarRadioItem.js.map