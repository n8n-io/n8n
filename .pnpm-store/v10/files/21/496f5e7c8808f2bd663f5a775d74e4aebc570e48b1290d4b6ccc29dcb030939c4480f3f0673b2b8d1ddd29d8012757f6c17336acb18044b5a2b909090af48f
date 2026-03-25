import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectNavigationMenuContext } from "./NavigationMenuRoot.js";
import { createBlock, createVNode, defineComponent, mergeProps, onMounted, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/NavigationMenu/NavigationMenuList.vue?vue&type=script&setup=true&lang.ts
var NavigationMenuList_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "NavigationMenuList",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "ul"
		}
	},
	setup(__props) {
		const props = __props;
		const menuContext = injectNavigationMenuContext();
		const { forwardRef, currentElement } = useForwardExpose();
		onMounted(() => {
			menuContext.onIndicatorTrackChange(currentElement.value);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), {
				ref: unref(forwardRef),
				style: { "position": "relative" }
			}, {
				default: withCtx(() => [createVNode(unref(Primitive), mergeProps(_ctx.$attrs, {
					"as-child": props.asChild,
					as: _ctx.as,
					"data-orientation": unref(menuContext).orientation
				}), {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 16, [
					"as-child",
					"as",
					"data-orientation"
				])]),
				_: 3
			}, 512);
		};
	}
});

//#endregion
//#region src/NavigationMenu/NavigationMenuList.vue
var NavigationMenuList_default = NavigationMenuList_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { NavigationMenuList_default };
//# sourceMappingURL=NavigationMenuList.js.map