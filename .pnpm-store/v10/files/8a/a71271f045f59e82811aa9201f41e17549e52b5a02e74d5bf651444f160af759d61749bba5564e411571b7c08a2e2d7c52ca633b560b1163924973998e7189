import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectSwitchRootContext } from "./SwitchRoot.js";
import { createBlock, defineComponent, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Switch/SwitchThumb.vue?vue&type=script&setup=true&lang.ts
var SwitchThumb_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "SwitchThumb",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "span"
		}
	},
	setup(__props) {
		const rootContext = injectSwitchRootContext();
		useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				"data-state": unref(rootContext).modelValue?.value ? "checked" : "unchecked",
				"data-disabled": unref(rootContext).disabled.value ? "" : void 0,
				"as-child": _ctx.asChild,
				as: _ctx.as
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"data-state",
				"data-disabled",
				"as-child",
				"as"
			]);
		};
	}
});

//#endregion
//#region src/Switch/SwitchThumb.vue
var SwitchThumb_default = SwitchThumb_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { SwitchThumb_default };
//# sourceMappingURL=SwitchThumb.js.map