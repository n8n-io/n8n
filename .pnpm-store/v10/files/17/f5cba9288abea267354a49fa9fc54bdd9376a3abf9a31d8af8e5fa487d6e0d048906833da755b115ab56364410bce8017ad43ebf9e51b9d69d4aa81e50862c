import { createContext } from "../shared/createContext.js";
import { useId } from "../shared/useId.js";
import { Primitive } from "../Primitive/Primitive.js";
import { createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Menu/MenuGroup.vue?vue&type=script&setup=true&lang.ts
const [injectMenuGroupContext, provideMenuGroupContext] = createContext("MenuGroup");
var MenuGroup_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "MenuGroup",
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
		const id = useId(void 0, "reka-menu-group");
		provideMenuGroupContext({ id });
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps({ role: "group" }, props, { "aria-labelledby": unref(id) }), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["aria-labelledby"]);
		};
	}
});

//#endregion
//#region src/Menu/MenuGroup.vue
var MenuGroup_default = MenuGroup_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { MenuGroup_default, injectMenuGroupContext };
//# sourceMappingURL=MenuGroup.js.map