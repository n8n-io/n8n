import { Primitive } from "../Primitive/Primitive.js";
import { injectListboxGroupContext } from "./ListboxGroup.js";
import { createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Listbox/ListboxGroupLabel.vue?vue&type=script&setup=true&lang.ts
var ListboxGroupLabel_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ListboxGroupLabel",
	props: {
		for: {
			type: String,
			required: false
		},
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "div"
		}
	},
	setup(__props) {
		const props = __props;
		const groupContext = injectListboxGroupContext({ id: "" });
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(props, { id: unref(groupContext).id }), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["id"]);
		};
	}
});

//#endregion
//#region src/Listbox/ListboxGroupLabel.vue
var ListboxGroupLabel_default = ListboxGroupLabel_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ListboxGroupLabel_default };
//# sourceMappingURL=ListboxGroupLabel.js.map