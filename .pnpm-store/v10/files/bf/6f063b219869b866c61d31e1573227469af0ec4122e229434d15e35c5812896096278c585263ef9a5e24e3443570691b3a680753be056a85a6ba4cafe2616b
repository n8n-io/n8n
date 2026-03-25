import { useForwardExpose } from "../shared/useForwardExpose.js";
import { PopperArrow_default } from "../Popper/PopperArrow.js";
import { createBlock, defineComponent, guardReactiveProps, normalizeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Tooltip/TooltipArrow.vue?vue&type=script&setup=true&lang.ts
var TooltipArrow_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "TooltipArrow",
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
		useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(PopperArrow_default), normalizeProps(guardReactiveProps(props)), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/Tooltip/TooltipArrow.vue
var TooltipArrow_default = TooltipArrow_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { TooltipArrow_default };
//# sourceMappingURL=TooltipArrow.js.map