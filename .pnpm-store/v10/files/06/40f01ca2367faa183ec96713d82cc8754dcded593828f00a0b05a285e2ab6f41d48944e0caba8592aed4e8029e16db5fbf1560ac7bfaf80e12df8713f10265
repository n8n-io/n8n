import { createContext } from "../shared/createContext.js";
import { useId } from "../shared/useId.js";
import { Primitive } from "../Primitive/Primitive.js";
import { createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Listbox/ListboxGroup.vue?vue&type=script&setup=true&lang.ts
const [injectListboxGroupContext, provideListboxGroupContext] = createContext("ListboxGroup");
var ListboxGroup_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ListboxGroup",
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
		const id = useId(void 0, "reka-listbox-group");
		provideListboxGroupContext({ id });
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps({ role: "group" }, props, { "aria-labelledby": unref(id) }), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["aria-labelledby"]);
		};
	}
});

//#endregion
//#region src/Listbox/ListboxGroup.vue
var ListboxGroup_default = ListboxGroup_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ListboxGroup_default, injectListboxGroupContext };
//# sourceMappingURL=ListboxGroup.js.map