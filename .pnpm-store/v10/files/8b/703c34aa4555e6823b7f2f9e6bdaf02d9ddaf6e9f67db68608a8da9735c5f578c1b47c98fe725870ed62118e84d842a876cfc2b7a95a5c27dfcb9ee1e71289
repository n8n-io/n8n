import { useForwardExpose } from "../shared/useForwardExpose.js";
import { Primitive } from "../Primitive/Primitive.js";
import { injectPaginationRootContext } from "./PaginationRoot.js";
import { computed, createBlock, createTextVNode, defineComponent, mergeProps, openBlock, renderSlot, unref, withCtx } from "vue";

//#region src/Pagination/PaginationFirst.vue?vue&type=script&setup=true&lang.ts
var PaginationFirst_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ defineComponent({
	__name: "PaginationFirst",
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
		const rootContext = injectPaginationRootContext();
		useForwardExpose();
		const disabled = computed(() => rootContext.page.value === 1 || rootContext.disabled.value);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Primitive), mergeProps(props, {
				"aria-label": "First Page",
				type: _ctx.as === "button" ? "button" : void 0,
				disabled: disabled.value,
				onClick: _cache[0] || (_cache[0] = ($event) => !disabled.value && unref(rootContext).onPageChange(1))
			}), {
				default: withCtx(() => [renderSlot(_ctx.$slots, "default", {}, () => [_cache[1] || (_cache[1] = createTextVNode("First page"))])]),
				_: 3
			}, 16, ["type", "disabled"]);
		};
	}
});

//#endregion
//#region src/Pagination/PaginationFirst.vue
var PaginationFirst_default = PaginationFirst_vue_vue_type_script_setup_true_lang_default;

//#endregion
export { PaginationFirst_default };
//# sourceMappingURL=PaginationFirst.js.map