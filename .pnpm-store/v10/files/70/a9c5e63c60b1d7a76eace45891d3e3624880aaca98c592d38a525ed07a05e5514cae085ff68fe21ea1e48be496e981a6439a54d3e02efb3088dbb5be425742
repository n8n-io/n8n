import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { RovingFocusGroup_default } from "../RovingFocus/RovingFocusGroup.js";
import { injectTabsRootContext } from "./TabsRoot.js";
import { createBlock, createVNode, defineComponent, openBlock, renderSlot, toRefs, unref, withCtx } from "vue";

//#region src/Tabs/TabsList.vue?vue&type=script&setup=true&lang.ts
var TabsList_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "TabsList",
	props: {
		loop: {
			type: Boolean,
			required: false,
			default: true
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
		const { loop } = toRefs(props);
		const { forwardRef, currentElement } = useForwardExpose();
		const context = injectTabsRootContext();
		context.tabsList = currentElement;
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(RovingFocusGroup_default), {
				"as-child": "",
				orientation: unref(context).orientation.value,
				dir: unref(context).dir.value,
				loop: unref(loop)
			}, {
				default: withCtx(() => [createVNode(unref(Primitive), {
					ref: unref(forwardRef),
					role: "tablist",
					"as-child": _ctx.asChild,
					as: _ctx.as,
					"aria-orientation": unref(context).orientation.value
				}, {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"as-child",
					"as",
					"aria-orientation"
				])]),
				_: 3
			}, 8, [
				"orientation",
				"dir",
				"loop"
			]);
		};
	}
});

//#endregion
//#region src/Tabs/TabsList.vue
var TabsList_default = TabsList_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { TabsList_default };
//# sourceMappingURL=TabsList.js.map