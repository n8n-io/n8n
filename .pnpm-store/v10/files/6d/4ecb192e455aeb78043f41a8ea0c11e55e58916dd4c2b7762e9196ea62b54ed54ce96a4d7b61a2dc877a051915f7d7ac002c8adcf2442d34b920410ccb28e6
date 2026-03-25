import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectPopperRootContext } from "./PopperRoot.js";
import { createBlock, defineComponent, openBlock, renderSlot, unref, watchPostEffect, withCtx } from "vue";

//#region src/Popper/PopperAnchor.vue?vue&type=script&setup=true&lang.ts
var PopperAnchor_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "PopperAnchor",
	props: {
		reference: {
			type: null,
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
		const { forwardRef, currentElement } = useForwardExpose();
		const rootContext = injectPopperRootContext();
		watchPostEffect(() => {
			rootContext.onAnchorChange(props.reference ?? currentElement.value);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				ref: unref(forwardRef),
				as: _ctx.as,
				"as-child": _ctx.asChild
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 8, ["as", "as-child"]);
		};
	}
});

//#endregion
//#region src/Popper/PopperAnchor.vue
var PopperAnchor_default = PopperAnchor_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { PopperAnchor_default };
//# sourceMappingURL=PopperAnchor.js.map