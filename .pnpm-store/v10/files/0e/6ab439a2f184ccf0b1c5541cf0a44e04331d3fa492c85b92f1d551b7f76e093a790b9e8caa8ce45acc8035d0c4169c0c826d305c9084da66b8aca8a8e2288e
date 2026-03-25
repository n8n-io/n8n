import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectTagsInputRootContext } from "./TagsInputRoot.js";
import { createBlock, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/TagsInput/TagsInputClear.vue?vue&type=script&setup=true&lang.ts
var TagsInputClear_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "TagsInputClear",
	props: {
		asChild: {
			type: Boolean,
			required: false
		},
		as: {
			type: null,
			required: false,
			default: "button"
		}
	},
	setup(__props) {
		const props = __props;
		useForwardExpose();
		const context = injectTagsInputRootContext();
		function handleCancel() {
			if (context.disabled.value) return;
			context.modelValue.value = [];
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(props, {
				type: _ctx.as === "button" ? "button" : void 0,
				"data-disabled": unref(context).disabled.value ? "" : void 0,
				onClick: handleCancel
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			}, 16, ["type", "data-disabled"]);
		};
	}
});

//#endregion
//#region src/TagsInput/TagsInputClear.vue
var TagsInputClear_default = TagsInputClear_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { TagsInputClear_default };
//# sourceMappingURL=TagsInputClear.js.map