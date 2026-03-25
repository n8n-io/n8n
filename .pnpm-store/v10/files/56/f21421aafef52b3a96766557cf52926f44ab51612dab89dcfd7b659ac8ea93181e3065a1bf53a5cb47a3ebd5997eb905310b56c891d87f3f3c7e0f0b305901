import { useForwardExpose } from "../shared/useForwardExpose.js";
import { BaseSeparator_default } from "../component/BaseSeparator.js";
import { injectToolbarRootContext } from "./ToolbarRoot.js";
import { createBlock, defineComponent, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Toolbar/ToolbarSeparator.vue?vue&type=script&setup=true&lang.ts
var ToolbarSeparator_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ToolbarSeparator",
	props: {
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
		const rootContext = injectToolbarRootContext();
		useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(BaseSeparator_default, {
				orientation: unref(rootContext).orientation.value,
				"as-child": props.asChild,
				as: _ctx.as
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, [
				"orientation",
				"as-child",
				"as"
			]);
		};
	}
});

//#endregion
//#region src/Toolbar/ToolbarSeparator.vue
var ToolbarSeparator_default = ToolbarSeparator_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ToolbarSeparator_default };
//# sourceMappingURL=ToolbarSeparator.js.map