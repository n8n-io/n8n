import { Primitive } from "../Primitive/Primitive.js";
import { injectSelectGroupContext } from "./SelectGroup.js";
import { createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Select/SelectLabel.vue?vue&type=script&setup=true&lang.ts
var SelectLabel_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "SelectLabel",
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
		const groupContext = injectSelectGroupContext({ id: "" });
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(props, { id: unref(groupContext).id }), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["id"]);
		};
	}
});

//#endregion
//#region src/Select/SelectLabel.vue
var SelectLabel_default = SelectLabel_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { SelectLabel_default };
//# sourceMappingURL=SelectLabel.js.map