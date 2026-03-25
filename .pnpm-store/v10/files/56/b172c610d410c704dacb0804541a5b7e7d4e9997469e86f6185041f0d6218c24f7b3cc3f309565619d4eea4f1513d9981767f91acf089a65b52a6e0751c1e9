import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectProgressRootContext } from "./ProgressRoot.js";
import { createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Progress/ProgressIndicator.vue?vue&type=script&setup=true&lang.ts
var ProgressIndicator_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ProgressIndicator",
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
		const rootContext = injectProgressRootContext();
		useForwardExpose();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(props, {
				"data-state": unref(rootContext).progressState.value,
				"data-value": unref(rootContext).modelValue?.value ?? void 0,
				"data-max": unref(rootContext).max.value
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, [
				"data-state",
				"data-value",
				"data-max"
			]);
		};
	}
});

//#endregion
//#region src/Progress/ProgressIndicator.vue
var ProgressIndicator_default = ProgressIndicator_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ProgressIndicator_default };
//# sourceMappingURL=ProgressIndicator.js.map