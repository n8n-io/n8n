import { createContext } from "../shared/createContext.js";
import { Presence_default } from "../Presence/Presence.js";
import { Primitive } from "../Primitive/Primitive.js";
import { getCheckedState, isIndeterminate } from "./utils.js";
import { createBlock, createVNode, defineComponent, openBlock, ref, renderSlot, unref, withCtx } from "vue";

//#region src/Menu/MenuItemIndicator.vue?vue&type=script&setup=true&lang.ts
const [injectMenuItemIndicatorContext, provideMenuItemIndicatorContext] = createContext(["MenuCheckboxItem", "MenuRadioItem"], "MenuItemIndicatorContext");
var MenuItemIndicator_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "MenuItemIndicator",
	props: {
		forceMount: {
			type: Boolean,
			required: false
		},
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
		const indicatorContext = injectMenuItemIndicatorContext({ modelValue: ref(false) });
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Presence_default), { present: _ctx.forceMount || unref(isIndeterminate)(unref(indicatorContext).modelValue.value) || unref(indicatorContext).modelValue.value === true }, {
				default: withCtx(() => [createVNode(unref(Primitive), {
					as: _ctx.as,
					"as-child": _ctx.asChild,
					"data-state": unref(getCheckedState)(unref(indicatorContext).modelValue.value)
				}, {
					default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
					_: 3
				}, 8, [
					"as",
					"as-child",
					"data-state"
				])]),
				_: 3
			}, 8, ["present"]);
		};
	}
});

//#endregion
//#region src/Menu/MenuItemIndicator.vue
var MenuItemIndicator_default = MenuItemIndicator_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { MenuItemIndicator_default, provideMenuItemIndicatorContext };
//# sourceMappingURL=MenuItemIndicator.js.map