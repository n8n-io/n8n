import { useEmitAsProps } from "../shared/useEmitAsProps.js";
import { useForwardExpose } from "../shared/useForwardExpose.js";
import { MenuRadioGroup_default } from "../Menu/MenuRadioGroup.js";
import { createBlock, defineComponent, guardReactiveProps, normalizeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Menubar/MenubarRadioGroup.vue?vue&type=script&setup=true&lang.ts
var MenubarRadioGroup_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "MenubarRadioGroup",
	props: {
		modelValue: {
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
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emits = __emit;
		const emitsAsProps = useEmitAsProps(emits);
		useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(MenuRadioGroup_default), normalizeProps(guardReactiveProps({
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
//#region src/Menubar/MenubarRadioGroup.vue
var MenubarRadioGroup_default = MenubarRadioGroup_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { MenubarRadioGroup_default };
//# sourceMappingURL=MenubarRadioGroup.js.map