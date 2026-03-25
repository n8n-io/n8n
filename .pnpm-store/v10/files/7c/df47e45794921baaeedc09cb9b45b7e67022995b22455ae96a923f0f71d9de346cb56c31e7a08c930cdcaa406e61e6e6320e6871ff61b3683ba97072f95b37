import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { context } from "./DismissableLayer.js";
import { createBlock, defineComponent, mergeProps, onMounted, onUnmounted, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/DismissableLayer/DismissableLayerBranch.vue?vue&type=script&setup=true&lang.ts
var DismissableLayerBranch_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "DismissableLayerBranch",
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
		const { forwardRef, currentElement } = useForwardExpose();
		onMounted(() => {
			context.branches.add(currentElement.value);
		});
		onUnmounted(() => {
			context.branches.delete(currentElement.value);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps({ ref: unref(forwardRef) }, props), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16);
		};
	}
});

//#endregion
//#region src/DismissableLayer/DismissableLayerBranch.vue
var DismissableLayerBranch_default = DismissableLayerBranch_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { DismissableLayerBranch_default };
//# sourceMappingURL=DismissableLayerBranch.js.map