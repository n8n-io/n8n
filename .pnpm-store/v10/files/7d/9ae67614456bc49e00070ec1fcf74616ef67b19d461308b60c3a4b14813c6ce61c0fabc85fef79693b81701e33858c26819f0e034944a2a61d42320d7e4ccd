import { PopperArrow_default } from "../Popper/PopperArrow.js";
import { injectSelectRootContext } from "./SelectRoot.js";
import { SelectContentDefaultContextValue, injectSelectContentContext } from "./SelectContentImpl.js";
import { createBlock, createCommentVNode, defineComponent, guardReactiveProps, mergeProps, normalizeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Select/SelectArrow.vue?vue&type=script&setup=true&lang.ts
var SelectArrow_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "SelectArrow",
	props: {
		width: {
			type: Number,
			required: false,
			default: 10
		},
		height: {
			type: Number,
			required: false,
			default: 5
		},
		rounded: {
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
			default: "svg"
		}
	},
	setup(__props) {
		const props = __props;
		const rootContext = injectSelectRootContext();
		const contentContext = injectSelectContentContext(SelectContentDefaultContextValue);
		return (_ctx, _cache) => {
			return unref(rootContext).open.value && unref(contentContext).position === "popper" ? (openBlock(), createBlock(unref(PopperArrow_default), normalizeProps(mergeProps({ key: 0 }, props)), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16)) : createCommentVNode("v-if", true);
		};
	}
});

//#endregion
//#region src/Select/SelectArrow.vue
var SelectArrow_default = SelectArrow_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { SelectArrow_default };
//# sourceMappingURL=SelectArrow.js.map