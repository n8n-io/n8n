import { useForwardExpose } from "../shared/useForwardExpose.js";
import { useId } from "../shared/useId.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectComboboxGroupContext } from "./ComboboxGroup.js";
import { createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Combobox/ComboboxLabel.vue?vue&type=script&setup=true&lang.ts
var ComboboxLabel_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "ComboboxLabel",
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
		useForwardExpose();
		const groupContext = injectComboboxGroupContext({
			id: "",
			labelId: ""
		});
		groupContext.labelId ||= useId(void 0, "reka-combobox-group-label");
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(props, { id: unref(groupContext).labelId }), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["id"]);
		};
	}
});

//#endregion
//#region src/Combobox/ComboboxLabel.vue
var ComboboxLabel_default = ComboboxLabel_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { ComboboxLabel_default };
//# sourceMappingURL=ComboboxLabel.js.map