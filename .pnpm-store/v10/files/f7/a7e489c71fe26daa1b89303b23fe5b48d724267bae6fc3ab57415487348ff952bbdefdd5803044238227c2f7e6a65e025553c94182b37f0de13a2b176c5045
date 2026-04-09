import { Primitive } from "../Primitive/Primitive.js";
import { injectMenuGroupContext } from "./MenuGroup.js";
import { createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Menu/MenuLabel.vue?vue&type=script&setup=true&lang.ts
var MenuLabel_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "MenuLabel",
	props: {
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
		const groupContext = injectMenuGroupContext({ id: "" });
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(props, { id: unref(groupContext).id || void 0 }), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["id"]);
		};
	}
});

//#endregion
//#region src/Menu/MenuLabel.vue
var MenuLabel_default = MenuLabel_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { MenuLabel_default };
//# sourceMappingURL=MenuLabel.js.map